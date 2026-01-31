"use client";

import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { useStream } from "@/hooks/stream";
// import { useStream } from "@langchain/langgraph-sdk/react";
import { type Message } from "@langchain/langgraph-sdk";
import {
  uiMessageReducer,
  type UIMessage,
  type RemoveUIMessage,
} from "@langchain/langgraph-sdk/react-ui";
import { useQueryState } from "@/hooks/use-query-state";
import { v4 as uuid } from "uuid";
import { toast } from "sonner";
import { useAuthSession } from "@/providers/Auth";
import { useAgentContext } from "@/providers/Agent";
import { useHasApiKeys } from "@/hooks/use-api-keys";
import { checkApiKeysWarning } from "@/lib/agent-utils";
import { useQueryClient } from "@tanstack/react-query";
import { config } from "@/config";
import {
  threadKeys,
  useUpdateThread,
  useFetchThreadState,
  useFetchThreads,
} from "@/hooks/use-threads";
import {
  useLocalThreads,
  useCreateLocalThread,
} from "@/hooks/use-local-threads";
import {
  useLocalStream,
  type LocalStreamState,
  type HITLRequest,
} from "@/hooks/stream/use-local-stream";
import { send } from "@/lib/electron";

type AgentSource = "local" | "cloud";

export type StateType = { messages: Message[]; ui?: UIMessage[] };

const useTypedStream = useStream<
  StateType,
  {
    UpdateType: {
      messages?: Message[] | Message | string;
      ui?: (UIMessage | RemoveUIMessage)[] | UIMessage | RemoveUIMessage;
    };
    CustomEventType: UIMessage | RemoveUIMessage;
  }
>;

// Unified stream context type that works for both local and cloud
type StreamContextType = {
  values: StateType | LocalStreamState | Record<string, unknown>;
  messages: Message[];
  isLoading: boolean;
  error: unknown;
  stop: () => void;
  submit: (values: unknown, options?: unknown) => Promise<void> | void;
  /** Pending HITL interrupt request (local agent only) */
  interrupt: HITLRequest | null;
  // Cloud-specific
  rewind?: () => void;
  next?: () => void;
  mutate?: (fn: unknown) => void;
  getMessagesMetadata?: (message: Message) => any; // Optional - only on cloud streams
  // Local-specific
  approve?: () => void;
  reject?: () => void;
};

const StreamContext = createContext<StreamContextType | undefined>(undefined);

/**
 * Cloud Stream Session - HTTP-based streaming with LangGraph API
 */
const CloudStreamSession = ({
  children,
  agentId,
  accessToken,
  threadId: currentThreadId,
}: {
  children: ReactNode;
  agentId: string;
  accessToken: string;
  threadId: string | null;
}) => {
  const [threadId, setThreadId] = useQueryState("threadId");
  const queryClient = useQueryClient();
  const { mutate: updateThread } = useUpdateThread();

  // Fetch cached thread state for instant display with initialValues
  // This shows cached data immediately while SDK loads fresh data in background
  // Result: sub-100ms perceived load time for previously visited threads
  const { data: cachedThreadState } = useFetchThreadState(threadId);

  const streamValue = useTypedStream({
    apiUrl: config.apiUrl,
    assistantId: agentId,
    threadId: threadId ?? null,
    fetchStateHistory: { limit: 500 },
    initialValues: (cachedThreadState?.values as StateType) || null, // Show cached data instantly
    onCustomEvent: (event, options) => {
      options.mutate((prev) => {
        const ui = uiMessageReducer(prev.ui ?? [], event);
        return { ...prev, ui };
      });
    },
    onThreadId: (id) => {
      setThreadId(id);

      // For new threads (when threadId was null before), save agent metadata
      if (!threadId) {
        updateThread({
          threadId: id,
          metadata: {
            assistant_id: agentId,
            source: "cloud" as AgentSource,
          },
        });
      }

      // Invalidate thread list cache to show new thread immediately
      queryClient.invalidateQueries({ queryKey: threadKeys.lists() });
    },
    defaultHeaders: {
      Authorization: `Bearer ${accessToken}`,
      "x-supabase-access-token": accessToken,
    },
  });

  // Adapt to unified context type
  const contextValue: StreamContextType = useMemo(
    () => ({
      values: streamValue.values,
      messages: streamValue.messages,
      isLoading: streamValue.isLoading,
      error: streamValue.error,
      stop: streamValue.stop,
      submit: streamValue.submit as StreamContextType["submit"],
      interrupt: (streamValue.interrupt as HITLRequest) || null, // Cloud interrupts use SDK's interrupt
      getMessagesMetadata: streamValue.getMessagesMetadata,
    }),
    [streamValue],
  );

  return (
    <StreamContext.Provider value={contextValue}>
      {children}
    </StreamContext.Provider>
  );
};

