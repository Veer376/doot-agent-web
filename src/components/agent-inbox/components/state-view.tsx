import {
  ChevronRightIcon as ChevronRight,
  XIcon as X,
  ChevronsDownUpIcon as ChevronsDownUp,
  ChevronsUpDownIcon as ChevronsUpDown,
} from "@/components/icons";
import { useEffect, useState } from "react";
import {
  baseMessageObject,
  isArrayOfMessages,
  prettifyText,
  unknownToPrettyDate,
} from "../utils";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { BaseMessage } from "@langchain/core/messages";
import { ToolCall } from "@langchain/core/messages/tool";
import { Button } from "../../ui/button";
import { ToolCallTable } from "./tool-call-table";
import { MarkdownText } from "@/components/ui/markdown-text/lazy";
import { ThreadData } from "../types";
import {
  EmptyStateView,
  InterruptedDescriptionView,
  NonInterruptedDescriptionView,
  ThreadStateView,
} from "./views";

interface StateViewRecursiveProps {
  value: unknown;
  expanded?: boolean;
}

const messageTypeToLabel = (message: BaseMessage) => {
  let type = "";
  if ("type" in message && typeof message.type === "string") {
    type = message.type;
  } else if ("_getType" in message && typeof message._getType === "function") {
    type = (message as any)._getType();
  }

  switch (type) {
    case "human":
      return "User";
    case "ai":
      return "Assistant";
    case "tool":
      return "Tool";
    case "System":
      return "System";
    default:
      return "";
  }
};

