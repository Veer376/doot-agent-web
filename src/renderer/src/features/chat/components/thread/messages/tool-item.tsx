"use client";

/**
 * ToolItem Component
 *
 * A unified, reusable component for displaying tool calls with different states:
 * - Collapsed: Shows only tool name with status icon, expandable on click
 * - In-Progress: Shows tool name + args while waiting for response
 * - Approval: Shows tool name + args + approve/reject buttons
 * - Expanded: Shows tool name + args + scrollable response
 *
 * Design principles:
 * 1. Collapsed mode: Arrow button on hover only, no copy button
 * 2. In-progress mode: Tool name at top, separator line, then JSON args
 * 3. Expanded mode: Tool name, args, and scrollable response
 *
 * Header layout: [Tool Icon] [Tool Name] ... [Status Icon → Arrow on hover]
 */

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ShieldAlert,
  ChevronDown,
  FileText,
  FilePen,
  FolderTree,
  Terminal,
  Globe,
  Search,
  FileSearch,
  MousePointer,
  Eye,
  Keyboard,
  Move,
  ScrollText,
  Camera,
  Bot,
  type LucideIcon,
} from "lucide-react";
import {
  ClockIcon,
  CheckIcon,
  CheckmarkCircleIcon,
  Note02Icon,
  ToolsIcon,
} from "@/components/icons";
import { XCircleIcon } from "lucide-react";
import type { ToolMessage } from "@langchain/langgraph-sdk";

// ============================================================================
// Types
// ============================================================================

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
  /** The tool call data */
  toolCall: ToolCallData;
  /** The tool response (if completed) */
  toolResponse?: ToolMessage | null;
  /** Interrupt/approval state */
  interrupt?: ToolInterruptData;
  /** Current execution state */
  state: ToolState;
  /** Whether to default to expanded (used for active tools) */
  defaultExpanded?: boolean;
  /** Custom class name */
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format tool response content for display
 */
function formatToolResponse(response: ToolMessage): string {
  if (typeof response.content === "string") {
    return response.content;
  }

  if (Array.isArray(response.content)) {
    return response.content
      .map((block) =>
        typeof block === "string" ? block : JSON.stringify(block, null, 2),
      )
      .join("\n");
  }

  return JSON.stringify(response.content, null, 2);
}

/**
 * Format tool args as pretty JSON
 */
function formatArgs(args: Record<string, unknown>): string {
  return JSON.stringify(args, null, 2);
}

// ============================================================================
// Tool Icon Registry
// ============================================================================

