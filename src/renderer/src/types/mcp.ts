/**
 * MCP (Model Context Protocol) Server Types
 *
 * Defines types for managing MCP server lifecycle and configuration.
 */

/**
 * MCP Server lifecycle states
 *
 * State transitions:
 *   NOT_INSTALLED → INSTALLED → NOT_ACTIVATED → ACTIVATED → CONNECTED
 *                                     ↑              ↓
 *                               (deactivate)   DISCONNECTED (error)
 */
export type MCPServerStatus =
    | 'NOT_INSTALLED'   // Package not installed locally
    | 'INSTALLED'       // Installed but not configured in registry
    | 'NOT_ACTIVATED'   // In registry but not enabled
    | 'ACTIVATED'       // Enabled, process started
    | 'CONNECTED'       // Successfully connected, tools fetched
    | 'DISCONNECTED';   // Error state - connection failed

/**
 * MCP Server configuration
 * Represents a managed MCP server that can be installed and activated
 */
export interface MCPServerConfig {
    /** Unique identifier (e.g., 'playwright') */
    id: string;
    /** Display name */
    name: string;
    /** Description of what the server provides */
    description: string;
    /** npm package name (e.g., '@anthropic/mcp-playwright') */
    package: string;
    /** Command to start the server */
    command: string;
    /** Additional CLI arguments */
    args?: string[];
    /** Icon identifier for UI */
    icon?: string;
    /** Category for grouping (e.g., 'browser', 'file', 'api') */
    category?: string;
}

/**
 * Runtime state of an MCP server instance
 * Extends config with runtime information
 */
export interface MCPServerInstance extends MCPServerConfig {
    /** Current lifecycle status */
    status: MCPServerStatus;
    /** MCP endpoint URL when running */
    url?: string;
    /** Number of tools available (after connection) */
    toolCount?: number;
    /** Last error message if any */
    lastError?: string;
    /** ISO timestamp when activated */
    activatedAt?: string;
    /** ISO timestamp when last connected */
    connectedAt?: string;
    /** Process ID if running */
    pid?: number;
}

/**
 * MCP tool definition (from MCP SDK)
 */
export interface MCPTool {
    name: string;
    description?: string;
    inputSchema?: Record<string, unknown>;
}

/**
 * Registry of installed/configured MCP servers
 * Persisted to local storage
 */
export interface MCPRegistry {
    /** Installed server instances */
    servers: MCPServerInstance[];
    /** Schema version for migrations */
    version: number;
}
