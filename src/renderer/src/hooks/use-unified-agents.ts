"use client";

/**
 * Unified Agents Hook
 * 
 * Aggregates agents from both local (Electron) and cloud (API) sources
 * into a single list. Provides filtering by source and thread compatibility.
 */

import { useMemo } from "react";
import { useFetchAgents } from "@/hooks/use-agents";
import { useLocalAgents } from "@/hooks/use-local-agents";
import { isElectron } from "@/lib/electron";
import type { UnifiedAgent, AgentSource } from "@/lib/agent-source";
import { transformCloudAgent, isAgentCompatibleWithThread } from "@/lib/agent-source";
import type { ThreadSource } from "@/lib/thread-source";
import type { Agent } from "@/types/agent";

/**
 * Transform an Agent (local or cloud) to UnifiedAgent format
 */
function agentToUnifiedAgent(agent: Agent): UnifiedAgent {
    return {
        id: agent.assistant_id,
        name: agent.name || agent.assistant_id,
        description: agent.description || (agent.metadata?.description as string | undefined),
        source: (agent.metadata?.source as AgentSource) || 'cloud',
        icon: agent.metadata?.icon as string | undefined,
        is_primary: agent.metadata?.is_primary,
    };
}

/**
 * Options for the unified agents hook
 */
export interface UseUnifiedAgentsOptions {
    /** Filter by source (optional - returns all if not specified) */
    source?: AgentSource;
    /** Filter to agents compatible with a specific thread source */
    threadSource?: ThreadSource;
}

/**
 * Hook that fetches agents from both local and cloud sources
 * and merges them into a single list.
 */
export function useUnifiedAgents(options?: UseUnifiedAgentsOptions) {
    const { source, threadSource } = options || {};
    const isElectronEnv = isElectron();

    // Fetch cloud agents
    const cloudQuery = useFetchAgents();

    // Fetch local agents (only in Electron) - returns Agent[]
    const localQuery = useLocalAgents();

    // Merge agents
    const agents = useMemo(() => {
        const cloudAgents: UnifiedAgent[] =
            source !== 'local' && cloudQuery.data
                ? cloudQuery.data.map(transformCloudAgent)
                : [];

        // Local agents are now Agent[] from useLocalAgents, transform to UnifiedAgent
        const localAgents: UnifiedAgent[] =
            source !== 'cloud' && isElectronEnv && localQuery.data
                ? localQuery.data.map(agentToUnifiedAgent)
                : [];

        console.log('[useUnifiedAgents] Merging agents:', {
            cloudCount: cloudAgents.length,
            localCount: localAgents.length,
            isElectron: isElectronEnv,
            source,
        });

        let allAgents = [...cloudAgents, ...localAgents];

        // Filter by thread source compatibility if specified
        if (threadSource) {
            allAgents = allAgents.filter(agent =>
                isAgentCompatibleWithThread(agent.source, threadSource)
            );
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
    const allAgents = useUnifiedAgents();

    return useMemo(() => {
        if (!threadSource) {
            // No thread selected - return all agents
            return allAgents;
        }

        return {
            ...allAgents,
            agents: allAgents.agents.filter(agent =>
                isAgentCompatibleWithThread(agent.source, threadSource)
            ),
        };
    }, [allAgents, threadSource]);
}

/**
 * Hook to get a single agent by ID
 */
export function useUnifiedAgent(agentId: string | null) {
    const { agents } = useUnifiedAgents();

    return useMemo(() => {
        if (!agentId) return null;
        return agents.find(a => a.id === agentId) || null;
    }, [agents, agentId]);
}

/**
 * Hook that provides agent counts by source
 */
export function useAgentCounts() {
    const { agents } = useUnifiedAgents();

    return useMemo(() => ({
        total: agents.length,
        local: agents.filter(a => a.source === 'local').length,
        cloud: agents.filter(a => a.source === 'cloud').length,
    }), [agents]);
}
