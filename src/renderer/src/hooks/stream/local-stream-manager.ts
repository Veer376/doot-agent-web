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
    interrupt?: {
        id: string;
        tool_call: {
            id?: string;
            name: string;
            args: Record<string, unknown>;
        };
        allowed_decisions: string[];
    };
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
 * Transform messages from checkpoint/stream formats to SDK format.
 * CRITICAL: Preserves content blocks (text, thinking, tool_use) - does NOT extract to plain text.
 * 
 * Two sources of messages:
 * 1. IPC stream events: SDK format `{type: 'human'|'ai', content: [...content blocks...]}`
 * 2. SqlJs checkpoint: LangChain serialized format `{lc: 1, type: 'constructor', kwargs}`
 * 
 * Note: Thread JSON files only store metadata, not messages.
 */
function transformMessages(rawMessages: unknown[]): Message[] {
    return rawMessages
        .map((msg): Message | null => {
            const raw = msg as any;
            
            // Format 1: SDK format (from IPC streams) - pass through
            if (raw.type && ['human', 'ai', 'tool', 'system', 'function', 'remove'].includes(raw.type)) {
                return {
                    id: raw.id || crypto.randomUUID(),
                    type: raw.type,
                    content: raw.content, // Keep content blocks as-is (array or string)
                    ...(raw.tool_calls && { tool_calls: raw.tool_calls }),
                    ...(raw.tool_call_id && { tool_call_id: raw.tool_call_id }),
                    ...(raw.name && { name: raw.name }),
                    ...(raw.additional_kwargs && { additional_kwargs: raw.additional_kwargs }),
                    ...(raw.response_metadata && { response_metadata: raw.response_metadata }),
                } as Message;
            }

            // Format 2: LangChain serialized format (from SqlJs checkpoint)
            // Structure: {lc: 1, type: 'constructor', id: ['langchain_core', 'messages', 'HumanMessage'], kwargs: {...}}
            if (raw.lc !== undefined && raw.type === 'constructor' && Array.isArray(raw.id)) {
                const kwargs = raw.kwargs || {};
                const classId = raw.id;
                const className = classId[classId.length - 1] || '';

                // Determine message type from LangChain class name
                let type: 'human' | 'ai' | 'tool' | 'system' = 'human';
                if (className.includes('Human')) type = 'human';
                else if (className.includes('AI')) type = 'ai';
                else if (className.includes('Tool')) type = 'tool';
                else if (className.includes('System')) type = 'system';

                return {
                    id: kwargs.id || crypto.randomUUID(),
                    type,
                    content: kwargs.content, // Keep content blocks as-is - DO NOT extract to string
                    ...(kwargs.tool_calls && { tool_calls: kwargs.tool_calls }),
                    ...(kwargs.tool_call_id && { tool_call_id: kwargs.tool_call_id }),
                    ...(kwargs.name && { name: kwargs.name }),
                    ...(kwargs.additional_kwargs && { additional_kwargs: kwargs.additional_kwargs }),
                    ...(kwargs.response_metadata && { response_metadata: kwargs.response_metadata }),
                } as Message;
            }

            console.warn('[transformMessages] Unknown message format, skipping:', raw);
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
                    const stateData = event.data as { 
                        messages?: unknown[]; 
                        __interrupt__?: Array<{
                            value?: {
                                actionRequests?: Array<{ name: string; id: string; args: Record<string, unknown> }>;
                                reviewConfigs?: Array<{ actionName: string; allowedDecisions: string[] }>;
                            };
                        }>;
                        [key: string]: unknown;
                    };
                    const rawMessages = stateData.messages || [];
                    
                    console.log('[LocalStreamManager] ========================================');
                    console.log('[LocalStreamManager] VALUES event - RAW messages count:', rawMessages.length);
                    if (rawMessages.length > 0) {
                        console.log('[LocalStreamManager] First message:', rawMessages[0]);
                        console.log('[LocalStreamManager] Last message:', rawMessages[rawMessages.length - 1]);
                    }
                    
                    // Validate messages (ensures id, type, content - keeps content blocks intact)
                    const transformedMessages = transformMessages(rawMessages);
                    console.log('[LocalStreamManager] Transformed messages count:', transformedMessages.length);
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
                    
                    // Store values first
                    this.setState(threadId, {
                        messages: transformedMessages,
                        values: stateData
                    });
                    
                    // Check for interrupt (LangGraph HITL format) - emit as custom event (matches SDK pattern)
                    if (stateData.__interrupt__ && Array.isArray(stateData.__interrupt__) && stateData.__interrupt__.length > 0) {
                        console.log('[LocalStreamManager] 🚨 INTERRUPT detected in values:', stateData.__interrupt__);
                        const interruptValue = stateData.__interrupt__[0]?.value;
                        const actionRequests = interruptValue?.actionRequests;
                        const reviewConfigs = interruptValue?.reviewConfigs;

                        if (actionRequests?.length) {
                            const firstAction = actionRequests[0];
                            const reviewConfig = reviewConfigs?.find(
                                (rc) => rc.actionName === firstAction.name
                            );

                            // Find tool_call.id from messages (actionRequest doesn't include it)
                            let toolCallId: string | undefined;
                            for (const msg of transformedMessages) {
                                if (msg.type === 'ai' && (msg as any).tool_calls?.length) {
                                    for (const tc of (msg as any).tool_calls) {
                                        if (tc.name === firstAction.name && tc.id) {
                                            toolCallId = tc.id;
                                            break;
                                        }
                                    }
                                    if (toolCallId) break;
                                }
                            }

                            console.log('[LocalStreamManager] Emitting interrupt custom event:', {
                                id: toolCallId || firstAction.id,
                                name: firstAction.name,
                                args: firstAction.args
                            });

                            // Emit as custom event (SDK pattern - matches openwork)
                            this.notifySubscribers(threadId);
                            
                            // TODO: Need to emit custom event through a callback mechanism
                            // For now, store in a separate interrupt state
                            const currentState = this.stateMap.get(threadId);
                            if (currentState) {
                                (currentState as any).interrupt = {
                                    id: toolCallId || firstAction.id || crypto.randomUUID(),
                                    tool_call: {
                                        id: toolCallId,
                                        name: firstAction.name,
                                        args: firstAction.args || {}
                                    },
                                    allowed_decisions: reviewConfig?.allowedDecisions || ['approve', 'reject']
                                };
                                this.notifySubscribers(threadId);
                            }
                        }
                    }
                } else if (event.mode === 'messages') {
                    // Message-level update - streaming chunks (should merge, not replace!)
                    const messageData = event.data as { messages?: unknown[] };
                    if (messageData.messages) {
                        console.log('[LocalStreamManager] ========================================');
                        console.log('[LocalStreamManager] MESSAGES mode - RAW count:', messageData.messages.length);
                        console.log('[LocalStreamManager] WARNING: Messages mode might only have partial data!');
                        console.log('[LocalStreamManager] ========================================');
                        
                        // Validate messages (keeps content blocks intact)
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
                // Transform messages (handles both LangChain serialized and SDK formats)
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
     * Swap temp thread ID for real thread ID.
     * Used for optimistic updates where we show UI with temp ID,
     * then swap to real ID when thread creation completes.
     */
    swapThreadId(tempThreadId: string, realThreadId: string): void {
        console.log('[LocalStreamManager] Swapping thread ID:', tempThreadId, '→', realThreadId);
        
        // Copy state from temp to real
        const tempState = this.stateMap.get(tempThreadId);
        if (tempState) {
            console.log('[LocalStreamManager] Copying state from temp to real thread');
            this.stateMap.set(realThreadId, tempState);
        }

        // Copy subscribers from temp to real
        const tempSubscribers = this.subscribersMap.get(tempThreadId);
        if (tempSubscribers) {
            console.log('[LocalStreamManager] Copying', tempSubscribers.size, 'subscribers from temp to real thread');
            this.subscribersMap.set(realThreadId, tempSubscribers);
        }

        // Set up IPC for real thread (temp thread never had real IPC)
        this.setupIPCSubscription(realThreadId);

        // Clean up temp thread (state, subscribers, but no IPC to cleanup)
        console.log('[LocalStreamManager] Cleaning up temp thread:', tempThreadId);
        this.stateMap.delete(tempThreadId);
        this.subscribersMap.delete(tempThreadId);

        // Notify subscribers that we've swapped (they're subscribed to real ID now)
        this.notify(realThreadId);
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
