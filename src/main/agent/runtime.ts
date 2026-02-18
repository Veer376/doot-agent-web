/**
 * Agent Runtime for Orbit-Agent
 * 
 * Creates and manages the deepagents runtime with:
 * - LangChain models (Anthropic, OpenAI, Google)
 * - SqlJsSaver checkpointer for state persistence
 * - LocalSandbox for file system operations
 */

import { createDeepAgent } from 'deepagents';
import { toolRetryMiddleware } from 'langchain';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { SqlJsSaver } from '../checkpointer/sqljs-saver';
import { LocalSandbox } from './local-sandbox';
import { BASE_SYSTEM_PROMPT } from './system-prompt';
import { app } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { getServerUrl } from '../mcp-handlers';
import { MultiServerMCPClient } from "@langchain/mcp-adapters";

// ============================================================================
// Storage Paths
// ============================================================================

function getDataDir(): string {
    const dataDir = join(app.getPath('userData'), 'orbit-agent-data');
    if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true });
    }
    return dataDir;
}

function getCheckpointsDir(): string {
    const dir = join(getDataDir(), 'checkpoints');
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
    return dir;
}

function getSettingsPath(): string {
    return join(getDataDir(), 'settings.json');
}

// ============================================================================
// Settings Storage
// ============================================================================

interface Settings {
    defaultModel: string;
    apiKeys: {
        anthropic?: string;
        openai?: string;
        google?: string;
    };
}

// ============================================================================
// In-Memory API Key Storage (Temporary - will be replaced with database)
// ============================================================================
// LIMITATION: Keys stored here are session-only and will be lost on app restart.
// TODO: Replace with database/secure storage in a future iteration.
const inMemoryApiKeys: Record<string, string> = {};

export function setInMemoryApiKey(provider: 'anthropic' | 'openai' | 'google', key: string): void {
    console.log(`[Runtime] Setting in-memory API key for provider: ${provider}`);
    inMemoryApiKeys[provider] = key;
}

export function getInMemoryApiKey(provider: 'anthropic' | 'openai' | 'google'): string | undefined {
    return inMemoryApiKeys[provider];
}

function getSettings(): Settings {
    const path = getSettingsPath();
    if (existsSync(path)) {
        try {
            return JSON.parse(readFileSync(path, 'utf-8'));
        } catch {
            // Default to gemini-2.5-flash for testing
            return { defaultModel: 'gemini-2.5-pro', apiKeys: {} };
        }
    }
    // Default to gemini-2.5-flash for testing
    return { defaultModel: 'gemini-2.5-flash', apiKeys: {} };
}

export function saveSettings(settings: Partial<Settings>): void {
    const current = getSettings();
    const merged = { ...current, ...settings };
    writeFileSync(getSettingsPath(), JSON.stringify(merged, null, 2));
}

export function getApiKey(provider: 'anthropic' | 'openai' | 'google'): string | undefined {
    // 1. Check in-memory cache first (set via IPC from frontend)
    const memKey = getInMemoryApiKey(provider);
    if (memKey) return memKey;

    // 2. Check environment variables
    const envKeys: Record<string, string> = {
        anthropic: 'ANTHROPIC_API_KEY',
        openai: 'OPENAI_API_KEY',
        google: 'GOOGLE_API_KEY',
    };
    const envKey = process.env[envKeys[provider]];
    if (envKey) return envKey;

    // 3. Fall back to stored settings (file-based, if any)
    return getSettings().apiKeys[provider];
}

export function getDefaultModel(): string {
    return getSettings().defaultModel;
}

// ============================================================================
// Checkpointer Management
// ============================================================================

const checkpointers = new Map<string, SqlJsSaver>();

export async function getCheckpointer(threadId: string): Promise<SqlJsSaver> {
    let checkpointer = checkpointers.get(threadId);
    if (!checkpointer) {
        const dbPath = join(getCheckpointsDir(), `${threadId}.sqlite`);
        checkpointer = new SqlJsSaver(dbPath);
        await checkpointer.initialize();
        checkpointers.set(threadId, checkpointer);
    }
    return checkpointer;
}

export async function closeCheckpointer(threadId: string): Promise<void> {
    const checkpointer = checkpointers.get(threadId);
    if (checkpointer) {
        await checkpointer.close();
        checkpointers.delete(threadId);
    }
}

export async function closeAllCheckpointers(): Promise<void> {
    const closePromises = Array.from(checkpointers.values()).map(cp => cp.close());
    await Promise.all(closePromises);
    checkpointers.clear();
}

// ============================================================================
// Model Instance Creation
// ============================================================================

