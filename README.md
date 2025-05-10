# Open Agent Platform

Open Agent Platform is a citizen developer platform, allowing non-technical users to build, prototype, and use agents. These agents can be connected to a wide range of tools, RAG servers, and event other agents through an Agent Supervisor!

> [!WARNING]
> This platform is currently a work in progress and is not ready for production use.

# Setup

## Agents

The first step in setting up Open Agent Platform is to deploy and configure your agents. To help with this, we're releasing three, pre-built agents, customized specifically for Open Agent Platform:

- [Tools Agent](TODO: ADD LINK)
- [Deep Research Agent](TODO: ADD LINK)
- [Supervisor Agent](TODO: ADD LINK)

To use these agents in your instance, you should:

1. Clone the repositories
2. Follow the instructions in the READMEs
3. Deploy the agents to LangGraph Platform

Once deployed, you can connect them to your instance of Open Agent Platform by setting the configuration environment variables. The configuration object is as follows:

```json
{
  "id": "The project ID of the deployment",
  "tenantId": "The tenant ID of your LangSmith account",
  "deploymentUrl": "The API URL to your deployment",
  "name": "A custom name for your deployment",
}
```

To easily find your project & tenant IDs, you can make a GET request to the `/info` endpoint of your deployment URL. Then, copy the `project_id` value into `id`, and `tenant_id` into `tenantId`.

After constructing the JSON objects with these values for each of the deployments you want to include in your Open Agent Platform instance, you should stringify them into a single, flat array, then set them under the `NEXT_PUBLIC_DEPLOYMENTS` environment variable.

After this, you must set a default graph ID, which is the ID of the graph you want to use as the default. We recommend this is set to the graph ID of the tools agent, since it will be used as the default agent when calling tools, and your RAG server (both of which are supported by our Tools Agent).

## Authentication

Here, we'll discuss authentication for the app itself, along with auth with the prebuilt agents

# Agents