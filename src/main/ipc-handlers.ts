/**
 * IPC Handlers for Local Agent Operations
 * 
 * Registers Electron IPC handlers for threads, agents, and model management.
 * These handlers bridge the renderer process to local storage and agent runtime.
 */

import { IpcMain, BrowserWindow } from 'electron';
import { app } from 'electron';
import { Command } from '@langchain/langgraph';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, readdirSync, appendFileSync } from 'fs';
import { v4 as uuid } from 'uuid';

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

function getThreadsDir(): string {
    const dir = join(getDataDir(), 'threads');
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
    return dir;
}

function getThreadMetaPath(threadId: string): string {
    return join(getThreadsDir(), `${threadId}.json`);
}

function getLoggingFilePath(): string {
    return join(getDataDir(), 'logging.txt');
}

// ============================================================================
// Thread Types
// ============================================================================

interface ThreadMetadata {
    source: 'local';
    assistant_id?: string;
    mode?: 'agent' | 'chat';
    workspacePath?: string;
    modelId?: string;
    [key: string]: unknown;
}

interface Thread {
    thread_id: string;
    created_at: string;
    updated_at: string;
    title?: string;
    status: 'idle' | 'busy' | 'interrupted' | 'error';
    metadata: ThreadMetadata;
    thread_values?: {
        messages?: Array<{
            id?: string;
            type?: string;
            role?: string;
            content?: string | unknown;
            created_at?: string;
            [key: string]: unknown;
        }>;
        [key: string]: unknown;
    };
}

// ============================================================================
// Thread Storage Functions
// ============================================================================

