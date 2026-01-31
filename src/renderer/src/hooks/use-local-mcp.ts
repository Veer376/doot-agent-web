"use client";

/**
 * Local MCP Hooks
 *
 * React Query hooks for managing MCP servers via Electron IPC.
 * This handles local MCP registry operations.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isElectron, invoke } from "@/lib/electron";
import type {
    MCPServerConfig,
    MCPServerInstance,
    MCPRegistry,
    MCPTool,
} from "@/types/mcp";

// ============================================================================
// Query Key Factory
// ============================================================================

export const mcpKeys = {
    all: ["mcp"] as const,
    registry: () => [...mcpKeys.all, "registry"] as const,
    managed: () => [...mcpKeys.all, "managed"] as const,
    server: (id: string) => [...mcpKeys.all, "server", id] as const,
    tools: (id: string) => [...mcpKeys.all, "tools", id] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch the MCP registry (all installed servers)
 */
export function useMCPRegistry() {
    const isElectronEnv = isElectron();

    return useQuery({
        queryKey: mcpKeys.registry(),
        queryFn: async (): Promise<MCPRegistry> => {
            if (!isElectronEnv) {
                return { servers: [], version: 1 };
            }
            return invoke<MCPRegistry>("mcp:registry:get");
        },
        enabled: isElectronEnv,
        staleTime: 10000, // Cache for 10 seconds
    });
}

/**
 * Fetch all managed server configs (available to install)
 */
export function useManagedMCPServers() {
    const isElectronEnv = isElectron();

    return useQuery({
        queryKey: mcpKeys.managed(),
        queryFn: async (): Promise<MCPServerConfig[]> => {
            if (!isElectronEnv) {
                return [];
            }
            return invoke<MCPServerConfig[]>("mcp:managed:list");
        },
        enabled: isElectronEnv,
        staleTime: 60000, // Cache for 1 minute (these rarely change)
    });
}

/**
 * Fetch a specific server's status
 */
export function useMCPServerStatus(serverId: string) {
    const isElectronEnv = isElectron();

    return useQuery({
        queryKey: mcpKeys.server(serverId),
        queryFn: async (): Promise<MCPServerInstance | null> => {
            if (!isElectronEnv) {
                return null;
            }
            return invoke<MCPServerInstance | null>("mcp:server:status", serverId);
        },
        enabled: isElectronEnv && !!serverId,
        staleTime: 5000,
    });
}

/**
 * Fetch tools from a connected server
 */
export function useMCPServerTools(serverId: string) {
    const isElectronEnv = isElectron();

    return useQuery({
        queryKey: mcpKeys.tools(serverId),
        queryFn: async (): Promise<MCPTool[]> => {
            if (!isElectronEnv) {
                return [];
            }
            return invoke<MCPTool[]>("mcp:server:tools", serverId);
        },
        enabled: false, // Manually fetched when needed
        staleTime: 30000,
    });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Install an MCP server (add to registry)
 */
export function useInstallMCPServer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (config: MCPServerConfig): Promise<MCPServerInstance> => {
            return invoke<MCPServerInstance>("mcp:server:install", config);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: mcpKeys.registry() });
        },
    });
}

/**
 * Uninstall an MCP server (remove from registry)
 */
export function useUninstallMCPServer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (serverId: string): Promise<{ success: boolean }> => {
            return invoke<{ success: boolean }>("mcp:server:uninstall", serverId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: mcpKeys.registry() });
        },
    });
}

/**
 * Activate an MCP server (start process)
 */
export function useActivateMCPServer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (serverId: string): Promise<MCPServerInstance> => {
            return invoke<MCPServerInstance>("mcp:server:activate", serverId);
        },
        onSuccess: (_, serverId) => {
            queryClient.invalidateQueries({ queryKey: mcpKeys.registry() });
            queryClient.invalidateQueries({ queryKey: mcpKeys.server(serverId) });
        },
    });
}

/**
 * Deactivate an MCP server (stop process)
 */
export function useDeactivateMCPServer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (serverId: string): Promise<MCPServerInstance | null> => {
            return invoke<MCPServerInstance | null>("mcp:server:deactivate", serverId);
        },
        onSuccess: (_, serverId) => {
            queryClient.invalidateQueries({ queryKey: mcpKeys.registry() });
            queryClient.invalidateQueries({ queryKey: mcpKeys.server(serverId) });
        },
    });
}

/**
 * Connect to an MCP server and fetch tools
 */
export function useConnectMCPServer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (
            serverId: string
        ): Promise<{ server: MCPServerInstance; tools: MCPTool[] }> => {
            return invoke<{ server: MCPServerInstance; tools: MCPTool[] }>(
                "mcp:server:connect",
                serverId
            );
        },
        onSuccess: (data, serverId) => {
            queryClient.invalidateQueries({ queryKey: mcpKeys.registry() });
            queryClient.invalidateQueries({ queryKey: mcpKeys.server(serverId) });
            // Cache the tools
            queryClient.setQueryData(mcpKeys.tools(serverId), data.tools);
        },
    });
}

// ============================================================================
// Helper Hooks
// ============================================================================

/**
 * Get installed servers from registry
 */
export function useInstalledMCPServers() {
    const { data: registry, ...rest } = useMCPRegistry();
    return {
        ...rest,
        data: registry?.servers || [],
    };
}

/**
 * Get only activated/connected servers
 */
export function useActiveMCPServers() {
    const { data: registry, ...rest } = useMCPRegistry();
    return {
        ...rest,
        data:
            registry?.servers.filter(
                (s) => s.status === "ACTIVATED" || s.status === "CONNECTED"
            ) || [],
    };
}
