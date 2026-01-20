/**
 * Agent Runtime for Orbit-Agent
 * 
 * Creates and manages the deepagents runtime with:
 * - LangChain models (Anthropic, OpenAI, Google)
 * - SqlJsSaver checkpointer for state persistence
 * - LocalSandbox for file system operations
 */

import { createDeepAgent } from 'deepagents';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { SqlJsSaver } from '../checkpointer/sqljs-saver';
import { LocalSandbox } from './local-sandbox';
import { BASE_SYSTEM_PROMPT } from './system-prompt';
import { app } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

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

function getSettings(): Settings {
    const path = getSettingsPath();
    if (existsSync(path)) {
        try {
            return JSON.parse(readFileSync(path, 'utf-8'));
        } catch {
            // Default to gemini-2.5-flash for testing
            return { defaultModel: 'gemini-2.5-flash', apiKeys: {} };
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
    // First check environment variables
    const envKeys: Record<string, string> = {
        anthropic: 'ANTHROPIC_API_KEY',
        openai: 'OPENAI_API_KEY',
        google: 'GOOGLE_API_KEY',
    };
    const envKey = process.env[envKeys[provider]];
    if (envKey) return envKey;

    // Fall back to stored settings
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

function getModelInstance(modelId?: string): ChatAnthropic | ChatOpenAI | ChatGoogleGenerativeAI | string {
    const model = modelId || getDefaultModel();
    console.log('[Runtime] Using model:', model);

    if (model.startsWith('claude')) {
        const apiKey = getApiKey('anthropic');
        if (!apiKey) {
            throw new Error('Anthropic API key not configured. Set ANTHROPIC_API_KEY environment variable or configure in settings.');
        }
        return new ChatAnthropic({ model, anthropicApiKey: apiKey });
    }

    if (model.startsWith('gpt') || model.startsWith('o1') || model.startsWith('o3') || model.startsWith('o4')) {
        const apiKey = getApiKey('openai');
        if (!apiKey) {
            throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY environment variable or configure in settings.');
        }
        return new ChatOpenAI({ model, openAIApiKey: apiKey });
    }

    if (model.startsWith('gemini')) {
        const apiKey = getApiKey('google');
        if (!apiKey) {
            throw new Error('Google API key not configured. Set GOOGLE_API_KEY environment variable or configure in settings.');
        }
        return new ChatGoogleGenerativeAI({ model, apiKey });
    }

    // Return as string for deepagents to handle
    return model;
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
}

export type AgentRuntime = ReturnType<typeof createDeepAgent>;

export async function createAgentRuntime(options: CreateAgentRuntimeOptions): Promise<AgentRuntime> {
    const { threadId, workspacePath, modelId } = options;

    if (!threadId) {
        throw new Error('Thread ID is required.');
    }

    if (!workspacePath) {
        throw new Error('Workspace path is required.');
    }

    console.log('[Runtime] Creating agent runtime...');
    console.log('[Runtime] Thread ID:', threadId);
    console.log('[Runtime] Workspace path:', workspacePath);

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

    const agent = createDeepAgent({
        model,
        checkpointer,
        backend,
        systemPrompt,
        filesystemSystemPrompt,
        interruptOn: { execute: false },
    } as Parameters<typeof createDeepAgent>[0]);

    console.log('[Runtime] Agent created successfully');
    return agent;
}
