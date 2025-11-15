import { useStreamContext } from "@/features/chat/providers/Stream";
import { Checkpoint, Message, ToolMessage } from "@langchain/langgraph-sdk";
import { cn } from "@/lib/utils";
import { CommandBar } from "./shared";
import { MarkdownText } from "@/components/ui/markdown-text";
import { extractChainOfThought } from "@/features/chat/utils/extract-chain-of-thought";
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import { DotIcon, WrenchIcon, CheckCircle2Icon, XCircleIcon, LoaderCircle } from "lucide-react";
import { CheckmarkCircleIcon, CopyIcon } from "@/components/icons";
import React, { useMemo } from "react";
import { toast } from "sonner";

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
    () => extractChainOfThought(turnMessages, isLoading),
    [turnMessages, isLoading]
  );

  const humanMessage = lastHumanIndex >= 0 ? allMessages[lastHumanIndex] : undefined;
  const humanMeta = humanMessage
    ? thread.getMessagesMetadata(humanMessage)
    : undefined;

  // Combine all content for the command bar
  const combinedContent = chainData.renderBlocks
    .filter((block) => block.type === "content")
    .map((block) => (block as any).content)
    .join("\n\n");

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

  // Get dynamic header text from last step in a group
  const getGroupHeader = (steps: any[]) => {
    if (steps.length === 0) return "Thinking...";
    
    const lastStep = steps[steps.length - 1];
    if (lastStep.type === "thinking") {
      return lastStep.heading;
    } else {
      return lastStep.toolCall.name;
    }
  };

  // Render a single step (thinking or tool)
  const renderStep = (step: any, idx: number) => {
    if (step.type === "thinking") {
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
      // Tool step - using same design as standalone tools but scaled down for thinking block
      const handleCopy = () => {
        const copyContent = `### ${step.toolCall.name}\n\n${step.toolResponse ? formatToolResponse(step.toolResponse) : ''}`;
        navigator.clipboard.writeText(copyContent);
        toast.success("Copied to clipboard");
      };
      
      return (
        <ChainOfThoughtStep
          key={`tool-${step.toolCall.id}-${idx}`}
          icon={WrenchIcon}
          label=""
          status={step.status === "pending" ? "pending" : "complete"}
          className="space-y-1"
        >
          <div className="inline-block -mt-0.5">
            {/* Toolbar acts as peer; only its hover expands response - matches standalone design but smaller */}
            <div 
              data-radius="radius2"
              className="group/tool peer inline-flex items-center gap-1.5 border bg-muted/30 px-2 py-1"
            >
              {/* Processing Icon / Tick */}
              {step.status === "pending" && (
                <LoaderCircle className="h-3 w-3 animate-spin text-muted-foreground flex-shrink-0" />
              )}
              {step.status === "success" && (
                <CheckmarkCircleIcon size="xs" className="text-green-600 flex-shrink-0" />
              )}
              {step.status === "error" && (
                <XCircleIcon className="h-3 w-3 text-red-600 flex-shrink-0" />
              )}
              <span className="text-xs font-medium">{step.toolCall.name}</span>
              {step.toolResponse && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="ml-1 opacity-0 transition-opacity duration-200 group-hover/tool:opacity-100"
                  aria-label="Copy tool and response"
                >
                  <CopyIcon size="xs" className="text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
            {step.toolResponse && (
              <div className="grid grid-rows-[0fr] peer-hover:grid-rows-[1fr] transition-all duration-300 ease-in-out">
                <div className="overflow-hidden">
                  <div 
                    data-radius="radius2"
                    className="mt-1.5 inline-block w-fit max-w-[60ch] border bg-muted/50 px-2 py-1.5"
                  >
                    <div className="whitespace-pre-wrap font-mono text-[10px] leading-relaxed">
                      {formatToolResponse(step.toolResponse)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ChainOfThoughtStep>
      );
    }
  };

  return (
    <div className="group mr-auto flex items-start gap-2">
      <div className="flex flex-col gap-1">
        
        {/* Render all blocks in order */}
        {chainData.renderBlocks.map((block, blockIdx) => {
          if (block.type === "thinking-group") {
            // Render thinking block with steps
            return (
              <ChainOfThought key={`thinking-${blockIdx}`} defaultOpen={false}>
                <ChainOfThoughtHeader>
                  {getGroupHeader(block.steps)}
                </ChainOfThoughtHeader>
                <ChainOfThoughtContent>
                  {block.steps.map((step, stepIdx) => renderStep(step, stepIdx))}
                  
                  {/* Done step if group is complete */}
                  {block.showDone && (
                    <ChainOfThoughtStep
                      icon={CheckCircle2Icon}
                      label="Done"
                      status="complete"
                      className="space-y-0"
                    />
                  )}
                </ChainOfThoughtContent>
              </ChainOfThought>
            );
          } else if (block.type === "content") {
            // Render content block
            return (
              <div key={`content-${blockIdx}`} className="py-1 text-[0.95em]">
                <MarkdownText>{block.content}</MarkdownText>
              </div>
            );
          } else if (block.type === "tools-only") {
            // Render standalone tools WITHOUT thinking wrapper
            // New design: Fixed container for tool name, response expands below independently
            return (
              <div key={`tools-${blockIdx}`} className="flex flex-col gap-2 my-2">
                {block.tools.map((toolStep, stepIdx) => {
                  // Type assertion: we know tools array only contains tool steps
                  const step = toolStep as Extract<typeof toolStep, { type: "tool" }>;
                  
                  const handleCopy = () => {
                    const copyContent = `### ${step.toolCall.name}\n\n${step.toolResponse ? formatToolResponse(step.toolResponse) : ''}`;
                    navigator.clipboard.writeText(copyContent);
                    toast.success("Copied to clipboard");
                  };
                  
                  return (
                    <div key={`tool-standalone-${stepIdx}`} className="inline-block">
                      {/* Toolbar acts as peer; only its hover expands response */}
                      <div 
                        data-radius="radius2"
                        className="group/tool peer inline-flex items-center gap-2 border bg-muted/30 px-3 py-2"
                      >
                        {/* Processing Icon / Tick */}
                        {step.status === "pending" && (
                          <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground flex-shrink-0" />
                        )}
                        {step.status === "success" && (
                          <CheckmarkCircleIcon size="sm" className="text-green-600 flex-shrink-0" />
                        )}
                        {step.status === "error" && (
                          <XCircleIcon className="h-4 w-4 text-red-600 flex-shrink-0" />
                        )}
                        <span className="text-sm font-medium">{step.toolCall.name}</span>
                        {step.toolResponse && (
                          <button
                            type="button"
                            onClick={handleCopy}
                            className="ml-2 opacity-0 transition-opacity duration-200 group-hover/tool:opacity-100"
                            aria-label="Copy tool and response"
                          >
                            <CopyIcon size="xs" className="text-muted-foreground hover:text-foreground" />
                          </button>
                        )}
                      </div>
                      {step.toolResponse && (
                        <div className="grid grid-rows-[0fr] peer-hover:grid-rows-[1fr] transition-all duration-300 ease-in-out">
                          <div className="overflow-hidden">
                            <div 
                              data-radius="radius2"
                              className="mt-2 inline-block w-fit max-w-[70ch] border bg-muted/50 px-3 py-2"
                            >
                              <div className="whitespace-pre-wrap font-mono text-xs">
                                {formatToolResponse(step.toolResponse)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          }
          return null;
        })}

        {/* CommandBar - only shown at the end of the turn */}
        {/* Branch switching is handled at the human message level, not here */}
        <div
          className={cn(
            "mr-auto flex items-center gap-2 transition-opacity duration-200 ease-in-out",
            "opacity-0 delay-[600ms] group-focus-within:opacity-100 group-focus-within:delay-0 group-hover:opacity-100 group-hover:delay-0"
          )}
        >
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
