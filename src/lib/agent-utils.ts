import { Agent } from "@/types/agent";
import { Assistant } from "@langchain/langgraph-sdk";
import { toast } from "sonner";
import React from "react";
import { config } from "@/config";

/**
 * Determines if an agent is the primary agent.
 *
 * The primary agent is the main agent shown in agent mode. Only one agent
 * should have is_primary: true in metadata. This is the agent that will be
 * used by default when the user switches to agent mode.
 *
 * @param agent The agent to check
 * @returns True if the agent is the primary agent
 */
export function isPrimaryAgent(agent: Agent | Assistant): boolean {
  return agent.metadata?.is_primary === true;
}

/**
 * Determines if an agent is a template agent.
 *
 * Template agents are system-created agents that serve as templates
 * and should NOT be shown in the agent selection list. They are used
 * internally for creating new agents based on them.
 *
 * @param agent The agent to check
 * @returns True if the agent is a template (should be hidden from selection)
 */
export function isTemplateAgent(agent: Agent | Assistant): boolean {
  return agent.metadata?.is_template === true;
}

/**
 * @deprecated Use isPrimaryAgent instead
 */
export function isUserCreatedDefaultAssistant(
  agent: Agent | Assistant,
): boolean {
  return isPrimaryAgent(agent);
}

/**
 * @deprecated Use isTemplateAgent instead
 */
export function isSystemCreatedDefaultAssistant(
  agent: Agent | Assistant,
): boolean {
  return isTemplateAgent(agent);
}

/**
 * @deprecated Use isPrimaryAgent instead
 */
export function isPrimaryAssistant(agent: Agent | Assistant): boolean {
  return isPrimaryAgent(agent);
}

/**
 * @deprecated Use isPrimaryAgent instead
 */
export function isUserSpecifiedDefaultAgent(agent: Agent): boolean {
  return isPrimaryAgent(agent);
}

/**
 * Sorts an array of agents within a group.
 * The primary agent comes first, followed by others sorted by `updated_at` descending.
 * @param agentGroup An array of agents belonging to the same group.
 * @returns A new array with the sorted agents.
 */
export function sortAgentGroup(agentGroup: Agent[]): Agent[] {
  return [...agentGroup].sort((a, b) => {
    const aIsPrimary = isPrimaryAgent(a);
    const bIsPrimary = isPrimaryAgent(b);

    if (aIsPrimary && !bIsPrimary) {
      return -1; // a comes first
    }
    if (!aIsPrimary && bIsPrimary) {
      return 1; // b comes first
    }

    // If both are primary or both are not, sort by updated_at descending
    // Handle potential missing or invalid dates gracefully
    const timeA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const timeB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    const validTimeA = !isNaN(timeA) ? timeA : 0;
    const validTimeB = !isNaN(timeB) ? timeB : 0;

    return validTimeB - validTimeA; // Newest first
  });
}

/**
 * Groups an array of agents by their `graph_id`.
 * @param agents An array of agents.
 * @returns An array of arrays, where each inner array contains agents belonging to the same graph.
 */
export function groupAgentsByGraphs<AgentOrAssistant extends Agent | Assistant>(
  agents: AgentOrAssistant[],
): AgentOrAssistant[][] {
  return Object.values(
    agents.reduce<Record<string, AgentOrAssistant[]>>((acc, agent) => {
      const groupId = agent.graph_id;
      if (!acc[groupId]) {
        acc[groupId] = [];
      }
      acc[groupId].push(agent);
      return acc;
    }, {}),
  );
}

/**
 * Checks if API keys are required but not set.
 * @param hasApiKeys Whether the user has API keys set
 * @returns True if API keys are required but user doesn't have them
 */
export function requiresApiKeysButNotSet(hasApiKeys: boolean): boolean {
  return config.features.requireApiKeys && !hasApiKeys;
}

/**
 * Shows a warning toast if API keys are required but not set.
 * @param hasApiKeys Whether the user has API keys set
 */
export function checkApiKeysWarning(hasApiKeys: boolean) {
  if (requiresApiKeysButNotSet(hasApiKeys)) {
    const baseMessage =
      "This agent requires all necessary API keys to be set in the Settings page under your Account.";

    const customMessage =
      "You have not set api keys please do right now or leave.";
    const fullMessage = customMessage
      ? `${baseMessage}\n\n${customMessage}`
      : baseMessage;

    toast.error(
      React.createElement(
        "div",
        { className: "space-y-2" },
        React.createElement("p", null, fullMessage),
        React.createElement(
          "a",
          {
            href: "/settings",
            className:
              "inline-flex items-center text-sm font-bold hover:text-red-900 underline",
          },
          "Go to Settings →",
        ),
      ),
      {
        duration: 60000,
        richColors: true,
        closeButton: false,
      },
    );
  }
}
