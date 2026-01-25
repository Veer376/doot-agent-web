/**
 * Local Stream Manager for Electron-based LangGraph streaming.
 * 
 * Architecture (based on cloud StreamManager + openwork patterns):
 * - State stored in refs (not React state) - avoids re-render cascades
 * - Subscribers notified via useSyncExternalStore pattern  
 * - Single source of truth for stream state
 * - Handles IPC events directly (no transport layer needed)
 * 
 * This provides the same smooth UX as cloud streaming but for local agents.
 */

import type { Message } from "@langchain/langgraph-sdk";
import { onIpcEvent, send } from "@/lib/electron";

/**
 * Stream state for a single thread
 */
export interface LocalStreamState {
    messages: Message[];
    isLoading: boolean;
    error: string | null;
    values: Record<string, unknown> | null;
}

/**
 * IPC stream event from main process
 */
interface IPCStreamEvent {
    type: 'stream' | 'done' | 'error';
    mode?: 'messages' | 'values';
    data?: unknown;
    error?: string;
}

/**
 * Listener callback
 */
type Listener = () => void;

/**
 * Default stream state
 */
const defaultState: LocalStreamState = {
    messages: [],
    isLoading: false,
    error: null,
    values: null
};

/**
 * LangChain serialized message format
 */
interface SerializedMessage {
    lc?: number;
    type?: string;
    id?: string[];
    kwargs?: {
        id?: string;
        content?: string | Array<{ type: string; text?: string }>;
        tool_calls?: unknown[];
        tool_call_id?: string;
        name?: string;
        [key: string]: unknown;
    };
}

/**
 * Extract text content from message content (string or content blocks)
 */
function extractContent(
    content: string | Array<{ type: string; text?: string }> | undefined
): string {
    if (!content) return "";
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
        return content
            .map((block) => {
                if (block.type === "text" && block.text) return block.text;
                return "";
            })
            .join("");
    }
    return "";
}

/**
 * Transform messages from various formats to SDK format
 */
function transformMessages(serializedMessages: unknown[]): Message[] {
    console.log('[transformMessages] Processing', serializedMessages.length, 'messages');
    
    return serializedMessages
        .map((msg, index): Message | null => {
            const raw = msg as any;
            
            console.log(`[transformMessages] Message ${index}:`, {
                hasType: !!raw.type,
                type: raw.type,
                hasLC: raw.lc !== undefined,
                hasRole: !!raw.role,
                contentType: Array.isArray(raw.content) ? 'array' : typeof raw.content,
                contentLength: Array.isArray(raw.content) ? raw.content.length : raw.content?.length,
                content: raw.content
            });

            // Format 1: SDK format (already correct)
            if (raw.type && ['human', 'ai', 'tool', 'system', 'function', 'remove'].includes(raw.type)) {
                const transformedContent = extractContent(raw.content);
                console.log(`[transformMessages] Message ${index} transformed (SDK format):`, {
                    id: raw.id,
                    type: raw.type,
                    originalContent: raw.content,
                    transformedContent,
                    transformedLength: transformedContent.length
                });
                
                return {
                    id: raw.id || crypto.randomUUID(),
                    type: raw.type,
                    content: transformedContent,
                    ...(raw.tool_calls && { tool_calls: raw.tool_calls }),
                    ...(raw.tool_call_id && { tool_call_id: raw.tool_call_id }),
                    ...(raw.name && { name: raw.name }),
                } as Message;
            }

            // Format 2: LangChain serialized format
            if (raw.lc !== undefined && Array.isArray(raw.id)) {
                const kwargs = raw.kwargs || {};
                const classId = raw.id;
                const className = classId[classId.length - 1] || "";

                let type: "human" | "ai" | "tool" | "custom" = "custom";
                if (className.includes("Human")) type = "human";
                else if (className.includes("AI")) type = "ai";
                else if (className.includes("Tool")) type = "tool";

                return {
                    id: kwargs.id || crypto.randomUUID(),
                    type,
                    content: extractContent(kwargs.content),
                    ...(kwargs.tool_calls && { tool_calls: kwargs.tool_calls }),
                    ...(kwargs.tool_call_id && { tool_call_id: kwargs.tool_call_id }),
                    ...(kwargs.name && { name: kwargs.name }),
                } as Message;
            }

            // Format 3: Legacy role-based
            if (raw.role) {
                const typeMap: Record<string, Message['type']> = {
                    'user': 'human',
                    'assistant': 'ai',
                    'tool': 'tool',
                    'system': 'system',
                };

                return {
                    id: raw.id || crypto.randomUUID(),
                    type: typeMap[raw.role] || 'human',
                    content: extractContent(raw.content),
                    ...(raw.tool_calls && { tool_calls: raw.tool_calls }),
                    ...(raw.tool_call_id && { tool_call_id: raw.tool_call_id as string }),
                    ...(raw.name && { name: raw.name as string }),
                } as Message;
            }

            console.warn('[LocalStreamManager] Unknown message format:', raw);
            return null;
        })
        .filter((msg): msg is Message => msg !== null);
}

