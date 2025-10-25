"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/providers/Auth";
import { createClient } from "@/lib/client";
import type { Thread } from "@langchain/langgraph-sdk";

// Query key factory for type-safe cache management
export const threadKeys = {
  all: ["threads"] as const,
  lists: () => [...threadKeys.all, "list"] as const,
  list: (filters?: { agentId?: string }) =>
    [...threadKeys.lists(), filters] as const,
  detail: (id: string) => [...threadKeys.all, "detail", id] as const,
  state: (id: string | null) => [...threadKeys.all, "state", id] as const,
};

// Type for thread metadata
export interface ThreadMetadata {
  assistant_id?: string;  // Which agent to use
  mode?: "agent" | "chat";  // UI mode (agent mode vs chat mode)
  [key: string]: unknown;
}

// Hook to fetch all threads (or filtered by agent)
export function useFetchThreads(agentId?: string) {
  const { session } = useAuthContext();
  const accessToken = session?.accessToken;

  return useQuery({
    queryKey: threadKeys.list({ agentId }),
    queryFn: async () => {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      const client = createClient(accessToken);
      const response = await client.threads.search({
        limit: 100,
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

// Hook to fetch thread state for cached display with initialValues
// This enables instant thread loading by showing cached data immediately
// while the SDK loads fresh data in the background
export function useFetchThreadState(threadId: string | null) {
  const { session } = useAuthContext();
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
    staleTime: 1000 * 30, // 30 seconds - show cached data for 30s before refetching
    gcTime: 1000 * 60 * 10, // 10 minutes - keep in cache for 10 mins after component unmount
    retry: false, // Don't retry on failure (thread might not exist yet)
  });
}

// Hook to create a new thread
export function useCreateThread() {
  const { session } = useAuthContext();
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
  const { session } = useAuthContext();
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

      // Snapshot previous value
      const previousThreads = queryClient.getQueryData(threadKeys.lists());

      // Optimistically update thread metadata
      queryClient.setQueriesData(
        { queryKey: threadKeys.lists() },
        (old: Thread<ThreadMetadata>[] | undefined) =>
          old?.map((thread) =>
            thread.thread_id === threadId
              ? {
                ...thread,
                metadata: { ...thread.metadata, ...metadata },
              }
              : thread
          ) ?? []
      );

      return { previousThreads };
    },
    onError: (err, { threadId }, context) => {
      // Rollback on error
      if (context?.previousThreads) {
        queryClient.setQueryData(threadKeys.lists(), context.previousThreads);
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
  const { session } = useAuthContext();
  const queryClient = useQueryClient();
  const accessToken = session?.accessToken;

  return useMutation({
    mutationFn: async (threadId: string) => {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      if (!apiUrl) {
        throw new Error("API URL not configured");
      }

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

// Hook to delete a thread
export function useDeleteThread() {
  const { session } = useAuthContext();
  const queryClient = useQueryClient();
  const accessToken = session?.accessToken;

  return useMutation({
    mutationFn: async (threadId: string) => {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      const client = createClient(accessToken);
      await client.threads.delete(threadId);
    },
    onMutate: async (threadId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: threadKeys.lists() });

      // Snapshot previous value
      const previousThreads = queryClient.getQueryData(threadKeys.lists());

      // Optimistically update to remove thread
      queryClient.setQueriesData(
        { queryKey: threadKeys.lists() },
        (old: Thread<ThreadMetadata>[] | undefined) =>
          old?.filter((thread) => thread.thread_id !== threadId) ?? []
      );

      return { previousThreads };
    },
    onError: (err, threadId, context) => {
      // Rollback on error
      if (context?.previousThreads) {
        queryClient.setQueryData(threadKeys.lists(), context.previousThreads);
      }
    },
    onSettled: () => {
      // Refetch after error or success
      queryClient.invalidateQueries({ queryKey: threadKeys.lists() });
    },
  });
}
