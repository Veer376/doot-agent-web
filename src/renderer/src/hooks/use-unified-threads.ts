"use client";

/**
 * Unified Threads Hook
 * 
 * Aggregates threads from both local (Electron) and cloud (API) sources
 * into a single sorted list. This is the primary hook for the thread list UI.
 */

import { useMemo } from "react";
import { useFetchThreads, useFetchThreadsInfinite } from "@/hooks/use-threads";
import { useLocalThreads } from "@/hooks/use-local-threads";
import { isElectron } from "@/lib/electron";
import type { UnifiedThread, ThreadSource } from "@/lib/thread-source";
import type { Thread } from "@langchain/langgraph-sdk";

/**
 * Transform cloud thread to UnifiedThread format
 */
function transformCloudThread(thread: Thread): UnifiedThread {
    const metadata = (thread.metadata || {}) as Record<string, unknown>;
    return {
        thread_id: thread.thread_id,
        created_at: new Date(thread.created_at),
        updated_at: new Date(thread.updated_at),
        title: (metadata.name as string) || undefined,
        status: (thread.status as UnifiedThread['status']) || 'idle',
        metadata: {
            source: 'cloud',
            assistant_id: metadata.assistant_id as string | undefined,
            mode: metadata.mode as 'agent' | 'chat' | undefined,
            name: metadata.name as string | undefined,
            pinned: metadata.pinned as boolean | undefined,
            ...metadata,
        },
        values: thread.values as Record<string, unknown> | undefined,
    };
}

/**
 * Options for the unified threads hook
 */
export interface UseUnifiedThreadsOptions {
    /** Filter by source (optional - returns all if not specified) */
    source?: ThreadSource;
    /** Filter by agent ID */
    agentId?: string;
    /** Maximum threads to fetch per source */
    limit?: number;
}

/**
 * Hook that fetches threads from both local and cloud sources
 * and merges them into a single sorted list.
 */
export function useUnifiedThreads(options?: UseUnifiedThreadsOptions) {
    const { source, agentId, limit } = options || {};
    const isElectronEnv = isElectron();

    // Fetch cloud threads (always enabled unless source is 'local')
    const cloudQuery = useFetchThreads(agentId, {
        limit: limit || 50,
    });

    // Fetch local threads (only in Electron, unless source is 'cloud')
    const localQuery = useLocalThreads({
        limit: limit || 50
    });

    // Merge and sort threads
    const threads = useMemo(() => {
        const cloudThreads: UnifiedThread[] =
            source !== 'local' && cloudQuery.data
                ? cloudQuery.data.map(transformCloudThread)
                : [];

        const localThreads: UnifiedThread[] =
            source !== 'cloud' && isElectronEnv && localQuery.data
                ? localQuery.data
                : [];

        // Merge and sort by updated_at (newest first)
        return [...cloudThreads, ...localThreads].sort(
            (a, b) => b.updated_at.getTime() - a.updated_at.getTime()
        );
    }, [cloudQuery.data, localQuery.data, source, isElectronEnv]);

    // Filter by agentId if specified
    const filteredThreads = useMemo(() => {
        if (!agentId) return threads;
        return threads.filter(t => t.metadata.assistant_id === agentId);
    }, [threads, agentId]);

    return {
        threads: filteredThreads,
        isLoading: cloudQuery.isLoading || (isElectronEnv && localQuery.isLoading),
        isError: cloudQuery.isError || localQuery.isError,
        error: cloudQuery.error || localQuery.error,
        refetch: async () => {
            await Promise.all([
                cloudQuery.refetch(),
                isElectronEnv ? localQuery.refetch() : Promise.resolve(),
            ]);
        },
    };
}

/**
 * Get a thread by ID from either source
 */
export function useUnifiedThread(threadId: string | null, source?: ThreadSource) {
    const threads = useUnifiedThreads({ source });

    return useMemo(() => {
        if (!threadId) return null;
        return threads.threads.find(t => t.thread_id === threadId) || null;
    }, [threads.threads, threadId]);
}

/**
 * Hook that provides thread counts by source
 */
export function useThreadCounts() {
    const { threads } = useUnifiedThreads();

    return useMemo(() => ({
        total: threads.length,
        local: threads.filter(t => t.metadata.source === 'local').length,
        cloud: threads.filter(t => t.metadata.source === 'cloud').length,
    }), [threads]);
}
