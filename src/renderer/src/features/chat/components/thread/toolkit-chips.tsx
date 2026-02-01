/**
 * Toolkit Chips Component
 *
 * Displays selected toolkits as horizontal chips in the composer
 * Shows max 3 chips, with "+N more" for overflow
 */

"use client";

import { useMemo } from "react";
import { XIcon } from "lucide-react";
import { ElectricPlugsIcon } from "hugeicons-react";
import { cn } from "@/lib/utils";
import type { SelectedToolkit } from "@/types/mcp-toolkit";

interface ToolkitChipsProps {
  toolkits: SelectedToolkit[];
  onRemove: (toolkitId: string) => void;
  onViewAll: () => void;
  className?: string;
  /** Maximum number of chips to display before showing "+N more" */
  maxVisible?: number;
}

export function ToolkitChips({
  toolkits,
  onRemove,
  onViewAll,
  className,
  maxVisible = 3,
}: ToolkitChipsProps) {
  const visibleToolkits = useMemo(
    () => toolkits.slice(0, maxVisible),
    [toolkits, maxVisible]
  );

  const remainingCount = toolkits.length - maxVisible;

  if (toolkits.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {visibleToolkits.map((toolkit) => (
        <div
          key={toolkit.id}
          className={cn(
            "group/chip flex items-center gap-1.5 px-2 py-1",
            "bg-accent/50 hover:bg-accent border border-border/50",
            "text-xs font-medium text-foreground",
            "transition-colors cursor-default"
          )}
          data-radius="radius2"
        >
          <ElectricPlugsIcon className="size-3 text-muted-foreground" />
          <span className="max-w-[100px] truncate">{toolkit.name}</span>
          {toolkit.toolCount && (
            <span className="text-muted-foreground">
              ({toolkit.toolCount})
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(toolkit.id);
            }}
            className={cn(
              "ml-0.5 opacity-60 hover:opacity-100",
              "hover:text-destructive transition-all"
            )}
            aria-label={`Remove ${toolkit.name}`}
          >
            <XIcon className="size-3" />
          </button>
        </div>
      ))}

      {remainingCount > 0 && (
        <button
          type="button"
          onClick={onViewAll}
          className={cn(
            "flex items-center gap-1 px-2 py-1",
            "bg-muted/50 hover:bg-muted border border-border/50",
            "text-xs font-medium text-muted-foreground hover:text-foreground",
            "transition-colors"
          )}
          data-radius="radius2"
        >
          +{remainingCount} more
        </button>
      )}
    </div>
  );
}
