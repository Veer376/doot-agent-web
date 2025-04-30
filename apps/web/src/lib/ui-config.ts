import {
  ConfigurableFieldMCPMetadata,
  ConfigurableFieldRAGMetadata,
  ConfigurableFieldUIMetadata,
} from "@/types/configurable";
import { Assistant, GraphSchema } from "@langchain/langgraph-sdk";

/**
 * Converts a LangGraph configuration schema into an array of UI metadata
 * for configurable fields.
 *
 * This function iterates through the properties of the provided schema,
 * looking for a specific metadata field (`x_lg_ui_config`). If found,
 * it extracts the UI configuration and constructs a ConfigurableFieldUIMetadata
 * object, using the property key as the label.
 *
 * @param schema - The LangGraph configuration schema to process.
 * @returns An array of ConfigurableFieldUIMetadata objects representing
 *          the UI configuration for fields found in the schema, or an empty
 *          array if the schema is invalid or contains no UI configurations.
 */
export function configSchemaToConfigurableFields(
  schema: GraphSchema["config_schema"],
): ConfigurableFieldUIMetadata[] {
  if (!schema || !schema.properties) {
    return [];
  }

  const fields: ConfigurableFieldUIMetadata[] = [];
  for (const [key, value] of Object.entries(schema.properties)) {
    if (
      typeof value === "object" &&
      "metadata" in value &&
      value.metadata &&
      typeof value.metadata === "object" &&
      "x_lg_ui_config" in value.metadata &&
      value.metadata.x_lg_ui_config &&
      typeof value.metadata.x_lg_ui_config === "object"
    ) {
      if (
        "type" in value.metadata.x_lg_ui_config &&
        ["mcp_server_url", "tools_list", "rag"].includes(
          value.metadata.x_lg_ui_config.type as string,
        )
      ) {
        // Do not set configurable fields for MCP in this func.
        continue;
      }
      const uiConfig = value.metadata.x_lg_ui_config as Omit<
        ConfigurableFieldUIMetadata,
        "label"
      >;
      fields.push({
        label: key,
        ...uiConfig,
      });
    } else {
      // If the `x_lg_ui_config` metadata is not found, default to text input
      fields.push({
        label: key,
        type: "text",
      });
    }
  }
  return fields;
}

export function configSchemaToConfigurableTools(
  schema: GraphSchema["config_schema"],
): ConfigurableFieldMCPMetadata[] {
  if (!schema || !schema.properties) {
    return [];
  }

  const fields: ConfigurableFieldMCPMetadata[] = [];
  for (const [key, value] of Object.entries(schema.properties)) {
    if (
      typeof value === "object" &&
      "metadata" in value &&
      value.metadata &&
      typeof value.metadata === "object" &&
      "x_lg_ui_config" in value.metadata &&
      value.metadata.x_lg_ui_config &&
      typeof value.metadata.x_lg_ui_config === "object" &&
      "type" in value.metadata.x_lg_ui_config &&
      value.metadata.x_lg_ui_config.type &&
      value.metadata.x_lg_ui_config.type === "tools_list"
    ) {
      const castType = value.metadata.x_lg_ui_config.type as "tools_list";
      fields.push({
        label: key,
        type: castType,
        default:
          (
            value.metadata.x_lg_ui_config as Record<
              string,
              string[] | undefined
            >
          )?.default ?? [],
      });
    }
  }
  return fields;
}

export function configSchemaToRagConfig(
  schema: GraphSchema["config_schema"],
): ConfigurableFieldRAGMetadata | undefined {
  if (!schema || !schema.properties) {
    return undefined;
  }

  let ragField: ConfigurableFieldRAGMetadata | undefined;
  for (const [key, value] of Object.entries(schema.properties)) {
    if (
      typeof value === "object" &&
      "metadata" in value &&
      value.metadata &&
      typeof value.metadata === "object" &&
      "x_lg_ui_config" in value.metadata &&
      value.metadata.x_lg_ui_config &&
      typeof value.metadata.x_lg_ui_config === "object" &&
      "type" in value.metadata.x_lg_ui_config &&
      value.metadata.x_lg_ui_config.type &&
      value.metadata.x_lg_ui_config.type === "rag"
    ) {
      const castType = value.metadata.x_lg_ui_config.type as "rag";
      ragField = {
        label: key,
        type: castType,
        default:
          (
            value.metadata.x_lg_ui_config as {
              default?: { collection?: string };
            }
          )?.default ?? undefined,
      };
    }
  }
  return ragField;
}

type ExtractedConfigs = {
  configFields: ConfigurableFieldUIMetadata[];
  toolConfig: ConfigurableFieldMCPMetadata[];
  ragConfig: ConfigurableFieldRAGMetadata[];
};

export function extractConfigurationsFromAgent({
  agent,
  schema,
}: {
  agent: Assistant;
  schema: Record<string, any>;
}): ExtractedConfigs {
  const configFields = configSchemaToConfigurableFields(schema);
  const toolConfig = configSchemaToConfigurableTools(schema);
  const ragConfig = configSchemaToRagConfig(schema);

  const configFieldsWithDefaults = configFields.map((f) => {
    const defaultConfig = agent.config?.configurable?.[f.label] ?? f.default;
    return {
      ...f,
      default: defaultConfig,
    };
  });

  const configToolsWithDefaults = toolConfig.map((f) => {
    const defaultConfig = agent.config?.configurable?.[f.label] ?? f.default;
    return {
      ...f,
      default: defaultConfig as string[],
    };
  });

  const configRagWithDefaults = ragConfig
    ? {
        ...ragConfig,
        default: {
          collection:
            (
              agent.config.configurable?.[ragConfig.label] as {
                collection?: string;
              }
            )?.collection ?? ragConfig.default?.collection,
        },
      }
    : undefined;

  return {
    configFields: configFieldsWithDefaults,
    toolConfig: configToolsWithDefaults,
    ragConfig: configRagWithDefaults ? [configRagWithDefaults] : [],
  };
}
