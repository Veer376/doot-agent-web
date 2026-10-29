"use client";
import React, { useId, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MarkdownText } from "@/components/ui/markdown-text/lazy";
import { SyntaxHighlighter } from "@/components/ui/markdown-text/syntax-highlighter";
import {
  ShieldAlertIcon as ShieldAlert,
  ChevronDownIcon as ChevronDown,
  FileTextIcon as FileText,
  FileEditIcon as FilePen,
  FolderIcon as FolderTree,
  TerminalIcon as Terminal,
  GlobeIcon as Globe,
  SearchIcon as Search,
  FileSearchIcon as FileSearch,
  MousePointerIcon as MousePointer,
  EyeIcon as Eye,
  KeyboardAppIcon as Keyboard,
  MoveAppIcon as Move,
  ScrollTextIcon as ScrollText,
  CameraIcon as Camera,
  BotIcon as Bot,
  type AppIconComponent as LucideIcon,
  ClockIcon,
  Note02Icon,
} from "@/components/icons";
import { ExclamationMarkIcon } from "./tool-status-icons";
import type { ToolMessage } from "@langchain/langgraph-sdk";

export type ToolState = "pending" | "running" | "completed" | "error";
export interface ToolCallData {
  id: string;
  name: string;
  args: Record<string, unknown>;
}
export interface ToolResponseData {
  content: string | unknown;
  error?: string;
}
export interface ToolInterruptData {
  needsApproval: boolean;
  onApprove?: () => void;
  onReject?: (feedback?: string) => void;
}
export interface ToolItemProps {
  toolCall: ToolCallData;
  toolResponse?: ToolMessage | null;
  interrupt?: ToolInterruptData;
  state: ToolState;
  displayLabel?: string;
  defaultExpanded?: boolean;
  className?: string;
}

function prettyJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}
function formatToolResponse(response: ToolMessage): string {
  const content = response.content;
  const text =
    typeof content === "string"
      ? content
      : Array.isArray(content)
        ? content
            .map((block) =>
              typeof block === "string"
                ? block
                : block.type === "text" && typeof block.text === "string"
                  ? block.text
                  : JSON.stringify(block, null, 2),
            )
            .join("\n\n")
        : JSON.stringify(content, null, 2);
  try {
    return "```json\n" + JSON.stringify(JSON.parse(text), null, 2) + "\n```";
  } catch {}
  return text.replace(
    /```json\s*\n([\s\S]*?)```/gi,
    (_, value: string) => "```json\n" + prettyJson(value.trim()) + "\n```",
  );
}

const toolIconPatterns: Array<{
  pattern: RegExp;
  icon: LucideIcon | React.ComponentType<any>;
}> = [
  // File operations
  { pattern: /read_file|readfile|file_read/i, icon: FileText },
  {
    pattern: /write_file|writefile|file_write|create_file|createfile/i,
    icon: FilePen,
  },
  {
    pattern: /list_dir|listdir|list_directory|^ls$|directory/i,
    icon: FolderTree,
  },
  {
    pattern: /file_search|filesearch|find_file|findfile|grep/i,
    icon: FileSearch,
  },

  // Terminal/Command
  {
    pattern: /bash|shell|terminal|execute|run_command|command|exec/i,
    icon: Terminal,
  },

  // Browser/Web
  { pattern: /browser|web|navigate|playwright|open_url/i, icon: Globe },
  { pattern: /click|press|button/i, icon: MousePointer },
  { pattern: /type|input|fill|keyboard/i, icon: Keyboard },
  { pattern: /screenshot|capture|snapshot/i, icon: Camera },
  { pattern: /scroll/i, icon: ScrollText },
  { pattern: /observe|view|inspect/i, icon: Eye },
  { pattern: /move|drag|drop/i, icon: Move },

  // Search/Query
  { pattern: /search|query|find|lookup/i, icon: Search },

  // Todos/Notes
  { pattern: /write_todos|todos|todo/i, icon: Note02Icon },

  // Agent/Task
  { pattern: /task|agent|subagent|delegate/i, icon: Bot },
];

