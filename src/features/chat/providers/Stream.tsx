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
import { threadKeys } from "@/hooks/use-threads";
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
}: {
  children: ReactNode;
  agentId: string;
  mode: "agent" | "chat";
  accessToken?: string;
}) => {
  
  if (!accessToken) {
    toast.error("Access token must be provided");
  }

  const [threadId, setThreadId] = useQueryState("threadId");
  const queryClient = useQueryClient();

  // Compute effective agentId based on mode
  // When in chat mode, use "chat_mode" as the assistant ID for backend
  // Otherwise, use the actual selected agent ID from metadata
  const effectiveAgentId = mode === "chat" ? "chat_mode" : agentId;

  const streamValue = useTypedStream({
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
    assistantId: effectiveAgentId,
    threadId: threadId ?? null,
    onCustomEvent: (event, options) => {
      options.mutate((prev) => {
        const ui = uiMessageReducer(prev.ui ?? [], event);
        return { ...prev, ui };
      });
    },
    onThreadId: (id) => {
      setThreadId(id);
      
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
  const { data: agents = [] } = useFetchAgents();
  const [threadId] = useQueryState("threadId");
  const queryClient = useQueryClient();
  
  const { session } = useAuthContext();
  const hasApiKeys = useHasApiKeys();
  const warningShownRef = useRef<string>("");

  // State management - no persistence, local state only
  const [agentId, setSelectedAgent] = useState<string>("");
  const [mode, setMode] = useState<"agent" | "chat">("agent");

  // Track previous threadId for key computation
  const prevThreadIdRef = useRef<string | null>(null);

  useEffect(() => {
    prevThreadIdRef.current = threadId;
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
      ) : agentId ? (
        <StreamSession
          key={(prevThreadIdRef.current && threadId && prevThreadIdRef.current !== threadId) ? threadId : 'stable'}
          agentId={agentId}
          mode={mode}
          accessToken={session.accessToken}
        >
          {children}
        </StreamSession>
      ) : (
        <div className="text-muted-foreground flex w-full items-center justify-center p-6 text-sm">
          Loading agent…
        </div>
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
