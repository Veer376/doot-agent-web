/**
 * Electron IPC Transport for @langchain/langgraph-sdk/react's useStream hook.
 * Based on openwork's ElectronIPCTransport pattern.
 * 
 * This transport allows useStream to work with local agents running in Electron's main process
 * by bridging IPC events to the SSE-like stream events expected by the SDK.
 */

import type { UseStreamTransport } from "@langchain/langgraph-sdk/react";
import type { ToolCall, ToolCallChunk } from "@langchain/core/messages";
import { onIpcEvent, send } from "@renderer/lib/ipc";

/**
 * LangChain usage metadata for token tracking
 */
interface UsageMetadata {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
    input_token_details?: {
        cache_read?: number;
        cache_creation?: number;
        audio?: number;
    };
    output_token_details?: {
        audio?: number;
        reasoning?: number;
    };
}

/**
 * Serialized LangChain message chunk format.
 * LangChain uses: { lc: 1, type: "constructor", id: [...], kwargs: {...} }
 */
interface SerializedMessageChunk {
    lc?: number;
    type?: string;
    id?: string[];
    kwargs?: {
        id?: string;
        content?: string | Array<{ type: string; text?: string }>;
        tool_calls?: ToolCall[];
        tool_call_chunks?: ToolCallChunk[];
        tool_call_id?: string;
        name?: string;
        usage_metadata?: UsageMetadata;
        response_metadata?: {
            usage?: UsageMetadata;
            [key: string]: unknown;
        };
    };
}

/**
 * Stream event from IPC
 */
interface IPCStreamEvent {
    type: 'stream' | 'done' | 'error';
    mode?: 'messages' | 'values' | 'updates';
    data?: unknown;
    error?: string;
}

/**
 * SDK-compatible stream event
 */
interface StreamEvent {
    event: string;
    data: unknown;
}

/**
 * Payload sent to start streaming
 */
interface StreamPayload {
    input: unknown;
    config?: {
        configurable?: {
            thread_id?: string;
            model_id?: string;
            [key: string]: unknown;
        };
        [key: string]: unknown;
    };
    command?: unknown;
    signal?: AbortSignal;
}

// Accumulated tool call data (for streaming tool calls)
interface AccumulatedToolCall {
    id: string;
    name: string;
    args: string; // Accumulated JSON string
}

// Completed tool call with parsed args
interface CompletedToolCall {
    id: string;
    name: string;
    args: Record<string, unknown>;
}

/**
 * Custom transport for useStream that uses Electron IPC instead of HTTP.
 * Mirrors openwork's implementation for consistency.
 */
export class ElectronIPCTransport implements UseStreamTransport {
    // Track current message ID for grouping tokens across chunks
    private currentMessageId: string | null = null;

    // Track accumulated tool call chunks (for streaming tool calls)
    private accumulatedToolCalls: Map<string, AccumulatedToolCall> = new Map();

    // Track completed tool calls by name for HITL matching
    private completedToolCallsByName: Map<string, CompletedToolCall[]> = new Map();

    async stream(payload: StreamPayload): Promise<AsyncGenerator<StreamEvent>> {
        // Reset state for new stream
        this.currentMessageId = null;
        this.accumulatedToolCalls.clear();
        this.completedToolCallsByName.clear();

        // Extract thread ID and model ID from config
        const threadId = payload.config?.configurable?.thread_id;
        const modelId = payload.config?.configurable?.model_id as string | undefined;
        
        if (!threadId) {
            return this.createErrorGenerator("MISSING_THREAD_ID", "Thread ID is required");
        }

        // Check if this is a resume command (no message needed)
        const hasResumeCommand = payload.command?.resume !== undefined;

        // Extract the message content from input
        const input = payload.input as
            | { messages?: Array<{ content: string; type: string }> }
            | null
            | undefined;
        const messages = input?.messages ?? [];
        const lastHumanMessage = messages.find((m) => m.type === "human");
        const messageContent = lastHumanMessage?.content ?? "";

        // Only require message content if not resuming
        if (!messageContent && !hasResumeCommand) {
            return this.createErrorGenerator("MISSING_MESSAGE", "Message content is required");
        }

        // Create the stream generator
        return this.createStreamGenerator(
            threadId,
            messageContent,
            payload.command,
            payload.signal,
            modelId
        );
    }

