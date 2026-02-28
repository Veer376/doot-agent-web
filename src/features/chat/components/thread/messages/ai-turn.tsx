import { useStreamContext } from "@/features/chat/providers/Stream";
import { Checkpoint, Message } from "@langchain/langgraph-sdk";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { CommandBar } from "./shared";
import { MarkdownText } from "@/components/ui/markdown-text";
import {
  extractChainOfThought,
  type ChainStep,
} from "@/features/chat/utils/extract-chain-of-thought";
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
  ChainOfThoughtPreview,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import { DotIcon, CheckCircle2Icon, ShieldAlert } from "lucide-react";
import { ToolsIcon } from "@/components/icons";
import React, { useMemo } from "react";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { ToolItem, type ToolState } from "./tool-item";

/**
 * Convert ChainStep status to ToolState
 */
function stepStatusToToolState(
  status: "pending" | "success" | "error",
): ToolState {
  switch (status) {
    case "pending":
      return "running";
    case "success":
      return "completed";
    case "error":
      return "error";
    default:
      return "pending";
  }
}

interface AITurnProps {
  turnMessages: Message[];
  lastHumanIndex: number;
  allMessages: Message[];
  isLoading: boolean;
  handleRegenerate: (
    parentCheckpoint: Checkpoint | null | undefined,
    optimisticValues?: (prev: { messages?: Message[] }) => {
      messages?: Message[] | undefined;
    },
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
    [turnMessages, isLoading],
  );

  const humanMessage =
    lastHumanIndex >= 0 ? allMessages[lastHumanIndex] : undefined;
  const humanMeta = humanMessage
    ? thread.getMessagesMetadata(humanMessage)
    : undefined;

  // Combine all content for the command bar
  const combinedContent = chainData.renderBlocks
    .filter((block) => block.type === "content")
    .map((block) => (block.type === "content" ? block.content : ""))
    .join("\n\n");

  // Parse citations once from combined content
  const parseCitations = (text: string) => {
    const citations = new Map<
      string,
      { number: string; title: string; url: string; description?: string }
    >();

    const sourcesMatch = text.match(/\*\*Sources:\*\*\s*\n([\s\S]+?)$/i);
    if (!sourcesMatch) return citations;

    const sourcesList = sourcesMatch[1];
    const citationLines = sourcesList
      .split(/(?=\n\[\d+\])/g)
      .filter((line) => line.trim());

    citationLines.forEach((line) => {
      const trimmedLine = line.trim();
      const match = trimmedLine.match(
        /^\[\s*(\d+)\s*\]\s*(.+?)\s*\|\s*(https?:\/\/\S+)(?:\s*\|\s*(.+))?$/,
      );

      if (match) {
        const [, number, title, url, description] = match;
        citations.set(number.trim(), {
          number: number.trim(),
          title: title.trim(),
          url: url.trim(),
          description: description?.trim(),
        });
      }
    });

    return citations;
  };

  const citations = parseCitations(combinedContent);

  const handleRegenerateFromHuman = () => {
    const checkpoint = humanMeta?.firstSeenState?.parent_checkpoint;

    handleRegenerate(checkpoint, (prev) => {
      return {
        ...prev,
        messages: allMessages.slice(0, lastHumanIndex + 1),
      };
    });
  };

