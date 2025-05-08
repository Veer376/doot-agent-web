import "dotenv/config";
import { getDeployments } from "@/lib/environment/deployments";
import { Assistant, Client } from "@langchain/langgraph-sdk";
import {
  extractConfigurationsFromAgent,
  getConfigurableDefaults,
} from "@/lib/ui-config";

async function main() {
  const deployments = getDeployments();

  const newMCPUrl = process.env.NEXT_PUBLIC_MCP_SERVER_URL;
  if (!newMCPUrl) {
    throw new Error("MCP URL env variable is not set");
  }

  for await (const deployment of deployments) {
    const client = new Client({
      apiUrl: deployment.deploymentUrl,
      apiKey: process.env.LANGSMITH_API_KEY,
    });

    // Collect all agents using pagination
    const allAgents: Assistant[] = [];
    const pageSize = 100;
    let hasMore = true;
    let offset = 0;

    // Continue fetching until there are no more pages
    while (hasMore) {
      const agents = await client.assistants.search({
        limit: pageSize,
        offset,
      });

      // Add the current page of agents to our collection
      if (agents.length === 0) {
        hasMore = false;
      } else {
        allAgents.push(...agents);
        offset += pageSize;
      }
    }

    console.log(
      `Found ${allAgents.length} agents for deployment ${deployment.id}`,
    );

    const agentsUpdatePromise = allAgents.map(async (agent) => {
      // First get the agent schema. We need this to verify this agent has support
      // for MCP servers
      const agentSchema = await client.assistants.getSchemas(
        agent.assistant_id,
      );
      // Extract the configs
      const agentConfigs = extractConfigurationsFromAgent({
        agent,
        schema: agentSchema.config_schema,
      });
      if (!agentConfigs.toolConfig || !agentConfigs.toolConfig[0]) {
        // Agent does not support MCP servers, skip
        return;
      }
      const mcpConfigDefaultUrl = agentConfigs.toolConfig[0].default?.url;
      if (newMCPUrl === mcpConfigDefaultUrl) {
        // Agent already has latest MCP URL, skip
        return;
      }
      const existingConfig = getConfigurableDefaults(
        agentConfigs.configFields,
        agentConfigs.toolConfig,
        agentConfigs.ragConfig,
        agentConfigs.agentsConfig,
      );

      await client.assistants.update(agent.assistant_id, {
        config: {
          configurable: {
            ...existingConfig,
            // Ensure we only update the MCP config field.
            [agentConfigs.toolConfig[0].label]: {
              ...agentConfigs.toolConfig[0].default,
              url: newMCPUrl,
            },
          },
        },
      });
    });
    await Promise.all(agentsUpdatePromise);
  }
}

main().catch(console.error);
