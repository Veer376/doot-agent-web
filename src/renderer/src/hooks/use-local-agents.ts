"use client";

/**
 * Local Agents Hook
 * 
 * Provides React Query hooks for managing local agents via Electron IPC.
 * Local agents are defined and run entirely within the Electron app.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isElectron, invoke } from "@/lib/electron";
import type { LocalAgentConfig } from "@/lib/agent-source";
import { transformLocalAgentToAgent } from "@/lib/agent-source";
import type { Agent } from "@/types/agent";

// Query key factory for local agents
export const localAgentKeys = {
    all: ["agents", "local"] as const,
    lists: () => [...localAgentKeys.all, "list"] as const,
    detail: (id: string) => [...localAgentKeys.all, "detail", id] as const,
    models: () => [...localAgentKeys.all, "models"] as const,
};

/**
 * Default local agent configuration (built-in)
 * This represents the deepagents-based local coding agent
 */
const DEFAULT_LOCAL_AGENT_CONFIG: LocalAgentConfig = {
    id: 'local-agent',
    name: 'Local Agent',
    description: 'AI coding assistant running locally on your machine',
    icon: 'robot',
    modelId: undefined, // Uses default model from settings
};

/**
 * Hook to fetch all local agents
 * Returns the built-in local agent plus any custom agents as full Agent objects
 */
export function useLocalAgents() {
    const isElectronEnv = isElectron();

    return useQuery({
        queryKey: localAgentKeys.lists(),
        queryFn: async (): Promise<Agent[]> => {
            if (!isElectronEnv) {
                console.log('[useLocalAgents] Not in Electron environment, returning empty array');
                return [];
            }

            // Try to fetch agents from IPC
            try {
                const customAgents = await invoke<LocalAgentConfig[]>('agents:list');
                // Transform agents from IPC to full Agent objects
                const agents = customAgents.map(transformLocalAgentToAgent);
                console.log('[useLocalAgents] Successfully loaded local agents:', agents);
                return agents;
            } catch (error) {
                // If IPC fails, return just the default local agent as fallback
                console.warn('[useLocalAgents] Failed to fetch local agents from IPC:', error);
                console.log('[useLocalAgents] Returning default local agent as fallback');
                return [transformLocalAgentToAgent(DEFAULT_LOCAL_AGENT_CONFIG)];
            }
        },
        enabled: isElectronEnv,
        staleTime: 30000, // Cache for 30 seconds
    });
}

/**
 * Hook to fetch available models for local agents
 */
export function useLocalModels() {
    const isElectronEnv = isElectron();

    return useQuery({
        queryKey: localAgentKeys.models(),
        queryFn: async () => {
            if (!isElectronEnv) {
                return [];
            }
            try {
                return await invoke<Array<{
                    id: string;
                    name: string;
                    provider: string;
                    available: boolean;
                }>>('models:list');
            } catch {
                return [];
            }
        },
        enabled: isElectronEnv,
        staleTime: 60000, // Cache for 1 minute
    });
}

/**
 * Hook to create a custom local agent
 */
export function useCreateLocalAgent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (config: Omit<LocalAgentConfig, 'id'>): Promise<Agent> => {
            const agent = await invoke<LocalAgentConfig>('agents:create', config);
            return transformLocalAgentToAgent(agent);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: localAgentKeys.lists() });
        },
    });
}

/**
 * Hook to update a local agent
 */
export function useUpdateLocalAgent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            agentId,
            updates,
        }: {
            agentId: string;
            updates: Partial<LocalAgentConfig>;
        }): Promise<Agent> => {
            const agent = await invoke<LocalAgentConfig>('agents:update', { agentId, updates });
            return transformLocalAgentToAgent(agent);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: localAgentKeys.detail(variables.agentId) });
            queryClient.invalidateQueries({ queryKey: localAgentKeys.lists() });
        },
    });
}

/**
 * Hook to delete a local agent
 */
export function useDeleteLocalAgent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (agentId: string): Promise<void> => {
            await invoke('agents:delete', agentId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: localAgentKeys.lists() });
        },
    });
}
