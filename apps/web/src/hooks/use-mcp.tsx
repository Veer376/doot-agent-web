import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Tool } from "@/types/tool";
import { useState } from "react";

function getMCPUrlOrThrow() {
  if (!process.env.NEXT_PUBLIC_BASE_API_URL) {
    throw new Error("NEXT_PUBLIC_BASE_API_URL is not defined");
  }
  const url = new URL(process.env.NEXT_PUBLIC_BASE_API_URL);
  url.pathname = `${url.pathname}/oap_mcp`;
  return url;
}

/**
 * Custom hook for interacting with the Model Context Protocol (MCP).
 * Provides functions to connect to an MCP server and list available tools.
 */
export default function useMCP() {
  const [tools, setTools] = useState<Tool[]>([]);
  /**
   * Creates an MCP client and connects it to the specified server URL.
   * @param url - The URL of the MCP server.
   * @param options - Client identification options.
   * @param options.name - The name of the client.
   * @param options.version - The version of the client.
   * @returns A promise that resolves to the connected MCP client instance.
   */
  const createAndConnectMCPClient = async ({
    name,
    version,
  }: {
    name: string;
    version: string;
  }) => {
    const url = getMCPUrlOrThrow();
    const connectionClient = new StreamableHTTPClientTransport(new URL(url));
    const mcp = new Client({
      name,
      version,
    });

    await mcp.connect(connectionClient);
    console.log("CONNECTED TO MCP SERVER 💻✅");
    return mcp;
  };

  /**
   * Connects to an MCP server and retrieves the list of available tools.
   * @param url - The URL of the MCP server.
   * @param options - Client identification options.
   * @param options.name - The name of the client.
   * @param options.version - The version of the client.
   * @returns A promise that resolves to an array of available tools.
   */
  const getTools = async ({
    name,
    version,
  }: {
    name: string;
    version: string;
  }): Promise<Tool[]> => {
    const mcp = await createAndConnectMCPClient({
      name,
      version,
    });
    console.log("LISTING TOOLS 📚");
    const tools = await mcp.listTools();
    console.log("TOOLS", tools);
    return tools.tools;
  };
  return { getTools, createAndConnectMCPClient, tools, setTools };
}
