"use client";

/**
 * Custom useStream Hook
 * 
 * A React hook that provides seamless integration with LangGraph streaming.
 * Ported from @langchain/langgraph-sdk/react with modifications for custom
 * branching logic and future enhancements.
 * 
 * @see implementation_plan.md for architecture details
 */

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
} from "react";
import { Client, type ThreadState, type Message } from "@langchain/langgraph-sdk";

import type {
    UseStreamOptions,
    UseStream,
    BagTemplate,
    MessageMetadata,
    GetUpdateType,
    GetConfigurableType,
    SubmitOptions,
    RunMetadataStorage,
} from "./types";
import { StreamManager } from "./stream-manager";
import { MessageTupleManager } from "./message-manager";
import { getBranchContext } from "./branching";
import { findLast, unique, getClientConfigHash } from "./utils";

// ============================================================================
// Helper: Thread History Hook
// ============================================================================

interface UseThreadHistoryOptions<StateType extends Record<string, unknown>> {
    passthrough?: boolean;
    submittingRef: React.MutableRefObject<string | null>;
    onError?: (error: unknown) => void;
}

function getFetchHistoryKey(
    client: Client,
    threadId: string | null,
    limit: number | false
): string {
    return [getClientConfigHash(client), threadId, limit].join(":");
}

async function fetchHistory<StateType extends Record<string, unknown>>(
    client: Client,
    threadId: string,
    options?: { limit: number | false }
): Promise<ThreadState<StateType>[]> {
    if (options?.limit === false) {
        const state = await client.threads.getState<StateType>(threadId);
        if (state.checkpoint == null) return [];
        return [state];
    }
    const limit = typeof options?.limit === "number" ? options.limit : 10;
    return client.threads.getHistory<StateType>(threadId, { limit });
}

function useThreadHistory<StateType extends Record<string, unknown>>(
    client: Client,
    threadId: string | null,
    limit: number | false,
    options: UseThreadHistoryOptions<StateType>
) {
    const key = getFetchHistoryKey(client, threadId, limit);

    const [state, setState] = useState<{
        key: string | undefined;
        data: ThreadState<StateType>[] | null | undefined;
        error: unknown;
        isLoading: boolean;
    }>(() => ({
        key: undefined,
        data: undefined,
        error: undefined,
        isLoading: threadId != null,
    }));

    const clientRef = useRef(client);
    clientRef.current = client;

    const onErrorRef = useRef(options?.onError);
    onErrorRef.current = options?.onError;

    const fetcher = useCallback(
        (fetchThreadId: string | null, fetchLimit: number | false) => {
            if (options.passthrough) return Promise.resolve([]);

            const currentClient = clientRef.current;
            const fetchKey = getFetchHistoryKey(currentClient, fetchThreadId, fetchLimit);

            if (fetchThreadId != null) {
                setState((prev) => {
                    if (prev.key === fetchKey) {
                        return { ...prev, isLoading: true };
                    }
                    return {
                        key: fetchKey,
                        data: undefined,
                        error: undefined,
                        isLoading: true,
                    };
                });

                return fetchHistory<StateType>(currentClient, fetchThreadId, { limit: fetchLimit })
                    .then((data) => {
                        setState((prev) => {
                            if (prev.key !== fetchKey) return prev;
                            return {
                                key: fetchKey,
                                data,
                                error: undefined,
                                isLoading: false,
                            };
                        });
                        return data;
                    })
                    .catch((error) => {
                        setState((prev) => {
                            if (prev.key !== fetchKey) return prev;
                            return {
                                key: fetchKey,
                                data: prev.data,
                                error,
                                isLoading: false,
                            };
                        });
                        onErrorRef.current?.(error);
                        return Promise.reject(error);
                    });
            }

            setState({
                key: fetchKey,
                data: undefined,
                error: undefined,
                isLoading: false,
            });

            return Promise.resolve([]);
        },
        [options.passthrough]
    );

    useEffect(() => {
        // Skip fetch if we're currently submitting to this thread
        if (
            options.submittingRef.current != null &&
            options.submittingRef.current === threadId
        ) {
            return;
        }
        fetcher(threadId, limit);
    }, [fetcher, key, threadId, limit, options.submittingRef]);

    return {
        data: state.data,
        error: state.error,
        isLoading: state.isLoading,
        mutate: (mutateId?: string) => fetcher(mutateId ?? threadId, limit),
    };
}

