/**
 * MCP Toolkit Types
 * Types for toolkit/MCP server selection in the composer
 */

/**
 * Represents a selected toolkit (MCP server) in the composer
 * Used for session-only storage (not persisted to thread)
 */
export interface SelectedToolkit {
    /** MCP server ID */
    id: string;
    /** Display name of the toolkit */
    name: string;
    /** Number of tools available (optional, set after connection) */
    toolCount?: number;
    /** Whether the toolkit is currently connected */
    isConnected?: boolean;
    /** Actual tools from the server */
    tools?: ToolkitTool[];
}

/**
 * Tool from an MCP server
 * Matches the MCPTool type from mcp.ts
 */
export interface ToolkitTool {
    name: string;
    description?: string;
    inputSchema?: Record<string, unknown>;
}

/**
 * Result of resolving tools from multiple toolkits
 */
export interface ResolvedToolkits {
    /** Aggregated tools from all successfully connected toolkits */
    tools: ToolkitTool[];
    /** Errors from toolkits that failed to connect */
    errors: Array<{
        toolkitId: string;
        toolkitName: string;
        error: string;
    }>;
}
