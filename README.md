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
  "id": "The project ID of the deployment. For locally running LangGraph servers, this can be any UUID.",
  "tenantId": "The tenant ID of your LangSmith account. For locally running LangGraph servers, this can be any UUID.",
  "deploymentUrl": "The API URL to your deployment",
  "name": "A custom name for your deployment",
}
```

To easily find your project & tenant IDs, you can make a GET request to the `/info` endpoint of your deployment URL. Then, copy the `project_id` value into `id`, and `tenant_id` into `tenantId`.

After constructing the JSON objects with these values for each of the deployments you want to include in your Open Agent Platform instance, you should stringify them into a single, flat array, then set them under the `NEXT_PUBLIC_DEPLOYMENTS` environment variable.

The following is an example of what this variable would look like for a single, local deployment:

```bash
NEXT_PUBLIC_DEPLOYMENTS=[{"id":"bf63dc89-1de7-4a65-8336-af9ecda479d6","deploymentUrl":"http://localhost:2024","tenantId":"42d732b3-1324-4226-9fe9-513044dceb58","name":"Local deployment"}]
```

After setting your deployments, you must set a default graph ID. We recommend this is set to the graph ID of the tools agent, since it will be used as the default agent when calling tools, and your RAG server (both of which are supported by our Tools Agent).

This should be set under the `NEXT_PUBLIC_DEFAULT_GRAPH_ID` environment variable.

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

Authencating to your LangConnect RAG server from the web client is handled in a similar way to LangGraph authentication. We pass the Supabase JWT in the `Authorization` header of the request. Then, inside the LangConnect RAG server, we extract this token and verify it's valid with Supabase. If it is, we receive back a user ID, which is used to verify each user is *only* able to access their own collections. We do not currently support sharing collections between users. If this is something you are interested in, please reach out to me, either on [X (Twitter)](https://x.com/bracesproul), or email: `brace@langchain.dev`

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

Open Agent Platform was built with first class support for connecting agents to MCP servers which support Streamable HTTP requests. To connect to an MCP server, you must set the `NEXT_PUBLIC_MCP_SERVER_URL` environment variable to the URL of your MCP server.

### Authentication

To support MCP servers which require authentication, we've implemented a proxy route in the web app's API routes. This pattern is similar to the one outlined above for LangGraph server authentication via API keys. Essiently how this works is:

The web client makes a request to the proxy route (`/api/oap_mcp`). Inside this API route, we once again use Supabase's JWT to authenticate with the MCP server. This means you must implement an endpoint on your MCP server which allows for exchanging a Supabase JWT (or any other JWT if you choose to use a different authentication provider) for an MCP access token. This access token is then used to authenticate requests to the MCP server. After this exchange, we use the MCP access token to make requests to the MCP server on behalf of the user, passing it through the `Authorization` header of the request. When sending the request response back to the client, we include the MCP access token in the `x-mcp-access-token` header of the response. This allows the client to use the MCP access token in future requests to the MCP server, without having to authenticate with the MCP server each time. It's set to expire after one hour by default.


# Building Your Own Agents

We built Open Agent Platform with custom agents in mind. Although we offer a few pre-built agents, we encourage you to build your own agents, and use OAP as a platform to prototype, test and use them! The following is a guide to help you build agents which are compatiable with all of Open Agent Platform's features.

## Platform

OAP is built on top of LangGraph Platform, which means all agents which you build to be used in OAP must be LangGraph agents deployed on LangGraph Platform.

## Configuration

To allow your agent to be configurable in OAP, you must set custom configuration metadata on your agent's configurable fields.

# Concepts/FAQ

Add concepts here.

What is an agent?
Do I need a backend
Can I build my own agents?
Can I use non-supabase auth?
Can I use non-langgraph agents?
Can I use