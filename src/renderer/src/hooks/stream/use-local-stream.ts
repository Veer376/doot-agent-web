"use client";

/**
 * Local Stream Hook
 * 
 * Provides a streaming interface for local agents via Electron IPC.
 * Mimics the API of useStream from @langchain/langgraph-sdk/react
 * but communicates through Electron IPC instead of HTTP.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { isElectron, send, onIpcEvent } from "@/lib/electron";
import type { Message } from "@langchain/langgraph-sdk";
import { useLocalThreadState } from "@/hooks/use-local-threads";

/**
 * LangChain serialized message format from the agent runtime
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
 * Stream event types from Electron main process
 */
interface StreamEvent {
    type: 'stream' | 'done' | 'error';
    mode?: 'messages' | 'values';
    data?: unknown;
    error?: string;
}

/**
 * State type for local streaming
 */
export interface LocalStreamState {
    messages: Message[];
    todos?: Array<{
        id: string;
        content: string;
        status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    }>;
    workspace_files?: Array<{
        path: string;
        is_dir?: boolean;
        size?: number;
    }>;
    browser_snapshot?: {
        url?: string;
        screenshot?: string;
        dom_text?: string;
    };
    [key: string]: unknown;
}

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
}

/**
 * Return type of useLocalStream
 */
export interface UseLocalStreamReturn {
    /** Current state values */
    values: LocalStreamState;
    /** Current messages */
    messages: Message[];
    /** Whether stream is currently running */
    isLoading: boolean;
    /** Last error message */
    error: string | null;
    /** Current interrupt request (if any) */
    interrupt: HITLRequest | null;
    /** Submit a new message */
    submit: (message: string) => void;
    /** Stop the current stream */
    stop: () => void;
    /** Resume after interrupt (approve) */
    approve: () => void;
    /** Reject the interrupt */
    reject: () => void;
}

/**
 * Extract text content from message content (string or content blocks)
 */
function extractContent(
    content: string | Array<{ type: string; text?: string }> | undefined
): string {
    if (typeof content === "string") {
        return content;
    }
    if (Array.isArray(content)) {
        return content
            .filter((block): block is { type: "text"; text: string } => block.type === "text")
            .map((block) => block.text)
            .join("");
    }
    return "";
}

/**
 * Transform LangChain serialized messages to LangGraph SDK Message format
 */
function transformMessages(serializedMessages: unknown[]): Message[] {
    return serializedMessages
        .map((msg): Message | null => {
            const serialized = msg as SerializedMessage;
            const kwargs = serialized?.kwargs || {};
            const classId = Array.isArray(serialized?.id) ? serialized.id : [];
            const className = classId[classId.length - 1] || "";

            // Determine message type from class name
            let type: "human" | "ai" | "tool" | "custom" = "custom";
            if (className.includes("Human")) {
                type = "human";
            } else if (className.includes("AI")) {
                type = "ai";
            } else if (className.includes("Tool")) {
                type = "tool";
            }

            const content = extractContent(kwargs.content);
            const id = kwargs.id || crypto.randomUUID();

            // Build message object
            const message: Message = {
                id,
                type,
                content,
            };

            // Include tool_calls if present
            if (kwargs.tool_calls) {
                (message as any).tool_calls = kwargs.tool_calls;
            }

            // Include tool_call_id for tool messages
            if (kwargs.tool_call_id) {
                (message as any).tool_call_id = kwargs.tool_call_id;
            }

            // Include name if present
            if (kwargs.name) {
                (message as any).name = kwargs.name;
            }

            return message;
        })
        .filter((msg): msg is Message => msg !== null);
}

/**
 * Hook for streaming with local agents via Electron IPC
 * 
 * This hook provides a similar interface to useStream from the LangGraph SDK
 * but communicates with the local agent running in the Electron main process.
 */
