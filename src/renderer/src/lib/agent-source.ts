/**
 * Agent Source Types & Utilities
 * 
 * Provides unified types and transformation functions for agents from
 * both local (Electron) and cloud (API) sources.
 */

import type { Agent } from "@/types/agent";
import type { ThreadSource } from "@/lib/thread-source";

/**
 * Source of the agent - determines where it runs
 */
export type AgentSource = 'local' | 'cloud';

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
export function isLocalAgent(agent: Agent | null | undefined): boolean {
    return agent?.metadata?.source === 'local';
}

/**
 * Check if an agent is cloud
 */
export function isCloudAgent(agent: Agent | null | undefined): boolean {
    return agent?.metadata?.source === 'cloud';
}
