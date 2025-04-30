"use client";

import {
  HumanResponse,
  ThreadData,
  ThreadStatusWithAll,
  EnhancedThreadStatus,
} from "@/components/agent-inbox/types";
import { toast } from "sonner";
import { createClient } from "@/lib/client";
import { Run, Thread, ThreadStatus } from "@langchain/langgraph-sdk";
import React, { useTransition } from "react";
import { useQueryState } from "nuqs";
import { IMPROPER_SCHEMA } from "../constants";
import {
  getInterruptFromThread,
  processInterruptedThread,
  processThreadWithoutInterrupts,
} from "./utils";
import { logger } from "../utils/logger";
import { v4 as uuidv4 } from "uuid";
import { useInboxQueryState } from "../hooks/useInboxQueryState";

type ThreadContentType<
  ThreadValues extends Record<string, any> = Record<string, any>,
> = {
  loading: boolean;
  isChangingThreads: boolean;
  threadData: ThreadData<ThreadValues>[];
  hasMoreThreads: boolean;
  currentInboxStatus: ThreadStatusWithAll;
  ignoreThread: (threadId: string) => Promise<void>;
  fetchThreads: (inbox: ThreadStatusWithAll) => Promise<void>;
  clearThreadData: () => void;
  sendHumanResponse: <TStream extends boolean = false>(
    _threadId: string,
    _response: HumanResponse[],
    _options?: {
      stream?: TStream;
    },
  ) => TStream extends true
    ?
        | AsyncGenerator<{
            event: Record<string, any>;
            data: any;
          }>
        | undefined
    : Promise<Run> | undefined;
  fetchSingleThread: (
    _threadId: string,
  ) => Promise<ThreadData<ThreadValues> | undefined>;
};

const ThreadsContext = React.createContext<ThreadContentType | undefined>(
  undefined,
);

// Internal component that uses the context
function ThreadsProviderInternal<
  ThreadValues extends Record<string, any> = Record<string, any>,
