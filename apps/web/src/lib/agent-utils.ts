import { Agent } from "@/types/agent";

/**
 * Checks if an agent is the system-defined default assistant.
 * @param agent The agent to check.
 * @returns True if the agent is the default, false otherwise.
 */
export const isDefaultAssistant = (agent: Agent): boolean => {
  return agent.metadata?.created_by === "system";
};

/**
 * Sorts an array of agents within a group.
 * The default agent comes first, followed by others sorted by `updated_at` descending.
 * @param agentGroup An array of agents belonging to the same group.
 * @returns A new array with the sorted agents.
 */
export const sortAgentGroup = (agentGroup: Agent[]): Agent[] => {
  return [...agentGroup].sort((a, b) => {
    const aIsDefault = isDefaultAssistant(a);
    const bIsDefault = isDefaultAssistant(b);

    if (aIsDefault && !bIsDefault) {
      return -1; // a comes first
    }
    if (!aIsDefault && bIsDefault) {
      return 1; // b comes first
    }

    // If both are default or both are not, sort by updated_at descending
    // Handle potential missing or invalid dates gracefully
    const timeA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const timeB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    const validTimeA = !isNaN(timeA) ? timeA : 0;
    const validTimeB = !isNaN(timeB) ? timeB : 0;

    return validTimeB - validTimeA; // Newest first
  });
};
