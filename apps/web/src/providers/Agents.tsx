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
};
const AgentsContext = createContext<AgentsContextType | undefined>(undefined);

export const AgentsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const deployments = getDeployments();
  const [agents, setAgents] = useState<Agent[]>([]);
  const isLoading = useRef(false);

  useEffect(() => {
    if (agents.length > 0 || isLoading.current) return;

    isLoading.current = true;
    getAgents(deployments).then(setAgents);
  }, []);

  return (
    <AgentsContext.Provider value={{ agents }}>
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
