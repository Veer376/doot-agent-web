"use client";

import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useAgentsContext } from "@/providers/Agents";

type AgentSelectionContextType = {
  /**
   * The ID of the currently selected agent in the format "assistant_id:deploymentId"
   */
  selectedAgentId: string | null;

  /**
   * Function to change the selected agent
   */
  changeSelectedAgent: (agentId: string) => void;

  /**
   * The agents from the main AgentsContext - provided for compatibility
   */
  agents: any[];
};

const AgentSelectionContext = createContext<
  AgentSelectionContextType | undefined
>(undefined);

export const AgentSelectionProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { agents } = useAgentsContext();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const { getItem, setItem } = useLocalStorage();

  // Initialize selectedAgentId from localStorage or use first agent if available
  useEffect(() => {
    try {
      // Try to get from localStorage first
      const savedAgentId = getItem("selectedAgentId");

      if (savedAgentId) {
        // Verify the agent still exists
        const agentExists = agents.some(
          (agent) =>
            `${agent.assistant_id}:${agent.deploymentId}` === savedAgentId,
        );

        if (agentExists) {
          setSelectedAgentId(savedAgentId);
          return;
        }
      }

      // Fallback: use first agent if available and none is selected
      if (agents.length > 0 && !selectedAgentId) {
        const firstAgent = agents[0];
        const newAgentId = `${firstAgent.assistant_id}:${firstAgent.deploymentId}`;
        setSelectedAgentId(newAgentId);
        setItem("selectedAgentId", newAgentId);
      }
    } catch (error) {
      console.error("Error initializing agent selection:", error);
    }
  }, [agents, getItem, setItem, selectedAgentId]);

  // Function to change the selected agent
  const changeSelectedAgent = (agentId: string) => {
    try {
      setSelectedAgentId(agentId);
      setItem("selectedAgentId", agentId);
    } catch (error) {
      console.error("Error changing selected agent:", error);
    }
  };

  return (
    <AgentSelectionContext.Provider
      value={{
        selectedAgentId,
        changeSelectedAgent,
        agents,
      }}
    >
      {children}
    </AgentSelectionContext.Provider>
  );
};

// Custom hook to use the context
export const useAgentSelection = (): AgentSelectionContextType => {
  const context = useContext(AgentSelectionContext);
  if (context === undefined) {
    throw new Error(
      "useAgentSelection must be used within an AgentSelectionProvider",
    );
  }
  return context;
};

export default AgentSelectionContext;
