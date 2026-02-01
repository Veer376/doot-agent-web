"use client";

import { useMutation, useQuery, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthSession } from "@/providers/Auth";
import { createClient } from "@/lib/client";
import type { Thread } from "@langchain/langgraph-sdk";
import { config } from "@/config";
import { useLocalThreads, useLocalThreadState, useUpdateLocalThread } from "./use-local-threads";

// Query key factory for type-safe cache management
export const cloudThreadKeys = {
  all: ["threads"] as const,
  lists: () => [...cloudThreadKeys.all, "list"] as const,
  list: (filters?: { agentId?: string; limit?: number; offset?: number }) =>
    [...cloudThreadKeys.lists(), filters] as const,
  detail: (id: string) => [...cloudThreadKeys.all, "detail", id] as const,
  state: (id: string | null) => [...cloudThreadKeys.all, "state", id] as const,
};

// Type for thread metadata
export interface ThreadMetadata {
  assistant_id?: string;  // Which agent to use
  mode?: "agent" | "chat";  // UI mode (agent mode vs chat mode)
  name?: string;  // Custom thread name
  pinned?: boolean;  // Whether the thread is pinned
  [key: string]: unknown;
}

// Hook to fetch all threads (or filtered by agent)
export function useFetchCloudThreads(agentId?: string, options?: { limit?: number; offset?: number }) {
  const { session } = useAuthSession();
  const accessToken = session?.accessToken;
  const limit = options?.limit || 100;
  const offset = options?.offset || 0;

  return useQuery({
    queryKey: cloudThreadKeys.list({ agentId, limit, offset }),
    queryFn: async () => {
      
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      
      const client = createClient(accessToken);
      const response = await client.threads.search({
        limit,
        offset,
        ...(agentId && {
          metadata: {
            assistant_id: agentId,
          },
        }),
      });
      return response as Thread<ThreadMetadata>[];
    },
    enabled: !!accessToken,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook to fetch threads with infinite scroll pagination
export function useFetchCloudThreadsInfinite(agentId?: string, pageSize = 20) {
  const { session } = useAuthSession();
  const accessToken = session?.accessToken;

  return useInfiniteQuery({
    queryKey: [...cloudThreadKeys.lists(), { agentId, pageSize }] as const,
    queryFn: async ({ pageParam = 0 }) => {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      const client = createClient(accessToken);
      const response = await client.threads.search({
        limit: pageSize,
        offset: pageParam,
        ...(agentId && {
          metadata: {
            assistant_id: agentId,
          },
        }),
      });
      return response as Thread<ThreadMetadata>[];
    },
    getNextPageParam: (lastPage, allPages) => {
      // If the last page has fewer items than pageSize, we've reached the end
      if (lastPage.length < pageSize) {
        return undefined;
      }
      // Otherwise, return the offset for the next page
      return allPages.length * pageSize;
    },
    initialPageParam: 0,
    enabled: !!accessToken,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook to fetch thread state for cached display with initialValues
// This enables instant thread loading by showing cached data immediately
// while the SDK loads fresh data in the background
export function useFetchThreadState(threadId: string | null) {
  const { session } = useAuthSession();
  const accessToken = session?.accessToken;

  return useQuery({
    queryKey: cloudThreadKeys.state(threadId),
    queryFn: async () => {
      if (!threadId || !accessToken) {
        return null;
      }

      const client = createClient(accessToken);

      try {
        // Fetch the latest state (current checkpoint) for the thread
        const state = await client.threads.getState(threadId);
        return state;
      } catch (error) {
        // Return null instead of throwing to avoid error states for missing threads
        console.warn(`Failed to fetch state for thread ${threadId}:`, error);
        return null;
      }
    },
    enabled: !!threadId && !!accessToken,
    staleTime: 1000 * 60 * 5, // 5 minutes - match agents cache time for consistency
    gcTime: 1000 * 60 * 10, // 10 minutes - keep in cache for 10 mins after component unmount
    retry: false, // Don't retry on failure (thread might not exist yet)
  });
}

/**
 * Unified hook to fetch thread state - routes to IPC or HTTP based on thread source
 * This is the hook that components should use to automatically route to the correct backend
 * Follows OpenWork's pattern of checking thread metadata to determine routing
 */
export function useThreadState(threadId: string | null) {
  const { data: localThreads } = useLocalThreads();
  const { data: cloudThreads } = useFetchCloudThreads();
  
  // Check if this thread is local or cloud by examining metadata
  const allThreads = [...(localThreads || []), ...(cloudThreads || [])];
  const thread = allThreads.find(t => t.thread_id === threadId);
  const isLocal = thread?.metadata?.source === 'local';
  
  // Use local IPC for local threads
  const localState = useLocalThreadState(isLocal ? threadId : null);
  
  // Use HTTP for cloud threads
  const cloudState = useFetchThreadState(!isLocal ? threadId : null);
  
  // Return the appropriate state based on thread source
  return isLocal ? localState : cloudState;
}

/**
 * Unified hook to update thread - routes to IPC or HTTP based on thread source
 * Components should use this instead of useUpdateCloudThread directly
 */
export function useThreadUpdate() {
  const { data: localThreads } = useLocalThreads();
  const { data: cloudThreads } = useFetchCloudThreads();
  const { mutate: updateLocalThread } = useUpdateLocalThread();
  const { mutate: updateCloudThread } = useUpdateCloudThread();

  return useMutation({
    mutationFn: async ({
      threadId,
      metadata,
    }: {
      threadId: string;
      metadata: ThreadMetadata;
    }) => {
      console.log('[useThreadUpdate] ========================================');
      console.log('[useThreadUpdate] mutationFn called');
      console.log('[useThreadUpdate]   threadId:', threadId);
      console.log('[useThreadUpdate]   metadata:', metadata);
      console.log('[useThreadUpdate]   localThreads count:', localThreads?.length || 0);
      console.log('[useThreadUpdate]   cloudThreads count:', cloudThreads?.length || 0);

      // Check if this thread is local or cloud
      const allThreads = [...(localThreads || []), ...(cloudThreads || [])];
      console.log('[useThreadUpdate]   allThreads count:', allThreads.length);
      console.log('[useThreadUpdate]   allThreads:', allThreads.map(t => ({ id: t.thread_id, source: t.metadata?.source })));
      
      const thread = allThreads.find(t => t.thread_id === threadId);
      console.log('[useThreadUpdate]   thread found:', !!thread);
      console.log('[useThreadUpdate]   thread.metadata?.source:', thread?.metadata?.source);
      
      const isLocal = thread?.metadata?.source === 'local';
      console.log('[useThreadUpdate]   isLocal:', isLocal);

      if (isLocal) {
        console.log('[useThreadUpdate] Using IPC (local thread)');
        // For local threads, map metadata.name to title
        const updates: any = {};
        if (metadata.name !== undefined) {
          updates.title = metadata.name;
        }
        // Keep other metadata as-is
        const { name, ...otherMetadata } = metadata;
        if (Object.keys(otherMetadata).length > 0) {
          updates.metadata = otherMetadata;
        }
        
        console.log('[useThreadUpdate] Mapped updates for local thread:', updates);
        
        // Use IPC for local threads
        return new Promise((resolve, reject) => {
          updateLocalThread(
            { threadId, updates },
            {
              onSuccess: (data) => {
                console.log('[useThreadUpdate] IPC update success');
                resolve(data as any);
              },
              onError: (err) => {
                console.error('[useThreadUpdate] IPC update error:', err);
                reject(err);
              },
            }
          );
        });
      } else {
        console.log('[useThreadUpdate] Using HTTP (cloud thread or not found)');
        // Use HTTP for cloud threads
        return new Promise((resolve, reject) => {
          updateCloudThread(
            { threadId, metadata },
            {
              onSuccess: (data) => {
                console.log('[useThreadUpdate] HTTP update success');
                resolve(data);
              },
              onError: (err) => {
                console.error('[useThreadUpdate] HTTP update error:', err);
                reject(err);
              },
            }
          );
        });
      }
    },
  });
}

// Hook to create a new thread
export function useCreateCloudThread() {
  const { session } = useAuthSession();
  const queryClient = useQueryClient();
  const accessToken = session?.accessToken;

  return useMutation({
    mutationFn: async (metadata?: ThreadMetadata) => {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      const client = createClient(accessToken);
      const thread = await client.threads.create({
        metadata: metadata || {},
      });
      return thread as Thread<ThreadMetadata>;
    },
    onSuccess: () => {
      // Invalidate all thread lists to trigger refetch
      queryClient.invalidateQueries({ queryKey: cloudThreadKeys.lists() });
    },
  });
}

// Hook to update a thread
export function useUpdateCloudThread() {
  const { session } = useAuthSession();
  const queryClient = useQueryClient();
  const accessToken = session?.accessToken;

  return useMutation({
    mutationFn: async ({
      threadId,
      metadata,
    }: {
      threadId: string;
      metadata: ThreadMetadata;
    }) => {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      const client = createClient(accessToken);
      const thread = await client.threads.update(threadId, {
        metadata,
      });
      return thread as Thread<ThreadMetadata>;
    },
    onMutate: async ({ threadId, metadata }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: cloudThreadKeys.lists() });

      // Snapshot previous value for all infinite queries
      const previousInfiniteData = queryClient.getQueriesData({
        queryKey: cloudThreadKeys.lists(),
      });

      // Optimistically update thread metadata in InfiniteData structure
      queryClient.setQueriesData(
        { queryKey: cloudThreadKeys.lists() },
        (old: any) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((page: Thread<ThreadMetadata>[]) =>
              page.map((thread) =>
                thread.thread_id === threadId
                  ? {
                    ...thread,
                    metadata: { ...thread.metadata, ...metadata },
                  }
                  : thread
              )
            ),
          };
        }
      );

      return { previousInfiniteData };
    },
    onError: (err, { threadId }, context) => {
      // Rollback on error
      if (context?.previousInfiniteData) {
        context.previousInfiniteData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      // Refetch after error or success
      queryClient.invalidateQueries({ queryKey: cloudThreadKeys.lists() });
    },
  });
}

// Hook to copy a thread
export function useCopyThread() {
  const { session } = useAuthSession();
  const queryClient = useQueryClient();
  const accessToken = session?.accessToken;

  return useMutation({
    mutationFn: async (threadId: string) => {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      const apiUrl = config.apiUrl;

      const response = await fetch(`${apiUrl}/threads/${threadId}/copy`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-supabase-access-token": accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to copy thread: ${response.statusText} - ${errorText}`);
      }

      return (await response.json()) as Thread<ThreadMetadata>;
    },
    onSuccess: (newThread) => {
      // Invalidate and refetch thread lists to show the new copied thread
      queryClient.invalidateQueries({ queryKey: cloudThreadKeys.lists() });
    },
    onError: (error) => {
      console.error("Failed to copy thread:", error);
      // TODO: Show error toast
    },
  });
}

// Hook to delete a thread with undo support
export function useDeleteCloudThread() {
  const { session } = useAuthSession();
  const queryClient = useQueryClient();
  const accessToken = session?.accessToken;

  return useMutation({
    mutationFn: async ({ threadId, skipToast }: { threadId: string; skipToast?: boolean }) => {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      // Don't actually delete from DB yet - that happens after timeout
      // This function will be called again from the timeout if undo isn't clicked
      if (skipToast) {
        const client = createClient(accessToken);
        await client.threads.delete(threadId);
      }
    },
    onMutate: async ({ threadId, skipToast }) => {
      // Only do optimistic update for the initial deletion (skipToast: false)
      // Don't do it for the actual deletion (skipToast: true)
      if (!skipToast) {
        // Cancel outgoing refetches
        await queryClient.cancelQueries({ queryKey: cloudThreadKeys.lists() });

        // Snapshot previous value for all infinite queries
        const previousInfiniteData = queryClient.getQueriesData({
          queryKey: cloudThreadKeys.lists(),
        });

        // Optimistically remove thread from InfiniteData structure
        queryClient.setQueriesData(
          { queryKey: cloudThreadKeys.lists() },
          (old: any) => {
            if (!old?.pages) return old;
            return {
              ...old,
              pages: old.pages.map((page: Thread<ThreadMetadata>[]) =>
                page.filter((thread) => thread.thread_id !== threadId)
              ),
            };
          }
        );

        return { previousInfiniteData };
      }
      return {};
    },
    onError: (err, { threadId }, context) => {
      // Rollback on error
      if (context?.previousInfiniteData) {
        context.previousInfiniteData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: (data, error, { skipToast }) => {
      // Only refetch when actually deleting (skipToast: true), not during optimistic removal
      if (skipToast) {
        queryClient.invalidateQueries({ queryKey: cloudThreadKeys.lists() });
      }
    },
  });
}

// Hook to delete messages from a checkpoint onwards (rollback)
export function useDeleteFromCheckpoint() {
  const { session } = useAuthSession();
  const accessToken = session?.accessToken;

  return useMutation({
    mutationFn: async ({
      threadId,
      checkpointId,
    }: {
      threadId: string;
      checkpointId: string;
    }) => {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      const apiUrl = config.apiUrl;

      const response = await fetch(
        `${apiUrl}/threads/${threadId}/checkpoints/${checkpointId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "x-supabase-access-token": accessToken,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to delete checkpoint: ${response.statusText} - ${errorText}`
        );
      }
    },
  });
}
