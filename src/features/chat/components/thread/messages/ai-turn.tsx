import { useStreamContext } from "@/features/chat/providers/Stream";
import { Checkpoint, Message, ToolMessage } from "@langchain/langgraph-sdk";
import { cn } from "@/lib/utils";
import { BranchSwitcher, CommandBar } from "./shared";
import { MarkdownText } from "@/components/ui/markdown-text";
import { extractChainOfThought } from "@/features/chat/utils/extract-chain-of-thought";
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import { DotIcon, WrenchIcon, CheckCircle2Icon, XCircleIcon, LoaderCircleIcon } from "lucide-react";
import React, { useMemo } from "react";

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
      // Tool step
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
  };

  return (
    <div className="group mr-auto flex items-start gap-2">
      <div className="flex flex-col gap-1">
        
        {/* Render all blocks in order */}
        {chainData.renderBlocks.map((block, blockIdx) => {
          if (block.type === "thinking-group") {
            // Render thinking block with steps
            return (
              <ChainOfThought key={`thinking-${blockIdx}`} defaultOpen={true}>
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
            // Just render the tool cards directly with consistent styling
            return (
              <div key={`tools-${blockIdx}`} className="flex flex-col gap-2 my-2">
                {block.tools.map((toolStep, stepIdx) => {
                  // Type assertion: we know tools array only contains tool steps
                  const step = toolStep as Extract<typeof toolStep, { type: "tool" }>;
                  
                  return (
                    <div key={`tool-standalone-${stepIdx}`} className="space-y-1">
                      {/* Tool call display with consistent styling */}
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <WrenchIcon className="h-4 w-4 text-muted-foreground" />
                        <span>{step.toolCall.name}</span>
                      </div>
                      
                      <div className="rounded border px-3 py-2 text-sm ml-6">
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
                        <div className="mt-1 ml-6 rounded bg-muted p-3 text-sm">
                          <div className="mb-0.5 text-xs font-medium text-muted-foreground">
                            Response:
                          </div>
                          <div className="whitespace-pre-wrap font-mono text-xs">
                            {formatToolResponse(step.toolResponse)}
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
