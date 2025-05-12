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
import { Deployment } from "@/types/deployment";
import {
  groupAgentsByGraphs,
  isDefaultAssistant,
  isPrimaryAssistant,
} from "@/lib/agent-utils";
import { useAgents } from "@/hooks/use-agents";
import { extractConfigurationsFromAgent } from "@/lib/ui-config";
import { createClient } from "@/lib/client";
import { useAuthContext } from "./Auth";
import { toast } from "sonner";
import { Assistant, Client } from "@langchain/langgraph-sdk";

// async function createDefaultAssistant(
//   client: Client,
//   graphId: string,
//   args: {
//     isDefault: boolean;
//     isPrimary: boolean
//   }
// ) {
//   try {
//     const assistant = await client.assistants.create({
//       graphId,
//       name: `${isDefault ? "Default" : "Primary"} Assistant`,
//       metadata: {
//         description: `${isDefault ? "Default" : "Primary"}  Assistant`,
//         ...(isDefault && { _x_oap_is_default: true }),
//       },
//     });
//     return assistant;
//   } catch (e) {
//     console.error("Failed to create default assistant", e);
//     toast.error("Failed to create default assistant");
//     return undefined;
//   }
// }

async function getOrCreateDefaultAssistants(
  deployment: Deployment,
  accessToken?: string,
): Promise<Assistant[]> {
  /**
   * For each deployment, fetch all assistants twice.
   * First, fetch all assistants created by the system.
   * Second, fetch all assistants with the metadata `_x_oap_is_default: true`.
   * This metadata flag indicates it's the default assistant (but still user scoped).
   *
   * If the array lengths match, we've already created all the default assistants.
   *
   * If the array lengths don't match, we need to create the missing default assistants.
   * For these new assistants, ensure we create one for each graph in the deployment
   * (we can get this by iterating over the default created_by: "system" assistants since
   * there will only be one of those per graph). Then, for each new graph, create an assistant
   * with the metadata `_x_oap_is_default: true`. When creating this assistant, we should also check
   * if that graph is the primary graph id. If true, we should add the metadata `_x_oap_is_primary: true`.
   */

  // Do NOT pass in an access token here. We want to use LangSmith auth.
  const client = createClient(deployment.id);
  const [systemDefaultAssistants, userDefaultAssistants] = await Promise.all([
    client.assistants.search({
      limit: 100,
      metadata: {
        created_by: "system",
      },
    }),
    client.assistants.search({
      limit: 100,
      metadata: {
        _x_oap_is_default: true,
      },
    }),
  ]);
  if (!systemDefaultAssistants.length) {
    throw new Error("Failed to find default system assistants.");
  }
  if (systemDefaultAssistants.length === userDefaultAssistants.length) {
    // User has already created all default assistants.
    return userDefaultAssistants;
  }

  // Find all assistants which are created by the system, but do not have a corresponding user defined default assistant.
  const missingDefaultAssistants = systemDefaultAssistants.filter(
    (assistant) =>
      !userDefaultAssistants.some((a) => a.graph_id === assistant.graph_id),
  );

  // Create a new client, passing in the access token to use user scoped auth.
  const newClient = createClient(deployment.id, accessToken);
  const newUserDefaultAssistantsPromise = missingDefaultAssistants.map(
    async (assistant) => {
      const isDefaultDeploymentAndGraph =
        deployment.isDefault &&
        deployment.defaultGraphId === assistant.graph_id;
      return await newClient.assistants.create({
        graphId: assistant.graph_id,
        name: `${isDefaultDeploymentAndGraph ? "Default" : "Primary"} Assistant`,
        metadata: {
          _x_oap_is_default: true,
          description: `${isDefaultDeploymentAndGraph ? "Default" : "Primary"}  Assistant`,
          ...(isDefaultDeploymentAndGraph && { _x_oap_is_primary: true }),
        },
      });
    },
  );

  const newUserDefaultAssistants = [
    ...userDefaultAssistants,
    ...(await Promise.all(newUserDefaultAssistantsPromise)),
  ];

  if (systemDefaultAssistants.length === newUserDefaultAssistants.length) {
    // We've successfully created all the default assistants, for every graph.
    return newUserDefaultAssistants;
  }

  throw new Error(
    `Failed to create default assistants for deployment ${deployment.id}. Expected ${systemDefaultAssistants.length} default assistants, but found/created ${newUserDefaultAssistants.length}.`,
  );
}

