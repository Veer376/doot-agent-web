"use client";

/**
 * Local Threads Hook
 * 
 * Provides React Query hooks for managing local threads via Electron IPC.
 * Mirrors the API of use-threads.ts but communicates with the local SQLite
 * database through the Electron main process.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isElectron, invoke } from "@/lib/electron";
import type { UnifiedThread, ThreadStatus } from "@/lib/thread-source";

// Query key factory for local threads
export const localThreadKeys = {
    all: ["threads", "local"] as const,
    lists: () => [...localThreadKeys.all, "list"] as const,
    list: (filters?: { limit?: number }) => [...localThreadKeys.lists(), filters] as const,
    detail: (id: string) => [...localThreadKeys.all, "detail", id] as const,
    history: (id: string) => [...localThreadKeys.all, "history", id] as const,
};

/**
 * Raw thread data from Electron IPC
 */
interface LocalThreadRow {
    thread_id: string;
    created_at: string;
    updated_at: string;
    title?: string;
    status: ThreadStatus;
    metadata?: Record<string, unknown>;
    thread_values?: Record<string, unknown>;
}

/**
 * Transform raw IPC response to UnifiedThread format
 */
function transformThread(row: LocalThreadRow): UnifiedThread {
    return {
        thread_id: row.thread_id,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
        title: row.title,
        status: row.status || 'idle',
        metadata: {
            source: 'local',
            ...row.metadata,
        },
        values: row.thread_values,
    };
}

/**
 * Hook to fetch all local threads
 */
export function useLocalThreads(options?: { limit?: number }) {
    const isElectronEnv = isElectron();

    return useQuery({
        queryKey: localThreadKeys.list(options),
        queryFn: async (): Promise<UnifiedThread[]> => {
            if (!isElectronEnv) {
                return [];
            }
            const threads = await invoke<LocalThreadRow[]>('threads:list');
            const transformed = threads.map(transformThread);
            return transformed;
        },
        enabled: isElectronEnv,
        staleTime: 5000, // Cache for 5 seconds
    });
}

/**
 * Hook to fetch a single local thread
 */
export function useLocalThread(threadId: string | null) {
    const isElectronEnv = isElectron();

    return useQuery({
        queryKey: localThreadKeys.detail(threadId || ''),
        queryFn: async (): Promise<UnifiedThread | null> => {
            if (!isElectronEnv || !threadId) {
                return null;
            }
            const thread = await invoke<LocalThreadRow | null>('threads:get', threadId);
            return thread ? transformThread(thread) : null;
        },
        enabled: isElectronEnv && !!threadId,
    });
}

/**
 * Hook to fetch local thread history (checkpoints)
 */
export function useLocalThreadHistory(threadId: string | null) {
    const isElectronEnv = isElectron();

    return useQuery({
        queryKey: localThreadKeys.history(threadId || ''),
        queryFn: async () => {
            if (!isElectronEnv || !threadId) {
                return [];
            }
            return invoke<unknown[]>('threads:history', threadId);
        },
        enabled: isElectronEnv && !!threadId,
    });
}

/**
 * Hook to fetch local thread state (current checkpoint)
 * Mirrors useFetchThreadState but uses IPC
 * This follows OpenWork's pattern for local thread state management
 */
export function useLocalThreadState(threadId: string | null) {
    const isElectronEnv = isElectron();

    return useQuery({
        queryKey: [...localThreadKeys.all, "state", threadId] as const,
        queryFn: async () => {
            if (!isElectronEnv || !threadId) {
                return null;
            }
            try {
                const state = await invoke<any>('threads:getState', threadId);
                return state;
            } catch (error) {
                console.warn(`Failed to fetch local thread state for ${threadId}:`, error);
                return null;
            }
        },
        enabled: isElectronEnv && !!threadId,
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 10, // 10 minutes
        retry: false,
    });
}

/**
 * Hook to create a new local thread
 */
export function useCreateLocalThread() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (metadata?: Record<string, unknown>): Promise<UnifiedThread> => {
            const thread = await invoke<LocalThreadRow>('threads:create', metadata);
            return transformThread(thread);
        },
        onSuccess: () => {
            // Invalidate thread list to show new thread
            queryClient.invalidateQueries({ queryKey: localThreadKeys.lists() });
        },
    });
}

/**
 * Hook to update a local thread
 */
export function useUpdateLocalThread() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            threadId,
            updates,
        }: {
            threadId: string;
            updates: {
                title?: string;
                status?: ThreadStatus;
                metadata?: Record<string, unknown>;
            };
        }): Promise<UnifiedThread> => {
            const thread = await invoke<LocalThreadRow>('threads:update', { threadId, updates });
            return transformThread(thread);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: localThreadKeys.detail(variables.threadId) });
            queryClient.invalidateQueries({ queryKey: localThreadKeys.lists() });
        },
    });
}

/**
 * Hook to delete a local thread
 */
export function useDeleteLocalThread() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (threadId: string): Promise<void> => {
            await invoke('threads:delete', threadId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: localThreadKeys.lists() });
        },
    });
}

/**
 * Hook to generate a title for a thread
 */
export function useGenerateLocalTitle() {
    return useMutation({
        mutationFn: async (message: string): Promise<string> => {
            return invoke<string>('threads:generateTitle', message);
        },
    });
}
