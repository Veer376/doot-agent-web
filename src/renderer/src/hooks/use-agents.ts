"use client";

/**
 * Unified Agents Hook
 * 
 * Aggregates agents from both local (Electron) and cloud (API) sources
 * into a single list. Provides filtering by source and thread compatibility.
 */

import { useMemo } from "react";
import { useFetchCloudAgents } from "@/hooks/use-cloud-agents";
import { useLocalAgents } from "@/hooks/use-local-agents";
import { isElectron } from "@/lib/electron";
import type { AgentSource } from "@/lib/agent-source";
import { isAgentCompatibleWithThread } from "@/lib/agent-source";
import type { ThreadSource } from "@/lib/thread-source";
import type { Agent } from "@/types/agent";

/**
 * Options for the agents hook
 */
export interface UseAgentsOptions {
    /** Filter by source (optional - returns all if not specified) */
    source?: AgentSource;
    /** Filter to agents compatible with a specific thread source */
    threadSource?: ThreadSource;
}

/**
 * Hook that fetches agents from both local and cloud sources
 * and merges them into a single list.
 */
export function useAgents(options?: UseAgentsOptions) {
    const { source, threadSource } = options || {};
    const isElectronEnv = isElectron();

    // Fetch cloud agents
    const cloudQuery = useFetchCloudAgents();

    // Fetch local agents (only in Electron) - returns Agent[]
    const localQuery = useLocalAgents();

    // Merge agents
    const agents = useMemo(() => {
        const cloudAgents: Agent[] =
            source !== 'local' && cloudQuery.data
                ? cloudQuery.data.map(agent => ({
                    ...agent,
                    metadata: {
                        ...agent.metadata,
                        source: 'cloud' as const, // Ensure cloud source is set
                    }
                }))
                : [];

        const localAgents: Agent[] =
            source !== 'cloud' && isElectronEnv && localQuery.data
                ? localQuery.data
                : [];

        console.log('[useAgents] Merging agents:', {
            cloudCount: cloudAgents.length,
            localCount: localAgents.length,
            isElectron: isElectronEnv,
            source,
        });

        let allAgents = [...cloudAgents, ...localAgents];

        // Filter by thread source compatibility if specified
        if (threadSource) {
            allAgents = allAgents.filter(agent => {
                const agentSource = (agent.metadata?.source as AgentSource) || 'cloud';
                return isAgentCompatibleWithThread(agentSource, threadSource);
            });
        }

        return allAgents;
    }, [cloudQuery.data, localQuery.data, source, threadSource, isElectronEnv]);

    return {
        agents,
        isLoading: cloudQuery.isLoading || (isElectronEnv && localQuery.isLoading),
        isError: cloudQuery.isError || localQuery.isError,
        error: cloudQuery.error || localQuery.error,
        refetch: async () => {
            await Promise.all([
                cloudQuery.refetch(),
                isElectronEnv ? localQuery.refetch() : Promise.resolve(),
            ]);
        },
    };
}

/**
 * Hook to get agents compatible with a thread
 * Returns only agents that can run on the given thread source
 */
export function useAgentsForThread(threadSource: ThreadSource | undefined) {
    const allAgents = useAgents();

    return useMemo(() => {
        if (!threadSource) {
            // No thread selected - return all agents
            return allAgents;
        }

        return {
            ...allAgents,
            agents: allAgents.agents.filter(agent => {
                const agentSource = (agent.metadata?.source as AgentSource) || 'cloud';
                return isAgentCompatibleWithThread(agentSource, threadSource);
            }),
        };
    }, [allAgents, threadSource]);
}

/**
 * Hook to get a single agent by ID
 */
export function useAgent(agentId: string | null) {
    const { agents } = useAgents();

    return useMemo(() => {
        if (!agentId) return null;
        return agents.find(a => a.assistant_id === agentId) || null;
    }, [agents, agentId]);
}

/**
 * Hook that provides agent counts by source
 */
export function useAgentCounts() {
    const { agents } = useAgents();

    return useMemo(() => ({
        total: agents.length,
        local: agents.filter(a => a.metadata?.source === 'local').length,
        cloud: agents.filter(a => !a.metadata?.source || a.metadata?.source === 'cloud').length,
    }), [agents]);
}
