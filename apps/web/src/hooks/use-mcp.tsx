import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Tool } from "@/types/tool";

/**
 * Custom hook for interacting with the Model Context Protocol (MCP).
 * Provides functions to connect to an MCP server and list available tools.
 */
export default function useMCP() {
  /**
   * Creates an MCP client and connects it to the specified server URL.
   * @param url - The URL of the MCP server.
   * @param options - Client identification options.
   * @param options.name - The name of the client.
   * @param options.version - The version of the client.
   * @returns A promise that resolves to the connected MCP client instance.
   */
  const createAndConnectMCPClient = async (
    url: string,
    {
      name,
      version,
    }: {
      name: string;
      version: string;
    },
  ) => {
    const connectionClient = new StreamableHTTPClientTransport(new URL(url));
    const mcp = new Client({
      name,
      version,
    });

    await mcp.connect(connectionClient);
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
  const getTools = async (
    url: string,
    {
      name,
      version,
    }: {
      name: string;
      version: string;
    },
  ): Promise<Tool[]> => {
    const mcp = await createAndConnectMCPClient(url, {
      name,
      version,
    });
    const tools = await mcp.listTools();

    return tools.tools;
  };
  return { getTools, createAndConnectMCPClient };
}
