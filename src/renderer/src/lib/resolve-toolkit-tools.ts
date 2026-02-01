/**
 * Resolve Toolkit Tools
 * 
 * Utility to connect to MCP toolkits and aggregate their tools
 * Used before agent invocation to configure available tools
 */

import { invoke, isElectron } from "@/lib/electron";
import type { ResolvedToolkits, SelectedToolkit, ToolkitTool } from "@/types/mcp-toolkit";
import type { MCPServerInstance, MCPTool } from "@/types/mcp";

/**
 * Connect to selected toolkits and aggregate all their tools
 * 
 * @param toolkits - Array of selected toolkits to connect
 * @returns Object containing aggregated tools and any errors
 * 
 * @example
 * const { tools, errors } = await resolveToolkitTools(selectedToolkits);
 * if (errors.length > 0) {
 *   // Show warning toast
 * }
 * // Pass tools to agent configuration
 */
export async function resolveToolkitTools(
    toolkits: SelectedToolkit[]
): Promise<ResolvedToolkits> {
    if (!isElectron() || toolkits.length === 0) {
        return { tools: [], errors: [] };
    }

    const results: ResolvedToolkits = {
        tools: [],
        errors: [],
    };

    // Connect to each toolkit in parallel
    const connectionPromises = toolkits.map(async (toolkit) => {
        try {
            // mcp:server:connect will start process if needed and return tools
            const response = await invoke<{ server: MCPServerInstance; tools: MCPTool[] }>(
                "mcp:server:connect",
                toolkit.id
            );

            // Convert MCPTool to ToolkitTool (they're the same structure)
            const toolkitTools: ToolkitTool[] = response.tools.map((tool) => ({
                name: tool.name,
                description: tool.description,
                inputSchema: tool.inputSchema,
            }));

            return {
                success: true as const,
                toolkitId: toolkit.id,
                toolkitName: toolkit.name,
                tools: toolkitTools,
            };
        } catch (error) {
            return {
                success: false as const,
                toolkitId: toolkit.id,
                toolkitName: toolkit.name,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    });

    const settledResults = await Promise.all(connectionPromises);

    for (const result of settledResults) {
        if (result.success) {
            results.tools.push(...result.tools);
        } else {
            results.errors.push({
                toolkitId: result.toolkitId,
                toolkitName: result.toolkitName,
                error: result.error,
            });
        }
    }

    return results;
}

/**
 * Get tools from a single toolkit (for debugging/testing)
 */
export async function getToolkitTools(toolkitId: string): Promise<ToolkitTool[]> {
    if (!isElectron()) {
        return [];
    }

    const response = await invoke<{ server: MCPServerInstance; tools: MCPTool[] }>(
        "mcp:server:connect",
        toolkitId
    );

    return response.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
    }));
}