/**
 * LocalStreamManager manages stream state using useSyncExternalStore pattern.
 * 
 * Single source of truth for local stream state, matching cloud StreamManager architecture.
 */
export class LocalStreamManager {
    // Stream state per thread (stored in refs, not React state)
    private stateMap = new Map<string, LocalStreamState>();
    
    // Subscribers per thread
    private subscribersMap = new Map<string, Set<Listener>>();
    
    // IPC cleanup functions per thread
    private ipcCleanupMap = new Map<string, () => void>();

    /**
     * Subscribe to stream updates for a specific thread.
     * Returns unsubscribe function.
     * 
     * Used with useSyncExternalStore in React components.
     */
    subscribe(threadId: string, callback: Listener): () => void {
        if (!this.subscribersMap.has(threadId)) {
            this.subscribersMap.set(threadId, new Set());
        }
        
        this.subscribersMap.get(threadId)!.add(callback);

        return () => {
            this.subscribersMap.get(threadId)?.delete(callback);
        };
    }

    /**
     * Get current stream state snapshot for a thread.
     * Used with useSyncExternalStore in React components.
     */
    getSnapshot(threadId: string): LocalStreamState {
        return this.stateMap.get(threadId) || defaultState;
    }

    /**
     * Update stream state and notify subscribers.
     * This triggers immediate re-render via useSyncExternalStore.
     */
    private setState(threadId: string, update: Partial<LocalStreamState>): void {
        const current = this.stateMap.get(threadId) || defaultState;
        const newState = { ...current, ...update };
        this.stateMap.set(threadId, newState);
        this.notify(threadId);
    }

    /**
     * Set optimistic values before stream starts.
     * Matches cloud StreamManager.setStreamValues() API.
     */
    setOptimisticValues(threadId: string, updater: (prev: LocalStreamState) => Partial<LocalStreamState>): void {
        const current = this.stateMap.get(threadId) || defaultState;
        const updates = updater(current);
        this.setState(threadId, updates);
    }

    /**
     * Notify all subscribers for a thread.
     * Triggers re-render in all components using useSyncExternalStore.
     */
    private notify(threadId: string): void {
        const subscribers = this.subscribersMap.get(threadId);
        if (subscribers) {
            subscribers.forEach(callback => callback());
        }
    }

    /**
     * Set up IPC subscription for a thread.
     * Call this when threadId changes in useEffect.
     */
    setupIPCSubscription(threadId: string): void {
        // Clean up existing subscription if any
        this.cleanupIPC(threadId);

        const channel = `agent:stream:${threadId}`;
        console.log('[LocalStreamManager] Setting up IPC for channel:', channel);

        const cleanup = onIpcEvent(channel, (event: unknown) => {
            this.handleIPCEvent(threadId, event as IPCStreamEvent);
        });

        this.ipcCleanupMap.set(threadId, cleanup);
    }