/**
 * Get the model instance for the given modelId.
 * Supports two formats:
 * 1. Simple: `gemini-2.5-pro`, `claude-3-5-sonnet-latest`, `gpt-4`
 * 2. Prefixed: `google:gemini-2.5-pro`, `anthropic:claude-3-5-sonnet-latest`, `openai:gpt-4`
 *
 * Throws structured error `[MISSING_API_KEY:provider]` if an API key is missing,
 * allowing the frontend to intercept and prompt the user.
 */
function getModelInstance(modelId?: string): ChatAnthropic | ChatOpenAI | ChatGoogleGenerativeAI | string {
    const rawModel = modelId || getDefaultModel();

    // Parse `provider:model` format
    let provider: 'anthropic' | 'openai' | 'google' | null = null;
    let model = rawModel;

    if (rawModel.includes(':')) {
        const [providerPart, modelPart] = rawModel.split(':', 2);
        if (['anthropic', 'openai', 'google'].includes(providerPart)) {
            provider = providerPart as 'anthropic' | 'openai' | 'google';
            model = modelPart;
        }
    }

    console.log(`[Runtime] Using model: ${model} (provider: ${provider || 'auto-detect'})`);

    // Determine provider from model name if not explicitly set
    const effectiveProvider = provider || inferProvider(model);

    if (effectiveProvider === 'anthropic' || model.startsWith('claude')) {
        const apiKey = getApiKey('anthropic');
        if (!apiKey) {
            throw new Error('[MISSING_API_KEY:anthropic]');
        }
        return new ChatAnthropic({ model, anthropicApiKey: apiKey });
    }

    if (effectiveProvider === 'openai' || model.startsWith('gpt') || model.startsWith('o1') || model.startsWith('o3') || model.startsWith('o4')) {
        const apiKey = getApiKey('openai');
        if (!apiKey) {
            throw new Error('[MISSING_API_KEY:openai]');
        }
        return new ChatOpenAI({ model, openAIApiKey: apiKey });
    }

    if (effectiveProvider === 'google' || model.startsWith('gemini')) {
        const apiKey = getApiKey('google');
        if (!apiKey) {
            throw new Error('[MISSING_API_KEY:google]');
        }
        return new ChatGoogleGenerativeAI({
            model,
            apiKey,
            temperature: 1,
            maxRetries: 2,
            thinkingConfig: {
                includeThoughts: true,
                thinkingBudget: -1, // Maximum thinking budget for Gemini 2.5
            },
        });
    }

    // Return as string for deepagents to handle
    return model;
}

/**
 * Infer provider from model name prefix.
 */
function inferProvider(model: string): 'anthropic' | 'openai' | 'google' | null {
    if (model.startsWith('claude')) return 'anthropic';
    if (model.startsWith('gpt') || model.startsWith('o1') || model.startsWith('o3') || model.startsWith('o4')) return 'openai';
    if (model.startsWith('gemini')) return 'google';
    return null;
}

// ============================================================================
// System Prompt
// ============================================================================

function getSystemPrompt(workspacePath: string): string {
    const workingDirSection = `
### File System and Paths

**IMPORTANT - Path Handling:**
- All file paths use fully qualified absolute system paths
- The workspace root is: \`${workspacePath}\`
- Example: \`${workspacePath}/src/index.ts\`, \`${workspacePath}/README.md\`
- To list the workspace root, use \`ls("${workspacePath}")\`
- Always use full absolute paths for all file operations
`;
    return workingDirSection + BASE_SYSTEM_PROMPT;
}

// ============================================================================
// Agent Runtime
// ============================================================================

export interface CreateAgentRuntimeOptions {
    threadId: string;
    workspacePath: string;
    modelId?: string;
    tools?: any[];
    toolkits?: any[];
}

export type AgentRuntime = ReturnType<typeof createDeepAgent>;

