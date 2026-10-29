import { useStreamContext } from "@/features/chat/providers/Stream";
import { Checkpoint, Message } from "@langchain/langgraph-sdk";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { CommandBar } from "./shared";
import { MarkdownText } from "@/components/ui/markdown-text/lazy";
import {
  extractChainOfThought,
  type ChainStep,
} from "@/features/chat/utils/extract-chain-of-thought";
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import { DotIcon } from "@/components/icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ToolItem, type ToolState } from "./tool-item";
import { ToolGroup, type ToolGroupEntry } from "./tool-group";
import { ResponseSelectionActions } from "./response-selection-actions";
import {
  compactWorkedTimeline,
  flattenWorkedBlocks,
} from "./worked-timeline";

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

type ToolStep = Extract<ChainStep, { type: "tool" }>;

function parseStateTime(value: string | null | undefined) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function formatWorkedDuration(milliseconds: number | null) {
  if (milliseconds == null || milliseconds < 0) return null;
  const totalMinutes = Math.floor(milliseconds / 60_000);
  if (totalMinutes < 1) return "<1 minute";

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const hourLabel = `${hours} hour${hours === 1 ? "" : "s"}`;
  const minuteLabel = `${minutes} minute${minutes === 1 ? "" : "s"}`;

  if (hours === 0) return minuteLabel;
  if (minutes === 0) return hourLabel;
  return `${hourLabel} ${minuteLabel}`;
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

  const hasWorked = chainData.hasThinking || chainData.hasToolCalls;
  const lastWorkedBlockIndex = useMemo(() => {
    for (let index = chainData.renderBlocks.length - 1; index >= 0; index--) {
      if (chainData.renderBlocks[index].type !== "content") return index;
    }
    return -1;
  }, [chainData.renderBlocks]);
  const workedBlocks =
    lastWorkedBlockIndex >= 0
      ? chainData.renderBlocks.slice(0, lastWorkedBlockIndex + 1)
      : [];
  const responseBlocks =
    lastWorkedBlockIndex >= 0
      ? chainData.renderBlocks.slice(lastWorkedBlockIndex + 1)
      : chainData.renderBlocks;

  const historicalTurnTimes = turnMessages
    .map((message) =>
      parseStateTime(
        thread.getMessagesMetadata(message)?.firstSeenState?.created_at,
      ),
    )
    .filter((timestamp): timestamp is number => timestamp != null);
  const historicalStartedAt =
    historicalTurnTimes[0] ??
    parseStateTime(humanMeta?.firstSeenState?.created_at) ??
    null;
  const historicalEndedAt = historicalTurnTimes.at(-1) ?? null;
  const wasLoading = useRef(isLoading);
  const [liveStartedAt, setLiveStartedAt] = useState<number | null>(() =>
    isLoading ? Date.now() : null,
  );
  const [liveCompletedAt, setLiveCompletedAt] = useState<number | null>(null);
  const [liveNow, setLiveNow] = useState(() => Date.now());

  useEffect(() => {
    if (isLoading) {
      setLiveCompletedAt(null);
      if (!wasLoading.current) setLiveStartedAt(Date.now());
    } else if (wasLoading.current) {
      setLiveCompletedAt(Date.now());
    }
    wasLoading.current = isLoading;
  }, [isLoading]);

  const effectiveStartedAt = historicalStartedAt ?? liveStartedAt;

  // The label only displays whole minutes, so tick at the next minute boundary
  // instead of re-rendering the entire active turn every second.
  useEffect(() => {
    if (!isLoading || effectiveStartedAt == null) return;

    let timeoutId: number | undefined;
    const updateAndSchedule = () => {
      const now = Date.now();
      setLiveNow(now);

      const elapsed = Math.max(0, now - effectiveStartedAt);
      const remainder = elapsed % 60_000;
      const untilNextMinute = 60_000 - remainder;
      timeoutId = window.setTimeout(
        updateAndSchedule,
        Math.max(1_000, untilNextMinute + 50),
      );
    };

    updateAndSchedule();
    return () => {
      if (timeoutId != null) window.clearTimeout(timeoutId);
    };
  }, [isLoading, effectiveStartedAt]);

  const runningDuration = formatWorkedDuration(
    isLoading && effectiveStartedAt != null ? liveNow - effectiveStartedAt : null,
  );
  const workedDuration = formatWorkedDuration(
    effectiveStartedAt != null && (liveCompletedAt ?? historicalEndedAt) != null
      ? (liveCompletedAt ?? historicalEndedAt)! - effectiveStartedAt
      : null,
  );
  const workedLabel = isLoading
    ? runningDuration
      ? `Working ${runningDuration}`
      : "Working…"
    : workedDuration
      ? `Worked ${workedDuration}`
      : "Worked";

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

  const toolStepToEntry = (step: ToolStep): ToolGroupEntry => {
    const interruptAny = thread.interrupt as any;
    const needsApproval = Boolean(
      thread.interrupt && interruptAny.tool_call?.id === step.toolCall.id,
    );

    // Preserve the existing interrupt-match diagnostics while tool rendering
    // moves through the Worked compaction state machine.
    if (
      thread.interrupt &&
      step.toolCall.name === interruptAny.tool_call?.name
    ) {
      console.log("[AITurn ToolItem] Checking tool for interrupt match:");
      console.log("  step.toolCall.id:", step.toolCall.id);
      console.log(
        "  thread.interrupt.tool_call.id:",
        interruptAny.tool_call?.id,
      );
      console.log("  needsApproval:", needsApproval);
    }

    return {
      toolCall: {
        id: step.toolCall.id,
        name: step.toolCall.name,
        args: step.toolCall.args as Record<string, unknown>,
      },
      toolResponse: step.toolResponse,
      state: stepStatusToToolState(step.status),
      interrupt: needsApproval
        ? {
            needsApproval: true,
            onApprove: (thread as any).approve,
            onReject: (thread as any).reject,
          }
        : undefined,
    };
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
          label={
            step.content.trim() && /^Thinking(?:\.\.\.|…)?$/i.test(step.heading)
              ? ""
              : step.heading
          }
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
      return (
        <ToolItem
          key={`tool-${step.toolCall.id}-${idx}`}
          {...toolStepToEntry(step)}
          defaultExpanded={false}
        />
      );
    }
  };

  const workedTimeline = useMemo(
    () => compactWorkedTimeline(flattenWorkedBlocks(workedBlocks), isLoading),
    [workedBlocks, isLoading],
  );

  const renderWorkedSegment = (
    segment: (typeof workedTimeline)[number],
    segmentIdx: number,
  ) => {
    if (segment.type === "tool-group") {
      return (
        <ToolGroup
          key={`worked-tool-group-${segmentIdx}-${segment.tools[0]?.toolCall.id || "group"}`}
          entries={segment.tools.map(toolStepToEntry)}
        />
      );
    }

    if (segment.item.type === "tool") {
      return (
        <React.Fragment key={`worked-tool-${segment.item.step.toolCall.id || segmentIdx}`}>
          {renderStep(segment.item.step, segmentIdx, false)}
        </React.Fragment>
      );
    }

    if (segment.item.type === "thinking") {
      return (
        <React.Fragment key={`worked-thinking-${segmentIdx}`}>
          {renderStep(segment.item.step, segmentIdx, false)}
        </React.Fragment>
      );
    }

    return (
      <ChainOfThoughtStep
        key={`worked-text-${segmentIdx}`}
        icon={DotIcon}
        label=""
        status="complete"
        className="space-y-1"
      >
        <div className="prose prose-sm mt-1 max-w-none text-sm">
          <MarkdownText citations={citations}>{segment.item.content}</MarkdownText>
        </div>
      </ChainOfThoughtStep>
    );
  };

  const renderResponseBlock = (
    block: (typeof chainData.renderBlocks)[number],
    blockIdx: number,
  ) => {
    if (block.type !== "content") return null;
    return (
      <motion.div
        key={`content-${blockIdx}`}
        data-doot-response-content="true"
        className="doot-response min-w-0 py-1 [overflow-wrap:anywhere]"
        initial={{ opacity: 0, y: 4 }}
        animate={{
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.3,
            ease: [0.19, 1, 0.22, 1],
          },
        }}
      >
        <MarkdownText citations={citations}>{block.content}</MarkdownText>
      </motion.div>
    );
  };

  return (
    <ResponseSelectionActions
      turnId={turnMessages[0]?.id ?? ""}
      disabled={isLoading}
      className="doot-assistant-turn group mr-auto flex w-full min-w-0 items-start gap-2"
    >
      <div className="flex w-full min-w-0 flex-col gap-2">
        {hasWorked && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
            }}
          >
            <ChainOfThought processing={isLoading} defaultOpen={isLoading}>
              <ChainOfThoughtHeader>{workedLabel}</ChainOfThoughtHeader>
              <ChainOfThoughtContent>
                {workedTimeline.map(renderWorkedSegment)}
              </ChainOfThoughtContent>
            </ChainOfThought>
          </motion.div>
        )}

        {responseBlocks.map(renderResponseBlock)}

        {/* CommandBar - only shown when streaming is complete */}
        {/* Don't render at all while loading to avoid showing non-functional buttons */}
        {!isLoading && (
          <div className={cn("doot-message-actions mr-auto flex items-center")}>
            <CommandBar
              content={combinedContent}
              isLoading={false}
              isAiMessage={true}
              handleRegenerate={handleRegenerateFromHuman}
            />
          </div>
        )}
      </div>
    </ResponseSelectionActions>
  );
});
