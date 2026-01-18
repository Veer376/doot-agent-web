import { Message, AIMessage, ToolMessage } from "@langchain/langgraph-sdk";
import { getThinkingBlocks, getContentString } from "./content-string";
import type { ToolCallArguments } from "@/types/tools";

export type ChainStep =
  | {
    type: "thinking";
    heading: string;
    content: string;
    status: "complete";
  }
  | {
    type: "tool";
    toolCall: {
      id: string;
      name: string;
      args: ToolCallArguments;
    };
    toolResponse?: ToolMessage;
    status: "pending" | "success" | "error";
  };

export interface ContentBlock {
  type: "content";
  content: string;
}

export interface ThinkingGroup {
  type: "thinking-group";
  steps: ChainStep[];
  showDone: boolean;
}

export interface StandaloneToolsBlock {
  type: "tools-only";
  tools: ChainStep[]; // Only tool steps
}

export type RenderBlock = ContentBlock | ThinkingGroup | StandaloneToolsBlock;

export interface ChainOfThoughtData {
  renderBlocks: RenderBlock[];
  hasThinking: boolean;
  hasToolCalls: boolean;
}

// Legacy interface for backward compatibility (deprecated)
export interface LegacyChainOfThoughtData {
  hasThinking: boolean;
  steps: ChainStep[];
  regularContent: string[];
  hasToolCalls: boolean;
}

/**
 * Extracts chain of thought data from turn messages with proper grouping.
 * Groups thinking and tools into blocks that are delimited by content.
 * 
 * Algorithm:
 * - Thinking/tools without content → added to current group (or start new group)
 * - Content → closes current group and creates content block
 * - Tools without thinking and no open group → standalone tools block
 * 
 * @param turnMessages - Messages in the current AI turn
 * @param isLoading - Whether the turn is still streaming
 */
export function extractChainOfThought(
  turnMessages: Message[],
  isLoading: boolean = false
): ChainOfThoughtData {
  const renderBlocks: RenderBlock[] = [];
  const currentGroupSteps: ChainStep[] = [];
  let hasThinking = false;
  let hasToolCalls = false;

  // Helper to close and add current group
  const closeCurrentGroup = (showDone: boolean) => {
    if (currentGroupSteps.length > 0) {
      renderBlocks.push({
        type: "thinking-group",
        steps: [...currentGroupSteps],
        showDone,
      });
      currentGroupSteps.length = 0; // Clear array
    }
  };

  // First pass: Build tool response map
  const toolResponseMap = new Map<string, ToolMessage>();
  turnMessages.forEach((msg) => {
    if (msg.type === "tool") {
      toolResponseMap.set(msg.tool_call_id, msg as ToolMessage);
    }
  });

  // Second pass: Process AI messages in order
  turnMessages.forEach((msg) => {
    if (msg.type !== "ai") return;

    const aiMsg = msg as AIMessage;
    const thinkingBlocks = getThinkingBlocks(aiMsg.content);
    const toolCalls = aiMsg.tool_calls || [];
    const textContent = getContentString(aiMsg.content).trim();

    // Track if we have thinking or tools in this message
    const hasThinkingInMessage = thinkingBlocks.length > 0;
    const hasToolsInMessage = toolCalls.length > 0;

    if (hasThinkingInMessage) hasThinking = true;
    if (hasToolsInMessage) hasToolCalls = true;

    // Process thinking blocks and tool calls
    if (hasThinkingInMessage || hasToolsInMessage) {
      // If we have thinking, always add to current group
      if (hasThinkingInMessage) {
        // Add thinking steps (with deduplication)
        thinkingBlocks.forEach((block) => {
          // Always add thinking steps, even if empty (to show "Thinking..." immediately)
          // Check if this exact thinking block already exists in the current group
          const isDuplicate = currentGroupSteps.some(
            (step) =>
              step.type === "thinking" &&
              step.heading === block.heading &&
              step.content === block.content
          );

          // Only add if not a duplicate
          if (!isDuplicate) {
            currentGroupSteps.push({
              type: "thinking",
              heading: block.heading,
              content: block.content,
              status: "complete",
            });
          }
        });
      }

      // Process tool calls
      if (hasToolsInMessage) {
        type ToolStep = Extract<ChainStep, { type: "tool" }>;
        const toolSteps: ToolStep[] = [];

        toolCalls.forEach((toolCall) => {
          const response = toolResponseMap.get(toolCall.id || "");

          let status: "pending" | "success" | "error" = "pending";
          if (response) {
            const responseContent =
              typeof response.content === "string"
                ? response.content
                : JSON.stringify(response.content);
            status = responseContent.toLowerCase().includes("error")
              ? "error"
              : "success";
          }

          toolSteps.push({
            type: "tool",
            toolCall: {
              id: toolCall.id || "",
              name: toolCall.name || "unknown",
              args: (toolCall.args as ToolCallArguments) || {},
            },
            toolResponse: response,
            status,
          });
        });

        // Decide where to put tool steps
        if (currentGroupSteps.length > 0 || hasThinkingInMessage) {
          // Add to current group (with deduplication by tool call ID)
          const existingToolIds = new Set(
            currentGroupSteps
              .filter((s) => s.type === "tool")
              .map((s) => (s as Extract<ChainStep, { type: "tool" }>).toolCall.id)
          );

          toolSteps.forEach((toolStep) => {
            if (!existingToolIds.has(toolStep.toolCall.id)) {
              currentGroupSteps.push(toolStep);
            }
          });
        } else {
          // Standalone tools (no thinking, no open group)
          renderBlocks.push({
            type: "tools-only",
            tools: toolSteps,
          });
        }
      }
    }

    // Handle text content - this closes the current group
    if (textContent.length > 0) {
      closeCurrentGroup(true); // Always show Done when closed by content

      // Add content block
      renderBlocks.push({
        type: "content",
        content: textContent,
      });
    }
  });

  // Close any remaining open group
  closeCurrentGroup(!isLoading); // Show Done only if not loading

  return {
    renderBlocks,
    hasThinking,
    hasToolCalls,
  };
}
