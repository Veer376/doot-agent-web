"use client";

/**
 * Custom Stream Hook
 * 
 * A custom implementation of the LangGraph SDK's useStream hook
 * with modifications for improved branching support and future enhancements.
 * 
 * Usage:
 * ```tsx
 * import { useStream } from "@/hooks/stream";
 * 
 * const stream = useStream({
 *   apiUrl: "...",
 *   assistantId: "...",
 *   threadId: "...",
 *   // ... other options
 * });
 * ```
 */

// Main hook
export { useStream } from "./use-stream";

// Types
export type {
    UseStreamOptions,
    UseStream,
    MessageMetadata,
    SubmitOptions,
    BagTemplate,
    GetUpdateType,
    GetConfigurableType,
    GetInterruptType,
    GetCustomEventType,
    RunCallbackMeta,
    MutateFn,
    Command,
    ConfigWithConfigurable,
    RunMetadataStorage,
    BranchNode,
    BranchFork,
    BranchSequence,
    BranchInfo,
    BranchContext,
    StreamState,
    StreamStartOptions,
    UseThreadHistoryState,
} from "./types";

// Utilities (for advanced use cases)
export { getBranchContext, PATH_SEP, ROOT_ID } from "./branching";
export { StreamManager } from "./stream-manager";
export { MessageTupleManager } from "./message-manager";
export { findLast, unique, getClientConfigHash } from "./utils";