    private async *createErrorGenerator(code: string, message: string): AsyncGenerator<StreamEvent> {
        yield {
            event: "error",
            data: { error: code, message }
        };
    }

    private async *createStreamGenerator(
        threadId: string,
        message: string,
        command: unknown,
        signal: AbortSignal | undefined,
        modelId?: string
    ): AsyncGenerator<StreamEvent> {
        // Create a queue to buffer events from IPC
        const eventQueue: StreamEvent[] = [];
        let resolveNext: ((value: StreamEvent | null) => void) | null = null;
        let isDone = false;
        let hasError = false;

        // Generate a run ID for this stream
        const runId = crypto.randomUUID();

        // Emit metadata event first to establish run context
        yield {
            event: "metadata",
            data: {
                run_id: runId,
                thread_id: threadId
            }
        };

        // Set up IPC listener for stream events
        const channel = `agent:stream:${threadId}`;
        
        const cleanup = onIpcEvent(channel, (ipcEvent: unknown) => {
            // Convert IPC events to SDK format
            const sdkEvents = this.convertToSDKEvents(ipcEvent as IPCStreamEvent, threadId);

            for (const sdkEvent of sdkEvents) {
                if (sdkEvent.event === "done" || sdkEvent.event === "error") {
                    isDone = true;
                    hasError = sdkEvent.event === "error";
                }

                // If someone is waiting for the next event, resolve immediately
                if (resolveNext) {
                    const resolve = resolveNext;
                    resolveNext = null;
                    resolve(sdkEvent);
                } else {
                    // Otherwise queue the event
                    eventQueue.push(sdkEvent);
                }
            }
        });

        // Handle abort signal
        if (signal) {
            signal.addEventListener("abort", () => {
                cleanup();
                isDone = true;
            });
        }

        // Start the stream via IPC
        if (command) {
            // Resume with command
            send("agent:resume", { threadId, command, modelId });
        } else {
            // New invocation
            send("agent:invoke", { threadId, message, modelId });
        }

        // Yield events from the queue
        try {
            while (!isDone) {
                // If there are queued events, yield them
                while (eventQueue.length > 0) {
                    const event = eventQueue.shift();
                    if (event) {
                        yield event;
                        // Check if this was the final event
                        if (event.event === "done" || event.event === "error") {
                            isDone = true;
                            break;
                        }
                    }
                }

                // If not done, wait for the next event
                if (!isDone) {
                    const nextEvent = await new Promise<StreamEvent | null>((resolve) => {
                        resolveNext = resolve;
                        // Set a timeout to periodically check for events
                        setTimeout(() => {
                            if (resolveNext === resolve) {
                                resolveNext = null;
                                resolve(null);
                            }
                        }, 100);
                    });

                    if (nextEvent) {
                        yield nextEvent;
                        // Check if this was the final event
                        if (nextEvent.event === "done" || nextEvent.event === "error") {
                            isDone = true;
                        }
                    }
                }
            }
        } finally {
            cleanup();
        }

        // Ensure we always send a final event
        if (!hasError && !isDone) {
            yield { event: "done", data: {} };
        }
    }

    /**
     * Convert IPC stream events to SDK-compatible stream events.
     * Mirrors openwork's conversion logic.
     */
    private convertToSDKEvents(ipcEvent: IPCStreamEvent, threadId: string): StreamEvent[] {
        const events: StreamEvent[] = [];

        switch (ipcEvent.type) {
            case 'stream': {
                const mode = ipcEvent.mode;
                const data = ipcEvent.data;

                if (mode === 'messages') {
                    // Parse message chunks
                    const messageEvents = this.parseMessageChunks(data, threadId);
                    events.push(...messageEvents);
                } else if (mode === 'values') {
                    // Full state update
                    events.push({
                        event: 'values',
                        data: data
                    });
                } else if (mode === 'updates') {
                    // State updates
                    events.push({
                        event: 'updates',
                        data: data
                    });
                }
                break;
            }

            case 'done': {
                events.push({ event: 'done', data: {} });
                break;
            }

            case 'error': {
                events.push({
                    event: 'error',
                    data: { error: ipcEvent.error || 'Unknown error' }
                });
                break;
            }
        }

        return events;
    }

