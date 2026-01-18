"use client";

/**
 * Custom Stream Hook Types
 * 
 * Ported from @langchain/langgraph-sdk/react with modifications
 * for custom branching logic.
 */

import type {
    Checkpoint,
    Config,
    Interrupt,
    Metadata,
    ThreadState
} from "@langchain/langgraph-sdk";
import type { Message } from "@langchain/langgraph-sdk";
import type { Client, ClientConfig } from "@langchain/langgraph-sdk";

// ============================================================================
// Core Types
// ============================================================================

/**
 * Metadata associated with a message in the stream.
 */
export interface MessageMetadata<StateType extends Record<string, unknown>> {
    /** The ID of the message. */
    messageId: string;
    /** The first thread state the message was seen in. */
    firstSeenState: ThreadState<StateType> | undefined;
    /** The branch of the message (checkpoint path). */
    branch: string | undefined;
    /** List of branches this message is part of - for branching controls. */
    branchOptions: string[] | undefined;
    /** Metadata sent during streaming (temporary, not persisted). */
    streamMetadata: Record<string, unknown> | undefined;
}

/**
 * Template for generic type bag.
 */
export interface BagTemplate {
    ConfigurableType?: Record<string, unknown>;
    InterruptType?: unknown;
    CustomEventType?: unknown;
    UpdateType?: unknown;
}

/**
 * Extract UpdateType from Bag or default to Partial<StateType>.
 */
export type GetUpdateType<
    Bag extends BagTemplate,
    StateType extends Record<string, unknown>
> = Bag extends { UpdateType: unknown }
    ? Bag["UpdateType"]
    : Partial<StateType>;

/**
 * Extract ConfigurableType from Bag.
 */
export type GetConfigurableType<Bag extends BagTemplate> =
    Bag extends { ConfigurableType: Record<string, unknown> }
    ? Bag["ConfigurableType"]
    : Record<string, unknown>;

/**
 * Extract InterruptType from Bag.
 */
export type GetInterruptType<Bag extends BagTemplate> =
    Bag extends { InterruptType: unknown }
    ? Bag["InterruptType"]
    : unknown;

/**
 * Extract CustomEventType from Bag.
 */
export type GetCustomEventType<Bag extends BagTemplate> =
    Bag extends { CustomEventType: unknown }
    ? Bag["CustomEventType"]
    : unknown;

// ============================================================================
// Callback Types
// ============================================================================

/**
 * Metadata passed to run callbacks.
 */
export interface RunCallbackMeta {
    run_id: string;
    thread_id: string;
}

/**
 * Mutate function for updating state.
 */
export type MutateFn<StateType> = (
    update: Partial<StateType> | ((prev: StateType) => Partial<StateType>)
) => void;

// ============================================================================
// Options Types
// ============================================================================

/**
 * Options for the useStream hook.
 */
export interface UseStreamOptions<
    StateType extends Record<string, unknown> = Record<string, unknown>,
    Bag extends BagTemplate = BagTemplate
> {
    /** The ID of the assistant to use. */
    assistantId: string;

    /** Client used to send requests. */
    client?: Client;

    /** The URL of the API to use. */
    apiUrl?: ClientConfig["apiUrl"];

    /** The API key to use. */
    apiKey?: ClientConfig["apiKey"];

    /** Custom call options, such as custom fetch implementation. */
    callerOptions?: ClientConfig["callerOptions"];

    /** Default headers to send with requests. */
    defaultHeaders?: ClientConfig["defaultHeaders"];

    /** Key within state that contains messages. @default "messages" */
    messagesKey?: string;

    /** Callback when an error occurs. */
    onError?: (error: unknown, run: RunCallbackMeta | undefined) => void;

    /** Callback when the stream is finished. */
    onFinish?: (state: ThreadState<StateType>, run: RunCallbackMeta | undefined) => void;

    /** Callback when a new stream is created. */
    onCreated?: (run: RunCallbackMeta) => void;

    /** Callback when an update event is received. */
    onUpdateEvent?: (
        data: unknown,
        options: { namespace: string[] | undefined; mutate: MutateFn<StateType> }
    ) => void;

    /** Callback when a custom event is received. */
    onCustomEvent?: (
        data: GetCustomEventType<Bag>,
        options: { namespace: string[] | undefined; mutate: MutateFn<StateType> }
    ) => void;

    /** Callback when a metadata event is received. */
    onMetadataEvent?: (data: unknown) => void;

    /** Callback when a LangChain event is received. */
    onLangChainEvent?: (data: unknown) => void;

    /** Callback when a debug event is received. @internal */
    onDebugEvent?: (data: unknown, options: { namespace: string[] | undefined }) => void;

    /** Callback when a checkpoints event is received. */
    onCheckpointEvent?: (data: unknown, options: { namespace: string[] | undefined }) => void;

    /** Callback when a tasks event is received. */
    onTaskEvent?: (data: unknown, options: { namespace: string[] | undefined }) => void;

    /** Callback when the stream is stopped by the user. */
    onStop?: (options: { mutate: MutateFn<StateType> }) => void;

    /** The ID of the thread to fetch history from. */
    threadId?: string | null;

    /** Callback when the thread ID is updated. */
    onThreadId?: (threadId: string) => void;

    /** Will reconnect the stream on mount. */
    reconnectOnMount?: boolean | (() => RunMetadataStorage);

    /** Initial values to display immediately when loading a thread. */
    initialValues?: StateType | null;

    /** Whether to fetch the history of the thread. @default true */
    fetchStateHistory?: boolean | { limit: number };
}

/**
 * Storage for run metadata (for reconnection).
 */
