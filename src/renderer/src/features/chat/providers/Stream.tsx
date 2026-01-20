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
  values: StateType | LocalStreamState;
  messages: Message[];
  isLoading: boolean;
  error: unknown;
  stop: () => void;
  submit: (values: unknown, options?: unknown) => Promise<void> | void;
  interrupt?: unknown;
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
      interrupt: streamValue.interrupt,
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
  const contextValue: StreamContextType = useMemo(
    () => ({
      values: localStream.values,
      messages: localStream.messages,
      isLoading: localStream.isLoading,
      error: localStream.error,
      stop: localStream.stop,
      submit: async (values: unknown) => {
        console.log('[Stream] ========================================');
        console.log('[Stream] LocalStreamSession submit called');
        console.log('[Stream]   values type:', typeof values);
        console.log('[Stream]   threadId before:', threadId);

        if (typeof values === "string") {
          console.log('[Stream] Simple string submission');
          localStream.submit(values);
        } else if (
          values &&
          typeof values === "object" &&
          "messages" in values
        ) {
          const msgs = (values as { messages?: Message[] | string }).messages;
          
          let msgContent = "";
          if (Array.isArray(msgs) && msgs.length > 0) {
            const lastMsg = msgs[msgs.length - 1];
            const content = lastMsg.content;
            
            // Handle content that could be string or array of content blocks
            if (typeof content === "string") {
              msgContent = content;
            } else if (Array.isArray(content)) {
              // Extract text from content blocks: [{type: 'text', text: '...'}, ...]
              msgContent = content
                .filter((block): block is { type: string; text: string } => 
                  typeof block === 'object' && block !== null && 'type' in block && block.type === 'text'
                )
                .map(block => block.text)
                .join(' ');
            }
          } else if (typeof msgs === "string") {
            msgContent = msgs;
          }

          console.log('[Stream]   extracted msgContent:', msgContent);

          let currentThreadId = threadId;

          // Handle new thread creation for local agent
          if (!currentThreadId) {
            console.log('[Stream] No threadId - creating new thread');
            const metadata = (values as any).metadata || {};
            const requestedWorkspace = metadata.workspacePath || workspacePath;
            console.log('[Stream]   metadata:', metadata);
            console.log('[Stream]   requestedWorkspace:', requestedWorkspace);

            try {
              console.log('[Stream] Calling createThread...');
              const newThread = await createThread({
                metadata: {
                  assistant_id: "local-agent", // specific to local agent
                  source: "local",
                  workspacePath: requestedWorkspace,
                },
              });
              console.log('[Stream] Thread created successfully:', newThread.thread_id);
              console.log('[Stream] Thread data:', JSON.stringify(newThread, null, 2));
              currentThreadId = newThread.thread_id;
              setThreadId(currentThreadId);
              console.log('[Stream] ThreadId set in URL:', currentThreadId);

              // Safety delay to ensure useLocalStream effect has subscribed to the new threadId
              // before we trigger the agent which sends events.
              await new Promise((resolve) => setTimeout(resolve, 100));
            } catch (err) {
              console.error('[Stream] Failed to create thread:', err);
              return;
            }
          }

          console.log('[Stream] About to send agent:invoke');
          console.log('[Stream]   currentThreadId:', currentThreadId);
          console.log('[Stream]   msgContent:', msgContent);
          console.log('[Stream]   workspacePath:', workspacePath);
          console.log('[Stream]   modelId:', modelId);

          // If we just created the thread, we MUST use direct send because localStream.submit
          // is bound to the old null threadId and won't update until next render.
          if (currentThreadId && msgContent) {
            // We use the direct IPC send which is what useLocalStream does anyway
            send("agent:invoke", {
              threadId: currentThreadId,
              message: msgContent,
              workspacePath:
                (values as any).metadata?.workspacePath || workspacePath,
              modelId,
            });
            console.log('[Stream] agent:invoke sent successfully');
          } else {
            console.error('[Stream] Cannot send - missing threadId or content:', {
              hasThreadId: !!currentThreadId,
              hasContent: !!msgContent
            });
          }
        }
      },
      interrupt: localStream.interrupt,
      approve: localStream.approve,
      reject: localStream.reject,
      getMessagesMetadata: () => undefined, // Local streams don't have metadata
    }),
    [localStream],
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
          agentId={agentId || "chat_agent"}
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
