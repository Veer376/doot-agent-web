/**
 * Thread Source Types
 * 
 * Unified types for local (Electron/OpenWork) and cloud (Orbit API) threads.
 * These types enable the abstraction layer that allows the frontend to work
 * with both local and cloud agents seamlessly.
 */

/**
 * Source of the thread - determines which backend handles it
 */
export type ThreadSource = 'local' | 'cloud';

/**
 * Thread status matching LangGraph conventions
 */
export type ThreadStatus = 'idle' | 'busy' | 'interrupted' | 'error';

/**
 * Unified thread metadata that works for both local and cloud
 */
export interface UnifiedThreadMetadata {
    /** Source of the thread (local or cloud) */
    source: ThreadSource;
    /** Assistant/Agent ID used for this thread */
    assistant_id?: string;
    /** Mode of interaction */
    mode?: 'agent' | 'chat';
    /** Workspace path (local threads only) */
    workspacePath?: string;
    /** Model ID override (local threads only) */
    modelId?: string;
    /** Thread name/title */
    name?: string;
    /** Whether thread is pinned */
    pinned?: boolean;
    /** Any additional metadata */
    [key: string]: unknown;
}

/**
 * Unified thread interface that works for both local and cloud threads
 */
export interface UnifiedThread {
    /** Unique thread identifier */
    thread_id: string;
    /** When the thread was created */
    created_at: Date;
    /** When the thread was last updated */
    updated_at: Date;
    /** Thread title */
    title?: string;
    /** Current thread status */
    status: ThreadStatus;
    /** Thread metadata including source */
    metadata: UnifiedThreadMetadata;
    /** Thread values (state snapshot) */
    values?: Record<string, unknown>;
}

/**
 * Options for creating a new thread
 */
export interface CreateThreadOptions {
    /** Source for the new thread */
    source: ThreadSource;
    /** Initial metadata */
    metadata?: Partial<UnifiedThreadMetadata>;
    /** Initial title */
    title?: string;
}

/**
 * Options for updating a thread
 */
export interface UpdateThreadOptions {
    /** Thread ID to update */
    threadId: string;
    /** Metadata updates */
    metadata?: Partial<UnifiedThreadMetadata>;
    /** Title update */
    title?: string;
    /** Status update */
    status?: ThreadStatus;
}

/**
 * Helper to determine thread source from metadata
 */
export function getThreadSource(thread: { metadata?: { source?: ThreadSource } }): ThreadSource {
    return thread.metadata?.source ?? 'cloud';
}

/**
 * Helper to check if thread is local
 */
export function isLocalThread(thread: { metadata?: { source?: ThreadSource } }): boolean {
    return getThreadSource(thread) === 'local';
}

/**
 * Helper to check if thread is cloud
 */
export function isCloudThread(thread: { metadata?: { source?: ThreadSource } }): boolean {
    return getThreadSource(thread) === 'cloud';
}
