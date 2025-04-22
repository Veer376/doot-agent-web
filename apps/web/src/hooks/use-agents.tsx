import { createClient } from "@/lib/client";
import { Assistant } from "@langchain/langgraph-sdk";
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
      console.error("Failed to get agent config schema", e);
      toast.error("Failed to get agent config schema");
    }
  };

  const createAgent = async (
    deploymentId: string,
    graphId: string,
    args: {
      name: string;
      description: string;
      config: Record<string, any>;
    },
  ): Promise<Assistant | undefined> => {
    try {
      const client = createClient(deploymentId);
      const agent = await client.assistants.create({
        graphId,
        metadata: {
          description: args.description,
        },
        name: args.name,
        config: {
          configurable: {
            ...args.config,
          },
        },
      });
      return agent;
    } catch (e) {
      console.error("Failed to create agent", e);
      toast.error("Failed to create agent");
      return undefined;
    }
  };

  return {
    getAgentConfigSchema,
    createAgent,
  };
}
