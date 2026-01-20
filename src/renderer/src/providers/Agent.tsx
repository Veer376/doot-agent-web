"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useMemo,
} from "react";
import { useFetchAgents } from "@/hooks/use-agents";
import { useLocalAgents } from "@/hooks/use-local-agents";
import { isPrimaryAgent } from "@/lib/agent-utils";
import { isElectron } from "@/lib/electron";
import type { Agent } from "@/types/agent";

/**
 * AgentProvider: Global agent selection and mode management
 *
 * This provider manages agent selection and mode (agent/chat) globally.
 * It merges cloud agents (from API) and local agents (from Electron IPC).
 *
 * Provider Responsibilities:
 * - Agent selection state (agentId)
 * - Mode state (agent/chat)
 * - Auto-initialization with primary agent
 * - Merge cloud and local agents
 *
 * Dependencies:
 * - ReactQueryProvider (for useFetchAgents and useLocalAgents hooks)
 */

type AgentSource = "local" | "cloud";

interface AgentContextType {
  agentId: string;
  agentSource: AgentSource;
  setSelectedAgent: (agentId: string, source?: AgentSource) => void;
  isLocalAgentAvailable: boolean;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export function AgentProvider({ children }: { children: ReactNode }) {
  const { data: cloudAgents = [], isLoading: loadingCloud } = useFetchAgents();
  const { data: localAgents = [], isLoading: loadingLocal } = useLocalAgents();

  // Merge cloud and local agents
  const agents = useMemo(() => {
    // Add source metadata to cloud agents if not present
    const cloudAgentsWithSource = cloudAgents.map((agent) => ({
      ...agent,
      metadata: {
        ...agent.metadata,
        source: agent.metadata?.source || ("cloud" as const),
      },
    }));

    const merged = [...cloudAgentsWithSource, ...localAgents];
    return merged;
  }, [cloudAgents, localAgents]);

  const [agentId, setAgentIdState] = useState<string>("");
  const [agentSource, setAgentSource] = useState<AgentSource>("cloud");

  // Track if local agent is available (Electron environment)
  const isLocalAgentAvailable = useMemo(() => isElectron(), []);

  // Wrapper to set both agentId and source
  const setSelectedAgent = (newAgentId: string, source?: AgentSource) => {
    setAgentIdState(newAgentId);
    if (source) {
      setAgentSource(source);
    } else if (newAgentId === "local-agent") {
      // Auto-detect local agent
      setAgentSource("local");
    } else {
      setAgentSource("cloud");
    }
  };

  // Agent Resolution Priority:
  // 1. URL Parameter (?agentId=xxx) - For marketing/sharing links
  // 2. Thread Metadata (handled in Thread component when loading thread)
  // 3. User Preference - TODO: Add localStorage/DB lookup for user's preferred agent
  // 4. Primary Agent - Fallback to system's primary agent
  useEffect(() => {
    // Priority 1: URL param (for marketing/sharing)
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlAgentId = params.get("agentId");

      if (urlAgentId && agents.some((a) => a.assistant_id === urlAgentId)) {
        setSelectedAgent(urlAgentId, "cloud");

        // Clean URL param after applying to avoid sticky state on refresh
        params.delete("agentId");
        const newUrl = params.toString()
          ? `${window.location.pathname}?${params.toString()}`
          : window.location.pathname;
        window.history.replaceState({}, "", newUrl);
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
        // Determine source from agent's metadata
        const source =
          defaultAgent.metadata?.source === "local" ? "local" : "cloud";
        setSelectedAgent(defaultAgent.assistant_id, source);
      }
    }
  }, [agents, agentId]);

  return (
    <AgentContext.Provider
      value={{
        agentId,
        agentSource,
        setSelectedAgent,
        isLocalAgentAvailable,
      }}
    >
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