/**
 * Local Stream Session - IPC-based streaming with Electron main process
 *
 * Refactored to match openwork's architecture:
 * - useLocalStream now uses LangGraph SDK's useStream with custom transport
 * - Optimistic updates handled by SDK's StreamManager (no separate state needed)
 * - Thread creation happens atomically before submit
 * - No timing hacks needed - transport handles IPC subscription
 */
const LocalStreamSession = ({
  children,
  threadId,
  workspacePath,
  modelId,
  setThreadId,
}: {
  children: ReactNode;
  threadId: string | null;
  workspacePath?: string;
  modelId?: string;
  setThreadId: (id: string) => void;
}) => {
  const localStream = useLocalStream({
    threadId,
    workspacePath,
    modelId,
  });

  const { mutateAsync: createThread } = useCreateLocalThread();

  // Adapt to unified context type
  // No need for optimisticMessages state - SDK's useStream handles it via setStreamValues
  const contextValue: StreamContextType = useMemo(
    () => ({
      values: localStream.values,
      messages: localStream.messages, // SDK manages optimistic updates internally
      isLoading: localStream.isLoading,
      error: localStream.error,
      stop: localStream.stop,
      submit: async (values: unknown, options?: unknown) => {
        console.log("[Stream] ========================================");
        console.log("[Stream] LocalStreamSession submit called");
        console.log("[Stream]   values type:", typeof values);
        console.log("[Stream]   threadId before:", threadId);

        // CRITICAL: localStream.submit is bound to the OLD threadId in its closure
        // For new threads, we must call the manager directly with the new currentThreadId
        // The hook will re-render with the new threadId on next cycle

        // Extract message content for submission
        let messageContent: string = "";
        let messageInput: { messages: Message[] } | undefined;

        if (typeof values === "string") {
          messageContent = values;
        } else if (
          values &&
          typeof values === "object" &&
          "messages" in values
        ) {
          const msgs = (values as { messages?: Message[] | string }).messages;

          if (Array.isArray(msgs)) {
            messageInput = { messages: msgs };
            // Extract text from last message
            const lastMsg = msgs[msgs.length - 1];
            if (typeof lastMsg.content === "string") {
              messageContent = lastMsg.content;
            } else if (Array.isArray(lastMsg.content)) {
              messageContent = lastMsg.content
                .map((block) => {
                  if (
                    typeof block === "object" &&
                    block !== null &&
                    "type" in block
                  ) {
                    const typedBlock = block as { type: string; text?: string };
                    if (typedBlock.type === "text" && typedBlock.text) {
                      return typedBlock.text;
                    }
                  }
                  return "";
                })
                .filter((text) => text.length > 0)
                .join(" ");
            }
          } else if (typeof msgs === "string") {
            messageContent = msgs;
          } else {
            console.error("[Stream] Invalid message format:", msgs);
            return;
          }
        }

        if (!messageContent) {
          console.error("[Stream] No message content extracted");
          return;
        }

        // FIXED APPROACH: Apply optimistic update FIRST with temp ID, then swap when thread created
        // This gives instant UI feedback (0ms) instead of waiting for thread creation (10-50ms)
        if (!threadId) {
          console.log(
            "[Stream] New thread - applying optimistic update BEFORE creation",
          );

          const metadata = (values as any)?.metadata || {};
          const requestedWorkspace = metadata.workspacePath || workspacePath;

          // Generate temporary thread ID for optimistic update
          const tempThreadId = `temp-${uuid()}`;
          console.log("[Stream] Generated temp thread ID:", tempThreadId);

          // CRITICAL: Apply optimistic update IMMEDIATELY using temp thread ID
          // This shows the user's message instantly (0ms delay)
          localStream.submitToThread(tempThreadId, messageContent, {
            modelId,
            workspacePath: requestedWorkspace,
            optimisticValues: (options as any)?.optimisticValues,
            isOptimistic: true, // Flag to prevent actual IPC call
          });

          // Create thread in background (async, doesn't block UI)
          createThread({
            metadata: {
              assistant_id: "local-agent",
              source: "local",
              workspacePath: requestedWorkspace,
            },
          })
            .then((newThread) => {
              console.log("[Stream] Thread created:", newThread.thread_id);
              const realThreadId = newThread.thread_id;
              setThreadId(realThreadId);

              // Swap temp ID for real ID in manager and start actual stream
              console.log(
                "[Stream] Swapping temp ID for real ID and starting stream",
              );
              localStream.swapThreadId(tempThreadId, realThreadId);

              // Now start the actual agent stream with real thread ID
              localStream.submitToThread(realThreadId, messageContent, {
                modelId,
                workspacePath: requestedWorkspace,
                skipOptimistic: true, // Already applied with temp ID
              });
            })
            .catch((err) => {
              console.error("[Stream] Failed to create thread:", err);
              // Clean up temp thread on error
              localStream.cleanupThread(tempThreadId);
            });
        } else {
          console.log("[Stream] Existing thread - calling normal submit");
          if (messageInput) {
            localStream.submit(messageInput, options as any);
          } else {
            localStream.submit(messageContent, options as any);
          }
        }
      },
      interrupt: localStream.interrupt,
      approve: localStream.approve,
      reject: localStream.reject,
      getMessagesMetadata: () => undefined, // Local streams don't have metadata
    }),
    [localStream, threadId, workspacePath, modelId, setThreadId, createThread],
  );

  return (
    <StreamContext.Provider value={contextValue}>
      {children}
    </StreamContext.Provider>
  );
};

