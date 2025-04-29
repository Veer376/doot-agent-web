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
import { isDefaultAssistant } from "@/lib/agent-utils";
import { useAgents } from "@/hooks/use-agents";
import { extractConfigurationsFromAgent } from "@/lib/ui-config";

async function getAgents(
  deployments: Deployment[],
  getAgentConfigSchema: (
    agentId: string,
    deploymentId: string,
  ) => Promise<Record<string, any> | undefined>,
): Promise<Agent[]> {
  const baseApiUrl = process.env.NEXT_PUBLIC_BASE_API_URL;

  const agentsPromise: Promise<Agent[]>[] = deployments.map(
    async (deployment) => {
      const client = new Client({
        apiUrl: `${baseApiUrl}/langgraph/${deployment.id}`,
      });

      const assistants = await client.assistants.search({
        limit: 100,
      });
      const defaultAssistant =
        assistants.find((a) => isDefaultAssistant(a as Agent)) ?? assistants[0];
      const schema = await getAgentConfigSchema(
        defaultAssistant.assistant_id,
        deployment.id,
      );

      const supportedConfigs: string[] = [];
      if (schema) {
        const { toolConfig, ragConfig } = extractConfigurationsFromAgent({
          agent: defaultAssistant,
          schema,
        });
        if (toolConfig.length) {
          supportedConfigs.push("tools");
        }
        if (ragConfig.length) {
          supportedConfigs.push("rag");
        }
      }

      return assistants.map((assistant) => ({
        ...assistant,
        deploymentId: deployment.id,
        supportedConfigs,
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
};
const AgentsContext = createContext<AgentsContextType | undefined>(undefined);

export const AgentsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const agentsState = useAgents();
  const deployments = getDeployments();
  const [agents, setAgents] = useState<Agent[]>([]);
  const firstRequestMade = useRef(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (agents.length > 0 || firstRequestMade.current) return;

    firstRequestMade.current = true;
    setLoading(true);
    getAgents(deployments, agentsState.getAgentConfigSchema)
      .then(setAgents)
      .finally(() => setLoading(false));
  }, []);

  async function refreshAgents() {
    try {
      const newAgents = await getAgents(
        deployments,
        agentsState.getAgentConfigSchema,
      );
      setAgents(newAgents);
    } catch (e) {
      console.error("Failed to refresh agents", e);
    }
  }

  const agentsContextValue = {
    agents,
    loading,
    refreshAgents,
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
