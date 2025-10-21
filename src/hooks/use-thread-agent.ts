"use client";

import { useCallback } from "react";

/**
 * LocalStorage keys for thread-agent persistence
 */
const STORAGE_KEY = "thread-agent-map"; // Maps threadId -> agentId
const LAST_AGENT_KEY = "last-used-agent"; // Last selected agent globally

/**
 * Hook for managing thread-agent persistence across localStorage and metadata.
 * 
 * This hook provides functions to:
 * 1. Save which agent was used in a specific thread (localStorage + future metadata sync)
 * 2. Retrieve the last used agent for a specific thread
 * 3. Get the globally last used agent (fallback when no thread-specific data)
 * 
 * @example
 * ```tsx
 * const { saveThreadAgent, getThreadAgent, getLastUsedAgent } = useThreadAgent();
 * 
 * // When user switches agent in a thread
 * saveThreadAgent("thread-123", "youtube-agent");
 * 
 * // When loading a thread, restore the agent
 * const agentId = getThreadAgent("thread-123") || getLastUsedAgent() || "default-agent";
 * ```
 */
export function useThreadAgent() {
  /**
   * Save the agent used in a specific thread
   * 
   * @param threadId - The thread ID
   * @param agentId - The agent/assistant ID to associate with this thread
   */
  const saveThreadAgent = useCallback((threadId: string, agentId: string) => {
    if (typeof window === "undefined") return; // SSR safety

    try {
      // 1. Save to thread-agent map
      const existingMap = localStorage.getItem(STORAGE_KEY);
      const map: Record<string, string> = existingMap
        ? JSON.parse(existingMap)
        : {};

      map[threadId] = agentId;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));

      // 2. Update global last-used agent
      localStorage.setItem(LAST_AGENT_KEY, agentId);
    } catch (error) {
      console.error("[useThreadAgent] Failed to save thread-agent:", error);
    }
  }, []);

  /**
   * Get the agent that was last used in a specific thread
   * 
   * @param threadId - The thread ID to look up
   * @returns The agent ID, or null if not found
   */
  const getThreadAgent = useCallback((threadId: string): string | null => {
    if (typeof window === "undefined") return null; // SSR safety

    try {
      const existingMap = localStorage.getItem(STORAGE_KEY);
      if (!existingMap) return null;

      const map: Record<string, string> = JSON.parse(existingMap);
      const agentId = map[threadId] || null;

      return agentId;
    } catch (error) {
      console.error("[useThreadAgent] Failed to get thread-agent:", error);
      return null;
    }
  }, []);

  /**
   * Get the globally last used agent (fallback when no thread-specific data)
   * 
   * @returns The last used agent ID, or null if none
   */
  const getLastUsedAgent = useCallback((): string | null => {
    if (typeof window === "undefined") return null; // SSR safety

    try {
      const lastAgent = localStorage.getItem(LAST_AGENT_KEY);
      return lastAgent;
    } catch (error) {
      console.error("[useThreadAgent] Failed to get last used agent:", error);
      return null;
    }
  }, []);

  /**
   * Clear all thread-agent mappings (useful for testing/debugging)
   */
  const clearThreadAgentMap = useCallback(() => {
    if (typeof window === "undefined") return;

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("[useThreadAgent] Failed to clear map:", error);
    }
  }, []);

  /**
   * Get all thread-agent mappings (useful for debugging)
   * 
   * @returns Object mapping threadId -> agentId
   */
  const getAllThreadAgents = useCallback((): Record<string, string> => {
    if (typeof window === "undefined") return {};

    try {
      const existingMap = localStorage.getItem(STORAGE_KEY);
      return existingMap ? JSON.parse(existingMap) : {};
    } catch (error) {
      console.error("[useThreadAgent] Failed to get all mappings:", error);
      return {};
    }
  }, []);

  return {
    saveThreadAgent,
    getThreadAgent,
    getLastUsedAgent,
    clearThreadAgentMap,
    getAllThreadAgents,
  };
}
