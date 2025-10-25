import { Message, AIMessage, ToolMessage } from "@langchain/langgraph-sdk";
import { getThinkingBlocks, getContentString } from "./content-string";

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
        args: Record<string, any>;
      };
      toolResponse?: ToolMessage;
      status: "pending" | "success" | "error";
    };

export interface ChainOfThoughtData {
  hasThinking: boolean;
  steps: ChainStep[];
  regularContent: string[];
  hasToolCalls: boolean;
}

/**
 * Extracts chain of thought data from turn messages
 * Matches tool calls with their responses and organizes steps in sequence
 */
export function extractChainOfThought(
  turnMessages: Message[]
): ChainOfThoughtData {
  const steps: ChainStep[] = [];
  const regularContent: string[] = [];
  let hasThinking = false;
  let hasToolCalls = false;

  // First pass: Build tool response map
  const toolResponseMap = new Map<string, ToolMessage>();
  turnMessages.forEach((msg) => {
    if (msg.type === "tool") {
      toolResponseMap.set(msg.tool_call_id, msg as ToolMessage);
    }
  });

  // Second pass: Process AI messages in order
  turnMessages.forEach((msg) => {
    if (msg.type === "ai") {
      const aiMsg = msg as AIMessage;

      // Extract thinking blocks
      const thinkingBlocks = getThinkingBlocks(aiMsg.content);
      if (thinkingBlocks.length > 0) {
        hasThinking = true;
        thinkingBlocks.forEach((block) => {
          steps.push({
            type: "thinking",
            heading: block.heading,
            content: block.content,
            status: "complete",
          });
        });
      }

      // Extract tool calls
      const toolCalls = aiMsg.tool_calls || [];
      if (toolCalls.length > 0) {
        hasToolCalls = true;
        toolCalls.forEach((toolCall) => {
          const response = toolResponseMap.get(toolCall.id || "");
          
          // Determine status
          let status: "pending" | "success" | "error" = "pending";
          if (response) {
            // Check if response indicates error
            const responseContent = typeof response.content === "string" 
              ? response.content 
              : JSON.stringify(response.content);
            status = responseContent.toLowerCase().includes("error") 
              ? "error" 
              : "success";
          }

          steps.push({
            type: "tool",
            toolCall: {
              id: toolCall.id || "",
              name: toolCall.name || "unknown",
              args: (toolCall.args as Record<string, any>) || {},
            },
            toolResponse: response,
            status,
          });
        });
      }

      // Extract regular content (text)
      const content = getContentString(aiMsg.content);
      if (content.length > 0) {
        regularContent.push(content);
      }
    }
  });

  return {
    hasThinking,
    steps,
    regularContent,
    hasToolCalls,
  };
}