async function getAgents(
  deployments: Deployment[],
  accessToken: string,
  getAgentConfigSchema: (
    agentId: string,
    deploymentId: string,
  ) => Promise<Record<string, any> | undefined>,
): Promise<Agent[]> {
  const agentsPromise: Promise<Agent[]>[] = deployments.map(
    async (deployment) => {
      const client = createClient(deployment.id, accessToken);

      const [defaultAssistants, allUserAssistants] = await Promise.all([
        getOrCreateDefaultAssistants(deployment, accessToken),
        client.assistants.search({
          limit: 100,
        }),
      ]);

      const assistantMap = new Map<string, Assistant>();

      // Add default assistants to the map
      defaultAssistants.forEach((assistant) => {
        assistantMap.set(assistant.assistant_id, assistant);
      });

      // Add user assistants to the map, potentially overriding defaults
      allUserAssistants.forEach((assistant) => {
        assistantMap.set(assistant.assistant_id, assistant);
      });

      // Convert map values back to array
      const allAssistants: Assistant[] = Array.from(assistantMap.values());

      const assistantsGroupedByGraphs = groupAgentsByGraphs(allAssistants);

      const assistantsPromise: Promise<Agent[]>[] =
        assistantsGroupedByGraphs.map(async (group) => {
          // We must get the agent config schema for each graph in a deployment,
          // not just for each deployment, as a deployment can have multiple graphs
          // each with their own unique config schema.
          const defaultAssistant =
            group.find((a) => isDefaultAssistant(a)) ?? group[0];
          const schema = await getAgentConfigSchema(
            defaultAssistant.assistant_id,
            deployment.id,
          );

          const supportedConfigs: string[] = [];
          if (schema) {
            const { toolConfig, ragConfig, agentsConfig } =
              extractConfigurationsFromAgent({
                agent: defaultAssistant,
                schema,
              });
            if (toolConfig.length) {
              supportedConfigs.push("tools");
            }
            if (ragConfig.length) {
              supportedConfigs.push("rag");
            }
            if (agentsConfig.length) {
              supportedConfigs.push("supervisor");
            }
          }

          return group.map((assistant) => ({
            ...assistant,
            deploymentId: deployment.id,
            supportedConfigs: supportedConfigs as [
              "tools" | "rag" | "supervisor",
            ],
          }));
        });

      return (await Promise.all(assistantsPromise)).flat();
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
   * Whether the agents list is currently loading.
   */
  refreshAgentsLoading: boolean;
};
const AgentsContext = createContext<AgentsContextType | undefined>(undefined);

export const AgentsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { session } = useAuthContext();
  const agentsState = useAgents();
  const deployments = getDeployments();
  const [agents, setAgents] = useState<Agent[]>([]);
  const firstRequestMade = useRef(false);
  const [loading, setLoading] = useState(false);
  const [refreshAgentsLoading, setRefreshAgentsLoading] = useState(false);

  useEffect(() => {
    if (agents.length > 0 || firstRequestMade.current || !session?.accessToken)
      return;

    firstRequestMade.current = true;
    setLoading(true);
    getAgents(
      deployments,
      session.accessToken,
      agentsState.getAgentConfigSchema,
    )
      .then(setAgents)
      .finally(() => setLoading(false));
  }, [session?.accessToken]);

  async function refreshAgents() {
    if (!session?.accessToken) {
      toast.error("No access token found", {
        richColors: true,
      });
      return;
    }
    try {
      setRefreshAgentsLoading(true);
      const newAgents = await getAgents(
        deployments,
        session.accessToken,
        agentsState.getAgentConfigSchema,
      );
      setAgents(newAgents);
    } catch (e) {
      console.error("Failed to refresh agents", e);
    } finally {
      setRefreshAgentsLoading(false);
    }
  }

  const agentsContextValue = {
    agents,
    loading,
    refreshAgents,
    refreshAgentsLoading,
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
