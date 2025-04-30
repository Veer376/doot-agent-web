"use client";

import {
  AgentInbox,
  HumanResponse,
  ThreadData,
  ThreadStatusWithAll,
  EnhancedThreadStatus,
} from "@/components/agent-inbox/types";
import { toast } from "sonner";
import { createClient } from "@/lib/client";
import { Run, Thread, ThreadStatus } from "@langchain/langgraph-sdk";
import React, { useTransition } from "react";
import {
  useQueryState,
  useQueryStates,
  parseAsString,
  parseAsInteger,
} from "nuqs";
import {
  INBOX_PARAM,
  LIMIT_PARAM,
  OFFSET_PARAM,
  IMPROPER_SCHEMA,
} from "../constants";
import {
  getInterruptFromThread,
  getThreadFilterMetadata,
  processInterruptedThread,
  processThreadWithoutInterrupts,
} from "./utils";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useInboxes } from "../hooks/use-inboxes";
import { logger } from "../utils/logger";
import { useAgentsContext } from "@/providers/Agents";
import { v4 as uuidv4 } from "uuid";
import { getDeployments } from "@/lib/environment/deployments";
import { Deployment } from "@/types/deployment";
import {
  useAgentSelection,
  AgentSelectionProvider,
} from "./AgentSelectionContext";
import { useInboxQueryState } from "../hooks/useInboxQueryState";

type ThreadContentType<
  ThreadValues extends Record<string, any> = Record<string, any>,
