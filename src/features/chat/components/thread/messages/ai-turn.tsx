import { useStreamContext } from "@/features/chat/providers/Stream";
import { Checkpoint, Message, ToolMessage } from "@langchain/langgraph-sdk";
import { cn } from "@/lib/utils";
import { BranchSwitcher, CommandBar } from "./shared";
import { MarkdownText } from "@/components/ui/markdown-text";
import { getContentString } from "@/features/chat/utils/content-string";
import { extractChainOfThought } from "@/features/chat/utils/extract-chain-of-thought";
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import { DotIcon, WrenchIcon, CheckCircle2Icon, XCircleIcon, LoaderCircleIcon } from "lucide-react";
import React, { useMemo } from "react";
import { ToolCalls } from "./tool-calls";

interface AITurnProps {
  turnMessages: Message[];
  lastHumanIndex: number;
  allMessages: Message[];
  isLoading: boolean;
  handleRegenerate: (
    parentCheckpoint: Checkpoint | null | undefined,
    optimisticValues?: (prev: { messages?: Message[] }) => {
      messages?: Message[] | undefined;
    }
  ) => void;
}

export const AITurn = React.memo(function AITurn({
  turnMessages,
  lastHumanIndex,
  allMessages,
  isLoading,
  handleRegenerate,
}: AITurnProps) {
  const thread = useStreamContext();

  const chainData = useMemo(
    () => extractChainOfThought(turnMessages),
    [turnMessages]
  );

  const lastAIMessage = [...turnMessages]
    .reverse()
    .find((m) => m.type === "ai");
  
  const meta = lastAIMessage
    ? thread.getMessagesMetadata(lastAIMessage)
    : undefined;

  const humanMessage = lastHumanIndex >= 0 ? allMessages[lastHumanIndex] : undefined;
  const humanMeta = humanMessage
    ? thread.getMessagesMetadata(humanMessage)
    : undefined;

  const combinedContent = chainData.regularContent.join("\n\n");

  const handleRegenerateFromHuman = () => {
    const checkpoint = humanMeta?.firstSeenState?.parent_checkpoint;
    
    handleRegenerate(checkpoint, (prev) => {
      return {
        ...prev,
        messages: allMessages.slice(0, lastHumanIndex + 1),
      };
    });
  };

  // Helper to format tool response content
  const formatToolResponse = (response: ToolMessage) => {
    if (typeof response.content === "string") {
      return response.content;
    }
    return JSON.stringify(response.content, null, 2);
  };

  // Get dynamic header text from last step
  const getChainOfThoughtHeader = () => {
    if (chainData.steps.length === 0) return "Thinking...";
    
    const lastStep = chainData.steps[chainData.steps.length - 1];
    if (lastStep.type === "thinking") {
      return lastStep.heading;
    } else {
      return lastStep.toolCall.name;
    }
  };

  return (
    <div className="group mr-auto flex items-start gap-2">
      <div className="flex flex-col gap-1">
        
        {/* Render with Chain of Thought if thinking exists */}
        {chainData.hasThinking ? (
          <ChainOfThought defaultOpen={false}>
            <ChainOfThoughtHeader>
              {getChainOfThoughtHeader()}
            </ChainOfThoughtHeader>
            <ChainOfThoughtContent>
              {chainData.steps.map((step, idx) => {
                if (step.type === "thinking") {
                  // Render thinking step
                  return (
                    <ChainOfThoughtStep
                      key={`thinking-${idx}`}
                      icon={DotIcon}
                      label={step.heading}
                      status="complete"
                      className="space-y-1"
                    >
                      <div className="prose prose-sm max-w-none text-sm mt-1">
                        <MarkdownText>{step.content}</MarkdownText>
                      </div>
                    </ChainOfThoughtStep>
                  );
                } else {
                  // Render tool step
                  return (
                    <ChainOfThoughtStep
                      key={`tool-${step.toolCall.id}-${idx}`}
                      icon={WrenchIcon}
                      label={step.toolCall.name}
                      status={step.status === "pending" ? "pending" : "complete"}
                      className="space-y-1"
                    >
                      {/* Tool call display */}
                      <div className="rounded border px-3 py-2 text-sm mt-1">
                        <div className="flex items-center gap-2">
                          {step.status === "pending" && (
                            <>
                              <LoaderCircleIcon className="h-4 w-4 animate-spin text-muted-foreground" />
                              <span className="text-muted-foreground">Processing...</span>
                            </>
                          )}
                          {step.status === "success" && (
                            <>
                              <CheckCircle2Icon className="h-4 w-4 text-green-600" />
                              <span className="text-green-600">Success</span>
                            </>
                          )}
                          {step.status === "error" && (
                            <>
                              <XCircleIcon className="h-4 w-4 text-red-600" />
                              <span className="text-red-600">Error</span>
                            </>
                          )}
                        </div>
                        
                        {/* Show args if they exist */}
                        {Object.keys(step.toolCall.args).length > 0 && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            <pre className="overflow-x-auto rounded bg-muted p-2">
                              <code>{JSON.stringify(step.toolCall.args, null, 2)}</code>
                            </pre>
                          </div>
                        )}
                      </div>

                      {/* Tool response display */}
                      {step.toolResponse && (
                        <div className="mt-1 rounded bg-muted p-3 text-sm">
                          <div className="mb-0.5 text-xs font-medium text-muted-foreground">
                            Response:
                          </div>
                          <div className="whitespace-pre-wrap font-mono text-xs">
                            {formatToolResponse(step.toolResponse)}
                          </div>
                        </div>
                      )}
                    </ChainOfThoughtStep>
                  );
                }
              })}
              
              {/* Done step at the end */}
              {!isLoading && (
                <ChainOfThoughtStep
                  icon={CheckCircle2Icon}
                  label="Done"
                  status="complete"
                  className="space-y-1"
                />
              )}
            </ChainOfThoughtContent>
          </ChainOfThought>
        ) : (
          // Regular rendering when no thinking
          <>
            {/* Render regular content */}
            {chainData.regularContent.map((content, idx) => (
              <div key={idx} className="py-1 text-[0.95em]">
                <MarkdownText>{content}</MarkdownText>
              </div>
            ))}

            {/* Render tool calls separately if no thinking */}
            {chainData.hasToolCalls && (
              <div className="mt-2">
                {turnMessages
                  .filter((msg) => msg.type === "ai")
                  .map((msg, idx) => {
                    const aiMsg = msg as any;
                    if (aiMsg.tool_calls && aiMsg.tool_calls.length > 0) {
                      return (
                        <ToolCalls
                          key={msg.id || idx}
                          toolCalls={aiMsg.tool_calls}
                        />
                      );
                    }
                    return null;
                  })}
              </div>
            )}
          </>
        )}

        {/* Render any remaining regular content after chain of thought */}
        {chainData.hasThinking && chainData.regularContent.length > 0 && (
          <div className="mt-2">
            {chainData.regularContent.map((content, idx) => (
              <div key={idx} className="py-1 text-[0.95em]">
                <MarkdownText>{content}</MarkdownText>
              </div>
            ))}
          </div>
        )}

        {/* CommandBar - only shown at the end of the turn */}
        <div
          className={cn(
            "mr-auto flex items-center gap-2 transition-opacity duration-200 ease-in-out",
            "opacity-0 delay-[600ms] group-focus-within:opacity-100 group-focus-within:delay-0 group-hover:opacity-100 group-hover:delay-0"
          )}
        >
          <BranchSwitcher
            branch={meta?.branch}
            branchOptions={meta?.branchOptions}
            onSelect={(branch) => thread.setBranch(branch)}
            isLoading={isLoading}
          />
          <CommandBar
            content={combinedContent}
            isLoading={isLoading}
            isAiMessage={true}
            handleRegenerate={handleRegenerateFromHuman}
          />
        </div>
      </div>
    </div>
  );
});
