import { cn } from "@/lib/utils";
import { OrbitLoaderIcon } from "@/components/icons/app-icons";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Message } from "@langchain/langgraph-sdk";

type ActivityState =
  | "thinking"
  | "executing_tool"
  | "writing"
  | "processing";

interface EnhancedLoaderProps {
  messages?: Message[];
  className?: string;
}

/**
 * Determines the current activity state based on the messages
 */
function getActivityState(messages: Message[]): {
  state: ActivityState;
  toolName?: string;
} {
  if (!messages || messages.length === 0) {
    return { state: "thinking" };
  }

  // Check from the end to find the most recent activity
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];

    // If we see a tool message, check if it has a response
    if (msg.type === "tool") {
      // No response yet means the tool is still executing
      if (!msg.content || msg.content === "") {
        return {
          state: "executing_tool",
          toolName: msg.name || "tool",
        };
      }
    }

    // If we see an AI message with tool calls
    if (msg.type === "ai" && Array.isArray((msg as any).tool_calls)) {
      const toolCalls = (msg as any).tool_calls;
      if (toolCalls.length > 0) {
        const lastToolCall = toolCalls[toolCalls.length - 1];
        return {
          state: "executing_tool",
          toolName: lastToolCall.name || "tool",
        };
      }
    }

    // If we see an AI message with content, it's writing
    if (msg.type === "ai" && msg.content) {
      return { state: "writing" };
    }
  }

  // Default to thinking
  return { state: "thinking" };
}

/**
 * Get the status message based on activity state
 */
function getStatusMessage(state: ActivityState, toolName?: string): string {
  switch (state) {
    case "thinking":
      return "Thinking...";
    case "executing_tool":
      return toolName ? `Executing ${toolName}...` : "Executing tool...";
    case "writing":
      return "Writing response...";
    case "processing":
      return "Processing...";
    default:
      return "Processing...";
  }
}

export function EnhancedLoader({
  messages = [],
  className,
}: EnhancedLoaderProps) {
  const { state, toolName } = getActivityState(messages);
  const statusMessage = getStatusMessage(state, toolName);

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground",
        className,
      )}
    >
      <OrbitLoaderIcon size={16} />
      <Shimmer duration={1.5} spread={2}>
        {statusMessage}
      </Shimmer>
    </div>
  );
}

