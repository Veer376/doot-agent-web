import { createClient } from "@/lib/client";
import { toast } from "sonner";

export function useAgents() {
  const getAgentConfigSchema = async (
    agentId: string,
    deploymentId: string,
  ) => {
    try {
      const client = createClient(deploymentId);
      const schemas = await client.assistants.getSchemas(agentId);
      return schemas.config_schema;
    } catch (e) {
      toast.error("Failed to get agent config schema");
    }
  };

  return {
    getAgentConfigSchema,
  };
}