function MessagesRenderer({ messages }: { messages: BaseMessage[] }) {
  return (
    <div className="flex w-full flex-col gap-1">
      {messages.map((msg, idx) => {
        const messageTypeLabel = messageTypeToLabel(msg);
        const content =
          typeof msg.content === "string"
            ? msg.content
            : JSON.stringify(msg.content, null);
        return (
          <div
            key={msg.id || `message-${idx}`}
            className="ml-2 flex w-full flex-col gap-0.5"
          >
            <p className="font-medium text-foreground">{messageTypeLabel}:</p>
            {content && (
              <MarkdownText className="text-muted-foreground">{content}</MarkdownText>
            )}
            {"tool_calls" in msg && msg.tool_calls ? (
              <div className="flex w-full flex-col items-start gap-1">
                {(msg.tool_calls as ToolCall[]).map((tc, idx) => (
                  <ToolCallTable
                    key={tc.id || `tool-call-${idx}`}
                    toolCall={tc}
                  />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function StateViewRecursive(props: StateViewRecursiveProps) {
  const date = unknownToPrettyDate(props.value);
  if (date) {
    return <p className="font-light text-muted-foreground">{date}</p>;
  }

  if (["string", "number"].includes(typeof props.value)) {
    return (
      <MarkdownText className="font-light text-muted-foreground">
        {props.value as string}
      </MarkdownText>
    );
  }

  if (typeof props.value === "boolean") {
    return (
      <MarkdownText className="font-light text-muted-foreground">
        {JSON.stringify(props.value)}
      </MarkdownText>
    );
  }

  if (props.value == null) {
    return <p className="whitespace-pre-wrap font-light text-muted-foreground">null</p>;
  }

  if (Array.isArray(props.value)) {
    if (props.value.length > 0 && isArrayOfMessages(props.value)) {
      return <MessagesRenderer messages={props.value} />;
    }

    const valueArray = props.value as unknown[];
    return (
      <div className="flex w-full flex-row items-start justify-start gap-1">
        <span className="font-normal text-foreground">[</span>
        {valueArray.map((item, idx) => {
          const itemRenderValue = baseMessageObject(item);
          return (
            <div
              key={`state-view-${idx}`}
              className="flex w-full flex-row items-start whitespace-pre-wrap"
            >
              <StateViewRecursive value={itemRenderValue} />
              {idx < valueArray?.length - 1 && (
                <span className="font-normal text-foreground">,&nbsp;</span>
              )}
            </div>
          );
        })}
        <span className="font-normal text-foreground">]</span>
      </div>
    );
  }

  if (typeof props.value === "object") {
    if (Object.keys(props.value).length === 0) {
      return <p className="font-light text-muted-foreground">{"{}"}</p>;
    }
    return (
      <div className="relative ml-6 flex w-full flex-col items-start justify-start gap-1">
        {/* Vertical line */}
        <div className="absolute -left-6 top-0 h-full w-px bg-accent" />

        {Object.entries(props.value).map(([key, value], idx) => (
          <div
            key={`state-view-object-${key}-${idx}`}
            className="relative w-full"
          >
            {/* Horizontal connector line */}
            <div className="absolute -left-5 top-2.5 h-px w-4.5 bg-accent" />
            <StateViewObject
              expanded={props.expanded}
              keyName={key}
              value={value}
            />
          </div>
        ))}
      </div>
    );
  }
}

function HasContentsEllipsis({ onClick }: { onClick?: () => void }) {
  return (
    <span
      onClick={onClick}
      className={cn(
        "p-0.5 font-mono text-doot-fine leading-3",
        "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
        "cursor-pointer transition-colors ease-in-out",
        "inline-block -translate-y-[2px]",
      )}
      data-radius="control"
    >
      {"{...}"}
    </span>
  );
}

interface StateViewProps {
  keyName: string;
  value: unknown;
  /**
   * Whether or not to expand or collapse the view
   * @default true
   */
  expanded?: boolean;
}

export function StateViewObject(props: StateViewProps) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (props.expanded != null) {
      setExpanded(props.expanded);
    }
  }, [props.expanded]);

  return (
    <div className="relative flex flex-row items-start justify-start gap-2 text-sm">
      <motion.div
        initial={false}
        animate={{ rotate: expanded ? 90 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <div
          onClick={() => setExpanded((prev) => !prev)}
          className="flex h-5 w-5 cursor-pointer items-center justify-center text-muted-foreground transition-colors ease-in-out hover:bg-muted hover:text-foreground"
          data-radius="control"
        >
          <ChevronRight className="h-4 w-4" />
        </div>
      </motion.div>
      <div className="flex w-full flex-col items-start justify-start gap-1">
        <p className="font-normal text-foreground">
          {prettifyText(props.keyName)}{" "}
          {!expanded && (
            <HasContentsEllipsis onClick={() => setExpanded((prev) => !prev)} />
          )}
        </p>
        <motion.div
          initial={false}
          animate={{
            height: expanded ? "auto" : 0,
            opacity: expanded ? 1 : 0,
          }}
          transition={{
            duration: 0.2,
            ease: "easeInOut",
          }}
          style={{ overflow: "hidden" }}
          className="relative w-full"
        >
          <StateViewRecursive
            expanded={props.expanded}
            value={props.value}
          />
        </motion.div>
      </div>
    </div>
  );
}

interface StateViewComponentProps {
  threadData: ThreadData<Record<string, any>>;
  handleShowSidePanel: (showState: boolean, showDescription: boolean) => void;
  view: "description" | "state";
}

export function StateView({
  threadData,
  handleShowSidePanel,
  view,
}: StateViewComponentProps) {
  const [expanded, setExpanded] = useState(false);
  const threadValues = threadData.thread.values;
  const description = threadData.interrupts?.[0]?.description;
  const isInterrupted =
    threadData.status === "interrupted" &&
    threadData.interrupts &&
    threadData.interrupts.length > 0;

  if (!threadValues) {
    return <EmptyStateView />;
  }

  return (
    <div className="relative flex w-full flex-row gap-0 overflow-y-auto border-t-[1px] border-border pl-6 lg:border-l-[1px] lg:border-t-[0px]">
      {view === "description" && isInterrupted && (
        <InterruptedDescriptionView description={description} />
      )}
      {view === "description" && !isInterrupted && (
        <NonInterruptedDescriptionView />
      )}
      {view === "state" && (
        <ThreadStateView
          threadValues={threadValues}
          expanded={expanded}
        />
      )}

      <div className="absolute right-6 top-6 flex gap-2">
        {view === "state" && (
          <Button
            onClick={() => setExpanded((prev) => !prev)}
            variant="ghost"
            className="text-muted-foreground"
            size="sm"
          >
            {expanded ? (
              <ChevronsUpDown className="h-4 w-4" />
            ) : (
              <ChevronsDownUp className="h-4 w-4" />
            )}
          </Button>
        )}
        <Button
          onClick={() => handleShowSidePanel(false, false)}
          variant="ghost"
          className="text-muted-foreground"
          size="sm"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