    /**
     * Handle IPC stream event and update state.
     */
    private handleIPCEvent(threadId: string, event: IPCStreamEvent): void {
        console.log('[LocalStreamManager] IPC event:', event.type, 'mode:', event.mode);

        switch (event.type) {
            case 'stream': {
                if (event.mode === 'values') {
                    // Full state update - contains ALL messages including history
                    const stateData = event.data as { messages?: unknown[]; [key: string]: unknown };
                    const rawMessages = stateData.messages || [];
                    
                    console.log('[LocalStreamManager] ========================================');
                    console.log('[LocalStreamManager] VALUES event - RAW messages count:', rawMessages.length);
                    console.log('[LocalStreamManager] First message:', rawMessages[0]);
                    console.log('[LocalStreamManager] Last message:', rawMessages[rawMessages.length - 1]);
                    
                    const transformedMessages = transformMessages(rawMessages);
                    console.log('[LocalStreamManager] TRANSFORMED messages count:', transformedMessages.length);
                    console.log('[LocalStreamManager] ========================================');
                    
                    // Log what's in the values data
                    console.log('[LocalStreamManager] VALUES DATA KEYS:', Object.keys(stateData));
                    if (stateData.todos) {
                        console.log('[LocalStreamManager] ✅ Found todos in values:', stateData.todos);
                    }
                    if (stateData.workspaceFiles || stateData.workspace_files || stateData.files) {
                        console.log('[LocalStreamManager] ✅ Found workspace files in values');
                    }
                    if (stateData.subagents) {
                        console.log('[LocalStreamManager] ✅ Found subagents in values:', stateData.subagents);
                    }
                    
                    this.setState(threadId, {
                        messages: transformedMessages,
                        values: stateData
                    });
                } else if (event.mode === 'messages') {
                    // Message-level update - streaming chunks (should merge, not replace!)
                    const messageData = event.data as { messages?: unknown[] };
                    if (messageData.messages) {
                        console.log('[LocalStreamManager] ========================================');
                        console.log('[LocalStreamManager] MESSAGES mode - RAW count:', messageData.messages.length);
                        console.log('[LocalStreamManager] WARNING: Messages mode might only have partial data!');
                        console.log('[LocalStreamManager] ========================================');
                        
                        const transformedMessages = transformMessages(messageData.messages);
                        
                        // DON'T replace - merge with existing messages
                        const currentState = this.stateMap.get(threadId) || defaultState;
                        const existingMessages = currentState.messages;
                        
                        // Merge: existing messages + new chunks
                        const mergedMessages = [...existingMessages, ...transformedMessages];
                        
                        console.log('[LocalStreamManager] Merged messages count:', mergedMessages.length);
                        
                        this.setState(threadId, {
                            messages: mergedMessages
                        });
                    }
                }
                break;
            }

            case 'done': {
                console.log('[LocalStreamManager] Stream done');
                this.setState(threadId, { isLoading: false });
                break;
            }

            case 'error': {
                console.error('[LocalStreamManager] Stream error:', event.error);
                this.setState(threadId, {
                    isLoading: false,
                    error: event.error || 'Unknown error'
                });
                break;
            }
        }
    }

    /**
     * Start streaming (send IPC agent:invoke).
     * Ensures IPC subscription is set up before starting.
     */
    start(threadId: string, message: string, options?: { modelId?: string; workspacePath?: string }): void {
        console.log('[LocalStreamManager] Starting stream for thread:', threadId);
        
        // Ensure IPC subscription is set up
        if (!this.ipcCleanupMap.has(threadId)) {
            console.log('[LocalStreamManager] IPC not set up, setting up now');
            this.setupIPCSubscription(threadId);
        }
        
        this.setState(threadId, {
            isLoading: true,
            error: null
        });

        send('agent:invoke', {
            threadId,
            message,
            modelId: options?.modelId,
            workspacePath: options?.workspacePath
        });
    }

    /**
     * Stop streaming.
     */
    stop(threadId: string): void {
        console.log('[LocalStreamManager] Stopping stream for thread:', threadId);
        send('agent:cancel', { threadId });
        this.setState(threadId, { isLoading: false });
    }

    /**
     * Load initial thread state (for existing threads).
     * Call this when threadId changes to show cached messages immediately.
     * Won't overwrite if stream is already loading (optimistic update in progress).
     */
    async loadInitialState(threadId: string, stateLoader: (threadId: string) => Promise<any>): Promise<void> {
        try {
            const threadState = await stateLoader(threadId);
            
            // Don't overwrite if stream is already loading (optimistic update in progress)
            const currentState = this.stateMap.get(threadId);
            if (currentState?.isLoading) {
                console.log('[LocalStreamManager] Skipping initial state load - stream already loading');
                return;
            }
            
            if (threadState?.values?.messages) {
                const transformedMessages = transformMessages(threadState.values.messages);
                this.setState(threadId, {
                    messages: transformedMessages,
                    values: threadState.values
                });
            }
        } catch (error) {
            console.error('[LocalStreamManager] Failed to load initial state:', error);
        }
    }

    /**
     * Clean up IPC subscription for a thread.
     */
    private cleanupIPC(threadId: string): void {
        const cleanup = this.ipcCleanupMap.get(threadId);
        if (cleanup) {
            cleanup();
            this.ipcCleanupMap.delete(threadId);
        }
    }

    /**
     * Clean up all state for a thread (when unmounting).
     */
    cleanup(threadId: string): void {
        this.cleanupIPC(threadId);
        this.stateMap.delete(threadId);
        this.subscribersMap.delete(threadId);
    }
}

/**
 * Global singleton manager instance.
 * Shared across all useLocalStream hooks for consistent state.
 */
let managerInstance: LocalStreamManager | null = null;

export function getLocalStreamManager(): LocalStreamManager {
    if (!managerInstance) {
        managerInstance = new LocalStreamManager();
    }
    return managerInstance;
}
