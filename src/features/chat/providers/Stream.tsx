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
// Removed agent selection UI; auto-select a default agent instead
import { toast } from "sonner";
import { isUserSpecifiedDefaultAgent } from "@/lib/agent-utils";
import { useAuthContext } from "@/providers/Auth";
import { useHasApiKeys } from "@/hooks/use-api-keys";
import { checkApiKeysWarning } from "@/lib/agent-utils";
import { useQueryClient } from "@tanstack/react-query";
import { threadKeys } from "@/hooks/use-threads";
import { useThreadAgent } from "@/hooks/use-thread-agent";
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

// PHASE 3: Agent Context for accessing agentId without URL
// PHASE 4: Add isChatMode to separate UI mode from agent selection
type AgentContextType = {
  agentId: string;
  setAgentId: (agentId: string) => void;
  isChatMode: boolean;
  setChatMode: (isChatMode: boolean) => void;
};
const AgentContext = createContext<AgentContextType | undefined>(undefined);

const StreamSession = ({
  children,
  agentId,
  isChatMode,
  accessToken,
}: {
  children: ReactNode;
  agentId: string;
  isChatMode: boolean;
  accessToken?: string;
}) => {
  if (!accessToken) {
    toast.error("Access token must be provided");
  }

  const [threadId, setThreadId] = useQueryState("threadId");
  const queryClient = useQueryClient();

  // Phase 2: Thread-Agent Persistence
  const { saveThreadAgent } = useThreadAgent();

  // PHASE 4: Compute effective agentId based on chat mode
  // When in chat mode, use "chat_mode" as the assistant ID for backend
  // Otherwise, use the actual selected agent ID
  const effectiveAgentId = isChatMode ? "chat_mode" : agentId;

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

      // Phase 2: Save thread-agent mapping when thread is created
      // This ensures new threads remember which agent was used
      // PHASE 4: Only save actual agent IDs, not chat mode
      if (!isChatMode) {
        saveThreadAgent(id, agentId);
      }

      // Invalidate thread list cache to show new thread immediately
      queryClient.invalidateQueries({ queryKey: threadKeys.lists() });
    },
    defaultHeaders: {
      Authorization: `Bearer ${accessToken}`,
      "x-supabase-access-token": accessToken,
    },
  });

  // REFACTOR: AgentContext.Provider moved to StreamProvider
  // StreamSession now only provides StreamContext (single responsibility)
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

  // PHASE 3: Remove agentId from URL, use localStorage instead
  const [threadId] = useQueryState("threadId");
  const [agentId, setAgentId] = useState<string>("");
  // PHASE 4: Separate chat mode state from agentId
  const [isChatMode, setChatMode] = useState<boolean>(false);
  const { getThreadAgent, getLastUsedAgent, saveThreadAgent } =
    useThreadAgent();

  const { session } = useAuthContext();
  const hasApiKeys = useHasApiKeys();
  const warningShownRef = useRef<string>("");

  // PHASE 3: Load agent from localStorage when threadId changes
  useEffect(() => {
    if (threadId) {
      // Priority: Thread's remembered agent > Current agent (keep it) > Last used > Default
      const threadAgent = getThreadAgent(threadId);

      if (threadAgent) {
        setAgentId(threadAgent);
      } else {
        // Thread not in localStorage yet - keep current agent or use fallback
        const fallbackAgent = agentId || getLastUsedAgent() || "";
        if (fallbackAgent) {
          setAgentId(fallbackAgent);
          saveThreadAgent(threadId, fallbackAgent); // Remember for next time
        }
      }
    } else {
      // No thread - try to restore last used agent
      const lastUsed = getLastUsedAgent();
      if (lastUsed && !agentId) {
        setAgentId(lastUsed);
      }
    }
  }, [threadId, agentId, getThreadAgent, getLastUsedAgent, saveThreadAgent]); // Only depend on threadId to avoid loops

  // Auto-select a default agent when none is chosen yet
  useEffect(() => {
    if (agentId || !agents.length) return;
    const defaultAgent = agents.find(isUserSpecifiedDefaultAgent) ?? agents[0];
    if (defaultAgent) {
      setAgentId(defaultAgent.assistant_id);
    }
  }, [agents, agentId]);

  useEffect(() => {
    if (agentId) {
      if (warningShownRef.current !== agentId) {
        checkApiKeysWarning(hasApiKeys);
        warningShownRef.current = agentId;
      }
    }
  }, [agentId, hasApiKeys]);

  // REFACTOR: Wrap everything in AgentContext.Provider
  // This makes agentId available to both agent selector AND children
  return (
    <AgentContext.Provider
      value={{ agentId, setAgentId, isChatMode, setChatMode }}
    >
      {!session?.accessToken ? (
        // No access token - show error
        <>
          {toast.error("Access token must be provided")}
          {null}
        </>
      ) : agentId ? (
        // Has agentId and access token - show stream session
        <StreamSession
          agentId={agentId}
          isChatMode={isChatMode}
          accessToken={session.accessToken}
        >
          {children}
        </StreamSession>
      ) : (
        // Auto-selection in progress
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
