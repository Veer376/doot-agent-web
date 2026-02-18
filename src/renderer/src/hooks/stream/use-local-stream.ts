"use client";

/**
 * Local Stream Hook (Refactored with LocalStreamManager)
 * 
 * Uses LocalStreamManager (useSyncExternalStore pattern) for state management.
 * Matches cloud StreamManager architecture for consistent, smooth UX.
 * 
 * Key principles:
 * 1. Manager stores state in refs (not React state) - avoids cascading re-renders
 * 2. useSyncExternalStore for synchronous updates - no race conditions
 * 3. Optimistic updates via manager.setOptimisticValues() - instant UI feedback
 * 4. No React Query for real-time state - avoids timing issues
 */

import { useCallback, useEffect, useSyncExternalStore, useMemo } from "react";
import type { Message } from "@langchain/langgraph-sdk";
import { getLocalStreamManager } from "./local-stream-manager";
import type { LocalStreamState } from "./local-stream-manager";
import { isElectron, invoke } from "@/lib/electron";

// Re-export LocalStreamState for external use
export type { LocalStreamState } from "./local-stream-manager";

/**
 * HITL Interrupt request
 */
export interface HITLRequest {
    id: string;
    tool_call: {
        id: string;
        name: string;
        args: Record<string, unknown>;
    };
    allowed_decisions: Array<'approve' | 'reject' | 'edit'>;
}

/**
 * Options for the local stream hook
 */
export interface UseLocalStreamOptions {
    /** Thread ID */
    threadId: string | null;
    /** Workspace path for file operations */
    workspacePath?: string;
    /** Model ID override */
    modelId?: string;
    /** Callback when stream finishes */
    onFinish?: (state: LocalStreamState) => void;
    /** Callback when error occurs */
    onError?: (error: string) => void;
    /** Callback for custom events (token usage, etc.) */
    onCustomEvent?: (data: unknown) => void;
}

/**
 * Return type of useLocalStream
 */
export interface UseLocalStreamReturn {
    /** Current state values (contains messages, todos, files, etc.) */
    values: Record<string, unknown>;
    /** Current messages */
    messages: Message[];
    /** Whether stream is currently running */
    isLoading: boolean;
    /** Last error message */
    error: string | null;
    /** Current interrupt request (if any) */
    interrupt: HITLRequest | null;
    /** Submit a new message (with optional optimistic update) */
    submit: (
        messageInput: string | { messages: Message[] },
        options?: { optimisticValues?: (prev: LocalStreamState) => Partial<LocalStreamState> }
    ) => void;
    /** Submit to a specific thread (for new thread creation where submit has stale threadId) */
    submitToThread: (targetThreadId: string, messageContent: string, options?: {
        modelId?: string;
        workspacePath?: string;
        optimisticValues?: (prev: LocalStreamState) => Partial<LocalStreamState>;
        isOptimistic?: boolean;
        skipOptimistic?: boolean;
        tools?: any[];
        toolkits?: any[];
    }) => void;
    /** Stop the current stream */
    stop: () => void;
    /** Resume after interrupt (approve) */
    approve: () => void;
    /** Reject the interrupt */
    reject: () => void;
    /** Swap temp thread ID for real thread ID (for optimistic updates) */
    swapThreadId: (tempThreadId: string, realThreadId: string) => void;
    /** Cleanup a thread (for error handling) */
    cleanupThread: (threadId: string) => void;
}

/**
 * Hook for streaming with local agents via Electron IPC.
 * 
 * Architecture (based on cloud StreamManager):
 * 1. LocalStreamManager stores state in refs (single source of truth)
 * 2. useSyncExternalStore subscribes to updates (synchronous re-renders)
 * 3. IPC events → manager.handleEvent() → notify() → instant UI update
 * 4. Optimistic updates integrated into manager (no separate state needed)
 * 5. Initial state loaded directly via IPC (no React Query timing issues)
 */
