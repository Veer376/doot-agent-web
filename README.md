# Open Agent Platform

Open Agent Platform is a citizen developer platform, allowing non-technical users to build, prototype, and use agents. These agents can be connected to a wide range of tools, RAG servers, and event other agents through an Agent Supervisor!


<video src="https://github.com/user-attachments/assets/bc91304b-e704-41d7-a0cd-9806d37640c0.mp4" controls="controls" style="max-width: 730px;" />

# Setup

## Agents

The first step in setting up Open Agent Platform is to deploy and configure your agents. To help with this, we're releasing two, pre-built agents, customized specifically for Open Agent Platform:

- [Tools Agent](https://github.com/langchain-ai/oap-langgraph-tools-agent)
- [Supervisor Agent](https://github.com/langchain-ai/oap-agent-supervisor)

To use these agents in your instance, you should:

1. Clone the repositories
2. Follow the instructions in the READMEs
3. Deploy the agents to LangGraph Platform

Once deployed, you can connect them to your instance of Open Agent Platform by setting the configuration environment variables. The configuration object is as follows:

```json
{
  "id": "The project ID of the deployment. For locally running LangGraph servers, this can be any UUID.",
  "tenantId": "The tenant ID of your LangSmith account. For locally running LangGraph servers, this can be any UUID.",
  "deploymentUrl": "The API URL to your deployment",
  "name": "A custom name for your deployment",
  "isDefault": "Whether this deployment is the default deployment. Should only be set to true for one deployment.",
  "defaultGraphId": "The graph ID of the default graph for the entire OAP instance. We recommend this is set to the graph ID of a graph which supports RAG & MCP tools. This must be set in the same deployment which isDefault is set to true on. Optional, but required in at least one deployment.",
}
```

To easily find your project & tenant IDs, you can make a GET request to the `/info` endpoint of your deployment URL. Then, copy the `project_id` value into `id`, and `tenant_id` into `tenantId`.

After constructing the JSON objects with these values for each of the deployments you want to include in your Open Agent Platform instance, you should stringify them into a single, flat array, then set them under the `NEXT_PUBLIC_DEPLOYMENTS` environment variable.

The following is an example of what this variable would look like for a single, local deployment:

```bash
NEXT_PUBLIC_DEPLOYMENTS=[{"id":"bf63dc89-1de7-4a65-8336-af9ecda479d6","deploymentUrl":"http://localhost:2024","tenantId":"42d732b3-1324-4226-9fe9-513044dceb58","name":"Local deployment","isDefault":true,"defaultGraphId":"agent"}]
```

## Authentication

The default authentication provider Open Agent Platform is configured to use is Supabase. To set up Supabase authentication, you must first create a new Supabase project. After creating a new project, set the following environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL="<your supabase url>"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<your supabase anon key>"
```

You should also enable Google authentication in your Supabase project, or remove the UI code for Google authentication from the app.

### LangGraph Server Authentication

Since the pre-built LangGraph agents implement custom authentication, there is no need to specify a LangSmith API key when making requests to them. Instead, we pass the user's Supabase access token (JWT token) in the `Authorization` header of the request. Then, inside the auth middleware of the LangGraph server, we extract this token and verify it's valid with Supabase. If it is, we receive back a user ID, which is used to verify each user is *only* able to access their own agents, and threads. If you want to allow users access to agents they did not create, you should update the custom authentication middleware in the LangGraph server to allow access to the agents you want users to be able to access.

Along with the `Authorization` header, we duplicate passing the Supabase JWT via the `x-supabase-access-token` header. This is because all non-LangSmith specific headers which are sent to LangGraph servers which are prefixed with `x-` are included in the configurable fields of the thread. We will need this JWT to later authenticate with the MCP server.

### Use LangSmith API Key Authentication

If you do *not* want to use custom authentication in your LangGraph server, and instead allow anyone to access your agents, you can do so by setting the `NEXT_PUBLIC_USE_LANGSMITH_AUTH` environment variable to `true`, and setting your `LANGSMITH_API_KEY` in the environment variables. Lastly, ensure you have the `NEXT_PUBLIC_BASE_API_URL` environment variable set to the base API URL of your **web** server. For local development, this should be set to:

```bash
NEXT_PUBLIC_BASE_API_URL="http://localhost:3000/api"
```

This will cause all requests made to your web client to first pass through a proxy route, which injects the LangSmith API key into the request from the server, as to not expose the API key to the client. The request is then forwarded on to your LangGraph server.

> [!WARNING]
> Remember *not* to prefix your LangSmith API key environment variable with `NEXT_PUBLIC_`, as this is a **secret** and should never be exposed to the client.

### RAG Authentication

Authenticating to your LangConnect RAG server from the web client is handled in a similar way to LangGraph authentication. We pass the Supabase JWT in the `Authorization` header of the request. Then, inside the LangConnect RAG server, we extract this token and verify it's valid with Supabase. If it is, we receive back a user ID, which is used to verify each user is *only* able to access their own collections. We do not currently support sharing collections between users. If this is something you are interested in, please reach out to me, either on [X (Twitter)](https://x.com/bracesproul), or email: `brace@langchain.dev`

## RAG Server

Open Agent Platform has first class support for RAG with your agents. To use this feature, you must deploy your own instance of a LangConnect RAG server.

LangConnect is an open source managed retrieval service for RAG applications. It's built on top of LangChain's RAG integrations (vectorstores, document loaders, indexing API, etc.) and allows you to quickly spin up an API server for managing your collections & documents for any RAG application.

To set it up, you can follow the instructions in the [LangConnect README](https://github.com/langchain-ai/langconnect). After setting it up, and either running the server locally via Docker, or deploying it to a cloud provider, you should set the `NEXT_PUBLIC_RAG_API_URL` environment variable to the API URL of your LangConnect server. For local development, this should be set to:

```bash
NEXT_PUBLIC_RAG_API_URL="http://localhost:8080"
```

Once this is set, you can visit the `/rag` page in the web app to create your first collection, and upload documents to it.

After setting up your RAG server, and configuring Open Agent Platform with an agent which can call it (like the Tools Agent), you can start to use it in your agents by selecting a collection when creating/editing an agent. This will give the agent access to a tool which can make requests to your RAG server, and retrieve relevant documents for the user's query. Since the RAG server is exposed to the agent as a tool, we recommend setting detailed descriptions on your collections when creating them, since these are the descriptions which will be attached to the tool.

### Authentication

As stated above in the [RAG Authentication](#rag-authentication) section, we pass the Supabase JWT in the `Authorization` header of the request. Then, inside the LangConnect RAG server, we extract this token and verify it's valid with Supabase. If it is, we receive back a user ID, which is used to verify each user is *only* able to access their own collections. We do not currently support sharing collections between users. If this is something you are interested in, please reach out to me, either on [X (Twitter)](https://x.com/bracesproul), or email: `brace@langchain.dev`

## MCP Server

> [!TIP]
> Open Agent Platform only supports connecting to MCP servers which support Streamable HTTP requests. As of **05/10/2025**, there are not many MCP servers which support this, which is why we've released the demo application connected to [Arcade's](https://arcade-ai.com/) MCP server.

Open Agent Platform was built with first class support for connecting agents to MCP servers which support Streamable HTTP requests. You can configure your MCP server in one of two ways.

First, set your MCP server URL under the environment variable `NEXT_PUBLIC_MCP_SERVER_URL`. Ensure this URL does *not* end in `/mcp`, as the OAP web app will append this to the URL when making requests to the MCP server.

### Authenticated Servers

To connect to an MCP server which requires authentication, you should set `NEXT_PUBLIC_MCP_AUTH_REQUIRED=true`. If this is set to `true`, OAP will route all requests to your MCP server through a proxy route in the web app's API routes. This pattern of using a proxy route is similar to the one outlined above for LangGraph server authentication via API keys. Essentially how this works is:

The web client makes a request to the proxy route (`/api/oap_mcp`). Inside this API route, we once again use Supabase's JWT to authenticate with the MCP server. This means you must implement an endpoint on your MCP server which allows for exchanging a Supabase JWT (or any other JWT if you choose to use a different authentication provider) for an MCP access token. This access token is then used to authenticate requests to the MCP server. After this exchange, we use the MCP access token to make requests to the MCP server on behalf of the user, passing it through the `Authorization` header of the request. When sending the request response back to the client, we include the MCP access token in the `x-mcp-access-token` header of the response. This allows the client to use the MCP access token in future requests to the MCP server, without having to authenticate with the MCP server each time. It's set to expire after one hour by default.

The URL set to `NEXT_PUBLIC_MCP_SERVER_URL` must be formatted so that the proxy route can append `/mcp` at the end to make requests to the MCP server, and `/oauth/token` at the end to make requests to the MCP server's OAuth token endpoint.

Optionally, you can set the `MCP_TOKENS` environment variable to contain an object with an `access_token` field. If this environment variable is set, we will attempt to use that access token to authenticate requests to the MCP server. This is useful for testing, or if you want to use a different authentication provider than Supabase.

### Unauthenticated Servers

To connect to an MCP server which does not require authentication, you should set the `NEXT_PUBLIC_MCP_SERVER_URL` environment variable to the URL of your MCP server. If this URL is set, and `NEXT_PUBLIC_MCP_AUTH_REQUIRED` is not set/not set to `true`, we will call your MCP server directly from the client.

### Changing MCP Server URL

If you change the MCP server URL, you'll need to update all of your agents to use the new URL. We've included a script in this repo to do just that. This script can be found in [`apps/web/scripts/update-agents-mcp-url.ts`](apps/web/scripts/update-agents-mcp-url.ts).

To update your agent's MCP server URL, ensure the latest MCP server URL is set under the environment variable `NEXT_PUBLIC_MCP_SERVER_URL`, along with your deployments under `NEXT_PUBLIC_DEPLOYMENTS`, and a LangSmith API key under `LANGSMITH_API_KEY` (this is because the script uses LangSmith auth to authenticate with your LangGraph server, bypassing any user authentication). Then, run the script:

```bash
# Ensure you're inside the `apps/web` directory
# cd apps/web

# Run the script via TSX.
npx tsx scripts/update-agents-mcp-url.ts
```

This will fetch every agent, from every deployment listed. It then checks to see if a given agent supports MCP servers. If it does it checks the MCP server URL is not already set to the new URL. If it is not, it updates the agent's config to use the new URL.

# Building Your Own Agents

We built Open Agent Platform with custom agents in mind. Although we offer a few pre-built agents, we encourage you to build your own agents, and use OAP as a platform to prototype, test and use them! The following is a guide to help you build agents which are compatible with all of Open Agent Platform's features.

## Platform

OAP is built on top of LangGraph Platform, which means all agents which you build to be used in OAP must be LangGraph agents deployed on LangGraph Platform.

## Configuration

To allow your agent to be configurable in OAP, you must set custom configuration metadata on your agent's configurable fields. There are currently three types of configurable fields:

1. **General Agent Config:** This consists of general configuration settings like the model name, system prompt, temperature, etc. These are where essentially all of your custom configurable fields should go.
2. **MCP Tools Config:** This is the config which defines the MCP server and tools to give your agent access to.
3. **RAG Config:** This is the config which defines the RAG server, and collection name to give your agent access to.

> [!TIP]
> This section assumes you have a basic understanding of configurable fields in LangGraph. If you do not, read the LangGraph documentation ([Python](https://langchain-ai.github.io/langgraph/how-tos/graph-api/#add-runtime-configuration), [TypeScript](https://langchain-ai.github.io/langgraphjs/how-tos/configuration/)) for more information.

### General Agent Config

By default, Open Agent Platform will show *all* fields listed in your configurable object as configurable in the UI. Each field will be configurable via a simple text input. To add more complex configurable field types (e.g boolean, dropdown, slider, etc), you should add a `x_oap_ui_config` object to `metadata` on the field. Inside this object is where you define the custom UI config for that specific field. The available options are:

```typescript
export type ConfigurableFieldUIType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "slider"
  | "select"
  | "json";

/**
 * The type interface for options in a select field.
 */
export interface ConfigurableFieldOption {
  label: string;
  value: string;
}

/**
 * The UI configuration for a field in the configurable object.
 */
export type ConfigurableFieldUIMetadata = {
  /**
   * The label of the field. This will be what is rendered in the UI.
   */
  label: string;
  /**
   * The default value to render in the UI component.
   *
   * @default undefined
   */
  default?: unknown;
  /**
   * The type of the field.
   * @default "text"
   */
  type?: ConfigurableFieldUIType;
  /**
   * The description of the field. This will be rendered below the UI component.
   */
  description?: string;
  /**
   * The placeholder of the field. This will be rendered inside the UI component.
   * This is only applicable for text, textarea, number, json, and select fields.
   */
  placeholder?: string;
  /**
   * The options of the field. These will be the options rendered in the select UI component.
   * This is only applicable for select fields.
   */
  options?: ConfigurableFieldOption[];
  /**
   * The minimum value of the field.
   * This is only applicable for number fields.
   */
  min?: number;
  /**
   * The maximum value of the field.
   * This is only applicable for number fields.
   */
  max?: number;
  /**
   * The step value of the field. E.g if using a slider, where you want
   * people to be able to increment by 0.1, you would set this field to 0.1
   * This is only applicable for number fields.
   */
  step?: number;
};
```

In the examples below, we'll look at how to add configurable fields for `model_name`, `system_prompt`, `max_tokens`, and `temperature`, in both Python and TypeScript graphs. The same principals apply to any configurable field (which is not for MCP tools, or RAG).

#### Python

<details>
<summary>In Python, this looks like:</summary>

```python
from pydantic import BaseModel, Field
from typing import Optional

class GraphConfigPydantic(BaseModel):
    model_name: Optional[str] = Field(
        default="anthropic:claude-3-7-sonnet-latest",
        metadata={
            "x_oap_ui_config": {
                "type": "select",
                "default": "anthropic:claude-3-7-sonnet-latest",
                "description": "The model to use in all generations",
                "options": [
                    {
                        "label": "Claude 3.7 Sonnet",
                        "value": "anthropic:claude-3-7-sonnet-latest",
                    },
                    {
                        "label": "Claude 3.5 Sonnet",
                        "value": "anthropic:claude-3-5-sonnet-latest",
                    },
                    {"label": "GPT 4o", "value": "openai:gpt-4o"},
                    {"label": "GPT 4o mini", "value": "openai:gpt-4o-mini"},
                    {"label": "GPT 4.1", "value": "openai:gpt-4.1"},
                ],
            }
        }
    )
    temperature: Optional[float] = Field(
        default=0.7,
        metadata={
            "x_oap_ui_config": {
                "type": "slider",
                "default": 0.7,
                "min": 0,
                "max": 2,
                "step": 0.1,
                "description": "Controls randomness (0 = deterministic, 2 = creative)",
            }
        }
    )
    max_tokens: Optional[int] = Field(
        default=4000,
        metadata={
            "x_oap_ui_config": {
                "type": "number",
                "default": 4000,
                "min": 1,
                "description": "The maximum number of tokens to generate",
            }
        }
    )
    system_prompt: Optional[str] = Field(
        default=None,
        metadata={
            "x_oap_ui_config": {
                "type": "textarea",
                "placeholder": "Enter a system prompt...",
                "description": "The system prompt to use in all generations",
            }
        }
    )

# ENSURE YOU PASS THE GRAPH CONFIGURABLE SCHEMA TO THE StateGraph:
workflow = StateGraph(State, config_schema=GraphConfigPydantic)
```

</details>

#### TypeScript

> [!TIP]
> In order for the Open Agent Platform to recognize & render your UI fields, your configuration object must be defined using the LangGraph Zod schema.

<details>
<summary>And in TypeScript, this looks like:</summary>

```typescript
import "@langchain/langgraph/zod";
import { z } from "zod";

export const GraphConfiguration = z.object({
  /**
   * The model ID to use for the reflection generation.
   * Should be in the format `provider/model_name`.
   * Defaults to `anthropic/claude-3-7-sonnet-latest`.
   */
  modelName: z
    .string()
    .optional()
    .langgraph.metadata({
      x_oap_ui_config: {
        type: "select",
        default: "anthropic/claude-3-7-sonnet-latest",
        description: "The model to use in all generations",
        options: [
          {
            label: "Claude 3.7 Sonnet",
            value: "anthropic/claude-3-7-sonnet-latest",
          },
          {
            label: "Claude 3.5 Sonnet",
            value: "anthropic/claude-3-5-sonnet-latest",
          },
          {
            label: "GPT 4o",
            value: "openai/gpt-4o",
          },
          {
            label: "GPT 4.1",
            value: "openai/gpt-4.1",
          },
          {
            label: "o3",
            value: "openai/o3",
          },
          {
            label: "o3 mini",
            value: "openai/o3-mini",
          },
          {
            label: "o4",
            value: "openai/o4",
          },
        ],
      },
    }),
  /**
   * The temperature to use for the reflection generation.
   * Defaults to `0.7`.
   */
  temperature: z
    .number()
    .optional()
    .langgraph.metadata({
      x_oap_ui_config: {
        type: "slider",
        default: 0.7,
        min: 0,
        max: 2,
        step: 0.1,
        description: "Controls randomness (0 = deterministic, 2 = creative)",
      },
    }),
  /**
   * The maximum number of tokens to generate.
   * Defaults to `1000`.
   */
  maxTokens: z
    .number()
    .optional()
    .langgraph.metadata({
      x_oap_ui_config: {
        type: "number",
        default: 4000,
        min: 1,
        description: "The maximum number of tokens to generate",
      },
    }),
  systemPrompt: z
    .string()
    .optional()
    .langgraph.metadata({
      x_oap_ui_config: {
        type: "textarea",
        placeholder: "Enter a system prompt...",
        description: "The system prompt to use in all generations",
      },
    }),
});

// ENSURE YOU PASS THE GRAPH CONFIGURABLE SCHEMA TO THE StateGraph:
const workflow = new StateGraph(MyStateSchema, GraphConfiguration)
```

</details>

### MCP Tools Config

To enable support for MCP tools in your agents with Open Agent Platform, you must add a field in your configurable fields with the type `mcp`. This field can have *any* key you want, but the value must be an object with these two keys:

- `url`: The URL of the MCP server.
- `tools`: An array of tool names to give your agent access to.

#### Python

<details>
<summary>In Python, this looks like:</summary>

```python
class MCPConfig(BaseModel):
    url: Optional[str] = Field(
        default=None,
        optional=True,
    )
    """The URL of the MCP server"""
    tools: Optional[List[str]] = Field(
        default=None,
        optional=True,
    )
    """The tools to make available to the LLM"""


class GraphConfigPydantic(BaseModel):
    # The key (in this case it's `mcp_config`)
    # can be any value you want.
    mcp_config: Optional[MCPConfig] = Field(
        default=None,
        metadata={
            "x_oap_ui_config": {
                # Ensure the type is `mcp`
                "type": "mcp",
                # Here is where you would set the default tools.
                # "default": {
                #     "tools": ["Math_Divide", "Math_Mod"]
                # }
            }
        }
    )
```

</details>

#### TypeScript

<details>
<summary>And in TypeScript, this looks like:</summary>

```typescript
export const MCPConfig = z.object({
  /**
   * The MCP server URL.
   */
  url: z.string(),
  /**
   * The list of tools to provide to the LLM.
   */
  tools: z.array(z.string()),
});

export const GraphConfiguration = z.object({
  /**
   * MCP configuration for tool selection. The key (in this case it's `mcpConfig`)
   * can be any value you want.
   */
  mcpConfig: z
    .lazy(() => MCPConfig)
    .optional()
    .langgraph.metadata({
      x_oap_ui_config: {
        // Ensure the type is `mcp`
        type: "mcp",
        // Add custom tools to default to here:
        // default: {
        //   tools: ["Math_Divide", "Math_Mod"]
        // }
      },
    }),
});
```

</details>

### RAG Config

To enable support for using a LangConnect RAG server in your LangGraph agent, you must define a configurable field similar to the MCP config, but with its own unique type of `rag`, and the following fields in the object:

- `rag_url`: The URL of the LangConnect RAG server.
- `collections`: A list of collection IDs, containing the IDs of the collections to give your agent access to.

#### Python

<details>
<summary>In Python, this looks like:</summary>

```python
class RagConfig(BaseModel):
    rag_url: Optional[str] = None
    """The URL of the rag server"""
    collections: Optional[List[str]] = None
    """The collections to use for rag. Will be a list of collection IDs"""


class GraphConfigPydantic(BaseModel):
    # Once again, the key (in this case it's `rag`)
    # can be any value you want.
    rag: Optional[RagConfig] = Field(
        default=None,
        optional=True,
        metadata={
            "x_oap_ui_config": {
                # Ensure the type is `rag`
                "type": "rag",
                # Here is where you would set the default collection. Use collection IDs
                # "default": {
                #     "collections": [
                #         "fd4fac19-886c-4ac8-8a59-fff37d2b847f",
                #         "659abb76-fdeb-428a-ac8f-03b111183e25",
                #     ]
                # },
            }
        }
    )
```

</details>

#### TypeScript

<details>
<summary>And in TypeScript, this looks like:</summary>

```typescript
export const RAGConfig = z.object({
  /**
   * The LangConnect RAG server URL.
   */
  rag_url: z.string(),
  /**
   * The collections to use for RAG. Will be an
   * array of collection IDs
   */
  collections: z.string().array(),
});

export const GraphConfiguration = z.object({
  /**
   * LangConnect RAG configuration. The key (in this case it's `rag`)
   * can be any value you want.
   */
  rag: z
    .lazy(() => RAGConfig)
    .optional()
    .langgraph.metadata({
      x_oap_ui_config: {
        // Ensure the type is `rag`
        type: "rag",
        // Here is where you would set the default collection. Use collection IDs
        // default: {
        //   collections: [
        //     "fd4fac19-886c-4ac8-8a59-fff37d2b847f",
        //     "659abb76-fdeb-428a-ac8f-03b111183e25",
        //   ]
        // }
      },
    }),
});
```

</details>

### Hidden Configurable Fields

You can hide configurable fields from the UI by setting the `type` of the `x_oap_ui_config` metadata to `hidden`. This will only hide the field from the UI, but it can still be set in the runtime configuration.

> [!WARNING]
> This does _not_ fully hide the field from the user. It can still be found by inspecting network requests, so do not use this for sensitive information.

#### Python

<details>
<summary>In Python, this looks like:</summary>

```python
class GraphConfigPydantic(BaseModel):
    hidden_field: Optional[str] = Field(
        metadata={
            "x_oap_ui_config": {
                # Ensure the type is `hidden`
                "type": "hidden",
            }
        }
    )
```

</details>

#### TypeScript

<details>
<summary>And in TypeScript, this looks like:</summary>

```typescript
export const GraphConfiguration = z.object({
  hidden_field: z
    .string()
    .optional()
    .langgraph.metadata({
      x_oap_ui_config: {
        // Ensure the type is `hidden`
        type: "hidden",
      },
    }),
});
```

</details>

# Concepts/FAQ

## Concepts

### Agents

An agent is a custom configuration on-top of an existing LangGraph graph. This is the same concept as an `assistant`, in the LangGraph API.

## FAQ

### Do I need a backend server?

OAP does not require a standalone backend server to be running in order for the web app to work. As long as you've added deployments from LangGraph Platform to your instance, it should work as expected!

However, if you want to use the RAG features, you will need to have the LangConnect server running on its own. This is because the LangConnect RAG server is intended to be hosted independently from your LangGraph deployments. See the [LangConnect docs](https://github.com/langchain-ai/langconnect/blob/main/README.md) for more information.

### How can I build my own agents?

Yes! See the [Building Your Own Agents](#building-your-own-agents) section for more information.

### How can I use non-supabase auth?

Yes! It requires some modifications to be made to the code, but we've implemented authentication in a way which makes it easy to swap out with any other authentication provider. 

### How can I use non-langgraph agents?

No. All agents you intend to use with OAP must be LangGraph agents, deployed on LangGraph Platform.

### Why is my agent's config is only showing string inputs, and not custom fields?

First, ensure you're using the latest version of LangGraph. If running locally, make sure you're using the latest version of the LangGraph API, and CLI packages. If deploying, make sure you've published a revision after 05/14/2025. Then, check that you have the `x_oap_ui_config` metadata set on your configurable fields. If you have, check that your configurable object is defined using LangGraph Zod (if using TypeScript), as this is required for the Open Agent Platform to recognize & render your UI fields.

If it's still not working, confirm your `x_oap_ui_config` metadata has the proper fields set.
