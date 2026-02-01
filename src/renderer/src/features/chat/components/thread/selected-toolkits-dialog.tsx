/**
 * Selected Toolkits Dialog
 *
 * Dialog that opens when clicking "+N more" to show all selected toolkits
 * Allows toggling individual toolkits on/off
 */

"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { ElectricPlugsIcon } from "hugeicons-react";
import { cn } from "@/lib/utils";
import type { SelectedToolkit } from "@/types/mcp-toolkit";

interface SelectedToolkitsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toolkits: SelectedToolkit[];
  onToggle: (toolkit: SelectedToolkit) => void;
}

export function SelectedToolkitsDialog({
  open,
  onOpenChange,
  toolkits,
  onToggle,
}: SelectedToolkitsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]" data-radius="radius2">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ElectricPlugsIcon className="size-5" />
            Selected Toolkits
          </DialogTitle>
          <DialogDescription>
            Manage toolkits for this message. Toggle to enable or disable.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {toolkits.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No toolkits selected
            </div>
          ) : (
            toolkits.map((toolkit) => (
              <div
                key={toolkit.id}
                className={cn(
                  "flex items-center justify-between p-3 border bg-card",
                  "hover:bg-accent/50 transition-colors"
                )}
                data-radius="radius1"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ElectricPlugsIcon className="size-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">
                      {toolkit.name}
                    </div>
                    {toolkit.toolCount && (
                      <div className="text-xs text-muted-foreground">
                        {toolkit.toolCount} tools
                      </div>
                    )}
                  </div>
                </div>
                <Switch
                  checked={true}
                  onCheckedChange={() => onToggle(toolkit)}
                />
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