  // Render a single step (thinking or tool)
  const renderStep = (
    step: ChainStep,
    idx: number,
    isPreview: boolean = false,
  ) => {
    if (step.type === "thinking") {
      return (
        <ChainOfThoughtStep
          key={`thinking-${idx}-${isPreview ? "preview" : "full"}`}
          icon={DotIcon}
          label={step.heading}
          status="complete"
          isPreview={isPreview}
          className="space-y-1"
        >
          <div className="prose prose-sm mt-1 max-w-none text-sm">
            <MarkdownText citations={citations}>{step.content}</MarkdownText>
          </div>
        </ChainOfThoughtStep>
      );
    } else {
      // Tool step - check if it needs HITL approval
      const interruptAny = thread.interrupt as any;
      const needsApproval = Boolean(
        thread.interrupt && interruptAny.tool_call?.id === step.toolCall.id,
      );

      // Debug logging for interrupt matching
      if (
        thread.interrupt &&
        step.toolCall.name === interruptAny.tool_call?.name
      ) {
        console.log("[AITurn renderStep] Checking tool for interrupt match:");
        console.log("  step.toolCall.id:", step.toolCall.id);
        console.log(
          "  thread.interrupt.tool_call.id:",
          interruptAny.tool_call?.id,
        );
        console.log("  needsApproval:", needsApproval);
      }

      return (
        <ChainOfThoughtStep
          key={`tool-${step.toolCall.id}-${idx}-${isPreview ? "preview" : "full"}`}
          icon={needsApproval ? ShieldAlert : ToolsIcon}
          label=""
          status={
            needsApproval
              ? "pending"
              : step.status === "pending"
                ? "pending"
                : "complete"
          }
          isPreview={isPreview}
          className="space-y-1"
        >
          <ToolItem
            toolCall={{
              id: step.toolCall.id,
              name: step.toolCall.name,
              args: step.toolCall.args as Record<string, unknown>,
            }}
            toolResponse={step.toolResponse}
            state={stepStatusToToolState(step.status)}
            interrupt={
              needsApproval
                ? {
                    needsApproval: true,
                    onApprove: (thread as any).approve,
                    onReject: (thread as any).reject,
                  }
                : undefined
            }
            defaultExpanded={false}
          />
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
            // Get the last step for preview
            const lastStep = block.steps[block.steps.length - 1];

            // Determine if this is active thinking or completed thoughts
            // Active: last thinking-group block AND still loading
            // Complete: everything else (has content after, not loading, or not last block)
            const isLastThinkingGroup =
              blockIdx === chainData.renderBlocks.length - 1;
            const isActiveThinking = isLoading && isLastThinkingGroup;

            // Always show preview with the last step (when collapsed)
            // The ChainOfThoughtPreview component handles hiding when expanded
            const shouldShowPreview = true;

            // Render thinking block with steps and smooth entrance animation
            return (
              <motion.div
                key={`thinking-wrapper-${blockIdx}`}
                initial={{ opacity: 0, y: -8 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: {
                    duration: 0.5,
                    ease: [0.16, 1, 0.3, 1],
                  },
                }}
                exit={{
                  opacity: 0,
                  y: -8,
                  transition: {
                    duration: 0.4,
                    ease: [0.7, 0, 0.84, 0],
                  },
                }}
              >
                <ChainOfThought
                  key={`thinking-${blockIdx}`}
                  defaultOpen={false}
                >
                  <ChainOfThoughtHeader>
                    {isActiveThinking ? (
                      <Shimmer
                        duration={1}
                        spread={2}
                      >
                        Thinking...
                      </Shimmer>
                    ) : (
                      "Thoughts"
                    )}
                  </ChainOfThoughtHeader>

                  {/* Preview: Show last step when collapsed (actively streaming and no content after) */}
                  {/* ChainOfThoughtPreview automatically hides when isOpen=true, preventing duplication */}
                  <ChainOfThoughtPreview
                    showPreview={shouldShowPreview}
                    contentKey={
                      lastStep
                        ? `${lastStep.type}-${block.steps.length}-${blockIdx}`
                        : undefined
                    }
                  >
                    {lastStep &&
                      renderStep(lastStep, block.steps.length - 1, true)}
                  </ChainOfThoughtPreview>

                  {/* Full content: Show all steps when expanded */}
                  {/* Preview is automatically hidden when expanded, so no duplication occurs */}
                  <ChainOfThoughtContent>
                    {block.steps.map((step, stepIdx) =>
                      renderStep(step, stepIdx, false),
                    )}

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
              </motion.div>
            );
          } else if (block.type === "content") {
            // Render content block with smooth animation
            return (
              <motion.div
                key={`content-${blockIdx}`}
                className="py-1 text-[0.95em]"
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: {
                    duration: 0.6,
                    ease: [0.16, 1, 0.3, 1],
                    delay: 0.1,
                  },
                }}
              >
                <MarkdownText citations={citations}>
                  {block.content}
                </MarkdownText>
              </motion.div>
            );
          } else if (block.type === "tools-only") {
            // Render standalone tools WITHOUT thinking wrapper
            // New design: Fixed container for tool name, response expands below independently
            return (
              <div
                key={`tools-${blockIdx}`}
                className="my-2 flex flex-col gap-2"
              >
                {block.tools.map((toolStep, stepIdx) => {
                  // Type assertion: we know tools array only contains tool steps
                  const step = toolStep as Extract<
                    typeof toolStep,
                    { type: "tool" }
                  >;

                  // Check if this tool needs HITL approval
                  const interruptAny2 = thread.interrupt as any;
                  const needsApproval = Boolean(
                    thread.interrupt &&
                    interruptAny2.tool_call?.id === step.toolCall.id,
                  );

                  // Debug logging for interrupt matching
                  if (
                    thread.interrupt &&
                    step.toolCall.name === interruptAny2.tool_call?.name
                  ) {
                    console.log(
                      "[AITurn ToolItem] Checking tool for interrupt match:",
                    );
                    console.log("  step.toolCall.id:", step.toolCall.id);
                    console.log(
                      "  thread.interrupt.tool_call.id:",
                      interruptAny2.tool_call?.id,
                    );
                    console.log("  needsApproval:", needsApproval);
                  }

                  return (
                    <ToolItem
                      key={`tool-standalone-${step.toolCall.id || stepIdx}`}
                      toolCall={{
                        id: step.toolCall.id,
                        name: step.toolCall.name,
                        args: step.toolCall.args as Record<string, unknown>,
                      }}
                      toolResponse={step.toolResponse}
                      state={stepStatusToToolState(step.status)}
                      interrupt={
                        needsApproval
                          ? {
                              needsApproval: true,
                              onApprove: (thread as any).approve,
                              onReject: (thread as any).reject,
                            }
                          : undefined
                      }
                    />
                  );
                })}
              </div>
            );
          }
          return null;
        })}

        {/* CommandBar - only shown when streaming is complete */}
        {/* Don't render at all while loading to avoid showing non-functional buttons */}
        {!isLoading && (
          <div
            className={cn(
              "mr-auto flex items-center gap-2 transition-opacity duration-200 ease-in-out",
              "opacity-100 group-focus-within:opacity-100 group-focus-within:delay-0 group-hover:opacity-100 group-hover:delay-0 md:opacity-0 md:delay-[600ms]",
            )}
          >
            <CommandBar
              content={combinedContent}
              isLoading={false}
              isAiMessage={true}
              handleRegenerate={handleRegenerateFromHuman}
            />
          </div>
        )}
      </div>
    </div>
  );
});