/**
 * StreamProvider: Feature-level stream session management
 *
 * This provider manages the stream session for the chat feature.
 * Agent selection is now handled by the global AgentProvider.
 *
 * Provider Responsibilities:
 * - Stream session lifecycle
 * - Thread synchronization
 * - API key warnings
 * - Mode reset on new thread
 * - Switching between local and cloud streams based on agentSource
 */
export const StreamProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { agentId, agentSource } = useAgentContext();
  const { session } = useAuthSession();
  const [threadId, setThreadId] = useQueryState("threadId");
  const hasApiKeys = useHasApiKeys();
  const warningShownRef = useRef<string>("");

  // Fetch threads to get metadata (workspacePath)
  // We fetch both lists here, but only one will be active/used based on source context
  const { data: cloudThreads } = useFetchThreads();
  const { data: localThreads } = useLocalThreads();

  // CLEAN:
  const threads = agentSource === "local" ? localThreads : cloudThreads;

  // API key warning
  useEffect(() => {
    if (agentId && warningShownRef.current !== agentId) {
      checkApiKeysWarning(hasApiKeys);
      warningShownRef.current = agentId;
    }
  }, [agentId, hasApiKeys]);

  // Local agents use IPC streaming
  if (agentSource === "local") {
    // Find metadata for current thread
    const currentThread = threads?.find((t) => t.thread_id === threadId);
    // Cast to any since standard ThreadMetadata doesn't include workspacePath yet
    const workspacePath = currentThread?.metadata
      ? (currentThread.metadata as any).workspacePath
      : undefined;

    return (
      <LocalStreamSession
        key={`local-stream-${threadId}`}
        threadId={threadId}
        workspacePath={workspacePath}
        modelId={undefined}
        setThreadId={setThreadId}
      >
        {children}
      </LocalStreamSession>
    );
  }

  // Cloud agents use HTTP streaming
  return (
    <>
      {!session?.accessToken ? (
        // Render children without StreamSession for unauthenticated users
        // This allows them to see the UI and interact with the composer
        // Auth will be required when they try to submit a message
        <>{children}</>
      ) : (
        <CloudStreamSession
          key={`cloud-stream-${session.accessToken.substring(0, 20)}`} // Force re-mount when session changes
          agentId={agentId}
          accessToken={session.accessToken}
          threadId={threadId}
        >
          {children}
        </CloudStreamSession>
      )}
    </>
  );
};

// Create a custom hook to use the context
export const useStreamContext = (): StreamContextType => {
  const context = useContext(StreamContext);

  // For unauthenticated users, return a default/empty stream context
  // This allows the UI to render without errors
  if (context === undefined) {
    return {
      values: { messages: [] },
      messages: [],
      isLoading: false,
      error: undefined,
      stop: () => {},
      submit: async () => {},
    } as StreamContextType;
  }

  return context;
};

export default StreamContext;
