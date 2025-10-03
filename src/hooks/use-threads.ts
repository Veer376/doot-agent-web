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
};

// Type for thread metadata
interface ThreadMetadata {
  assistant_id?: string;
  [key: string]: unknown;
}

// Fetch all threads with optional agent filtering
async function fetchThreads(
  accessToken: string,
  agentId?: string
): Promise<Thread<ThreadMetadata>[]> {
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
}

// Hook to fetch all threads (or filtered by agent)
export function useThreads(agentId?: string) {
  const { session } = useAuthContext();
  const accessToken = session?.accessToken;

  return useQuery({
    queryKey: threadKeys.list({ agentId }),
    queryFn: () => {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      return fetchThreads(accessToken, agentId);
    },
    enabled: !!accessToken,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Create new thread
async function createThread(
  accessToken: string,
  metadata?: ThreadMetadata
): Promise<Thread<ThreadMetadata>> {
  const client = createClient(accessToken);

  const thread = await client.threads.create({
    metadata: metadata || {},
  });

  return thread as Thread<ThreadMetadata>;
}

// Hook to create a new thread
export function useCreateThread() {
  const { session } = useAuthContext();
  const queryClient = useQueryClient();
  const accessToken = session?.accessToken;

  return useMutation({
    mutationFn: (metadata?: ThreadMetadata) => {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      return createThread(accessToken, metadata);
    },
    onSuccess: () => {
      // Invalidate all thread lists to trigger refetch
      queryClient.invalidateQueries({ queryKey: threadKeys.lists() });
    },
  });
}

// Delete thread
async function deleteThread(
  accessToken: string,
  threadId: string
): Promise<void> {
  const client = createClient(accessToken);
  await client.threads.delete(threadId);
}

// Hook to delete a thread
export function useDeleteThread() {
  const { session } = useAuthContext();
  const queryClient = useQueryClient();
  const accessToken = session?.accessToken;

  return useMutation({
    mutationFn: (threadId: string) => {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      return deleteThread(accessToken, threadId);
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
