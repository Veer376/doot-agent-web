import {
  ConfigurableFieldAgentsMetadata,
  ConfigurableFieldMCPMetadata,
  ConfigurableFieldRAGMetadata,
  ConfigurableFieldUIMetadata,
} from "@/types/configurable";
import { useCallback, useState } from "react";
import {
  extractConfigurationsFromAgent,
  getConfigurableDefaults,
} from "@/lib/ui-config";
import { useConfigStore } from "@/features/chat/hooks/use-config-store";
import { Agent } from "@/types/agent";
import { useQueryState } from "nuqs";
import { useAuthSession } from "@/providers/Auth";
import { toast } from "sonner";
import { createClient } from "@/lib/client";

/**
 * A custom hook for managing and accessing the configurable
 * fields on an agent.
 */
export function useAgentConfig() {
  const { session } = useAuthSession();
  const [chatWithCollectionId, setChatWithCollectionId] = useQueryState(
    "chatWithCollectionId",
  );

  const [configurations, setConfigurations] = useState<
    ConfigurableFieldUIMetadata[]
  >([]);
  const [toolConfigurations, setToolConfigurations] = useState<
    ConfigurableFieldMCPMetadata[]
  >([]);
  const [ragConfigurations, setRagConfigurations] = useState<
    ConfigurableFieldRAGMetadata[]
  >([]);
  const [agentsConfigurations, setAgentsConfigurations] = useState<
    ConfigurableFieldAgentsMetadata[]
  >([]);

  const [supportedConfigs, setSupportedConfigs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const clearState = useCallback(() => {
    setConfigurations([]);
    setToolConfigurations([]);
    setRagConfigurations([]);
    setAgentsConfigurations([]);
    setLoading(false);
  }, []);

  const getSchemaAndUpdateConfig = useCallback(
    async (
      agent: Agent,
    ): Promise<{
      name: string;
      description: string;
      config: Record<string, any>;
    }> => {
      clearState();

      setLoading(true);
      try {
        if (!session?.accessToken) {
          toast.error("No access token found", {
            richColors: true,
          });
          return {
            name: agent.name,
            description:
              (agent.metadata?.description as string | undefined) ?? "",
            config: {},
          };
        }

        const client = createClient(session.accessToken);
        const schemas = await client.assistants.getSchemas(
          agent.assistant_id,
        );
        const schema = schemas.config_schema ?? undefined;
        
        if (!schema)
          return {
            name: agent.name,
            description:
              (agent.metadata?.description as string | undefined) ?? "",
            config: {},
          };
        const { configFields, toolConfig, ragConfig, agentsConfig } =
          extractConfigurationsFromAgent({
            agent,
            schema,
          });

        const agentId = agent.assistant_id;

        setConfigurations(configFields);
        setToolConfigurations(toolConfig);

        // Set default config values based on configuration fields
        const { setDefaultConfig } = useConfigStore.getState();
        setDefaultConfig(agentId, configFields);

        const supportedConfigs: string[] = [];

        if (toolConfig.length) {
          setDefaultConfig(`${agentId}:selected-tools`, toolConfig);
          setToolConfigurations(toolConfig);
          supportedConfigs.push("tools");
        }
        if (ragConfig.length) {
          if (chatWithCollectionId) {
            ragConfig[0].default = {
              ...ragConfig[0].default,
              collections: [chatWithCollectionId],
            };
            // Clear from query params so it's not set again.
            setChatWithCollectionId(null);
          }
          setDefaultConfig(`${agentId}:rag`, ragConfig);
          setRagConfigurations(ragConfig);
          supportedConfigs.push("rag");
        }
        if (agentsConfig.length) {
          setDefaultConfig(`${agentId}:agents`, agentsConfig);
          setAgentsConfigurations(agentsConfig);
          supportedConfigs.push("supervisor");
        }
        setSupportedConfigs(supportedConfigs);

        const configurableDefaults = getConfigurableDefaults(
          configFields,
          toolConfig,
          ragConfig,
          agentsConfig,
        );

        return {
          name: agent.name,
          description:
            (agent.metadata?.description as string | undefined) ?? "",
          config: configurableDefaults,
        };
      } finally {
        setLoading(false);
      }
    },
    [clearState, session?.accessToken],
  );

  return {
    clearState,
    getSchemaAndUpdateConfig,
 
    configurations,
    toolConfigurations,
    ragConfigurations,
    agentsConfigurations,
    supportedConfigs,

    loading,
  };
}
