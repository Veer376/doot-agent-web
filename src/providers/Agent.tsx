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

  // Agent Resolution Priority:
  // 1. URL Parameter (?agentId=xxx) - For marketing/sharing links
  // 2. Thread Metadata (handled in Thread component when loading thread)
  // 3. User Preference - TODO: Add localStorage/DB lookup for user's preferred agent
  // 4. Primary Agent - Fallback to system's primary agent
  useEffect(() => {
    // Priority 1: URL param (for marketing/sharing)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlAgentId = params.get('agentId');
      
      if (urlAgentId && agents.some((a) => a.assistant_id === urlAgentId)) {
        setSelectedAgent(urlAgentId);
        setMode('agent');
        
        // Clean URL param after applying to avoid sticky state on refresh
        params.delete('agentId');
        const newUrl = params.toString() 
          ? `${window.location.pathname}?${params.toString()}` 
          : window.location.pathname;
        window.history.replaceState({}, '', newUrl);
        return; // Skip fallback logic
      }
    }

    // Priority 3: User Preference
    // TODO: Add localStorage/DB lookup for user's preferred default agent
    // const savedAgentId = localStorage.getItem('preferredAgentId');
    // if (savedAgentId && agents.some(a => a.assistant_id === savedAgentId)) {
    //   setSelectedAgent(savedAgentId);
    //   return;
    // }

    // Priority 4: Primary agent fallback (existing logic)
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