    /**
     * Parse message chunks from LangChain's serialized format.
     * Mirrors openwork's message parsing logic.
     */
    private parseMessageChunks(data: unknown, threadId: string): StreamEvent[] {
        const events: StreamEvent[] = [];

        // Messages are sent as arrays from LangGraph
        if (!Array.isArray(data)) {
            return events;
        }

        for (const serialized of data) {
            const chunk = serialized as SerializedMessageChunk;

            // Extract message data from LangChain serialization format
            const kwargs = chunk.kwargs || {};
            const messageId = kwargs.id || crypto.randomUUID();

            // Track message ID for token grouping
            if (this.currentMessageId !== messageId) {
                this.currentMessageId = messageId;
            }

            // Get message type from LangChain class ID
            const classId = chunk.id?.[2] || "AIMessageChunk";
            let messageType = "ai";
            if (classId.includes("Human")) messageType = "human";
            else if (classId.includes("System")) messageType = "system";
            else if (classId.includes("Tool")) messageType = "tool";

            // Extract content
            let content = "";
            if (typeof kwargs.content === "string") {
                content = kwargs.content;
            } else if (Array.isArray(kwargs.content)) {
                // Handle content blocks
                content = kwargs.content
                    .map(block => block.type === "text" ? block.text || "" : "")
                    .join("");
            }

            // Create message event (partial or complete)
            const messageEvent: StreamEvent = {
                event: content ? "messages/partial" : "messages/metadata",
                data: [
                    messageType,
                    {
                        id: messageId,
                        type: messageType,
                        content: content || "",
                        tool_calls: kwargs.tool_calls,
                        tool_call_chunks: kwargs.tool_call_chunks,
                        tool_call_id: kwargs.tool_call_id,
                        name: kwargs.name
                    }
                ]
            };

            events.push(messageEvent);

            // Handle token usage if present
            const usageMetadata = kwargs.usage_metadata || kwargs.response_metadata?.usage;
            if (usageMetadata) {
                events.push({
                    event: 'custom',
                    data: {
                        type: 'token_usage',
                        usage: {
                            inputTokens: usageMetadata.input_tokens,
                            outputTokens: usageMetadata.output_tokens,
                            totalTokens: usageMetadata.total_tokens,
                            cacheReadTokens: usageMetadata.input_token_details?.cache_read,
                            cacheCreationTokens: usageMetadata.input_token_details?.cache_creation
                        }
                    }
                });
            }

            // Handle tool calls
            if (kwargs.tool_call_chunks && kwargs.tool_call_chunks.length > 0) {
                for (const toolChunk of kwargs.tool_call_chunks) {
                    this.accumulateToolCall(toolChunk as ToolCallChunk);
                }
            }

            // Emit completed tool calls
            if (kwargs.tool_calls && kwargs.tool_calls.length > 0) {
                for (const toolCall of kwargs.tool_calls) {
                    const completed: CompletedToolCall = {
                        id: toolCall.id || crypto.randomUUID(),
                        name: toolCall.name || "",
                        args: (toolCall.args || {}) as Record<string, unknown>
                    };

                    // Store by name for HITL matching
                    if (!this.completedToolCallsByName.has(completed.name)) {
                        this.completedToolCallsByName.set(completed.name, []);
                    }
                    this.completedToolCallsByName.get(completed.name)!.push(completed);
                }
            }
        }

        return events;
    }

    /**
     * Accumulate streaming tool call chunks.
     */
    private accumulateToolCall(chunk: ToolCallChunk): void {
        const id = chunk.id || "";
        if (!id) return;

        if (!this.accumulatedToolCalls.has(id)) {
            this.accumulatedToolCalls.set(id, {
                id,
                name: chunk.name || "",
                args: ""
            });
        }

        const accumulated = this.accumulatedToolCalls.get(id)!;
        if (chunk.name) accumulated.name = chunk.name;
        if (chunk.args) accumulated.args += chunk.args;
    }
}
