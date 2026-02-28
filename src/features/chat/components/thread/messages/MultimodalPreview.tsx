import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Pdf01Icon, DocumentCodeIcon } from "hugeicons-react";
import { X } from "lucide-react";
import type { Base64ContentBlock } from "@/types/multimodal";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export interface MultimodalPreviewProps {
  block: Base64ContentBlock;
  removable?: boolean;
  onRemove?: () => void;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export const MultimodalPreview: React.FC<MultimodalPreviewProps> = ({
  block,
  removable = false,
  onRemove,
  className,
}) => {
  const [previewOpen, setPreviewOpen] = useState(false);

  const isPdf =
    block.type === "file" &&
    block.source_type === "base64" &&
    block.mime_type === "application/pdf";

  // ── Image block ──────────────────────────────────────────────────────────
  if (
    block.type === "image" &&
    block.source_type === "base64" &&
    typeof block.mime_type === "string" &&
    block.mime_type.startsWith("image/")
  ) {
    const url = `data:${block.mime_type};base64,${block.data}`;
    const name = String(block.metadata?.name || "image");

    return (
      <>
        <div
          data-radius="radius"
          className={cn(
            "group/attachment bg-accent/30 border-border flex h-7 items-center overflow-hidden border",
            className,
          )}
        >
          {/* Clickable: thumbnail + name */}
          <button
            type="button"
            title={`Preview ${name}`}
            onClick={() => setPreviewOpen(true)}
            className="hover:bg-accent/60 flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 px-1.5 py-1 transition-colors"
          >
            <img
              src={url}
              alt={name}
              className="size-4 flex-shrink-0 rounded object-cover"
            />
            <span className="text-foreground max-w-[120px] truncate text-xs">
              {name}
            </span>
          </button>

          {/* Remove X */}
          {removable && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove?.();
              }}
              aria-label="Remove image"
              className="text-muted-foreground/60 hover:text-destructive flex flex-shrink-0 items-center self-stretch px-1.5 transition-colors"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        {/* Preview Dialog */}
        <Dialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
        >
          <DialogContent className="max-w-3xl">
            <DialogTitle className="text-sm font-medium">{name}</DialogTitle>
            <DialogDescription className="sr-only">
              Image preview
            </DialogDescription>
            <img
              src={url}
              alt={name}
              className="max-h-[70vh] w-full rounded object-contain"
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // ── PDF block ─────────────────────────────────────────────────────────────
  if (isPdf) {
    const filename = String(
      block.metadata?.filename || block.metadata?.name || "PDF file",
    );

    return (
      <>
        <div
          data-radius="radius"
          className={cn(
            "group/attachment bg-accent/30 border-border flex h-7 items-center overflow-hidden border",
            className,
          )}
        >
          {/* Clickable: icon + name */}
          <button
            type="button"
            title={`Preview ${filename}`}
            onClick={() => setPreviewOpen(true)}
            className="hover:bg-accent/60 flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 px-1.5 py-1 transition-colors"
          >
            <Pdf01Icon className="text-primary size-4 flex-shrink-0" />
            <span className="text-foreground max-w-[120px] truncate text-xs">
              {filename}
            </span>
          </button>

          {/* Remove X */}
          {removable && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove?.();
              }}
              aria-label="Remove PDF"
              className="text-muted-foreground/60 hover:text-destructive flex flex-shrink-0 items-center self-stretch px-1.5 transition-colors"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        {/* Preview Dialog — native iframe PDF preview */}
        <Dialog
          open={previewOpen}
          onOpenChange={(o) => {
            setPreviewOpen(o);
          }}
        >
          <DialogContent className="max-w-4xl overflow-hidden">
            <DialogTitle className="text-sm font-medium">
              {filename}
            </DialogTitle>
            <DialogDescription className="sr-only">
              PDF preview
            </DialogDescription>

            {/* Scrollable PDF area */}
            <div className="bg-muted/30 border-border max-h-[75vh] overflow-auto rounded border">
              <iframe
                src={`data:application/pdf;base64,${block.data}`}
                className="h-[70vh] w-full"
                title={filename}
              />
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // ── Fallback ──────────────────────────────────────────────────────────────
  return (
    <div
      data-radius="radius"
      className={cn(
        "group/attachment bg-accent/30 border-border flex h-7 items-center overflow-hidden border",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-1.5 px-1.5 py-1">
        <DocumentCodeIcon className="text-muted-foreground size-4 flex-shrink-0" />
        <span className="text-muted-foreground max-w-[120px] truncate text-xs">
          Unsupported file
        </span>
      </div>
      {removable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          aria-label="Remove file"
          className="text-muted-foreground/60 hover:text-destructive flex flex-shrink-0 items-center self-stretch px-1.5 transition-colors"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
};
