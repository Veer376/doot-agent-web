"use client";

import { useMutation, useQuery, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthSession } from "@/providers/Auth";
import { createClient } from "@/lib/client";
import type { Thread } from "@langchain/langgraph-sdk";
import { config } from "@/config";

// Query key factory for type-safe cache management
export const threadKeys = {
  all: ["threads"] as const,
  lists: () => [...threadKeys.all, "list"] as const,
  list: (filters?: { agentId?: string; limit?: number; offset?: number }) =>
    [...threadKeys.lists(), filters] as const,
  detail: (id: string) => [...threadKeys.all, "detail", id] as const,
  state: (id: string | null) => [...threadKeys.all, "state", id] as const,
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
export function useFetchThreads(agentId?: string, options?: { limit?: number; offset?: number }) {
  const { session } = useAuthSession();
  const accessToken = session?.accessToken;
  const limit = options?.limit || 100;
  const offset = options?.offset || 0;

  return useQuery({
    queryKey: threadKeys.list({ agentId, limit, offset }),
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
export function useFetchThreadsInfinite(agentId?: string, pageSize = 20) {
  const { session } = useAuthSession();
  const accessToken = session?.accessToken;

  return useInfiniteQuery({
    queryKey: [...threadKeys.lists(), { agentId, pageSize }] as const,
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
    queryKey: threadKeys.state(threadId),
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

// Hook to create a new thread
export function useCreateThread() {
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
      queryClient.invalidateQueries({ queryKey: threadKeys.lists() });
    },
  });
}

// Hook to update a thread
export function useUpdateThread() {
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
      await queryClient.cancelQueries({ queryKey: threadKeys.lists() });

      // Snapshot previous value for all infinite queries
      const previousInfiniteData = queryClient.getQueriesData({
        queryKey: threadKeys.lists(),
      });

      // Optimistically update thread metadata in InfiniteData structure
      queryClient.setQueriesData(
        { queryKey: threadKeys.lists() },
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
      queryClient.invalidateQueries({ queryKey: threadKeys.lists() });
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
      queryClient.invalidateQueries({ queryKey: threadKeys.lists() });
    },
    onError: (error) => {
      console.error("Failed to copy thread:", error);
      // TODO: Show error toast
    },
  });
}

// Hook to delete a thread with undo support
export function useDeleteThread() {
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
        await queryClient.cancelQueries({ queryKey: threadKeys.lists() });

        // Snapshot previous value for all infinite queries
        const previousInfiniteData = queryClient.getQueriesData({
          queryKey: threadKeys.lists(),
        });

        // Optimistically remove thread from InfiniteData structure
        queryClient.setQueriesData(
          { queryKey: threadKeys.lists() },
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
        queryClient.invalidateQueries({ queryKey: threadKeys.lists() });
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
