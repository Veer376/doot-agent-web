import { ConfigurableFieldUIMetadata } from "@/types/configurable";
import { GraphSchema } from "@langchain/langgraph-sdk";

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