// ============================================================================
// Helper: Controllable Thread ID
// ============================================================================

function useControllableThreadId<StateType extends Record<string, unknown>>(
    options: UseStreamOptions<StateType>
): [string | null, (id: string) => void] {
    const [internalThreadId, setInternalThreadId] = useState<string | null>(null);

    // Use external threadId if provided, otherwise use internal
    const threadId = options.threadId !== undefined ? options.threadId : internalThreadId;

    const setThreadId = useCallback(
        (id: string) => {
            setInternalThreadId(id);
            options.onThreadId?.(id);
        },
        [options]
    );

    return [threadId, setThreadId];
}

// ============================================================================
// Main Hook: useStream
// ============================================================================

/**
 * A React hook that provides seamless integration with LangGraph streaming.
 * 
 * Handles streaming, state management, and branching logic automatically.
 */
export function useStream<
    StateType extends Record<string, unknown> = Record<string, unknown>,
    Bag extends BagTemplate = BagTemplate
>(options: UseStreamOptions<StateType, Bag>): UseStream<StateType, Bag> {
    // -------------------------------------------------------------------------
    // Setup: Reconnection storage
    // -------------------------------------------------------------------------
    const reconnectOnMountRef = useRef(options.reconnectOnMount);
    const runMetadataStorage = useMemo<RunMetadataStorage | null>(() => {
        if (typeof window === "undefined") return null;
        const storage = reconnectOnMountRef.current;
        if (storage === true) return window.sessionStorage as RunMetadataStorage;
        if (typeof storage === "function") return storage();
        return null;
    }, []);

    // -------------------------------------------------------------------------
    // Setup: Client
    // -------------------------------------------------------------------------
    const client = useMemo(
        () =>
            options.client ??
            new Client({
                apiUrl: options.apiUrl,
                apiKey: options.apiKey,
                callerOptions: options.callerOptions,
                defaultHeaders: options.defaultHeaders,
            }),
        [
            options.client,
            options.apiKey,
            options.apiUrl,
            options.callerOptions,
            options.defaultHeaders,
        ]
    );

    // -------------------------------------------------------------------------
    // Setup: Managers
    // -------------------------------------------------------------------------
    const [messageManager] = useState(() => new MessageTupleManager());
    const [stream] = useState(() => new StreamManager<StateType>(messageManager));

    // Subscribe to stream state changes
    useSyncExternalStore(stream.subscribe, stream.getSnapshot, stream.getSnapshot);

    // -------------------------------------------------------------------------
    // Setup: Thread ID
    // -------------------------------------------------------------------------
    const [threadId, onThreadId] = useControllableThreadId(options);
    const threadIdRef = useRef(threadId);
    const threadIdStreamingRef = useRef<string | null>(null);

    // Clear stream when thread changes
    useEffect(() => {
        if (threadIdRef.current !== threadId) {
            threadIdRef.current = threadId;
            stream.clear();
        }
    }, [threadId, stream]);

    // -------------------------------------------------------------------------
    // Setup: Stream mode tracking
    // -------------------------------------------------------------------------
    const trackStreamModeRef = useRef<string[]>([]);
    const trackStreamMode = useCallback((...mode: string[]) => {
        const ref = trackStreamModeRef.current;
        for (const m of mode) {
            if (!ref.includes(m)) ref.push(m);
        }
    }, []);

    // Calculate callback stream modes
    const hasUpdateListener = options.onUpdateEvent != null;
    const hasCustomListener = options.onCustomEvent != null;
    const hasLangChainListener = options.onLangChainEvent != null;
    const hasDebugListener = options.onDebugEvent != null;
    const hasCheckpointListener = options.onCheckpointEvent != null;
    const hasTaskListener = options.onTaskEvent != null;

    const callbackStreamMode = useMemo(() => {
        const modes: string[] = [];
        if (hasUpdateListener) modes.push("updates");
        if (hasCustomListener) modes.push("custom");
        if (hasLangChainListener) modes.push("events");
        if (hasDebugListener) modes.push("debug");
        if (hasCheckpointListener) modes.push("checkpoints");
        if (hasTaskListener) modes.push("tasks");
        return modes;
    }, [
        hasUpdateListener,
        hasCustomListener,
        hasLangChainListener,
        hasDebugListener,
        hasCheckpointListener,
        hasTaskListener,
    ]);

    // -------------------------------------------------------------------------
    // Setup: History
    // -------------------------------------------------------------------------
    const historyLimit =
        typeof options.fetchStateHistory === "object" && options.fetchStateHistory != null
            ? options.fetchStateHistory.limit ?? false
            : options.fetchStateHistory ?? false;

    const history = useThreadHistory<StateType>(client, threadId, historyLimit, {
        submittingRef: threadIdStreamingRef,
        onError: options.onError,
    });

    // -------------------------------------------------------------------------
    // Setup: Branch Context
    // -------------------------------------------------------------------------
    const [branch, setBranch] = useState("");
    const branchContext = getBranchContext<StateType>(branch, history.data ?? undefined);

    const historyValues = (branchContext.threadHead?.values ?? options.initialValues ?? {}) as StateType;

    // Extract error from history if present
    const historyError = (() => {
        const error = branchContext.threadHead?.tasks?.at(-1)?.error;
        if (error == null) return undefined;
        try {
            return JSON.parse(error);
        } catch {
            return error;
        }
    })();

    // -------------------------------------------------------------------------
    // Setup: Message Metadata
    // -------------------------------------------------------------------------
    const getMessages = useCallback(
        (value: StateType): Message[] => {
            const messagesKey = options.messagesKey ?? "messages";
            const messages = value[messagesKey];
            return Array.isArray(messages) ? messages : [];
        },
        [options.messagesKey]
    );

    const setMessages = useCallback(
        (current: StateType, messages: Message[]): StateType => {
            const messagesKey = options.messagesKey ?? "messages";
            return { ...current, [messagesKey]: messages };
        },
        [options.messagesKey]
    );

    const messageMetadata = useMemo(() => {
        const alreadyShown = new Set<string>();

        return getMessages(historyValues).map((message, idx): MessageMetadata<StateType> => {
            const messageId = message.id ?? String(idx);

            // Find first state containing this message
            const firstSeenState = findLast(
                history.data ?? [],
                (state) =>
                    getMessages(state.values as StateType)
                        .map((m, i) => m.id ?? String(i))
                        .includes(messageId)
            );

            const checkpointId = firstSeenState?.checkpoint?.checkpoint_id;
            let branchInfo = checkpointId != null
                ? branchContext.branchByCheckpoint[checkpointId]
                : undefined;

            // Don't show duplicate branch options
            if (branchInfo?.branch && !branchInfo.branch.length) {
                branchInfo = undefined;
            }

            const optionsShown = branchInfo?.branchOptions?.flat().join(",");
            if (optionsShown) {
                if (alreadyShown.has(optionsShown)) {
                    branchInfo = undefined;
                }
                alreadyShown.add(optionsShown);
            }

            return {
                messageId: messageId.toString(),
                firstSeenState,
                branch: branchInfo?.branch,
                branchOptions: branchInfo?.branchOptions,
                streamMetadata: undefined,
            };
        });
    }, [historyValues, history.data, branchContext.branchByCheckpoint, getMessages]);

    // -------------------------------------------------------------------------
    // Actions: Stop
    // -------------------------------------------------------------------------
    const stop = useCallback(async () => {
        await stream.stop(historyValues, {
            onStop: (args) => {
                if (runMetadataStorage && threadId) {
                    const runId = runMetadataStorage.getItem(`lg:stream:${threadId}`);
                    if (runId) {
                        client.runs.cancel(threadId, runId);
                    }
                    runMetadataStorage.removeItem(`lg:stream:${threadId}`);
                }
                options.onStop?.(args);
            },
        });
    }, [stream, historyValues, runMetadataStorage, threadId, client, options]);

    // -------------------------------------------------------------------------
    // Actions: Submit
    // -------------------------------------------------------------------------
    const submit = useCallback(
        async (
            values: GetUpdateType<Bag, StateType> | null | undefined,
            submitOptions?: SubmitOptions<StateType, GetConfigurableType<Bag>>
        ) => {
            const checkpointId = submitOptions?.checkpoint?.checkpoint_id;
            setBranch(
                checkpointId != null
                    ? branchContext.branchByCheckpoint[checkpointId]?.branch ?? ""
                    : ""
            );

            const includeImplicitBranch =
                historyLimit === true || typeof historyLimit === "number";
            const shouldRefetch = options.onFinish != null || includeImplicitBranch;

            // Set optimistic values
            stream.setStreamValues(() => {
                const prev = shouldRefetch
                    ? historyValues
                    : { ...historyValues, ...stream.values };

                if (submitOptions?.optimisticValues != null) {
                    return {
                        ...prev,
                        ...(typeof submitOptions.optimisticValues === "function"
                            ? submitOptions.optimisticValues(prev)
                            : submitOptions.optimisticValues),
                    };
                }
                return { ...prev };
            });

            let callbackMeta: { run_id: string; thread_id: string } | undefined;
            let rejoinKey: `lg:stream:${string}` | undefined;
            let usableThreadId = threadId;

            await stream.start(
                async (signal) => {
                    // Create thread if needed
                    if (!usableThreadId) {
                        const thread = await client.threads.create({
                            threadId: submitOptions?.threadId,
                            metadata: submitOptions?.metadata,
                        });
                        usableThreadId = thread.thread_id;
                        threadIdRef.current = usableThreadId;
                        threadIdStreamingRef.current = usableThreadId;
                        onThreadId(usableThreadId);
                    }

                    if (!usableThreadId) {
                        throw new Error("Failed to obtain valid thread ID.");
                    }

                    threadIdStreamingRef.current = usableThreadId;

                    // Build stream modes
                    const streamMode = unique([
                        ...(submitOptions?.streamMode ?? []),
                        ...trackStreamModeRef.current,
                        ...callbackStreamMode,
                    ]);

                    // Calculate checkpoint
                    let checkpoint =
                        submitOptions?.checkpoint ??
                        (includeImplicitBranch ? branchContext.threadHead?.checkpoint : undefined) ??
                        undefined;

                    if (submitOptions?.checkpoint === null) checkpoint = undefined;
                    if (checkpoint != null) delete (checkpoint as { thread_id?: string }).thread_id;

                    const streamResumable = submitOptions?.streamResumable ?? !!runMetadataStorage;

                    // Start the stream
                    return client.runs.stream(usableThreadId, options.assistantId, {
                        input: values,
                        config: submitOptions?.config,
                        context: submitOptions?.context,
                        command: submitOptions?.command,
                        interruptBefore: submitOptions?.interruptBefore,
                        interruptAfter: submitOptions?.interruptAfter,
                        metadata: submitOptions?.metadata,
                        multitaskStrategy: submitOptions?.multitaskStrategy,
                        onCompletion: submitOptions?.onCompletion,
                        onDisconnect: submitOptions?.onDisconnect ?? (streamResumable ? "continue" : "cancel"),
                        signal,
                        checkpoint,
                        streamMode,
                        streamSubgraphs: submitOptions?.streamSubgraphs,
                        streamResumable,
                        durability: submitOptions?.durability,
                        onRunCreated(params: { run_id: string; thread_id?: string }) {
                            callbackMeta = {
                                run_id: params.run_id,
                                thread_id: params.thread_id ?? usableThreadId!,
                            };
                            if (runMetadataStorage) {
                                rejoinKey = `lg:stream:${usableThreadId}`;
                                runMetadataStorage.setItem(rejoinKey, callbackMeta.run_id);
                            }
                            options.onCreated?.(callbackMeta);
                        },
                    });
                },
                {
                    getMessages,
                    setMessages,
                    initialValues: historyValues,
                    callbacks: options,
                    async onSuccess() {
                        if (rejoinKey) runMetadataStorage?.removeItem(rejoinKey);
                        if (shouldRefetch) {
                            const newHistory = await history.mutate(usableThreadId ?? undefined);
                            const lastHead = newHistory?.at(0);
                            if (lastHead) {
                                options.onFinish?.(lastHead, callbackMeta);
                                return null;
                            }
                        }
                        return undefined;
                    },
                    onError(error) {
                        options.onError?.(error, callbackMeta);
                    },
                    onFinish() {
                        threadIdStreamingRef.current = null;
                    },
                }
            );
        },
        [
            branchContext,
            historyLimit,
            historyValues,
            threadId,
            client,
            options,
            stream,
            runMetadataStorage,
            onThreadId,
            callbackStreamMode,
            getMessages,
            setMessages,
            history,
        ]
    );

    // -------------------------------------------------------------------------
    // Actions: Join Stream
    // -------------------------------------------------------------------------
    const joinStream = useCallback(
        async (
            runId: string,
            lastEventId?: string,
            joinOptions?: { streamMode?: string | string[] }
        ) => {
            const eventId = lastEventId ?? "-1";
            if (!threadId) return;

            const callbackMeta = { thread_id: threadId, run_id: runId };

            await stream.start(
                async (signal) => {
                    threadIdStreamingRef.current = threadId;
                    return client.runs.joinStream(threadId, runId, {
                        signal,
                        lastEventId: eventId,
                        streamMode: joinOptions?.streamMode,
                    });
                },
                {
                    getMessages,
                    setMessages,
                    initialValues: historyValues,
                    callbacks: options,
                    async onSuccess() {
                        runMetadataStorage?.removeItem(`lg:stream:${threadId}`);
                        const newHistory = await history.mutate(threadId);
                        const lastHead = newHistory?.at(0);
                        if (lastHead) options.onFinish?.(lastHead, callbackMeta);
                    },
                    onError(error) {
                        options.onError?.(error, callbackMeta);
                    },
                    onFinish() {
                        threadIdStreamingRef.current = null;
                    },
                }
            );
        },
        [
            threadId,
            stream,
            client,
            getMessages,
            setMessages,
            historyValues,
            options,
            runMetadataStorage,
            history,
        ]
    );

    // -------------------------------------------------------------------------
    // Reconnection Logic
    // -------------------------------------------------------------------------
    const reconnectKey = useMemo(() => {
        if (!runMetadataStorage || stream.isLoading) return undefined;
        if (typeof window === "undefined") return undefined;
        const runId = runMetadataStorage?.getItem(`lg:stream:${threadId}`);
        if (!runId) return undefined;
        return { runId, threadId };
    }, [runMetadataStorage, stream.isLoading, threadId]);

    const shouldReconnect = !!runMetadataStorage;
    const reconnectRef = useRef({ threadId, shouldReconnect });
    const joinStreamRef = useRef(joinStream);
    joinStreamRef.current = joinStream;

    useEffect(() => {
        if (reconnectRef.current.threadId !== threadId) {
            reconnectRef.current = { threadId, shouldReconnect };
        }
    }, [threadId, shouldReconnect]);

    useEffect(() => {
        if (reconnectKey && reconnectRef.current.shouldReconnect) {
            reconnectRef.current.shouldReconnect = false;
            joinStreamRef.current?.(reconnectKey.runId);
        }
    }, [reconnectKey]);

    // -------------------------------------------------------------------------
    // Return Value
    // -------------------------------------------------------------------------
    const error = stream.error ?? historyError ?? history.error;
    const values = (stream.values ?? historyValues) as StateType;

    return {
        get values() {
            trackStreamMode("values");
            return values;
        },

        client,
        assistantId: options.assistantId,
        error,
        isLoading: stream.isLoading,
        stop,
        submit: submit as UseStream<StateType, Bag>["submit"],
        joinStream,

        branch,
        setBranch,

        get history() {
            if (historyLimit === false) {
                throw new Error("`fetchStateHistory` must be set to `true` to use `history`");
            }
            return branchContext.flatHistory;
        },

        isThreadLoading: history.isLoading && history.data == null,

        get interrupt() {
            // Check for interrupt in values
            if (
                values != null &&
                "__interrupt__" in values &&
                Array.isArray((values as Record<string, unknown>).__interrupt__)
            ) {
                const valueInterrupts = (values as Record<string, unknown>).__interrupt__ as unknown[];
                if (valueInterrupts.length === 0) return { when: "breakpoint" } as never;
                if (valueInterrupts.length === 1) return valueInterrupts[0] as never;
                return valueInterrupts as never;
            }

            if (stream.isLoading) return undefined;

            const interrupts = branchContext.threadHead?.tasks?.at(-1)?.interrupts;
            if (interrupts == null || interrupts.length === 0) {
                const next = branchContext.threadHead?.next ?? [];
                if (!next.length || error != null) return undefined;
                return { when: "breakpoint" } as never;
            }

            return interrupts.at(-1) as never;
        },

        get messages() {
            trackStreamMode("messages-tuple", "values");
            return getMessages(values);
        },

        getMessagesMetadata(message: Message, index?: number) {
            trackStreamMode("values");
            const streamMetadata = messageManager.get(message.id)?.metadata;
            const historicalMetadata = messageMetadata?.find(
                (m) => m.messageId === (message.id ?? String(index))
            );

            if (streamMetadata != null || historicalMetadata != null) {
                return {
                    ...historicalMetadata,
                    streamMetadata,
                } as MessageMetadata<StateType>;
            }

            return undefined;
        },
    };
}
