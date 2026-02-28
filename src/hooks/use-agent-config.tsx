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
import { useQueryState } from "@/hooks/use-query-state";
import { useAuthSession } from "@/providers/Auth";
import { toast } from "sonner";
import { createClient } from "@/lib/client";
import { invoke, isElectron } from "@/lib/electron";

/**
 * A custom hook for managing and accessing the configurable
 * fields on an agent.
 *
 * Supports both cloud agents (fetches schema via LangGraph SDK) and
 * local Electron agents (fetches schema via `agents:schema` IPC).
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

  // ── Shared: process schema object into config UI state ──────────────────
  const processSchema = useCallback(
    (agent: Agent, schema: Record<string, unknown>): Record<string, any> => {
      const { configFields, toolConfig, ragConfig, agentsConfig } =
        // Cast: our local JSON schema and the SDK's GraphSchema["config_schema"] are
        // structurally compatible — both have `{ type, properties }`.
        extractConfigurationsFromAgent({
          agent: agent as any,
          schema: schema as any,
        });

      const agentId = agent.assistant_id;
      const { setDefaultConfig } = useConfigStore.getState();

      setConfigurations(configFields);
      setToolConfigurations(toolConfig);
      setDefaultConfig(agentId, configFields);

      const nextSupportedConfigs: string[] = [];

      if (toolConfig.length) {
        setDefaultConfig(`${agentId}:selected-tools`, toolConfig);
        setToolConfigurations(toolConfig);
        nextSupportedConfigs.push("tools");
      }
      if (ragConfig.length) {
        if (chatWithCollectionId) {
          ragConfig[0].default = {
            ...ragConfig[0].default,
            collections: [chatWithCollectionId],
          };
        }
        setDefaultConfig(`${agentId}:rag`, ragConfig);
        setRagConfigurations(ragConfig);
        nextSupportedConfigs.push("rag");
      }
      if (agentsConfig.length) {
        setDefaultConfig(`${agentId}:agents`, agentsConfig);
        setAgentsConfigurations(agentsConfig);
        nextSupportedConfigs.push("supervisor");
      }
      setSupportedConfigs(nextSupportedConfigs);

      return getConfigurableDefaults(
        configFields,
        toolConfig,
        ragConfig,
        agentsConfig,
      );
    },
    [chatWithCollectionId],
  );

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
        // ── Local agent path ─────────────────────────────────────────────
        if (agent.metadata?.source === "local" && isElectron()) {
          const schema = await invoke<Record<string, unknown> | null>(
            "agents:schema",
            agent.graph_id,
          );

          if (!schema) {
            // Graph has no registered schema — return empty config
            return {
              name: agent.name,
              description:
                (agent.metadata?.description as string | undefined) ?? "",
              config: agent.config?.configurable ?? {},
            };
          }

          const configurableDefaults = processSchema(agent, schema);

          // Merge in any already-saved graphConfig values as defaults.
          // User-created agents store their config in the top-level `graphConfig`
          // field (not inside `config.configurable`).
          const savedConfig =
            (agent as any).graphConfig ?? agent.config?.configurable ?? {};
          return {
            name: agent.name,
            description:
              (agent.metadata?.description as string | undefined) ?? "",
            config: { ...configurableDefaults, ...savedConfig },
          };
        }

        // ── Cloud agent path ─────────────────────────────────────────────
        if (!session?.accessToken) {
          toast.error("No access token found", { richColors: true });
          return {
            name: agent.name,
            description:
              (agent.metadata?.description as string | undefined) ?? "",
            config: {},
          };
        }

        const client = createClient(session.accessToken);
        const schemas = await client.assistants.getSchemas(agent.assistant_id);
        const schema = schemas.config_schema ?? undefined;

        if (!schema)
          return {
            name: agent.name,
            description:
              (agent.metadata?.description as string | undefined) ?? "",
            config: {},
          };

        const configurableDefaults = processSchema(
          agent,
          schema as Record<string, unknown>,
        );

        return {
          name: agent.name,
          description:
            (agent.metadata?.description as string | undefined) ?? "",
          config: configurableDefaults,
        };
      } finally {
        setLoading(false);
        if (chatWithCollectionId) {
          setChatWithCollectionId(null);
        }
      }
    },
    [
      clearState,
      processSchema,
      session?.accessToken,
      chatWithCollectionId,
      setChatWithCollectionId,
    ],
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
