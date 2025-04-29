"use client";

import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useRef,
} from "react";
import { getDeployments } from "@/lib/environment/deployments";
import { Agent } from "@/types/agent";
import { Client } from "@langchain/langgraph-sdk";
import { Deployment } from "@/types/deployment";

async function getAgents(deployments: Deployment[]): Promise<Agent[]> {
  const baseApiUrl = process.env.NEXT_PUBLIC_BASE_API_URL;

  const agentsPromise: Promise<Agent[]>[] = deployments.map(
    async (deployment) => {
      const client = new Client({
        apiUrl: `${baseApiUrl}/langgraph/${deployment.id}`,
      });

      const assistants = await client.assistants.search({
        limit: 100,
      });

      return assistants.map((assistant) => ({
        ...assistant,
        deploymentId: deployment.id,
      }));
    },
  );

  return (await Promise.all(agentsPromise)).flat();
}

type AgentsContextType = {
  /**
   * A two-dimensional array of agents.
   * Each subarray contains the agents for a specific deployment.
   */
  agents: Agent[];
  /**
   * Refreshes the agents list by fetching the latest agents from the API,
   * and updating the state.
   */
  refreshAgents: () => Promise<void>;
  /**
   * Whether the agents list is currently loading.
   */
  loading: boolean;
  /**
   * The currently selected agent's ID (format: "assistant_id:deploymentId")
   */
  selectedAgentId: string | null;
  /**
   * Function to change the selected agent
   */
  changeSelectedAgent: (_agentId: string) => void;
};
const AgentsContext = createContext<AgentsContextType | undefined>(undefined);

export const AgentsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const deployments = getDeployments();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const firstRequestMade = useRef(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (agents.length > 0 || firstRequestMade.current) return;

    firstRequestMade.current = true;
    setLoading(true);
    getAgents(deployments)
      .then((fetchedAgents) => {
        setAgents(fetchedAgents);
        // Select the first agent by default if none is selected
        if (!selectedAgentId && fetchedAgents.length > 0) {
          const firstAgent = fetchedAgents[0];
          setSelectedAgentId(
            `${firstAgent.assistant_id}:${firstAgent.deploymentId}`,
          );
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function refreshAgents() {
    try {
      const newAgents = await getAgents(deployments);
      setAgents(newAgents);
    } catch (e) {
      console.error("Failed to refresh agents", e);
    }
  }

  const changeSelectedAgent = (agentId: string) => {
    setSelectedAgentId(agentId);
  };

  const agentsContextValue = {
    agents,
    loading,
    refreshAgents,
    selectedAgentId,
    changeSelectedAgent,
  };

  return (
    <AgentsContext.Provider value={agentsContextValue}>
      {children}
    </AgentsContext.Provider>
  );
};

// Create a custom hook to use the context
export const useAgentsContext = (): AgentsContextType => {
  const context = useContext(AgentsContext);
  if (context === undefined) {
    throw new Error("useAgentsContext must be used within a StreamProvider");
  }
  return context;
};

export default AgentsContext;
