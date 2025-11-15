"use client";

import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useRef,
} from "react";
import { useStream } from "@langchain/langgraph-sdk/react";
import { type Message } from "@langchain/langgraph-sdk";
import {
  uiMessageReducer,
  type UIMessage,
  type RemoveUIMessage,
} from "@langchain/langgraph-sdk/react-ui";
import { useQueryState } from "nuqs";
import { toast } from "sonner";
import { isUserSpecifiedDefaultAgent } from "@/lib/agent-utils";
import { useAuthContext } from "@/providers/Auth";
import { useHasApiKeys } from "@/hooks/use-api-keys";
import { checkApiKeysWarning } from "@/lib/agent-utils";
import { useQueryClient } from "@tanstack/react-query";
import { threadKeys, useUpdateThread, useFetchThreadState } from "@/hooks/use-threads";
import { useFetchAgents } from "@/hooks/use-agents";

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

type StreamContextType = ReturnType<typeof useTypedStream>;
const StreamContext = createContext<StreamContextType | undefined>(undefined);

// Agent Context for accessing agentId and mode
// Agent selection and mode are stored in local state only (no persistence)
type AgentContextType = {
  agentId: string;
  setSelectedAgent: (agentId: string) => void;
  mode: "agent" | "chat";
  setMode: (mode: "agent" | "chat") => void;
};
const AgentContext = createContext<AgentContextType | undefined>(undefined);

const StreamSession = ({
  children,
  agentId,
  mode,
  accessToken,
  threadId: currentThreadId,
}: {
  children: ReactNode;
  agentId: string;
  mode: "agent" | "chat";
  accessToken?: string;
  threadId: string | null;
}) => {
  if (!accessToken) {
    toast.error("Access token must be provided");
  }

  const [threadId, setThreadId] = useQueryState("threadId");
  const queryClient = useQueryClient();
  const { mutate: updateThread } = useUpdateThread();

  // Fetch cached thread state for instant display with initialValues
  // This shows cached data immediately while SDK loads fresh data in background
  // Result: sub-100ms perceived load time for previously visited threads
  const { data: cachedThreadState, isLoading: threadStateLoading } = useFetchThreadState(threadId);

  // Use a stable assistantId for the stream connection
  // The actual agent/mode will be determined by the submit config, not the stream connection
  // This prevents stream reconnections when user changes agent/mode in UI
  const effectiveAgentId = mode === "chat" ? "chat_mode" : agentId;

  const streamValue = useTypedStream({
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
    assistantId: effectiveAgentId,
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
      
      // For new threads (when threadId was null before), save agent/mode metadata
      if (!threadId) {
        updateThread({
          threadId: id,
          metadata: {
            assistant_id: agentId,
            mode: mode,
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

  return (
    <StreamContext.Provider value={streamValue}>
      {children}
    </StreamContext.Provider>
  );
};

export const StreamProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { data: agents = [], isLoading: agentsLoading } = useFetchAgents();
  const [threadId] = useQueryState("threadId");
  
  const { session } = useAuthContext();
  const hasApiKeys = useHasApiKeys();
  const warningShownRef = useRef<string>("");

  // State management - no persistence, local state only
  const [agentId, setSelectedAgent] = useState<string>("");
  const [mode, setMode] = useState<"agent" | "chat">("chat"); // Default to chat mode

  // Track previous threadId for key computation
  const prevThreadIdRef = useRef<string | null>(null);

  useEffect(() => {
    prevThreadIdRef.current = threadId;
  }, [threadId]);

  // When threadId changes to null (new thread), reset to chat mode
  useEffect(() => {
    if (threadId === null) {
      setMode("chat");
    }
  }, [threadId]);

  // Initialize with default agent on mount
  useEffect(() => {
    if (!agentId && agents.length > 0) {
      const defaultAgent = agents.find(isUserSpecifiedDefaultAgent) ?? agents[0];
      if (defaultAgent) {
        setSelectedAgent(defaultAgent.assistant_id);
      }
    }
  }, [agents, agentId]);

  // API key warning
  useEffect(() => {
    if (agentId && warningShownRef.current !== agentId) {
      checkApiKeysWarning(hasApiKeys);
      warningShownRef.current = agentId;
    }
  }, [agentId, hasApiKeys]);

  return (
    <AgentContext.Provider
      value={{ agentId, setSelectedAgent, mode, setMode }}
    >
      {!session?.accessToken ? (
        <>
          {toast.error("Access token must be provided")}
          {null}
        </>
      ) : (
        <StreamSession
          // key={(prevThreadIdRef.current && threadId && prevThreadIdRef.current !== threadId) ? threadId : 'stable'}
          agentId={agentId || "chat_mode"}
          mode={mode}
          accessToken={session.accessToken}
          threadId={threadId}
        >
          {children}
        </StreamSession>
      )}
    </AgentContext.Provider>
  );
};

// Create a custom hook to use the context
export const useStreamContext = (): StreamContextType => {
  const context = useContext(StreamContext);
  if (context === undefined) {
    throw new Error("useStreamContext must be used within a StreamProvider");
  }
  return context;
};

// PHASE 3: Hook to access agentId without URL
export const useAgentContext = (): AgentContextType => {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error("useAgentContext must be used within a StreamProvider");
  }
  return context;
};

export default StreamContext;
