"use client";

/**
 * Local Agents Hook
 * 
 * Fetches local agents from Electron IPC.
 * Local agents are defined in agents-config.ts in the main process.
 */

import { useQuery } from "@tanstack/react-query";
import { isElectron, invoke } from "@/lib/electron";
import type { Agent } from "@/types/agent";

// Query key factory for local agents
export const localAgentKeys = {
    all: ["agents", "local"] as const,
    lists: () => [...localAgentKeys.all, "list"] as const,
    detail: (id: string) => [...localAgentKeys.all, "detail", id] as const,
    models: () => [...localAgentKeys.all, "models"] as const,
};

interface LocalAssistant {
    id: string;
    name: string;
    description: string;
    graph_id: string;
    config: Record<string, unknown>;
    metadata: {
        source: 'local';
        icon?: string;
        is_primary?: boolean;
        [key: string]: unknown;
    };
    created_at: string;
    updated_at: string;
}

/**
 * Hook to fetch all local agents from Electron
 */
export function useLocalAgents() {
    const isElectronEnv = isElectron();

    return useQuery({
        queryKey: localAgentKeys.lists(),
        queryFn: async (): Promise<Agent[]> => {
            if (!isElectronEnv) {
                return [];
            }

            try {
                const assistants = await invoke<LocalAssistant[]>('agents:list');
                
                // Transform to Agent type
                const agents = assistants.map(assistant => ({
                    assistant_id: assistant.id,
                    graph_id: assistant.graph_id,
                    name: assistant.name,
                    description: assistant.description,
                    created_at: assistant.created_at,
                    updated_at: assistant.updated_at,
                    config: assistant.config,
                    version: 1,
                    context: null,
                    metadata: assistant.metadata,
                    supportedConfigs: ["tools"] as ["tools" | "rag" | "supervisor"],
                }));
                return agents;
            } catch (error) {
                console.error('Local agents error:', error);
                return [];
            }
        },
        enabled: isElectronEnv,
        staleTime: 30000,
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
