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
import { LangGraphLogoSVG } from "@/components/icons/langgraph";
import { AgentsCombobox } from "@/components/ui/agents-combobox";
import { useAgentsContext } from "@/providers/Agents";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { isUserSpecifiedDefaultAgent } from "@/lib/agent-utils";
import { useAuthContext } from "@/providers/Auth";
import { useHasApiKeys } from "@/hooks/use-api-keys";
import { checkApiKeysWarning } from "@/lib/agent-utils";
import { useQueryClient } from "@tanstack/react-query";
import { threadKeys } from "@/hooks/use-threads";
import { useThreadAgent } from "@/hooks/use-thread-agent";

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
type AgentContextType = {
  agentId: string;
  setAgentId: (agentId: string) => void;
};
const AgentContext = createContext<AgentContextType | undefined>(undefined);

const StreamSession = ({
  children,
  agentId,
  accessToken,
}: {
  children: ReactNode;
  agentId: string;
  accessToken?: string;
}) => {
  if (!accessToken) {
    toast.error("Access token must be provided");
  }

  const [threadId, setThreadId] = useQueryState("threadId");
  const queryClient = useQueryClient();

  // Phase 2: Thread-Agent Persistence
  const { saveThreadAgent } = useThreadAgent();

  const streamValue = useTypedStream({
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
    assistantId: agentId,
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
      saveThreadAgent(id, agentId);

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
  const { agents, loading } = useAgentsContext();

  // PHASE 3: Remove agentId from URL, use localStorage instead
  const [threadId] = useQueryState("threadId");
  const [agentId, setAgentId] = useState<string>("");
  const { getThreadAgent, getLastUsedAgent, saveThreadAgent } =
    useThreadAgent();

  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [open, setOpen] = useState(false);
  const { session } = useAuthContext();
  const hasApiKeys = useHasApiKeys();
  const warningShownRef = useRef<string>("");

  // PHASE 3: Load agent from localStorage when threadId changes
  useEffect(() => {
    if (threadId) {
      // Priority: Thread's remembered agent > Current agent (keep it) > Last used > Default
      const threadAgent = getThreadAgent(threadId);

      if (threadAgent) {
        console.log(
          `[Phase 3] Loading thread ${threadId} with remembered agent: ${threadAgent}`,
        );
        setAgentId(threadAgent);
      } else {
        // Thread not in localStorage yet - keep current agent or use fallback
        const fallbackAgent = agentId || getLastUsedAgent() || "";
        if (fallbackAgent) {
          console.log(
            `[Phase 3] Thread ${threadId} has no remembered agent, using fallback: ${fallbackAgent}`,
          );
          setAgentId(fallbackAgent);
          saveThreadAgent(threadId, fallbackAgent); // Remember for next time
        }
      }
    } else {
      // No thread - try to restore last used agent
      const lastUsed = getLastUsedAgent();
      if (lastUsed && !agentId) {
        console.log(
          `[Phase 3] No thread, loading last used agent: ${lastUsed}`,
        );
        setAgentId(lastUsed);
      }
    }
  }, [threadId]); // Only depend on threadId to avoid loops

  useEffect(() => {
    if (selectedAgentId || !agents.length) {
      return;
    }
    const defaultAgent = agents.find(isUserSpecifiedDefaultAgent);
    if (defaultAgent) {
      setSelectedAgentId(`${defaultAgent.assistant_id}`);
    }
  }, [agents, selectedAgentId]);

  useEffect(() => {
    if (agentId) {
      if (warningShownRef.current !== agentId) {
        checkApiKeysWarning(hasApiKeys);
        warningShownRef.current = agentId;
      }
    }
  }, [agentId, hasApiKeys]);

  const handleValueChange = (v: string) => {
    setSelectedAgentId(v);
    setOpen(false);
  };

  const handleStartChat = () => {
    if (!selectedAgentId) {
      toast.info("Please select an agent");
      return;
    }
    setAgentId(selectedAgentId);
  };

  // REFACTOR: Wrap everything in AgentContext.Provider
  // This makes agentId available to both agent selector AND children
  return (
    <AgentContext.Provider value={{ agentId, setAgentId }}>
      {/* Show the form if we don't have an assistant ID */}
      {!agentId ? (
        <div className="flex w-full items-center justify-center p-4">
          <div className="animate-in fade-in-0 zoom-in-95 bg-background flex min-h-64 max-w-3xl flex-col rounded-lg border shadow-lg">
            <div className="mt-14 flex flex-col gap-2 p-6">
              <div className="flex flex-col items-start gap-2">
                <LangGraphLogoSVG className="h-7" />
                <h1 className="text-xl font-semibold tracking-tight">
                  Open Agent Platform
                </h1>
              </div>
              <p className="text-muted-foreground">
                Welcome to Open Agent Platform's chat! To continue, please
                select an agent to chat with.
              </p>
            </div>
            <div className="mb-24 grid grid-cols-[1fr_auto] gap-4 px-6 pt-4">
              <AgentsCombobox
                disableDeselect
                agents={agents}
                agentsLoading={loading}
                value={selectedAgentId}
                setValue={(v) =>
                  Array.isArray(v)
                    ? handleValueChange(v[0])
                    : handleValueChange(v)
                }
                open={open}
                setOpen={setOpen}
              />
              <Button onClick={handleStartChat}>Start Chat</Button>
            </div>
          </div>
        </div>
      ) : !session?.accessToken ? (
        // No access token - show error
        <>
          {toast.error("Access token must be provided")}
          {null}
        </>
      ) : (
        // Has agentId and access token - show stream session
        <StreamSession
          agentId={agentId}
          accessToken={session.accessToken}
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