export function useLocalStream(options: UseLocalStreamOptions): UseLocalStreamReturn {
    const { threadId, workspacePath, modelId, onFinish, onError } = options;
    const isElectronEnv = isElectron();

    const [values, setValues] = useState<LocalStreamState>({ messages: [] });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [interrupt, setInterrupt] = useState<HITLRequest | null>(null);

    // Track the current stream channel
    const channelRef = useRef<string>(`agent:stream:${threadId}`);
    
    // Fetch existing thread state to load previous messages
    const { data: threadState } = useLocalThreadState(threadId);

    // Update channel when threadId changes
    useEffect(() => {
        channelRef.current = `agent:stream:${threadId}`;
    }, [threadId]);
    
    // Load existing messages from thread state when thread changes
    useEffect(() => {
        console.log('[useLocalStream] ========================================');
        console.log('[useLocalStream] Thread state changed');
        console.log('[useLocalStream]   threadId:', threadId);
        console.log('[useLocalStream]   threadState:', threadState);
        
        if (!threadId) {
            console.log('[useLocalStream] No threadId - resetting to empty messages');
            setValues({ messages: [] });
            return;
        }
        
        if (threadState?.values?.messages) {
            console.log('[useLocalStream] Loading existing messages from thread state');
            console.log('[useLocalStream]   raw messages count:', threadState.values.messages.length);
            
            // Transform the messages from storage format
            const transformedMessages = transformMessages(threadState.values.messages);
            console.log('[useLocalStream]   transformed messages count:', transformedMessages.length);
            console.log('[useLocalStream]   message types:', transformedMessages.map(m => m.type).join(', '));
            
            setValues({
                ...threadState.values,
                messages: transformedMessages,
            });
        } else {
            console.log('[useLocalStream] No existing messages in thread state');
            setValues({ messages: [] });
        }
        console.log('[useLocalStream] ========================================');
    }, [threadId, threadState]);

    // Subscribe to stream events
    useEffect(() => {
        if (!isElectronEnv || !threadId) {
            return;
        }

        const channel = `agent:stream:${threadId}`;
        console.log('[useLocalStream] Setting up event listener for channel:', channel);

        const cleanup = onIpcEvent(channel, (event: unknown) => {
            console.log('[useLocalStream] Received event on channel:', channel);
            const streamEvent = event as StreamEvent;
            console.log('[useLocalStream]   event type:', streamEvent.type);
            console.log('[useLocalStream]   event mode:', streamEvent.mode);

            switch (streamEvent.type) {
                case 'stream':
                    console.log('[useLocalStream] Processing stream event');
                    if (streamEvent.mode === 'values') {
                        console.log('[useLocalStream]   Full state update');
                        const stateData = streamEvent.data as LocalStreamState;
                        console.log('[useLocalStream]   raw messages count:', stateData.messages?.length || 0);
                        
                        // Transform LangChain serialized messages to SDK format
                        const transformedMessages = transformMessages(stateData.messages || []);
                        console.log('[useLocalStream]   transformed messages:', transformedMessages.length);
                        
                        setValues({
                            ...stateData,
                            messages: transformedMessages,
                        });
                    } else if (streamEvent.mode === 'messages') {
                        console.log('[useLocalStream]   Message-level update');
                        // Message-level update (partial)
                        const messageData = streamEvent.data as { messages?: unknown[] };
                        if (messageData.messages) {
                            console.log('[useLocalStream]   raw messages count:', messageData.messages.length);
                            const transformedMessages = transformMessages(messageData.messages);
                            console.log('[useLocalStream]   transformed messages:', transformedMessages.length);
                            setValues(prev => ({
                                ...prev,
                                messages: transformedMessages,
                            }));
                        }
                    }
                    break;

                case 'done':
                    console.log('[useLocalStream] Stream done');
                    setIsLoading(false);
                    onFinish?.(values);
                    break;

                case 'error':
                    console.log('[useLocalStream] Stream error:', streamEvent.error);
                    setIsLoading(false);
                    setError(streamEvent.error || 'Unknown error');
                    onError?.(streamEvent.error || 'Unknown error');
                    break;
            }
        });

        return cleanup;
    }, [isElectronEnv, threadId, onFinish, onError, values]);

    // Submit a new message
    const submit = useCallback((message: string) => {
        console.log('[useLocalStream] ========================================');
        console.log('[useLocalStream] submit called');
        console.log('[useLocalStream]   threadId:', threadId);
        console.log('[useLocalStream]   message length:', message?.length);
        console.log('[useLocalStream]   workspacePath:', workspacePath);
        console.log('[useLocalStream]   modelId:', modelId);
        console.log('[useLocalStream]   isElectronEnv:', isElectronEnv);

        if (!isElectronEnv || !threadId) {
            console.error('[useLocalStream] Cannot submit:', {
                isElectronEnv,
                hasThreadId: !!threadId
            });
            setError('Cannot submit: Not in Electron or no thread');
            return;
        }

        setIsLoading(true);
        setError(null);
        setInterrupt(null);

        console.log('[useLocalStream] Sending agent:invoke via IPC');
        // Send via IPC
        send('agent:invoke', {
            threadId,
            message,
            workspacePath,
            modelId,
        });
        console.log('[useLocalStream] agent:invoke sent');
    }, [isElectronEnv, threadId, workspacePath, modelId]);

    // Stop the current stream
    const stop = useCallback(() => {
        if (!isElectronEnv || !threadId) {
            return;
        }

        send('agent:cancel', { threadId });
        setIsLoading(false);
    }, [isElectronEnv, threadId]);

    // Approve an interrupt
    const approve = useCallback(() => {
        if (!isElectronEnv || !threadId || !interrupt) {
            return;
        }

        setIsLoading(true);
        send('agent:interrupt', {
            threadId,
            decision: {
                type: 'approve',
                tool_call_id: interrupt.tool_call.id,
            },
        });
        setInterrupt(null);
    }, [isElectronEnv, threadId, interrupt]);

    // Reject an interrupt
    const reject = useCallback(() => {
        if (!isElectronEnv || !threadId || !interrupt) {
            return;
        }

        setIsLoading(false);
        send('agent:interrupt', {
            threadId,
            decision: {
                type: 'reject',
                tool_call_id: interrupt.tool_call.id,
            },
        });
        setInterrupt(null);
    }, [isElectronEnv, threadId, interrupt]);

    return {
        values,
        messages: values.messages || [],
        isLoading,
        error,
        interrupt,
        submit,
        stop,
        approve,
        reject,
    };
}