export function useLocalStream(options: UseLocalStreamOptions): UseLocalStreamReturn {
    const { threadId, modelId, workspacePath, onFinish, onError, onCustomEvent } = options;

    // Only use stream if in Electron environment
    const isElectronEnv = isElectron();

    // Get singleton manager instance
    const manager = getLocalStreamManager();

    // Cache the default state to avoid infinite loop
    // (getSnapshot must return same reference if state hasn't changed)
    const defaultState = useMemo<LocalStreamState>(() => ({
        messages: [],
        isLoading: false,
        error: null,
        values: null,
        interrupt: null
    }), []);

    // Subscribe to stream state via useSyncExternalStore
    // This provides synchronous updates (no re-render delays)
    const subscribe = useCallback(
        (callback: () => void) => {
            if (!threadId) return () => { };
            return manager.subscribe(threadId, callback);
        },
        [manager, threadId]
    );

    const getSnapshot = useCallback(() => {
        if (!threadId) {
            return defaultState;
        }
        return manager.getSnapshot(threadId);
    }, [manager, threadId, defaultState]);

    const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    // Set up IPC subscription when threadId changes
    // IMPORTANT: No early returns - all hooks must run unconditionally (Rules of Hooks)
    useEffect(() => {
        if (isElectronEnv && threadId) {
            manager.setupIPCSubscription(threadId);

            return () => {
                // Don't cleanup on threadId change - let manager handle it
                // Only cleanup on unmount
            };
        }
    }, [isElectronEnv, threadId, manager]);

    // Load initial thread state when threadId changes
    // This shows cached messages immediately (sub-100ms load time)
    // IMPORTANT: No early returns - all hooks must run unconditionally (Rules of Hooks)
    useEffect(() => {
        if (isElectronEnv && threadId) {

            // Load state from IPC (backend database)
            manager.loadInitialState(threadId, async (id: string) => {
                return await invoke('threads:getState', id);
            });
        }
    }, [isElectronEnv, threadId, manager]);

    // Submit to specific thread (for new thread creation flow)
    // This bypasses the closure issue where submit is bound to old threadId
    const submitToThread = useCallback((targetThreadId: string, messageContent: string, options?: {
        modelId?: string;
        workspacePath?: string;
        optimisticValues?: (prev: LocalStreamState) => Partial<LocalStreamState>;
        isOptimistic?: boolean;
        skipOptimistic?: boolean;
        tools?: any[];
        toolkits?: any[];
    }) => {
        if (!isElectronEnv) {
            console.warn("[useLocalStream] Cannot submit without Electron environment");
            return;
        }

        // Set up IPC subscription for this thread if not already done
        manager.setupIPCSubscription(targetThreadId);

        // Apply optimistic values if provided (unless skipOptimistic is true)
        if (options?.optimisticValues && !options?.skipOptimistic) {
            manager.setOptimisticValues(targetThreadId, options.optimisticValues);
        }

        // If this is only for optimistic display (temp thread), don't start actual stream
        if (options?.isOptimistic) {
            return;
        }

        manager.start(targetThreadId, messageContent, {
            modelId: options?.modelId || modelId,
            workspacePath: options?.workspacePath || workspacePath,
            tools: options?.tools,
            toolkits: options?.toolkits
        });
    }, [isElectronEnv, modelId, workspacePath, manager]);

    // Submit function with integrated optimistic updates
    const submit = useCallback((
        messageInput: string | { messages: Message[] },
        submitOptions?: {
            optimisticValues?: (prev: LocalStreamState) => Partial<LocalStreamState>;
            tools?: any[];
            toolkits?: any[];
        }
    ) => {
        if (!threadId || !isElectronEnv) {
            console.warn("[useLocalStream] Cannot submit without threadId or Electron environment");
            return;
        }

        // Apply optimistic values FIRST (instant UI feedback)
        if (submitOptions?.optimisticValues) {
            manager.setOptimisticValues(threadId, submitOptions.optimisticValues);
        }

        // Extract message content
        let messageContent: string;

        if (typeof messageInput === 'string') {
            messageContent = messageInput;
        } else {
            // Extract from message object
            const messages = messageInput.messages;
            const lastMsg = messages[messages.length - 1];
            const content = lastMsg.content;

            if (typeof content === 'string') {
                messageContent = content;
            } else if (Array.isArray(content)) {
                // Handle content blocks (Message Content Complex)
                messageContent = content
                    .map(block => {
                        if (typeof block === 'object' && block !== null && 'type' in block) {
                            const typedBlock = block as { type: string; text?: string };
                            if (typedBlock.type === 'text' && typedBlock.text) {
                                return typedBlock.text;
                            }
                        }
                        return '';
                    })
                    .filter(text => text.length > 0)
                    .join(' ');
            } else {
                messageContent = JSON.stringify(content);
            }
        }
        // Start stream (sends IPC)
        manager.start(threadId, messageContent, {
            modelId,
            workspacePath,
            tools: submitOptions?.tools,
            toolkits: submitOptions?.toolkits
        });
    }, [threadId, isElectronEnv, modelId, workspacePath, manager]);

    // Stop function
    const stop = useCallback(() => {
        if (!threadId || !isElectronEnv) return;
        manager.stop(threadId);
    }, [threadId, isElectronEnv, manager]);

    // Approve interrupt
    const approve = useCallback(() => {
        if (!threadId || !isElectronEnv) return;
        manager.approve(threadId, workspacePath, modelId);
    }, [threadId, isElectronEnv, manager, workspacePath, modelId]);

    // Reject interrupt
    const reject = useCallback(() => {
        if (!threadId || !isElectronEnv) return;
        manager.reject(threadId, workspacePath, modelId);
    }, [threadId, isElectronEnv, manager, workspacePath, modelId]);

    // Swap thread ID (for optimistic updates with temp ID)
    const swapThreadId = useCallback((tempThreadId: string, realThreadId: string) => {
        if (!isElectronEnv) return;
        manager.swapThreadId(tempThreadId, realThreadId);
    }, [isElectronEnv, manager]);

    // Cleanup thread (for error handling)
    const cleanupThread = useCallback((threadId: string) => {
        if (!isElectronEnv) return;
        manager.cleanup(threadId);
    }, [isElectronEnv, manager]);

    // Handle stream finish
    // IMPORTANT: No early returns - all hooks must run unconditionally (Rules of Hooks)
    useEffect(() => {
        // Stream finished - call onFinish
        if (!state.isLoading && state.messages.length > 0 && onFinish) {
            onFinish(state);
        }
    }, [state.isLoading, state.messages.length, onFinish, state]);

    // Handle errors
    // IMPORTANT: No early returns - all hooks must run unconditionally (Rules of Hooks)
    useEffect(() => {
        if (state.error && onError) {
            onError(state.error);
        }
    }, [state.error, onError]);

    return {
        values: state.values || {}, // Return the actual state values (with todos, etc.), not the LocalStreamState wrapper
        messages: state.messages,
        isLoading: state.isLoading,
        error: state.error,
        interrupt: state.interrupt, // Extract from state (set by LocalStreamManager)
        submit,
        submitToThread, // For new thread creation flow
        stop,
        approve,
        reject,
        swapThreadId, // For swapping temp ID to real ID
        cleanupThread // For cleaning up on errors
    };
}
