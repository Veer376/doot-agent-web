import { AIMessage, ToolMessage } from "@langchain/langgraph-sdk";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronUpIcon as ChevronUp,
  ChevronDownIcon as ChevronDown,
} from "@/components/icons";
import { ToolContainer } from "@/components/ai-elements/tool-container";
import type { ToolCallArguments } from "@/types/tools";

function isComplexValue(value: unknown): boolean {
  return Array.isArray(value) || (typeof value === "object" && value !== null);
}

export function ToolCalls({
  toolCalls,
}: {
  toolCalls: AIMessage["tool_calls"];
}) {
  if (!toolCalls || toolCalls.length === 0) return null;

  return (
    <div className="w-full max-w-4xl space-y-4">
      {toolCalls.map((tc, idx) => {
        const args = tc.args as ToolCallArguments;
        const hasArgs = Object.keys(args).length > 0;
        return (
          <ToolContainer
            key={idx}
            title={tc.name}
            code={tc.id}
          >
            {hasArgs ? (
              <table className="min-w-full divide-y divide-border">
                <tbody className="divide-y divide-border">
                  {Object.entries(args).map(([key, value], argIdx) => (
                    <tr key={argIdx}>
                      <td className="px-4 py-2 text-sm font-medium whitespace-nowrap text-foreground">
                        {key}
                      </td>
                      <td className="px-4 py-2 text-sm text-muted-foreground">
                        {isComplexValue(value) ? (
                          <code className="rounded bg-muted/40 px-2 py-1 font-mono text-sm break-all">
                            {JSON.stringify(value, null, 2)}
                          </code>
                        ) : (
                          String(value)
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <code className="block text-sm">{"{}"}</code>
            )}
          </ToolContainer>
        );
      })}
    </div>
  );
}

export function ToolResult({ message }: { message: ToolMessage }) {
  const [isExpanded, setIsExpanded] = useState(false);

  let parsedContent: unknown;
  let isJsonContent = false;

  try {
    if (typeof message.content === "string") {
      parsedContent = message.content;
    } else if (typeof message.content === "object") {
      if (Array.isArray(message.content) && message.content.length === 1) {
        parsedContent = message.content[0];
      } else {
        parsedContent = message.content;
      }
      isJsonContent = true;
    }
  } catch {
    // Content is not JSON, use as is
    parsedContent = message.content;
  }

  const contentStr = isJsonContent
    ? JSON.stringify(parsedContent, null, 2)
    : String(message.content);
  const contentLines = contentStr.split("\n");
  const shouldTruncate = contentLines.length > 4;
  const displayedContent =
    shouldTruncate && !isExpanded
      ? contentStr.length > 500
        ? contentStr.slice(0, 500) + "..."
        : contentLines.slice(0, 4).join("\n") + "\n..."
      : contentStr;

  return (
    <ToolContainer
      className="w-full max-w-4xl"
      header={
        <div className="flex flex-wrap items-center justify-between gap-2">
          {message.name ? (
            <h3 className="font-medium text-foreground">
              Tool Result:{" "}
              <code className="rounded bg-muted px-2 py-1">
                {message.name}
              </code>
            </h3>
          ) : (
            <h3 className="font-medium text-foreground">Tool Result</h3>
          )}
          {message.tool_call_id && (
            <code className="ml-2 rounded bg-muted px-2 py-1 text-sm">
              {message.tool_call_id}
            </code>
          )}
        </div>
      }
    >
      <motion.div
        className="min-w-full"
        initial={false}
        animate={{ height: "auto" }}
        transition={{ duration: 0.3 }}
      >
        <div>
          <AnimatePresence
            mode="wait"
            initial={false}
          >
            <motion.div
              key={isExpanded ? "expanded" : "collapsed"}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {isJsonContent ? (
                <table className="min-w-full divide-y divide-border overflow-x-auto">
                  <tbody className="divide-y divide-border">
                    {(Array.isArray(parsedContent)
                      ? isExpanded
                        ? parsedContent
                        : parsedContent.slice(0, 5)
                      : Object.entries(parsedContent as Record<string, unknown>)
                    ).map((item, argIdx) => {
                      const [key, value] = Array.isArray(parsedContent)
                        ? [argIdx, item]
                        : [item[0], item[1]];
                      return (
                        <tr key={argIdx}>
                          <td className="px-4 py-2 text-sm font-medium whitespace-nowrap text-foreground">
                            {key}
                          </td>
                          <td className="px-4 py-2 text-sm text-muted-foreground">
                            {isComplexValue(value) ? (
                              <code className="rounded bg-muted/40 px-2 py-1 font-mono text-sm break-all">
                                {JSON.stringify(value, null, 2)}
                              </code>
                            ) : (
                              String(value)
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <code className="block overflow-x-auto text-sm">
                  {displayedContent}
                </code>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        {((shouldTruncate && !isJsonContent) ||
          (isJsonContent &&
            Array.isArray(parsedContent) &&
            parsedContent.length > 5)) && (
          <motion.button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex w-full cursor-pointer items-center justify-center border-t-[1px] border-border py-2 text-muted-foreground transition-all duration-200 ease-in-out hover:bg-muted/40 hover:text-muted-foreground"
            initial={{ scale: 1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isExpanded ? <ChevronUp /> : <ChevronDown />}
          </motion.button>
        )}
      </motion.div>
    </ToolContainer>
  );
}