>({ children }: { children: React.ReactNode }): React.ReactElement {
  const [agentInboxId] = useQueryState("agentInbox");
  const activeRequests = React.useRef<AbortController[]>([]);
  const currentRequestIdRef = React.useRef<string | null>(null);
  const [isPending] = useTransition();

  // Get thread filter query params using the custom hook
  const [inboxState] = useInboxQueryState();
  const inboxParam = inboxState.status;
  const offsetParam = inboxState.offset;
  const limitParam = inboxState.limit;

  const [loading, setLoading] = React.useState(false);
  const [threadData, setThreadData] = React.useState<
    ThreadData<ThreadValues>[]
  >([]);
  const [hasMoreThreads, setHasMoreThreads] = React.useState(true);

  const clearThreadData = React.useCallback(() => {
    setThreadData([]);
  }, []);

  const fetchThreads = React.useCallback(
    async (inbox: ThreadStatusWithAll, requestId?: string) => {
      // Cancel any previous requests
      activeRequests.current.forEach((controller) => {
        try {
          controller.abort();
        } catch (e) {
          // Ignore abort errors
        }
      });
      activeRequests.current = [];

      setLoading(true);

      await fetchThreadsFromAPI(inbox, requestId);
    },
    [offsetParam, limitParam],
  );

  // Helper function to fetch threads from API
  const fetchThreadsFromAPI = React.useCallback(
    async (inbox: ThreadStatusWithAll, requestId?: string) => {
      if (!agentInboxId) {
        toast.error("No agent inbox ID found", {
          richColors: true,
        });
        return;
      }
      // If a requestId was passed and it's different from current, abort
      if (requestId && requestId !== currentRequestIdRef.current) {
        return; // This is a stale request, ignore it
      }
      const [assistantId, deploymentId] = agentInboxId.split(":");

      const client = createClient(deploymentId);

      try {
        // Use the values from queryParams
        const limit = limitParam;
        const offset = offsetParam;

        if (!limit) {
          throw new Error("Limit query param not found");
        }

        if (!offset && offset !== 0) {
          throw new Error("Offset query param not found");
        }

        if (limit > 100) {
          toast.error("Limit Exceeded", {
            description: "Cannot fetch more than 100 threads at a time",
            duration: 3000,
          });
          setLoading(false);
          return;
        }

        // Create abort controller for this request
        const controller = new AbortController();
        activeRequests.current.push(controller);

        // Handle inbox filtering differently based on type
        let statusInput: { status?: ThreadStatus } = {};
        if (inbox !== "all" && inbox !== "human_response_needed") {
          statusInput = { status: inbox as ThreadStatus };
        }

        const threadSearchArgs = {
          offset,
          limit,
          ...statusInput,
          metadata: {
            assistant_id: assistantId,
          },
        };

        const threads = await client.threads.search(threadSearchArgs);

        // Check if this is still the current request before proceeding
        if (requestId && requestId !== currentRequestIdRef.current) {
          return; // This is a stale request, don't update state
        }

        const processedData: ThreadData<ThreadValues>[] = [];

        // Process threads in batches with Promise.all for better performance
        const processPromises = threads.map(
          async (thread): Promise<ThreadData<ThreadValues>> => {
            const currentThread = thread as Thread<ThreadValues>;

            // Handle special cases for human_response_needed inbox
            if (
              inbox === "human_response_needed" &&
              currentThread.status !== "interrupted"
            ) {
              return {
                status: "human_response_needed" as EnhancedThreadStatus,
                thread: currentThread,
                interrupts: undefined,
                invalidSchema: undefined,
              };
            }

            if (currentThread.status === "interrupted") {
              // Try the faster processing method first
              const processedThreadData =
                processInterruptedThread(currentThread);
              if (
                processedThreadData &&
                processedThreadData.interrupts?.length
              ) {
                return processedThreadData as ThreadData<ThreadValues>;
              }

              // Only if necessary, do the more expensive thread state fetch
              try {
                // Attempt to get interrupts from state only if necessary
                const threadInterrupts = getInterruptFromThread(currentThread);
                if (!threadInterrupts || threadInterrupts.length === 0) {
                  const state = await client.threads.getState<ThreadValues>(
                    currentThread.thread_id,
                  );

                  return processThreadWithoutInterrupts(currentThread, {
                    thread_id: currentThread.thread_id,
                    thread_state: state,
                  }) as ThreadData<ThreadValues>;
                }

                // Return with the interrupts we found
                return {
                  status: "interrupted" as const,
                  thread: currentThread,
                  interrupts: threadInterrupts,
                  invalidSchema: threadInterrupts.some(
                    (interrupt) =>
                      interrupt?.action_request?.action === IMPROPER_SCHEMA ||
                      !interrupt?.action_request?.action,
                  ),
                };
              } catch (e) {
                // If all else fails, mark as invalid schema
                return {
                  status: "interrupted" as const,
                  thread: currentThread,
                  interrupts: undefined,
                  invalidSchema: true,
                };
              }
            } else {
              // Non-interrupted threads are simple
              return {
                status: currentThread.status,
                thread: currentThread,
                interrupts: undefined,
                invalidSchema: undefined,
              } as ThreadData<ThreadValues>;
            }
          },
        );

        // Check if this is still the current request before updating state
        if (requestId && requestId !== currentRequestIdRef.current) {
          return; // This is a stale request, don't update state
        }

        // Process all threads concurrently
        const results = await Promise.all(processPromises);
        processedData.push(...results);

        const sortedData = processedData.sort((a, b) => {
          return (
            new Date(b.thread.created_at).getTime() -
            new Date(a.thread.created_at).getTime()
          );
        });

        // Final check before updating state
        if (requestId && requestId !== currentRequestIdRef.current) {
          return; // This is a stale request, don't update state
        }

        setThreadData(sortedData);
        setHasMoreThreads(threads.length === limit);
      } catch (e) {
        logger.error("Failed to fetch threads", e);
        toast.error("Failed to load threads. Please try again.");
      } finally {
        // Always reset loading state, even after errors
        setLoading(false);
      }
    },
    [limitParam, offsetParam],
  );

  // Effect to fetch threads when parameters change
  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!agentInboxId || !inboxParam) {
      return;
    }

    // Cancel any existing requests before starting a new one
    activeRequests.current.forEach((controller) => {
      try {
        controller.abort();
      } catch (e) {
        // Ignore abort errors
      }
    });
    activeRequests.current = [];

    // Generate a unique request ID for this fetch
    const requestId = uuidv4();
    currentRequestIdRef.current = requestId;

    // Set loading state immediately
    setLoading(true);

    try {
      // Fetch threads
      fetchThreads(inboxParam, requestId);
    } catch (e) {
      logger.error("Error occurred while fetching threads", e);
      toast.error("Failed to load threads. Please try again.");
      // Always reset loading state in case of error
      setLoading(false);
    }
  }, [inboxParam, offsetParam, limitParam, fetchThreads, clearThreadData]);

  const fetchSingleThread = React.useCallback(
    async (threadId: string): Promise<ThreadData<ThreadValues> | undefined> => {
      if (!agentInboxId) {
        toast.error("No agent inbox ID found when fetching thread.", {
          richColors: true,
        });
        return;
      }

      const [_, deploymentId] = agentInboxId.split(":");
      const client = createClient(deploymentId);

      try {
        const thread = await client.threads.get(threadId);
        const currentThread = thread as Thread<ThreadValues>;

        if (thread.status === "interrupted") {
          const threadInterrupts = getInterruptFromThread(currentThread);

          if (!threadInterrupts || !threadInterrupts.length) {
            const state = await client.threads.getState(threadId);
            const processedThread = processThreadWithoutInterrupts(
              currentThread,
              {
                thread_state: state,
                thread_id: threadId,
              },
            );

            if (processedThread) {
              return processedThread as ThreadData<ThreadValues>;
            }
          }

          // Return interrupted thread data
          return {
            thread: currentThread,
            status: "interrupted",
            interrupts: threadInterrupts,
            invalidSchema:
              !threadInterrupts ||
              threadInterrupts.length === 0 ||
              threadInterrupts.some(
                (interrupt) =>
                  interrupt?.action_request?.action === IMPROPER_SCHEMA ||
                  !interrupt?.action_request?.action,
              ),
          };
        }

        // Check for special human_response_needed status
        if (inboxParam === "human_response_needed") {
          return {
            thread: currentThread,
            status: "human_response_needed" as EnhancedThreadStatus,
            interrupts: undefined,
            invalidSchema: undefined,
          };
        }

        // Normal non-interrupted thread
        return {
          thread: currentThread,
          status: currentThread.status,
          interrupts: undefined,
          invalidSchema: undefined,
        };
      } catch (error) {
        logger.error("Error fetching single thread", error);
        toast.error("Failed to load thread details. Please try again.");
        return undefined;
      }
    },
    [inboxParam],
  );

  const ignoreThread = async (threadId: string) => {
    if (!agentInboxId) {
      toast.error("No agent inbox ID found when fetching thread.", {
        richColors: true,
      });
      return;
    }

    const [_, deploymentId] = agentInboxId.split(":");
    const client = createClient(deploymentId);

    try {
      setLoading(true);
      await client.threads.updateState(threadId, {
        values: null,
        asNode: "__end__",
      });

      setThreadData((prev) => {
        return prev.filter((p) => p.thread.thread_id !== threadId);
      });
      toast("Success", {
        description: "Ignored thread",
        duration: 3000,
      });
    } catch (e) {
      logger.error("Error ignoring thread", e);
      toast.error("Failed to ignore thread. Please try again.", {
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const sendHumanResponse = <TStream extends boolean = false>(
    threadId: string,
    response: HumanResponse[],
    options?: {
      stream?: TStream;
    },
  ): TStream extends true
    ?
        | AsyncGenerator<{
            event: Record<string, any>;
            data: any;
          }>
        | undefined
    : Promise<Run> | undefined => {
    if (!agentInboxId) {
      toast.error("No agent inbox ID found when fetching thread.", {
        richColors: true,
      });
      return;
    }

    const [assistantId, deploymentId] = agentInboxId.split(":");
    const client = createClient(deploymentId);

    try {
      if (options?.stream) {
        return client.runs.stream(threadId, assistantId, {
          command: {
            resume: response,
          },
          streamMode: "events",
        }) as any; // Type assertion needed due to conditional return type
      }
      return client.runs.create(threadId, assistantId, {
        command: {
          resume: response,
        },
      }) as any; // Type assertion needed due to conditional return type
    } catch (e: any) {
      logger.error("Error sending human response", e);
      throw e;
    }
  };

  // Clean up on component unmount
  React.useEffect(() => {
    return () => {
      // Cancel all pending requests on unmount
      activeRequests.current.forEach((controller) => {
        try {
          controller.abort();
        } catch (e) {
          // Ignore abort errors
        }
      });
      activeRequests.current = [];
    };
  }, []);

  const contextValue: ThreadContentType = {
    loading,
    isChangingThreads: isPending,
    threadData,
    hasMoreThreads,
    currentInboxStatus: inboxState.status,
    ignoreThread,
    sendHumanResponse,
    fetchThreads,
    fetchSingleThread,
    clearThreadData,
  };

  return (
    <ThreadsContext.Provider value={contextValue}>
      {children}
    </ThreadsContext.Provider>
  );
}

// Export the wrapped provider
export function ThreadsProvider<
  ThreadValues extends Record<string, any> = Record<string, any>,
>({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <ThreadsProviderInternal<ThreadValues>>{children}</ThreadsProviderInternal>
  );
}

export function useThreadsContext<
  T extends Record<string, any> = Record<string, any>,
>() {
  const context = React.useContext(ThreadsContext) as ThreadContentType<T>;
  if (context === undefined) {
    throw new Error("useThreadsContext must be used within a ThreadsProvider");
  }
  return context;
}
