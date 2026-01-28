/**
 * IPC Handlers for Local Agent Operations
 * 
 * Registers Electron IPC handlers for threads, agents, and model management.
 * These handlers bridge the renderer process to local storage and agent runtime.
 */

import { IpcMain, BrowserWindow } from 'electron';
import { app } from 'electron';
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
    console.log('[updateThread] Updating thread:', threadId, 'with:', updates);
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
    console.log('[updateThread] Writing updated thread to:', filePath);
    writeFileSync(filePath, JSON.stringify(updated, null, 2));
    console.log('[updateThread] Thread updated successfully');
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
        console.log('[IPC] threads:list called');
        const threads = getAllThreads();
        console.log('[IPC] threads:list returning', threads.length, 'threads');
        return threads;
    });

    ipcMain.handle('threads:get', async (_event, threadId: string) => {
        console.log('[IPC] threads:get called with threadId:', threadId);
        const thread = getThread(threadId);
        console.log('[IPC] threads:get returning:', thread ? 'found' : 'not found');
        return thread;
    });

    ipcMain.handle('threads:create', async (_event, metadata?: Partial<ThreadMetadata>) => {
        console.log('[IPC] threads:create called with metadata:', metadata);
        const thread = createThread(metadata);
        console.log('[IPC] threads:create created thread:', thread.thread_id);
        console.log('[DEBUG2] ============================================');
        console.log('[DEBUG2] Local thread created with source: local');
        console.log('[DEBUG2] Thread ID:', thread.thread_id);
        console.log('[DEBUG2] Metadata:', JSON.stringify(thread.metadata, null, 2));
        console.log('[DEBUG2] ============================================');
        return thread;
    });

    ipcMain.handle('threads:update', async (_event, { threadId, updates }: {
        threadId: string;
        updates: Partial<Thread>;
    }) => {
        console.log('[IPC] threads:update called with threadId:', threadId, 'updates:', updates);
        const result = updateThread(threadId, updates);
        console.log('[IPC] threads:update result:', result ? 'success' : 'failed');
        return result;
    });

    ipcMain.handle('threads:delete', async (_event, threadId: string) => {
        deleteThread(threadId);
        return { success: true };
    });

    ipcMain.handle('threads:getState', async (_event, threadId: string) => {
        console.log('[IPC] threads:getState called with threadId:', threadId);
        const thread = getThread(threadId);
        if (!thread) {
            console.log('[IPC] threads:getState - thread not found');
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
                console.log('[IPC] threads:getState loaded from checkpoint:', state?.messages?.length || 0, 'messages');
                
                return {
                    values: state || { messages: [] },
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
            }
        } catch (checkpointError) {
            console.warn('[IPC] Failed to load from checkpoint:', checkpointError);
        }

        // Fallback to thread JSON (simplified format without content blocks)
        console.log('[IPC] threads:getState returning state from JSON with', thread.thread_values?.messages?.length || 0, 'messages');
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
    // Agent Runtime Handlers (Streaming)
    // ========================================

    // FUTURE-TODO: Here we will provide the agent:invoke:{graph_id} and using the register we will then fetch the graph by passing the configurations.
    ipcMain.on('agent:invoke', async (event, { threadId, message, workspacePath, modelId }: {
        threadId: string;
        message: string;
        workspacePath?: string;
        modelId?: string;
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

        try {
            // Update thread status
            console.log('[IPC] Updating thread status to busy');
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
                    
                    console.log('[IPC]   mode:', mode);
                    console.log('[IPC]   data keys:', data ? Object.keys(data) : 'null');

                    // Send values or messages update
                    if (mode === 'values' && data) {
                        // Check for interrupt (LangGraph standard: __interrupt__ key in values)
                        if ('__interrupt__' in data && Array.isArray(data.__interrupt__) && data.__interrupt__.length > 0) {
                            console.log('[IPC] Interrupt detected:', data.__interrupt__);
                            updateThread(threadId, { status: 'interrupted' });
                        } else {
                            console.log('[IPC] Streaming values event');
                        }
                        
                        try {
                            const serializedData = JSON.parse(JSON.stringify(data));
                            console.log('[IPC] VALUES STATE - Full Keys:', Object.keys(serializedData));
                            
                            window.webContents.send(channel, {
                                type: 'stream',
                                mode: 'values',
                                data: serializedData,
                            });
                        } catch (serializeError) {
                            console.error('[IPC] Failed to serialize values:', serializeError);
                        }
                        finalState = data;
                    } else if (mode === 'messages' && Array.isArray(data)) {
                        console.log('[IPC] Sending messages update');
                        console.log('[IPC]   messages count:', data.length);
                        
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
                            console.log('[IPC] Messages update sent successfully');
                        } catch (serializeError) {
                            console.error('[IPC] Failed to serialize messages:', serializeError);
                        }
                    }
                }

                // Save final state to thread
                if (finalState) {
                    console.log('[DEBUG2] ============================================');
                    console.log('[DEBUG2] Saving final state to thread');
                    console.log('[DEBUG2] Thread ID:', threadId);
                    console.log('[DEBUG2] Messages in final state:', (finalState as any).messages?.length || 0);
                    console.log('[DEBUG2] ============================================');
                    
                    updateThread(threadId, { 
                        thread_values: finalState as any 
                    });
                    console.log('[IPC] Final state saved to thread');
                } else {
                    console.warn('[IPC] No final state captured - messages may not persist');
                }
                
                response = 'Agent completed successfully';

            } catch (runtimeError) {
                // Fallback to placeholder if runtime fails (missing dependencies, etc.)
                console.error('[IPC] ======================================');
                console.error('[IPC] RUNTIME ERROR - Agent failed to execute');
                console.error('[IPC] Error type:', runtimeError instanceof Error ? runtimeError.constructor.name : typeof runtimeError);
                console.error('[IPC] Error message:', runtimeError instanceof Error ? runtimeError.message : String(runtimeError));
                console.error('[IPC] Error stack:', runtimeError instanceof Error ? runtimeError.stack : 'N/A');
                console.error('[IPC] ======================================');
                
                response = `I received your message: "${message.substring(0, 100)}..."

⚠️ Local agent runtime not fully configured. To enable:
1. Install: npm install deepagents @langchain/anthropic @langchain/openai sql.js
2. Set ANTHROPIC_API_KEY environment variable

Error: ${runtimeError instanceof Error ? runtimeError.message : 'Unknown error'}`;

                console.log('[IPC] Sending placeholder response to channel:', channel);
                // Send placeholder response (serialize dates)
                const placeholderData = {
                    messages: [
                        { id: uuid(), role: 'user', content: message, created_at: new Date().toISOString() },
                        { id: uuid(), role: 'assistant', content: response, created_at: new Date().toISOString() },
                    ],
                };
                console.log('[IPC] AI placeholder message (runtime error)');
                console.log('[IPC] Thread ID:', threadId);
                console.log('[IPC] Error message:', response.substring(0, 200));
                
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

            updateThread(threadId, { status: 'idle' });

            window.webContents.send(channel, { type: 'done' });
            console.log('[IPC] Done event sent');

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

            console.log('[IPC] Resuming agent with decision:', decision.type);
            updateThread(threadId, { status: 'busy' });

            if (decision.type === 'approve') {
                // Resume execution by streaming with null (continues from checkpoint)
                for await (const event of await agent.stream(null, config)) {
                    if (abortController.signal.aborted) break;

                    const [mode, data] = Array.isArray(event) ? event : [null, event];

                    // Handle values events (including new interrupts)
                    if (mode === 'values' && data) {
                        if ('__interrupt__' in data && Array.isArray(data.__interrupt__) && data.__interrupt__.length > 0) {
                            console.log('[IPC] New interrupt during resume:', data.__interrupt__);
                            updateThread(threadId, { status: 'interrupted' });
                        }
                        
                        const serializedData = JSON.parse(JSON.stringify(data));
                        window.webContents.send(channel, {
                            type: 'stream',
                            mode: 'values',
                            data: serializedData,
                        });
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
                if (finalState) {
                    updateThread(threadId, { thread_values: finalState as any });
                }

                if (!abortController.signal.aborted) {
                    updateThread(threadId, { status: 'idle' });
                    window.webContents.send(channel, { type: 'done' });
                }
            } else {
                // For reject/edit: Currently not implemented properly in LangGraph JS
                // Just mark as idle and send done (matches openwork behavior)
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