function getAllThreads(): Thread[] {
    const threadsDir = getThreadsDir();
    const files = readdirSync(threadsDir).filter(f => f.endsWith('.json'));

    return files.map(file => {
        try {
            const content = readFileSync(join(threadsDir, file), 'utf-8');
            return JSON.parse(content) as Thread;
        } catch {
            return null;
        }
    }).filter((t): t is Thread => t !== null)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

function getThread(threadId: string): Thread | null {
    const path = getThreadMetaPath(threadId);
    if (!existsSync(path)) return null;

    try {
        const content = readFileSync(path, 'utf-8');
        return JSON.parse(content) as Thread;
    } catch {
        return null;
    }
}

function createThread(metadata?: Partial<ThreadMetadata>): Thread {
    console.log('[createThread] Starting thread creation with metadata:', metadata);
    const threadId = uuid();
    const now = new Date().toISOString();

    const thread: Thread = {
        thread_id: threadId,
        created_at: now,
        updated_at: now,
        title: metadata?.title as string || `Thread ${new Date().toLocaleDateString()}`,
        status: 'idle',
        metadata: {
            source: 'local',
            ...metadata,
        },
    };

    const filePath = getThreadMetaPath(threadId);
    console.log('[createThread] Writing thread to:', filePath);
    writeFileSync(filePath, JSON.stringify(thread, null, 2));
    console.log('[createThread] Thread created successfully:', threadId);
    return thread;
}

function updateThread(threadId: string, updates: Partial<Thread>): Thread | null {
    const thread = getThread(threadId);
    if (!thread) {
        console.error('[updateThread] Thread not found:', threadId);
        return null;
    }

    const updated: Thread = {
        ...thread,
        ...updates,
        updated_at: new Date().toISOString(),
        metadata: {
            ...thread.metadata,
            ...(updates.metadata || {}),
        },
    };

    const filePath = getThreadMetaPath(threadId);
    writeFileSync(filePath, JSON.stringify(updated, null, 2));
    return updated;
}

function deleteThread(threadId: string): void {
    const path = getThreadMetaPath(threadId);
    if (existsSync(path)) {
        unlinkSync(path);
    }
    // Also delete checkpoint file if exists
    const checkpointPath = join(getDataDir(), 'checkpoints', `${threadId}.sqlite`);
    if (existsSync(checkpointPath)) {
        unlinkSync(checkpointPath);
    }
}

// ============================================================================
// Agent Stub (Local Agent Runtime Placeholder)
// ============================================================================

// Track active runs for cancellation
const activeRuns = new Map<string, AbortController>();

async function generateTitle(message: string): Promise<string> {
    // Simple title generation - in production, use LLM
    const words = message.split(' ').slice(0, 5).join(' ');
    return words.length > 50 ? words.substring(0, 50) + '...' : words;
}

// ============================================================================
// IPC Handler Registration
// ============================================================================

export function registerLocalAgentHandlers(ipcMain: IpcMain): void {
    console.log('[LocalAgent] Registering IPC handlers...');

    // ========================================
    // Thread Handlers
    // ========================================

    ipcMain.handle('threads:list', async () => {
        const threads = getAllThreads();
        return threads;
    });

    ipcMain.handle('threads:get', async (_event, threadId: string) => {
        const thread = getThread(threadId);
        return thread;
    });

    ipcMain.handle('threads:create', async (_event, metadata?: Partial<ThreadMetadata>) => {
        const thread = createThread(metadata);
        return thread;
    });

    ipcMain.handle('threads:update', async (_event, { threadId, updates }: {
        threadId: string;
        updates: Partial<Thread>;
    }) => {
        const result = updateThread(threadId, updates);
        return result;
    });

    ipcMain.handle('threads:delete', async (_event, threadId: string) => {
        deleteThread(threadId);
        return { success: true };
    });

    ipcMain.handle('threads:getState', async (_event, threadId: string) => {
        const thread = getThread(threadId);
        if (!thread) {
            return null;
        }

        // Load state from SqlJs checkpoint database (not thread JSON)
        // The checkpoint has the full message objects with content blocks intact
        try {
            const { getCheckpointer } = await import('./agent/runtime');
            const checkpointer = await getCheckpointer(threadId);
            const config = {
                configurable: {
                    thread_id: threadId,
                    checkpoint_ns: '',
                },
            };

            const checkpointTuple = await checkpointer.getTuple(config);

            if (checkpointTuple?.checkpoint) {
                const state = checkpointTuple.checkpoint.channel_values;
                const pendingWrites = checkpointTuple.pendingWrites || [];

                // Check for interrupt in pendingWrites
                // LangGraph stores interrupts as writes to the "__interrupt__" channel
                let interruptData = null;
                for (const [taskId, channel, value] of pendingWrites) {
                    if (channel === '__interrupt__') {
                        interruptData = value;
                    }
                }

                // If we found interrupt data in pendingWrites, add it to the state
                const valuesWithInterrupt = interruptData
                    ? { ...state, __interrupt__: Array.isArray(interruptData) ? interruptData : [interruptData] }
                    : state;

                const result = {
                    values: valuesWithInterrupt || { messages: [] },
                    next: checkpointTuple.checkpoint.pending_sends || [],
                    config: checkpointTuple.config,
                    metadata: checkpointTuple.metadata || {
                        source: 'checkpoint',
                        step: -1,
                        writes: null,
                        parents: {},
                    },
                    created_at: thread.created_at,
                    parent_config: checkpointTuple.parentConfig,
                };

                // Log to file for debugging interrupt persistence
                try {
                    const { writeFileSync } = await import('fs');
                    const { join } = await import('path');
                    const logPath = join(getThreadsDir(), '..', 'logging.txt');
                    const logEntry = `\n\n[${new Date().toISOString()}] threads:getState for ${threadId}:\n` +
                        `Has __interrupt__ in channel_values: ${!!state?.__interrupt__}\n` +
                        `Has __interrupt__ in pendingWrites: ${!!interruptData}\n` +
                        `pendingWrites count: ${pendingWrites.length}\n` +
                        `pendingWrites channels: ${pendingWrites.map((w: unknown[]) => w[1]).join(', ')}\n` +
                        `__interrupt__ value: ${JSON.stringify(interruptData, null, 2)}\n` +
                        `Messages count: ${state?.messages?.length || 0}\n`;
                    writeFileSync(logPath, logEntry, { flag: 'a' });
                } catch (logError) {
                    console.warn('[IPC] Failed to write logging.txt:', logError);
                }

                return result;
            }
        } catch (checkpointError) {
            console.warn('[IPC] Failed to load from checkpoint:', checkpointError);
        }

        return {
            values: thread.thread_values || { messages: [] },
            next: [],
            config: {
                configurable: {
                    thread_id: threadId,
                    checkpoint_ns: '',
                    checkpoint_id: undefined,
                },
            },
            metadata: {
                source: 'local',
                step: -1,
                writes: null,
                parents: {},
            },
            created_at: thread.created_at,
            parent_config: undefined,
        };
    });

    ipcMain.handle('threads:history', async (_event, threadId: string) => {
        // TODO: Implement checkpoint history via SqlJsSaver
        console.log('[LocalAgent] threads:history called for:', threadId);
        return [];
    });

    ipcMain.handle('threads:generateTitle', async (_event, message: string) => {
        return generateTitle(message);
    });

    // ========================================
    // Agent Handlers
    // ========================================

    ipcMain.handle('agents:list', async () => {
        const { getLocalAssistants } = await import('./agents-config');
        return getLocalAssistants();
    });

    ipcMain.handle('models:list', async () => {
        // For testing, gemini-2.5-flash is the default
        return [
            { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'google', available: true },
            { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet', provider: 'anthropic', available: false },
            { id: 'gpt-4', name: 'GPT-4', provider: 'openai', available: false },
        ];
    });

    // ========================================
    // Workspace Selection Handlers
    // ========================================

    // Select workspace folder via dialog
    ipcMain.handle('workspace:select', async (_event, threadId?: string) => {
        const { dialog } = await import('electron');
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory', 'createDirectory'],
            title: 'Select Workspace Folder',
            message: 'Choose a folder for the agent to work in'
        });

        if (result.canceled || result.filePaths.length === 0) {
            return null;
        }

        const selectedPath = result.filePaths[0];

        // If threadId provided, save to thread metadata
        if (threadId) {
            const thread = getThread(threadId);
            if (thread) {
                updateThread(threadId, {
                    metadata: { ...thread.metadata, workspacePath: selectedPath }
                });
            }
        }

        return selectedPath;
    });

    // Get workspace path for a thread
    ipcMain.handle('workspace:get', async (_event, threadId?: string) => {
        if (!threadId) return null;
        const thread = getThread(threadId);
        return thread?.metadata?.workspacePath || null;
    });

    // Set workspace path for a thread
    ipcMain.handle('workspace:set', async (_event, { threadId, path }: { threadId: string; path: string | null }) => {
        const thread = getThread(threadId);
        if (!thread) return null;

        updateThread(threadId, {
            metadata: { ...thread.metadata, workspacePath: path || undefined }
        });

        return path;
    });

    // ========================================
    // Workspace File Operations
    // ========================================

    // Read a text file from workspace
    ipcMain.handle('workspace:readFile', async (_event, { threadId, filePath }: { threadId: string; filePath: string }) => {
        try {
            const thread = getThread(threadId);
            if (!thread?.metadata?.workspacePath) {
                return { success: false, error: 'No workspace set for this thread' };
            }

            const workspacePath = thread.metadata.workspacePath as string;
            const fullPath = join(workspacePath, filePath);

            // Security: ensure path is within workspace
            if (!fullPath.startsWith(workspacePath)) {
                return { success: false, error: 'Path traversal not allowed' };
            }

            if (!existsSync(fullPath)) {
                return { success: false, error: 'File not found' };
            }

            const content = readFileSync(fullPath, 'utf-8');
            return { success: true, content };
        } catch (error) {
            console.error('[IPC] workspace:readFile error:', error);
            return { success: false, error: String(error) };
        }
    });

    // Read a binary file from workspace (returns base64)
    ipcMain.handle('workspace:readBinaryFile', async (_event, { threadId, filePath }: { threadId: string; filePath: string }) => {
        try {
            const thread = getThread(threadId);
            if (!thread?.metadata?.workspacePath) {
                return { success: false, error: 'No workspace set for this thread' };
            }

            const workspacePath = thread.metadata.workspacePath as string;
            const fullPath = join(workspacePath, filePath);

            // Security: ensure path is within workspace
            if (!fullPath.startsWith(workspacePath)) {
                return { success: false, error: 'Path traversal not allowed' };
            }

            if (!existsSync(fullPath)) {
                return { success: false, error: 'File not found' };
            }

            const content = readFileSync(fullPath);
            return { success: true, content: content.toString('base64') };
        } catch (error) {
            console.error('[IPC] workspace:readBinaryFile error:', error);
            return { success: false, error: String(error) };
        }
    });

    // Load file tree from workspace directory
    ipcMain.handle('workspace:loadFromDisk', async (_event, threadId: string): Promise<{ success: boolean; error?: string; files: Array<{ path: string; is_dir: boolean; size?: number }> }> => {
        try {
            const thread = getThread(threadId);
            if (!thread?.metadata?.workspacePath) {
                return { success: false, error: 'No workspace set for this thread', files: [] };
            }

            const workspacePath = thread.metadata.workspacePath as string;
            if (!existsSync(workspacePath)) {
                return { success: false, error: 'Workspace path does not exist', files: [] };
            }

            const files: Array<{ path: string; is_dir: boolean; size?: number }> = [];

            function scanDir(dirPath: string, basePath: string): void {
                try {
                    const entries = readdirSync(dirPath, { withFileTypes: true });
                    for (const entry of entries) {
                        // Skip hidden files and common ignore patterns
                        if (entry.name.startsWith('.') ||
                            entry.name === 'node_modules' ||
                            entry.name === '__pycache__' ||
                            entry.name === 'venv' ||
                            entry.name === '.git') {
                            continue;
                        }

                        const fullPath = join(dirPath, entry.name);
                        const relativePath = fullPath.replace(basePath, '').replace(/\\/g, '/');

                        if (entry.isDirectory()) {
                            files.push({ path: relativePath, is_dir: true });
                            scanDir(fullPath, basePath);
                        } else {
                            try {
                                const stats = require('fs').statSync(fullPath);
                                files.push({ path: relativePath, is_dir: false, size: stats.size });
                            } catch {
                                files.push({ path: relativePath, is_dir: false });
                            }
                        }
                    }
                } catch (error) {
                    console.error('[IPC] workspace:loadFromDisk scanDir error:', error);
                }
            }

            scanDir(workspacePath, workspacePath);
            return { success: true, files };
        } catch (error) {
            console.error('[IPC] workspace:loadFromDisk error:', error);
            return { success: false, error: String(error), files: [] };
        }
    });

    // ========================================
    // Agent Runtime Handlers (Streaming)
    // ========================================

    // FUTURE-TODO: Here we will provide the agent:invoke:{graph_id} and using the register we will then fetch the graph by passing the configurations.
    ipcMain.on('agent:invoke', async (event, { threadId, message, workspacePath, modelId, tools, toolkits }: {
        threadId: string;
        message: string;
        workspacePath?: string;
        modelId?: string;
        tools?: any[];
        toolkits?: any[];
    }) => {
        const channel = `agent:stream:${threadId}`;
        const window = BrowserWindow.fromWebContents(event.sender);

        if (!window) {
            console.error('[IPC] agent:invoke - No window found');
            return;
        }

        // Abort any existing stream
        const existingController = activeRuns.get(threadId);
        if (existingController) {
            existingController.abort();
            activeRuns.delete(threadId);
        }

        const abortController = new AbortController();
        activeRuns.set(threadId, abortController);

        // Track messages at outer scope so error handler can access them
        let lastStateWithMessages: unknown = null;

        try {
            // Update thread status
            updateThread(threadId, { status: 'busy' });

            // Try to import and run agent runtime
            let response: string;
            try {
                const { createAgentRuntime } = await import('./agent/runtime');

                // TODO: Update this to default "C:\users\user-profile\.dootagent\{thread_id}"
                const effectiveWorkspace = workspacePath || process.env.USERPROFILE || process.env.HOME || '.';
                console.log('[IPC] Creating agent with workspace:', effectiveWorkspace);

                // FUTURE-TODO: In the future we will import it form the register and not like this.
                const agent = await createAgentRuntime({
                    threadId,
                    workspacePath: effectiveWorkspace,
                    modelId,
                    tools,
                    toolkits,
                });
                console.log('[IPC] Agent runtime created successfully');

                // Stream the agent response
                const config = { configurable: { thread_id: threadId } };
                let finalState: unknown;

                console.log('[IPC] Starting agent stream...');

                for await (const event of await agent.stream(
                    { messages: [{ type: 'human', content: message }] },
                    { ...config, streamMode: ['messages', 'values'] }
                )) {

                    if (abortController.signal.aborted) {
                        console.log('[IPC] Stream aborted');
                        break;
                    }

                    // LangGraph stream events are arrays: [mode, data]
                    const [mode, data] = Array.isArray(event) ? event : [null, event];

                    // Send values or messages update
                    if (mode === 'values' && data) {
                        // Check for interrupt (LangGraph standard: __interrupt__ key in values)
                        const isInterruptEvent = '__interrupt__' in data && Array.isArray(data.__interrupt__) && data.__interrupt__.length > 0;
                        const hasMessages = 'messages' in data && Array.isArray((data as any).messages) && (data as any).messages.length > 0;

                        if (isInterruptEvent) {
                            console.log('[IPC] Interrupt detected:', data.__interrupt__);
                            console.log('[IPC] Interrupt event has messages:', hasMessages);
                            updateThread(threadId, { status: 'interrupted' });
                        }

                        try {
                            const serializedData = JSON.parse(JSON.stringify(data));

                            window.webContents.send(channel, {
                                type: 'stream',
                                mode: 'values',
                                data: serializedData,
                            });
                        } catch (serializeError) {
                            console.error('[IPC] Failed to serialize values:', serializeError);
                        }

                        // CRITICAL FIX: Track state with messages separately.
                        // When interrupt occurs, LangGraph emits { __interrupt__: [...] } WITHOUT messages.
                        // We need to preserve the last state that actually had messages for persistence.
                        if (hasMessages) {
                            lastStateWithMessages = data;
                        }

                        // Always update finalState (for values reference)
                        finalState = data;
                    } else if (mode === 'messages' && Array.isArray(data)) {

                        try {
                            const serializedMessages = JSON.parse(JSON.stringify(data));

                            try {
                                const logEntry = `\n${'='.repeat(80)}\n[${new Date().toISOString()}] Thread: ${threadId}\nVALUES EVENT:\n${JSON.stringify(serializedMessages, null, 2)}\n${'='.repeat(80)}\n`;
                                appendFileSync(getLoggingFilePath(), logEntry, 'utf-8');
                            } catch (logError) {
                                console.error('[IPC] Failed to write to logging.txt:', logError);
                            }

                            window.webContents.send(channel, {
                                type: 'stream',
                                mode: 'messages',
                                data: { messages: serializedMessages },
                            });
                        } catch (serializeError) {
                            console.error('[IPC] Failed to serialize messages:', serializeError);
                        }
                    }
                }

                // Save final state to thread
                // CRITICAL: Use lastStateWithMessages if available (interrupt events don't have messages)
                const stateToSave = lastStateWithMessages || finalState;

                if (stateToSave) {
                    // Merge: preserve messages from lastStateWithMessages, but include any new values from finalState
                    const mergedState = lastStateWithMessages && finalState && lastStateWithMessages !== finalState
                        ? { ...lastStateWithMessages, ...finalState, messages: (lastStateWithMessages as any).messages }
                        : stateToSave;

                    updateThread(threadId, {
                        thread_values: mergedState as any
                    });
                } else {
                    console.warn('[IPC] No final state captured - messages may not persist');
                }

                response = 'Agent completed successfully';

            } catch (runtimeError) {
                // Handle runtime error - but preserve any messages that were already streamed
                console.error('[IPC] ======================================');
                console.error('[IPC] RUNTIME ERROR - Agent failed to execute');
                console.error('[IPC] Error type:', runtimeError instanceof Error ? runtimeError.constructor.name : typeof runtimeError);
                console.error('[IPC] Error message:', runtimeError instanceof Error ? runtimeError.message : String(runtimeError));
                console.error('[IPC] Error stack:', runtimeError instanceof Error ? runtimeError.stack : 'N/A');
                console.error('[IPC] Already streamed messages:', (lastStateWithMessages as any)?.messages?.length || 0);
                console.error('[IPC] ======================================');

                // Check if we already have streamed messages - preserve them!
                if (lastStateWithMessages && (lastStateWithMessages as any).messages?.length > 0) {

                    // Save the already-streamed messages (not placeholder)
                    updateThread(threadId, {
                        thread_values: lastStateWithMessages as any
                    });

                    // Send error event so UI knows something went wrong, but messages are preserved
                    window.webContents.send(channel, {
                        type: 'error',
                        error: runtimeError instanceof Error ? runtimeError.message : 'Agent execution failed',
                    });
                } else {
                    // No messages were streamed yet - use placeholder
                    response = `I received your message: "${message.substring(0, 100)}..."

⚠️ Local agent runtime not fully configured. To enable:
1. Install: npm install deepagents @langchain/anthropic @langchain/openai sql.js
2. Set ANTHROPIC_API_KEY environment variable

Error: ${runtimeError instanceof Error ? runtimeError.message : 'Unknown error'}`;

                    console.log('[IPC] No streamed messages - sending placeholder response');
                    const placeholderData = {
                        messages: [
                            { id: uuid(), role: 'user', content: message, created_at: new Date().toISOString() },
                            { id: uuid(), role: 'assistant', content: response, created_at: new Date().toISOString() },
                        ],
                    };

                    // Save placeholder messages to thread
                    updateThread(threadId, {
                        thread_values: placeholderData as any
                    });

                    window.webContents.send(channel, {
                        type: 'stream',
                        mode: 'values',
                        data: placeholderData,
                    });
                }
            }

            updateThread(threadId, { status: 'idle' });

            window.webContents.send(channel, { type: 'done' });

        } catch (error) {
            console.error('[IPC] agent:invoke OUTER error:', error);
            window.webContents.send(channel, {
                type: 'error',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            updateThread(threadId, { status: 'error' });

        } finally {
            console.log('[IPC] Cleaning up activeRuns for threadId:', threadId);
            activeRuns.delete(threadId);
        }
    });

    ipcMain.on('agent:interrupt', async (event, { threadId, decision }: {
        threadId: string;
        decision: { type: string; tool_call_id?: string };
    }) => {
        const channel = `agent:stream:${threadId}`;
        const window = BrowserWindow.fromWebContents(event.sender);

        console.log('[IPC] agent:interrupt received:', { threadId, decision });

        if (!window) {
            console.error('[IPC] No window found for interrupt');
            return;
        }

        // Abort any existing stream
        const existingController = activeRuns.get(threadId);
        if (existingController) {
            existingController.abort();
            activeRuns.delete(threadId);
        }

        const abortController = new AbortController();
        activeRuns.set(threadId, abortController);

        try {
            const { createAgentRuntime } = await import('./agent/runtime');
            const thread = getThread(threadId);

            if (!thread) {
                console.error('[IPC] Thread not found:', threadId);
                return;
            }

            const workspacePath = thread.metadata.workspacePath || process.env.USERPROFILE || process.env.HOME || '.';
            const modelId = thread.metadata.modelId;

            const agent = await createAgentRuntime({
                threadId,
                workspacePath,
                modelId,
            });

            const config = {
                configurable: { thread_id: threadId },
                signal: abortController.signal,
                streamMode: ['messages', 'values'] as const
            };
            let finalState: unknown;
            // Track last state with messages (interrupt events don't have messages)
            let lastStateWithMessages: unknown = null;

            console.log('[IPC] Resuming agent with decision:', decision.type);
            updateThread(threadId, { status: 'busy' });

            if (decision.type === 'approve') {
                // Resume execution with Command containing the decision
                // LangGraph HITL expects { decisions: [{ type: 'approve' | 'reject' }] }
                const resumeCommand = new Command({
                    resume: { decisions: [{ type: 'approve' }] }
                });
                console.log('[IPC] Sending resume command:', resumeCommand);

                for await (const event of await agent.stream(resumeCommand, config)) {
                    if (abortController.signal.aborted) break;

                    const [mode, data] = Array.isArray(event) ? event : [null, event];

                    // Handle values events (including new interrupts)
                    if (mode === 'values' && data) {
                        const isInterruptEvent = '__interrupt__' in data && Array.isArray(data.__interrupt__) && data.__interrupt__.length > 0;
                        const hasMessages = 'messages' in data && Array.isArray((data as any).messages) && (data as any).messages.length > 0;

                        if (isInterruptEvent) {
                            console.log('[IPC] New interrupt during resume:', data.__interrupt__);
                            console.log('[IPC] Resume interrupt event has messages:', hasMessages);
                            updateThread(threadId, { status: 'interrupted' });
                        }

                        const serializedData = JSON.parse(JSON.stringify(data));
                        window.webContents.send(channel, {
                            type: 'stream',
                            mode: 'values',
                            data: serializedData,
                        });

                        // Track state with messages separately
                        if (hasMessages) {
                            lastStateWithMessages = data;
                            console.log('[IPC] Resume: Updated lastStateWithMessages with', (data as any).messages.length, 'messages');
                        }
                        finalState = data;
                    } else if (mode === 'messages' && Array.isArray(data)) {
                        const serializedMessages = JSON.parse(JSON.stringify(data));
                        window.webContents.send(channel, {
                            type: 'stream',
                            mode: 'messages',
                            data: { messages: serializedMessages },
                        });
                    }
                }

                // Save final state - use lastStateWithMessages if available
                const stateToSave = lastStateWithMessages || finalState;
                if (stateToSave) {
                    // Merge: preserve messages from lastStateWithMessages, but include any new values from finalState
                    const mergedState = lastStateWithMessages && finalState && lastStateWithMessages !== finalState
                        ? { ...lastStateWithMessages, ...finalState, messages: (lastStateWithMessages as any).messages }
                        : stateToSave;

                    console.log('[IPC] Resume: Saving state with', (mergedState as any).messages?.length || 0, 'messages');
                    updateThread(threadId, { thread_values: mergedState as any });
                }

                if (!abortController.signal.aborted) {
                    updateThread(threadId, { status: 'idle' });
                    window.webContents.send(channel, { type: 'done' });
                }
            } else if (decision.type === 'reject') {
                // Reject: Send Command with reject decision
                const resumeCommand = new Command({
                    resume: { decisions: [{ type: 'reject' }] }
                });
                console.log('[IPC] Sending reject command:', resumeCommand);

                for await (const event of await agent.stream(resumeCommand, config)) {
                    if (abortController.signal.aborted) break;

                    const [mode, data] = Array.isArray(event) ? event : [null, event];

                    if (mode === 'values' && data) {
                        const isInterruptEvent = '__interrupt__' in data && Array.isArray(data.__interrupt__) && data.__interrupt__.length > 0;
                        const hasMessages = 'messages' in data && Array.isArray((data as any).messages) && (data as any).messages.length > 0;

                        if (isInterruptEvent) {
                            console.log('[IPC] New interrupt during reject:', data.__interrupt__);
                            updateThread(threadId, { status: 'interrupted' });
                        }

                        const serializedData = JSON.parse(JSON.stringify(data));
                        window.webContents.send(channel, {
                            type: 'stream',
                            mode: 'values',
                            data: serializedData,
                        });

                        if (hasMessages) {
                            lastStateWithMessages = data;
                        }
                        finalState = data;
                    } else if (mode === 'messages' && Array.isArray(data)) {
                        const serializedMessages = JSON.parse(JSON.stringify(data));
                        window.webContents.send(channel, {
                            type: 'stream',
                            mode: 'messages',
                            data: { messages: serializedMessages },
                        });
                    }
                }

                // Save final state
                const stateToSave = lastStateWithMessages || finalState;
                if (stateToSave) {
                    const mergedState = lastStateWithMessages && finalState && lastStateWithMessages !== finalState
                        ? { ...lastStateWithMessages, ...finalState, messages: (lastStateWithMessages as any).messages }
                        : stateToSave;
                    updateThread(threadId, { thread_values: mergedState as any });
                }

                if (!abortController.signal.aborted) {
                    updateThread(threadId, { status: 'idle' });
                    window.webContents.send(channel, { type: 'done' });
                }
            } else {
                // Unknown decision type - just mark as idle
                console.warn('[IPC] Unknown decision type:', decision.type);
                updateThread(threadId, { status: 'idle' });
                window.webContents.send(channel, { type: 'done' });
            }

            console.log('[IPC] Resume completed');

        } catch (error) {
            const isAbortError = error instanceof Error &&
                (error.name === 'AbortError' || error.message.includes('aborted'));

            if (!isAbortError) {
                console.error('[IPC] agent:interrupt error:', error);
                window.webContents.send(channel, {
                    type: 'error',
                    error: error instanceof Error ? error.message : 'Resume failed',
                });
                updateThread(threadId, { status: 'error' });
            }
        } finally {
            activeRuns.delete(threadId);
        }
    });

    ipcMain.on('agent:cancel', async (_event, { threadId }: { threadId: string }) => {
        console.log('[IPC] agent:cancel received for thread:', threadId);
        const controller = activeRuns.get(threadId);
        if (controller) {
            console.log('[IPC] Aborting stream for thread:', threadId);
            controller.abort();
            activeRuns.delete(threadId);
        } else {
            console.log('[IPC] No active controller found for thread:', threadId);
        }
        updateThread(threadId, { status: 'idle' });
    });

    console.log('[LocalAgent] IPC handlers registered');
}
