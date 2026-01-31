/**
 * Managed MCP Server Configurations
 *
 * Pre-defined MCP server configurations that are offered by the platform.
 * Users can install and activate these servers.
 */

import type { MCPServerConfig } from '@/types/mcp';

/**
 * Playwright MCP Server
 * Provides browser automation tools for the agent
 */
export const PLAYWRIGHT_MCP_CONFIG: MCPServerConfig = {
    id: 'playwright',
    name: 'Playwright',
    description: 'Browser automation and web scraping tools',
    package: '@playwright/mcp',
    command: 'npx',
    args: ['@playwright/mcp@latest', '--port'],  // Port appended dynamically
    icon: 'browser',
    category: 'browser',
};

/**
 * All available managed MCP servers
 */
export const MANAGED_MCP_SERVERS: MCPServerConfig[] = [
    PLAYWRIGHT_MCP_CONFIG,
];

/**
 * Get a managed server config by ID
 */
export function getManagedServerConfig(id: string): MCPServerConfig | undefined {
    return MANAGED_MCP_SERVERS.find(server => server.id === id);
}

/**
 * Check if a server ID is a managed server
 */
export function isManagedServer(id: string): boolean {
    return MANAGED_MCP_SERVERS.some(server => server.id === id);
}
