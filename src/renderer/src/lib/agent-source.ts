/**
 * Agent Source Types & Utilities
 * 
 * Provides unified types and transformation functions for agents from
 * both local (Electron) and cloud (API) sources.
 */

import type { Agent, AgentMetadata } from "@/types/agent";
import type { ThreadSource } from "@/lib/thread-source";

/**
 * Source of the agent - determines where it runs
 */
export type AgentSource = 'local' | 'cloud';

/**
 * Unified agent interface that works for both local and cloud agents
 */
export interface UnifiedAgent {
    /** Unique agent identifier */
    id: string;
    /** Display name */
    name: string;
    /** Description of the agent's capabilities */
    description?: string;
    /** Source (local or cloud) */
    source: AgentSource;
    /** Icon identifier */
    icon?: string;
    /** Model ID (for local agents) */
    modelId?: string;
    /** Whether this is the primary/default agent */
    is_primary?: boolean;
    /** Additional metadata */
    [key: string]: unknown;
}

/**
 * Local agent configuration format (from IPC)
 * Matches the LocalAssistant interface from main/agents-config.ts
 */
export interface LocalAgentConfig {
    id: string;
    name: string;
    description?: string;
    graph_id?: string;
    config?: {
        recursion_limit?: number;
        [key: string]: unknown;
    };
    metadata?: {
        source?: 'local';
        icon?: string;
        is_primary?: boolean;
        [key: string]: unknown;
    };
    created_at?: string;
    updated_at?: string;
    /** Legacy field - use metadata.icon instead */
    icon?: string;
    modelId?: string;
    [key: string]: unknown;
}

/**
 * Transform a cloud agent (from API) to unified format
 */
export function transformCloudAgent(agent: Agent): UnifiedAgent {
    return {
        id: agent.assistant_id,
        name: agent.name || agent.assistant_id,
        description: agent.metadata?.description as string | undefined,
        source: 'cloud',
        icon: agent.metadata?.icon as string | undefined,
        is_primary: agent.metadata?.is_primary as boolean | undefined,
        // Preserve any additional metadata
        ...agent.metadata,
    };
}

/**
 * Transform a local agent (from IPC) to unified format
 */
export function transformLocalAgent(config: LocalAgentConfig): UnifiedAgent {
    return {
        id: config.id,
        name: config.name,
        description: config.description,
        source: 'local',
        icon: config.icon,
        modelId: config.modelId,
        // Preserve any additional fields
        ...config,
    };
}

/**
 * Transform a local agent config to a full Agent object.
 * This ensures local agents are fully compatible with components
 * that expect the Agent interface (which extends Assistant).
 */
export function transformLocalAgentToAgent(config: LocalAgentConfig): Agent {
    const now = new Date().toISOString();
    
    // Get icon from metadata or legacy field
    const icon = config.metadata?.icon || config.icon;
    const isPrimary = config.metadata?.is_primary ?? false;
    
    const metadata: AgentMetadata = {
        source: 'local',
        icon,
        is_primary: isPrimary,
    };

    return {
        // Required Assistant fields
        assistant_id: config.id,
        graph_id: config.graph_id || 'browser_agent',
        config: config.config || {
            recursion_limit: 50,
        },
        context: null,
        created_at: config.created_at || now,
        updated_at: config.updated_at || now,
        metadata,
        version: 1,
        name: config.name,
        description: config.description,
    };
}

/**
 * Check if an agent can run on a specific thread source
 * 
 * Rules:
 * - Local agents can ONLY run on local threads
 * - Cloud agents can ONLY run on cloud threads
 */
export function isAgentCompatibleWithThread(
    agentSource: AgentSource,
    threadSource: ThreadSource
): boolean {
    // Simple rule: sources must match
    return agentSource === threadSource;
}

/**
 * Get the thread source required for an agent
 */
export function getRequiredThreadSource(agentSource: AgentSource): ThreadSource {
    return agentSource; // Direct mapping for now
}

/**
 * Check if an agent is local
 */
export function isLocalAgent(agent: UnifiedAgent | null | undefined): boolean {
    return agent?.source === 'local';
}

/**
 * Check if an agent is cloud
 */
export function isCloudAgent(agent: UnifiedAgent | null | undefined): boolean {
    return agent?.source === 'cloud';
}