/**
 * Get the appropriate icon for a tool based on its name.
 * Falls back to ToolsIcon if no pattern matches.
 */
export function getToolIcon(
  toolName: string,
): LucideIcon | React.ComponentType<any> {
  for (const { pattern, icon } of toolIconPatterns) {
    if (pattern.test(toolName)) {
      return icon;
    }
  }
  // No specific icon found - return null to use ToolsIcon from app-icons
  return Terminal; // Default fallback to Terminal as a generic "tool" icon
}

function ToolResult({ response }: { response: ToolMessage }) {
  const parts = formatToolResponse(response).split(
    /(```json\s*\n[\s\S]*?```)/gi,
  );
  return (
    <>
      {parts.map((part, index) => {
        const json = /^```json\s*\n([\s\S]*?)```$/i.exec(part);
        return json ? (
          <SyntaxHighlighter
            key={index}
            language="json"
          >
            {json[1].trim()}
          </SyntaxHighlighter>
        ) : part.trim() ? (
          <MarkdownText key={index}>{part}</MarkdownText>
        ) : null;
      })}
    </>
  );
}

export const ToolItem = React.memo(function ToolItem({
  toolCall,
  toolResponse,
  interrupt,
  state,
  displayLabel,
  defaultExpanded = false,
  className,
}: ToolItemProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const detailsId = useId();
  const needsApproval = interrupt?.needsApproval ?? false;
  const isOpen = needsApproval || expanded;
  const ToolIcon = getToolIcon(toolCall.name);
  const StatusIcon = needsApproval
    ? ShieldAlert
    : state === "completed"
      ? null
      : state === "error"
        ? ExclamationMarkIcon
        : ClockIcon;
  return (
    <div className={cn("doot-tool-item min-w-0", className)}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={detailsId}
        aria-label={`${displayLabel || toolCall.name} (${needsApproval ? "approval required" : state})`}
        onClick={() => setExpanded((value) => !value)}
        className="group/toolheader text-muted-foreground hover:text-foreground inline-flex max-w-full items-center gap-2 py-1 text-sm"
      >
        <span className="relative size-4 shrink-0">
          <ToolIcon className="absolute size-4 group-hover/toolheader:opacity-0 group-focus-visible/toolheader:opacity-0" />
          <ChevronDown
            className={cn(
              "absolute size-4 opacity-0 group-hover/toolheader:opacity-100 group-focus-visible/toolheader:opacity-100",
              isOpen && "rotate-180",
            )}
          />
        </span>
        <span className="truncate" title={displayLabel || toolCall.name}>
          {displayLabel || toolCall.name}
        </span>
        {StatusIcon && (
          <StatusIcon
            className={cn(
              "size-4 shrink-0",
              needsApproval && "text-semantic-warning",
              state === "error" && "text-destructive",
            )}
          />
        )}
      </button>
      {isOpen && (
        <div
          id={detailsId}
          className="doot-tool-details bg-muted/40 my-1 ml-6 max-h-[28rem] overflow-auto rounded-lg p-3 text-sm"
        >
          <div className="text-muted-foreground text-xs">Arguments</div>
          <SyntaxHighlighter language="json">
            {JSON.stringify(toolCall.args, null, 2)}
          </SyntaxHighlighter>
          <div className="text-muted-foreground mt-2 text-xs">Response</div>
          {toolResponse ? (
            <ToolResult response={toolResponse} />
          ) : (
            <p className="text-muted-foreground py-2">
              {needsApproval ? "Awaiting approval…" : "Waiting for response…"}
            </p>
          )}
          {needsApproval && (
            <div className="mt-3 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => interrupt?.onReject?.()}
              >
                Reject
              </Button>
              <Button
                size="sm"
                onClick={() => interrupt?.onApprove?.()}
              >
                Approve & Run
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