/**
 * Registry mapping tool names to their icons.
 * Uses pattern matching for flexible tool name recognition.
 */
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
    pattern: /list_dir|listdir|list_directory|ls|directory/i,
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
function getToolIcon(toolName: string): LucideIcon | React.ComponentType<any> {
  for (const { pattern, icon } of toolIconPatterns) {
    if (pattern.test(toolName)) {
      return icon;
    }
  }
  // No specific icon found - return null to use ToolsIcon from app-icons
  return Terminal; // Default fallback to Terminal as a generic "tool" icon
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Status icon based on tool state
 */
function ToolStatusIcon({
  state,
  needsApproval,
  className,
}: {
  state: ToolState;
  needsApproval?: boolean;
  className?: string;
}) {
  if (needsApproval) {
    return <ShieldAlert className={cn("h-4 w-4 text-amber-500", className)} />;
  }

  switch (state) {
    case "pending":
    case "running":
      return (
        <ClockIcon
          size="xs"
          className={cn("text-muted-foreground", className)}
        />
      );
    case "completed":
      return (
        <CheckmarkCircleIcon
          size="xs"
          className={cn("text-green-600", className)}
        />
      );
    case "error":
      return <XCircleIcon className={cn("h-4 w-4 text-red-600", className)} />;
    default:
      return (
        <ToolsIcon
          size="xs"
          className={cn("text-muted-foreground", className)}
        />
      );
  }
}

/**
 * Tool header bar with new design:
 * [Tool Icon] [Tool Name] ... [Status Icon ⟷ Arrow on hover when expandable]
 *
 * The status icon swaps to arrow on hover when the tool can be expanded,
 * similar to the ChainOfThoughtHeader pattern.
 */
function ToolHeader({
  name,
  state,
  needsApproval,
  isExpanded,
  canExpand,
  onToggle,
}: {
  name: string;
  state: ToolState;
  needsApproval?: boolean;
  isExpanded: boolean;
  canExpand: boolean;
  onToggle: () => void;
}) {
  const ToolIcon = getToolIcon(name);

  return (
    <div
      className={cn(
        "group/toolheader flex items-center gap-2 px-2.5 py-1.5 transition-colors",
        canExpand && "hover:bg-muted/50 cursor-pointer",
      )}
      onClick={canExpand ? onToggle : undefined}
    >
      {/* Tool-Specific Icon */}
      <ToolIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />

      {/* Tool Name */}
      <span className="text-sm font-medium">{name}</span>

      {/* Approval Badge */}
      {needsApproval && (
        <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-600 dark:bg-amber-900/30">
          APPROVAL
        </span>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Status Icon / Arrow - swaps on hover when expandable */}
      <div className="relative h-4 w-4 flex-shrink-0">
        {canExpand ? (
          <>
            {/* Status icon - visible by default, hidden on hover */}
            <div className="absolute inset-0 transition-opacity group-hover/toolheader:opacity-0">
              <ToolStatusIcon
                state={state}
                needsApproval={needsApproval}
              />
            </div>
            {/* Arrow - hidden by default, visible on hover */}
            <div className="absolute inset-0 opacity-0 transition-opacity group-hover/toolheader:opacity-100">
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </>
        ) : (
          /* When not expandable, just show status icon */
          <ToolStatusIcon
            state={state}
            needsApproval={needsApproval}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Tool arguments display (JSON format with separator)
 */
function ToolArgs({
  args,
  showSeparator = true,
  needsApproval = false,
}: {
  args: Record<string, unknown>;
  showSeparator?: boolean;
  needsApproval?: boolean;
}) {
  return (
    <div className="mt-0">
      {showSeparator && (
        <div
          className={cn(
            "border-t",
            needsApproval ? "border-amber-500/30" : "border-border",
          )}
        />
      )}
      <div className="relative">
        {/* Top gradient fade */}
        <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 h-2 bg-gradient-to-b from-background to-transparent" />

        <pre className="max-h-[150px] overflow-auto p-2 font-mono text-xs leading-relaxed text-muted-foreground">
          {formatArgs(args)}
        </pre>

        {/* Bottom gradient fade */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-2 bg-gradient-to-t from-background to-transparent" />
      </div>
    </div>
  );
}

/**
 * Tool response display (scrollable)
 */
function ToolResponse({ response }: { response: ToolMessage }) {
  return (
    <div className="mt-0">
      <div className="border-t border-border" />
      <div className="p-2">
        <div className="mb-1 text-xs font-medium uppercase text-muted-foreground">
          Response
        </div>
        <div className="relative">
          {/* Top gradient fade */}
          <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 h-2 bg-gradient-to-b from-background to-transparent" />

          <div className="max-h-[300px] overflow-y-auto whitespace-pre-wrap font-mono text-xs leading-relaxed">
            {formatToolResponse(response)}
          </div>

          {/* Bottom gradient fade */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-2 bg-gradient-to-t from-background to-transparent" />
        </div>
      </div>
    </div>
  );
}

/**
 * Approval actions (approve/reject buttons)
 */
function ToolApprovalActions({
  onApprove,
  onReject,
}: {
  onApprove?: () => void;
  onReject?: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-2 border-t border-amber-500/30 p-2">
      <Button
        variant="outline"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onReject?.();
        }}
        className="h-7 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
      >
        Reject
      </Button>
      <Button
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onApprove?.();
        }}
        className="h-7 bg-amber-500 text-xs text-white hover:bg-amber-600"
      >
        Approve & Run
      </Button>
    </div>
  );
}

// ============================================================================
// Main ToolItem Component
// ============================================================================

export const ToolItem = React.memo(function ToolItem({
  toolCall,
  toolResponse,
  interrupt,
  state,
  defaultExpanded,
  className,
}: ToolItemProps) {
  const needsApproval = interrupt?.needsApproval ?? false;
  const isCompleted = state === "completed" && toolResponse;
  const isInProgress = state === "pending" || state === "running";
  const isError = state === "error";

  // Determine default expanded state:
  // - Needs approval: always expanded
  // - In progress: always expanded (show args)
  // - Completed: collapsed by default (user can expand)
  // - Error: expanded to show error
  const computedDefaultExpanded =
    defaultExpanded ?? (needsApproval || isInProgress || isError);

  const [isExpanded, setIsExpanded] = useState(computedDefaultExpanded);

  // Can expand only if we have content to show (response exists)
  const canExpand = Boolean(toolResponse) && !needsApproval;

  const handleToggle = () => {
    if (canExpand) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className={cn("inline-block", className)}>
      {/* Container with appropriate styling based on state */}
      <div
        data-radius="radius2"
        className={cn(
          "overflow-hidden border",
          needsApproval
            ? "border-amber-500/50 bg-amber-500/5"
            : "border-border bg-background",
        )}
      >
        {/* Header: Tool name + status */}
        <ToolHeader
          name={toolCall.name}
          state={state}
          needsApproval={needsApproval}
          isExpanded={isExpanded}
          canExpand={canExpand}
          onToggle={handleToggle}
        />

        {/* Body: Context-dependent content */}
        {/* 1. In-progress: Show args */}
        {isInProgress && !needsApproval && (
          <ToolArgs
            args={toolCall.args}
            showSeparator={false}
            needsApproval={false}
          />
        )}

        {/* 2. Needs approval: Show args + approval buttons */}
        {needsApproval && (
          <>
            <ToolArgs
              args={toolCall.args}
              showSeparator={false}
              needsApproval={true}
            />
            <ToolApprovalActions
              onApprove={interrupt?.onApprove}
              onReject={interrupt?.onReject}
            />
          </>
        )}

        {/* 3. Completed/Error + Expanded: Show args + response */}
        {!needsApproval && !isInProgress && isExpanded && toolResponse && (
          <>
            <ToolArgs
              args={toolCall.args}
              showSeparator={true}
              needsApproval={false}
            />
            <ToolResponse response={toolResponse} />
          </>
        )}
      </div>
    </div>
  );
});

export default ToolItem;
