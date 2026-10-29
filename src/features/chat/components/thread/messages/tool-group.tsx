"use client";

import React, { useId, useMemo, useState } from "react";
import {
  ChevronDownIcon as ChevronDown,
  ClockIcon,
  ShieldAlertIcon as ShieldAlert,
  ToolsIcon,
} from "@/components/icons";
import { ExclamationMarkIcon } from "./tool-status-icons";
import {
  ToolItem,
  getToolIcon,
  type ToolCallData,
  type ToolInterruptData,
  type ToolState,
} from "./tool-item";
import type { ToolMessage } from "@langchain/langgraph-sdk";
import { cn } from "@/lib/utils";

export interface ToolGroupEntry {
  toolCall: ToolCallData;
  toolResponse?: ToolMessage | null;
  interrupt?: ToolInterruptData;
  state: ToolState;
}

export interface ToolGroupProps {
  entries: ToolGroupEntry[];
  className?: string;
}

function pluralizeToolName(name: string) {
  if (name.endsWith("_patch")) return `${name.slice(0, -5)}patches`;
  if (name.endsWith("_command")) return `${name}s`;
  if (name.endsWith("_file")) return `${name}s`;
  if (name.endsWith("_todo")) return `${name}s`;
  if (name.endsWith("s")) return name;
  return `${name}s`;
}

function firstStringArg(args: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = args[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function summarizeToolCall(toolCall: ToolCallData) {
  const { name, args } = toolCall;

  if (/execute_command|run_command|command/i.test(name)) {
    const command = firstStringArg(args, ["command", "cmd", "CommandLine"]);
    if (command) return command.split("\n")[0].trim();
  }

  if (/apply_patch|patch/i.test(name)) {
    const patch = firstStringArg(args, ["input", "patch"]);
    const match = patch.match(/\*\*\* (?:Update|Add|Delete) File: ([^\n]+)/);
    if (match?.[1]) return match[1].trim();
  }

  if (/write_todos|todos?/i.test(name)) {
    const todos = args.todos;
    if (Array.isArray(todos)) {
      return `${todos.length} todo${todos.length === 1 ? "" : "s"}`;
    }
  }

  const detail = firstStringArg(args, [
    "path",
    "query",
    "name",
    "action",
    "url",
  ]);
  return detail || name;
}

export function ToolGroup({ entries, className }: ToolGroupProps) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const first = entries[0];
  const toolFamilies = useMemo(() => {
    const families: Array<{ name: string; count: number }> = [];
    for (const entry of entries) {
      const current = families.at(-1);
      if (current?.name === entry.toolCall.name) {
        current.count += 1;
      } else {
        families.push({ name: entry.toolCall.name, count: 1 });
      }
    }
    return families;
  }, [entries]);
  const label = useMemo(
    () =>
      toolFamilies
        .map(({ name, count }) => (count > 1 ? pluralizeToolName(name) : name))
        .join(" · "),
    [toolFamilies],
  );
  const ToolIcon =
    toolFamilies.length === 1
      ? getToolIcon(first?.toolCall.name || "tool")
      : ToolsIcon;

  const status = useMemo(() => {
    if (entries.some((entry) => entry.interrupt?.needsApproval)) {
      return { Icon: ShieldAlert, className: "text-semantic-warning" };
    }
    if (entries.some((entry) => entry.state === "error")) {
      return { Icon: ExclamationMarkIcon, className: "text-destructive" };
    }
    if (
      entries.some(
        (entry) => entry.state === "pending" || entry.state === "running",
      )
    ) {
      return { Icon: ClockIcon, className: "" };
    }
    return null;
  }, [entries]);

  return (
    <div className={cn("doot-tool-group min-w-0", className)}>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={detailsId}
        aria-label={`${label} (${entries.length} calls)`}
        onClick={() => setExpanded((value) => !value)}
        className="group/toolgroup text-muted-foreground hover:text-foreground inline-flex max-w-full items-center gap-2 py-1 text-sm"
      >
        <span className="relative size-4 shrink-0">
          <ToolIcon className="absolute size-4 group-hover/toolgroup:opacity-0 group-focus-visible/toolgroup:opacity-0" />
          <ChevronDown
            className={cn(
              "absolute size-4 opacity-0 group-hover/toolgroup:opacity-100 group-focus-visible/toolgroup:opacity-100",
              expanded && "rotate-180",
            )}
          />
        </span>
        <span className="truncate">{label}</span>
        <span className="text-muted-foreground/70 text-xs tabular-nums">
          {entries.length}
        </span>
        {status && (
          <status.Icon
            className={cn("size-4 shrink-0", status.className)}
          />
        )}
      </button>

      {expanded && (
        <div id={detailsId} className="doot-tool-group-items">
          {entries.map((entry, index) => (
            <ToolItem
              key={entry.toolCall.id || `${entry.toolCall.name}-${index}`}
              {...entry}
              displayLabel={summarizeToolCall(entry.toolCall)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