export interface RunMetadataStorage {
    getItem(key: `lg:stream:${string}`): string | null;
    setItem(key: `lg:stream:${string}`, value: string): void;
    removeItem(key: `lg:stream:${string}`): void;
}

// ============================================================================
// Submit Options
// ============================================================================

/**
 * Config with configurable property.
 */
export type ConfigWithConfigurable<ConfigurableType extends Record<string, unknown>> =
    Config & { configurable?: ConfigurableType };

/**
 * Command type for resuming from interrupt.
 */
export interface Command {
    resume?: unknown;
    update?: Record<string, unknown>;
    goto?: string | string[];
}

/**
 * Options for the submit function.
 */
export interface SubmitOptions<
    StateType extends Record<string, unknown> = Record<string, unknown>,
    ConfigurableType extends Record<string, unknown> = Record<string, unknown>
> {
    config?: ConfigWithConfigurable<ConfigurableType>;
    context?: ConfigurableType;
    checkpoint?: Omit<Checkpoint, "thread_id"> | null;
    command?: Command;
    interruptBefore?: "*" | string[];
    interruptAfter?: "*" | string[];
    metadata?: Metadata;
    multitaskStrategy?: "reject" | "rollback" | "interrupt" | "enqueue";
    onCompletion?: "keep" | "delete";
    onDisconnect?: "cancel" | "continue";
    feedbackKeys?: string[];
    streamMode?: string[];
    optimisticValues?: Partial<StateType> | ((prev: StateType) => Partial<StateType>);
    /** Stream nodes of subgraphs. @default false */
    streamSubgraphs?: boolean;
    /** Mark stream as resumable. @default false */
    streamResumable?: boolean;
    /** Checkpoint strategy. @default "async" */
    durability?: "async" | "sync" | "exit";
    /** Thread ID for new thread creation. */
    threadId?: string;
}

// ============================================================================
// Return Type
// ============================================================================

/**
 * Return type of the useStream hook.
 */
export interface UseStream<
    StateType extends Record<string, unknown> = Record<string, unknown>,
    Bag extends BagTemplate = BagTemplate
> {
    /** Current values of the thread. */
    values: StateType;

    /** Last seen error from the thread or during streaming. */
    error: unknown;

    /** Whether the stream is currently running. */
    isLoading: boolean;

    /** Whether the thread is currently being loaded. */
    isThreadLoading: boolean;

    /** Stops the stream. */
    stop: () => Promise<void>;

    /** Create and stream a run to the thread. */
    submit: (
        values: GetUpdateType<Bag, StateType> | null | undefined,
        options?: SubmitOptions<StateType, GetConfigurableType<Bag>>
    ) => Promise<void>;

    /** Current branch of the thread. */
    branch: string;

    /** Set the branch of the thread. */
    setBranch: (branch: string) => void;

    /** Flattened history of thread states. */
    history: ThreadState<StateType>[];

    /** Get the interrupt value if interrupted. */
    interrupt: Interrupt<GetInterruptType<Bag>> | undefined;

    /** Messages inferred from the thread. */
    messages: Message[];

    /** Get metadata for a message. */
    getMessagesMetadata: (
        message: Message,
        index?: number
    ) => MessageMetadata<StateType> | undefined;

    /** LangGraph SDK client. */
    client: Client;

    /** The assistant ID. */
    assistantId: string;

    /** Join an active stream. */
    joinStream: (
        runId: string,
        lastEventId?: string,
        options?: { streamMode?: string | string[] }
    ) => Promise<void>;
}

// ============================================================================
// Branching Types
// ============================================================================

/**
 * A node in the branch tree.
 */
export interface BranchNode<StateType extends Record<string, unknown>> {
    type: "node";
    value: ThreadState<StateType>;
    path: string[];
}

/**
 * A fork point in the branch tree.
 */
export interface BranchFork<StateType extends Record<string, unknown>> {
    type: "fork";
    items: BranchSequence<StateType>[];
}

/**
 * A sequence of nodes/forks.
 */
export interface BranchSequence<StateType extends Record<string, unknown>> {
    type: "sequence";
    items: (BranchNode<StateType> | BranchFork<StateType>)[];
}

/**
 * Branch info for a checkpoint.
 */
export interface BranchInfo {
    branch: string;
    branchOptions: string[];
}

/**
 * Context for branch calculations.
 */
export interface BranchContext<StateType extends Record<string, unknown>> {
    branchTree: BranchSequence<StateType>;
    flatHistory: ThreadState<StateType>[];
    branchByCheckpoint: Record<string, BranchInfo>;
    threadHead: ThreadState<StateType> | undefined;
}

// ============================================================================
// Stream Manager Types
// ============================================================================

/**
 * State managed by StreamManager.
 */
export interface StreamState<StateType extends Record<string, unknown>> {
    values: StateType | null;
    error: unknown;
    isLoading: boolean;
}

/**
 * Options for starting a stream.
 */
export interface StreamStartOptions<StateType extends Record<string, unknown>> {
    getMessages: (value: StateType) => Message[];
    setMessages: (current: StateType, messages: Message[]) => StateType;
    initialValues: StateType;
    callbacks: UseStreamOptions<StateType>;
    onSuccess: () => Promise<StateType | null | undefined>;
    onError: (error: unknown) => void;
    onFinish: () => void;
}

/**
 * Thread history hook state.
 */
export interface UseThreadHistoryState<StateType extends Record<string, unknown>> {
    data: ThreadState<StateType>[] | null | undefined;
    error: unknown;
    isLoading: boolean;
    mutate: (mutateId?: string) => Promise<ThreadState<StateType>[] | null | undefined>;
}
