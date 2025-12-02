"use client";

import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { useFetchAgents } from "@/hooks/use-agents";
import { isPrimaryAgent } from "@/lib/agent-utils";

/**
 * AgentProvider: Global agent selection and mode management
 * 
 * This provider manages agent selection and mode (agent/chat) globally.
 * It was extracted from StreamProvider to follow Single Responsibility Principle.
 * 
 * Provider Responsibilities:
 * - Agent selection state (agentId)
 * - Mode state (agent/chat)
 * - Auto-initialization with primary agent
 * 
 * Dependencies:
 * - ReactQueryProvider (for useFetchAgents hook)
 */

interface AgentContextType {
  agentId: string;
  setSelectedAgent: (agentId: string) => void;
  mode: "agent" | "chat";
  setMode: (mode: "agent" | "chat") => void;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export function AgentProvider({ children }: { children: ReactNode }) {
  const { data: agents = [] } = useFetchAgents();
  const [agentId, setSelectedAgent] = useState<string>("");
  const [mode, setMode] = useState<"agent" | "chat">("chat");

  // Initialize with primary agent on mount
  useEffect(() => {
    if (!agentId && agents.length > 0) {
      const defaultAgent = agents.find(isPrimaryAgent) ?? agents[0];
      if (defaultAgent) {
        setSelectedAgent(defaultAgent.assistant_id);
      }
    }
  }, [agents, agentId]);

  return (
    <AgentContext.Provider value={{ agentId, setSelectedAgent, mode, setMode }}>
      {children}
    </AgentContext.Provider>
  );
}

export function useAgentContext(): AgentContextType {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error("useAgentContext must be used within an AgentProvider");
  }
  return context;
}