export async function createAgentRuntime(options: CreateAgentRuntimeOptions): Promise<AgentRuntime> {
    const { threadId, workspacePath, modelId, tools, toolkits } = options;

    if (!threadId) {
        throw new Error('Thread ID is required.');
    }

    if (!workspacePath) {
        throw new Error('Workspace path is required.');
    }

    console.log('[Runtime] Creating agent runtime...');
    console.log('[Runtime] Thread ID:', threadId);
    console.log('[Runtime] Workspace path:', workspacePath);

    if (tools) {
        console.log(`[MCP] Runtime injecting ${tools.length} tools`);
    } else {
        console.log('[MCP] Runtime received no tools');
    }

    const model = getModelInstance(modelId);
    const checkpointer = await getCheckpointer(threadId);

    const backend = new LocalSandbox({
        rootDir: workspacePath,
        virtualMode: false,
        timeout: 120_000,
        maxOutputBytes: 100_000,
    });

    const systemPrompt = getSystemPrompt(workspacePath);

    const filesystemSystemPrompt = `You have access to a filesystem. All file paths use fully qualified absolute system paths.

- ls: list files in a directory (e.g., ls("${workspacePath}"))
- read_file: read a file from the filesystem
- write_file: write to a file in the filesystem
- edit_file: edit a file in the filesystem
- glob: find files matching a pattern (e.g., "**/*.py")
- grep: search for text within files

The workspace root is: ${workspacePath}`;

    // Prepare MCP tools using @langchain/mcp-adapters
    let mcpTools: any[] = [];

    // Prioritize toolkits if available (Run Config)
    if (toolkits && toolkits.length > 0) {
        console.log(`[Runtime] Using ${toolkits.length} toolkits from Run Config`);
        try {
            const mcpConfig: Record<string, any> = {};
            // Extract IDs from toolkit objects
            const toolkitIds = toolkits.map((tk: any) => tk.id).filter(Boolean);

            for (const tid of toolkitIds) {
                const url = getServerUrl(tid);
                if (url) {
                    mcpConfig[tid] = {
                        transport: "http",
                        url: url
                    };
                }
            }

            if (Object.keys(mcpConfig).length > 0) {
                console.log('[Runtime] Initializing MultiServerMCPClient with toolkits:', Object.keys(mcpConfig));
                const client = new MultiServerMCPClient(mcpConfig);
                // Load ALL tools from the selected toolkits
                mcpTools = await client.getTools();
                console.log(`[Runtime] Loaded ${mcpTools.length} tools from ${Object.keys(mcpConfig).length} toolkits`);
            }
        } catch (err) {
            console.error('[Runtime] Failed to load MCP tools from toolkits:', err);
        }
    }
    // Fallback to legacy 'tools' array if no toolkits provided
    else if (tools && tools.length > 0) {
        try {
            const uniqueToolkitIds = [...new Set(tools.map((t: any) => t.toolkitId).filter(Boolean))] as string[];
            if (uniqueToolkitIds.length > 0) {
                const mcpConfig: Record<string, any> = {};
                for (const tid of uniqueToolkitIds) {
                    const url = getServerUrl(tid);
                    if (url) {
                        mcpConfig[tid] = {
                            transport: "http",
                            url: url
                        };
                    }
                }

                if (Object.keys(mcpConfig).length > 0) {
                    console.log('[Runtime] Initializing MultiServerMCPClient from legacy tools config');
                    const client = new MultiServerMCPClient(mcpConfig);
                    const allMcpTools = await client.getTools();

                    // Filter tools based on user selection (frontend passes valid tools in 'tools' arg)
                    if (tools && tools.length > 0) {
                        const allowedToolNames = new Set(tools.map((t: any) => t.name));
                        mcpTools = allMcpTools.filter(t => allowedToolNames.has(t.name));
                        console.log(`[Runtime] Filtered tools: ${mcpTools.length}/${allMcpTools.length} available.`);
                    } else {
                        mcpTools = allMcpTools;
                    }

                    console.log(`[Runtime] Loaded ${mcpTools.length} tools from MCP`);
                }
            }
        } catch (err) {
            console.error('[Runtime] Failed to load MCP tools:', err);
        }
    }

    // Configure tool retry middleware for MCP tools
    // This automatically retries failed tool calls and passes errors back to the AI
    const retryMiddleware = toolRetryMiddleware({
        maxRetries: 1,              // 1 total attempts (1 initial + 1 retries)
        initialDelayMs: 1000,       // 1 second initial delay
        backoffFactor: 2.0,         // Exponential backoff (1s, 2s, 4s)
        jitter: true,               // Add randomness to avoid thundering herd
        onFailure: 'continue',      // Pass error message back to AI so it can retry/adapt
        // Retry on all errors by default (MCP tools can have various failure modes)
    });

    const agent = createDeepAgent({
        model,
        checkpointer,
        backend,
        systemPrompt,
        filesystemSystemPrompt, // Note: filesystemSystemPrompt is used as additionalSystemPrompt in older versions, checking compatibility
        tools: mcpTools,
        middleware: [retryMiddleware],  // Add retry middleware
        interruptOn: { execute: true },
    } as Parameters<typeof createDeepAgent>[0]);

    console.log('[Runtime] Agent created successfully with tool retry middleware');
    return agent;
}