> = {
  loading: boolean;
  isChangingThreads: boolean;
  threadData: ThreadData<ThreadValues>[];
  hasMoreThreads: boolean;
  agentInboxes: AgentInbox[];
  selectedInbox: AgentInbox | null;
  currentInboxStatus: ThreadStatusWithAll;
  deleteAgentInbox: (id: string) => void;
  changeAgentInbox: (graphId: string, _replaceAll?: boolean) => void;
  addAgentInbox: (agentInbox: AgentInbox) => void;
  updateAgentInbox: (updatedInbox: AgentInbox) => void;
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

interface GetClientArgs {
  agentInboxes: AgentInbox[];
  getItem: (key: string) => string | null | undefined;
}

const getClient = ({ agentInboxes }: GetClientArgs) => {
  if (agentInboxes.length === 0) {
    toast.error("Agent inbox not found", {
      description: "Please add an inbox in settings.",
      duration: 3000,
    });
    return;
  }
  const selectedInbox = agentInboxes.find((i) => i.selected);
  if (!selectedInbox) {
    toast.error("No selected inbox", {
      description: "Please select an agent inbox.",
      duration: 5000,
    });
    return;
  }

  const deploymentId = selectedInbox.deploymentId;
  if (!deploymentId) {
    toast.error("Missing deployment ID", {
      description:
        "Please ensure your selected agent inbox has a deployment ID.",
      duration: 5000,
    });
    return;
  }

  return createClient(deploymentId);
};

// Internal component that uses the context
function ThreadsProviderInternal<
  ThreadValues extends Record<string, any> = Record<string, any>,
>({ children }: { children: React.ReactNode }): React.ReactElement {
  const { getItem } = useLocalStorage();
  const { selectedAgentId } = useAgentSelection();
  const { agents } = useAgentsContext();
  const deployments = getDeployments();
  const processedAgentIdRef = React.useRef<string | null>(null);
  const activeRequests = React.useRef<AbortController[]>([]);
  const currentRequestIdRef = React.useRef<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Get thread filter query params using the custom hook
  const [inboxState, updateInboxState] = useInboxQueryState();
  const inboxParam = inboxState.status;
  const offsetParam = inboxState.offset;
  const limitParam = inboxState.limit;

  const [loading, setLoading] = React.useState(false);
  const [threadData, setThreadData] = React.useState<
    ThreadData<ThreadValues>[]
  >([]);
  const [hasMoreThreads, setHasMoreThreads] = React.useState(true);

  const {
    agentInboxes,
    selectedInbox,
    addAgentInbox,
    deleteAgentInbox,
    changeAgentInbox,
    updateAgentInbox,
    isChangingInbox,
  } = useInboxes();

  const clearThreadData = React.useCallback(() => {
    setThreadData([]);
  }, []);

  // Effect for loading threads when selectedAgentId changes
  React.useEffect(() => {
    // Skip if no selectedAgentId or if we've already processed this agent ID
    if (!selectedAgentId || selectedAgentId === processedAgentIdRef.current)
      return;

    // Update ref to prevent processing the same agent multiple times
    processedAgentIdRef.current = selectedAgentId;

    // Extract assistant_id and deploymentId from selectedAgentId
    const [assistantId, deploymentId] = selectedAgentId.split(":");
    if (!assistantId || !deploymentId) return;

    // Find or create an agent inbox for this agent
    const existingInbox = agentInboxes.find(
      (inbox) =>
        inbox.graphId === assistantId &&
        (inbox.deploymentId === deploymentId ||
          (inbox.deploymentUrl && inbox.deploymentUrl.includes(deploymentId))),
    );

    if (existingInbox) {
      // If inbox exists, select it
      changeAgentInbox(existingInbox.id);
    } else {
      // Create a new agent inbox for this agent
      const agent = agents.find(
        (a) =>
          a.assistant_id === assistantId && a.deploymentId === deploymentId,
      );

      if (agent) {
        // Create and add new inbox using agent data
        const deployment = deployments.find(
          (d: Deployment) => d.id === agent.deploymentId,
        );

        if (deployment) {
          const newInbox: AgentInbox = {
            id: uuidv4(),
            graphId: agent.graph_id,
            deploymentId: agent.deploymentId,
            deploymentUrl: deployment.deploymentUrl,
            name: agent.name,
            selected: true,
            createdAt: new Date().toISOString(),
          };

          // Use setTimeout to break the render cycle and prevent infinite loops
          setTimeout(() => {
            addAgentInbox(newInbox);
          }, 0);
        }
      }
    }
  }, [
    selectedAgentId,
    agentInboxes,
    agents,
    deployments,
    changeAgentInbox,
    addAgentInbox,
  ]);

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
    [agentInboxes, offsetParam, limitParam],
  );

  // Helper function to fetch threads from API
  const fetchThreadsFromAPI = React.useCallback(
    async (inbox: ThreadStatusWithAll, requestId?: string) => {
      // If a requestId was passed and it's different from current, abort
      if (requestId && requestId !== currentRequestIdRef.current) {
        return; // This is a stale request, ignore it
      }

      const client = getClient({
        agentInboxes,
        getItem,
      });
      if (!client) {
        setLoading(false);
        return;
      }

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

        const metadataInput = getThreadFilterMetadata(agentInboxes);

        const threadSearchArgs = {
          offset,
          limit,
          ...statusInput,
          ...(metadataInput ? { metadata: metadataInput } : {}),
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
    [agentInboxes, getItem, limitParam, offsetParam],
  );

  // Effect to fetch threads when parameters change
  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!agentInboxes.length) {
      return;
    }
    if (!inboxParam) {
      return;
    }
    if (!selectedInbox) {
      return;
    }

    // If we're changing inboxes, clear thread data immediately to prevent flash of old data
    if (isChangingInbox) {
      clearThreadData();
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
  }, [
    inboxParam,
    offsetParam,
    limitParam,
    agentInboxes,
    fetchThreads,
    isChangingInbox,
    clearThreadData,
    selectedInbox,
  ]);

  const fetchSingleThread = React.useCallback(
    async (threadId: string): Promise<ThreadData<ThreadValues> | undefined> => {
      const client = getClient({
        agentInboxes,
        getItem,
      });
      if (!client) {
        return;
      }

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
    [agentInboxes, getItem, inboxParam],
  );

  const ignoreThread = async (threadId: string) => {
    const client = getClient({
      agentInboxes,
      getItem,
    });
    if (!client) {
      return;
    }
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
    const graphId = agentInboxes.find((i) => i.selected)?.graphId;
    if (!graphId) {
      toast.error("No assistant/graph ID found", {
        description:
          "Assistant/graph IDs are required to send responses. Please add an assistant/graph ID in the settings.",
      });
      return undefined;
    }

    const client = getClient({
      agentInboxes,
      getItem,
    });
    if (!client) {
      return;
    }
    try {
      if (options?.stream) {
        return client.runs.stream(threadId, graphId, {
          command: {
            resume: response,
          },
          streamMode: "events",
        }) as any; // Type assertion needed due to conditional return type
      }
      return client.runs.create(threadId, graphId, {
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
    isChangingThreads: isPending || isChangingInbox,
    threadData,
    hasMoreThreads,
    agentInboxes,
    selectedInbox,
    currentInboxStatus: inboxState.status,
    deleteAgentInbox,
    changeAgentInbox,
    addAgentInbox,
    updateAgentInbox,
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
    <AgentSelectionProvider>
      <ThreadsProviderInternal<ThreadValues>>
        {children}
      </ThreadsProviderInternal>
    </AgentSelectionProvider>
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
