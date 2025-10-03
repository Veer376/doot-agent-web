"use client";

import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useRef,
} from "react";
import { Agent } from "@/types/agent";
import {
  groupAgentsByGraphs,
  isSystemCreatedDefaultAssistant,
  isUserCreatedDefaultAssistant,
} from "@/lib/agent-utils";
import { useAgents } from "@/hooks/use-agents";
import { extractConfigurationsFromAgent } from "@/lib/ui-config";
import { createClient } from "@/lib/client";
import { useAuthContext } from "./Auth";
import { toast } from "sonner";
import { Assistant } from "@langchain/langgraph-sdk";
import { Client } from "@langchain/langgraph-sdk";
import { List } from "lucide-react";

async function getOrCreateDefaultAssistants(
  accessToken?: string,
): Promise<Assistant[]> {
  const baseApiUrl = process.env.NEXT_PUBLIC_BASE_API_URL;
  if (!baseApiUrl) {
    throw new Error(
      "Failed to get default assistants: Base API URL not configured. Please set NEXT_PUBLIC_BASE_API_URL",
    );
  }

  try {
    const url = `${baseApiUrl}/defaults`;
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to get default assistants: ${response.status} ${response.statusText} ${errorData.error || ""}`,
      );
    }

    const defaultAssistants = await response.json();
    return defaultAssistants;
  } catch (error) {
    console.error("Error getting default assistants:", error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

async function getAgents(
  accessToken: string,
  getAgentConfigSchema: (
    agentId: string,
  ) => Promise<Record<string, any> | undefined>,
): Promise<Agent[]> {
  const client = createClient(accessToken);
  /*featches system, default and user assistants
    system assistants - are assistants created by the system, visible to user, but doesn't user the graph_id from templates and hence not configurble.
    default assistants - are assistants created by the system, visible to user, and uses the graph_id from templates and hence configurble.
    user assistants - are assistants created by the user, visible to user, and uses the graph_id from templates and hence configurble.
  */
  const assistants = await client.assistants.search({
    limit: 100,
  });
  console.log(`Assistants: ${JSON.stringify(assistants)}`);

  // TODO: filter out user and system assistants
  const assistantMap = new Map<string, Assistant>(); //<id: assistant>

  assistants.forEach((assistant) => {
    assistantMap.set(assistant.assistant_id, assistant);
  });

  const assistantsGroupedByGraphs = groupAgentsByGraphs(
    Array.from(assistantMap.values()),
  );

  const assistantsPromise: Promise<Agent[]>[] = assistantsGroupedByGraphs.map(
    async (group) => {
      // We must get the agent config schema for each graph in a deployment,
      // not just for each deployment, as a deployment can have multiple graphs
      // each with their own unique config schema.

      const defaultAssistant =
        group.find((a) => isUserCreatedDefaultAssistant(a)) ?? group[0];
      const schema = await getAgentConfigSchema(defaultAssistant.assistant_id);

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
        supportedConfigs: supportedConfigs as ["tools" | "rag" | "supervisor"],
      }));
    },
  );

  return (await Promise.all(assistantsPromise)).flat();
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
  const [agents, setAgents] = useState<Agent[]>([]);
  const firstRequestMade = useRef(false);
  const [loading, setLoading] = useState(false);
  const [refreshAgentsLoading, setRefreshAgentsLoading] = useState(false);

  useEffect(() => {
    if (agents.length > 0 || firstRequestMade.current || !session?.accessToken)
      return;

    firstRequestMade.current = true;
    setLoading(true);
    getAgents(session.accessToken, agentsState.getAgentConfigSchema)
      .then((a) => {
        setAgents(a.filter((a) => !isSystemCreatedDefaultAssistant(a)));
      })
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
        session.accessToken,
        agentsState.getAgentConfigSchema,
      );
      // EDIT: we are showing the system assistants.
      // setAgents(newAgents.filter((a) => !isSystemCreatedDefaultAssistant(a)));
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
