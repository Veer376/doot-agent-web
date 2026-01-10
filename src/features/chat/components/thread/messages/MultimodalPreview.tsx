import React from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Pdf01Icon, DocumentCodeIcon, CancelCircleIcon } from "hugeicons-react";
import type { Base64ContentBlock } from "@/types/multimodal";

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
  size = "md",
}) => {
  // Image block
  if (
    block.type === "image" &&
    block.source_type === "base64" &&
    typeof block.mime_type === "string" &&
    block.mime_type.startsWith("image/")
  ) {
    const url = `data:${block.mime_type};base64,${block.data}`;
    let imgClass: string = "object-cover h-16 w-16 text-lg";
    if (size === "sm") imgClass = "object-cover h-10 w-10 text-base";
    if (size === "lg") imgClass = "object-cover h-24 w-24 text-xl";
    if (size === "xl") imgClass = "object-cover h-32 w-32 text-2xl";
    return (
      <div className={cn("relative inline-block", className)}>
        <Image
          data-radius="radius2"
          src={url}
          alt={String(block.metadata?.name || "uploaded image")}
          className={imgClass}
          width={
            size === "sm" ? 16 : size === "md" ? 32 : size === "lg" ? 48 : 64
          }
          height={
            size === "sm" ? 16 : size === "md" ? 32 : size === "lg" ? 48 : 64
          }
        />
        {removable && (
          <button
            type="button"
            className="absolute top-1 right-1 z-10 cursor-pointer transition-all hover:opacity-80"
            onClick={onRemove}
            aria-label="Remove image"
          >
            <CancelCircleIcon className="text-foreground size-5" />
          </button>
        )}
      </div>
    );
  }

  // PDF block
  if (
    block.type === "file" &&
    block.source_type === "base64" &&
    block.mime_type === "application/pdf"
  ) {
    const filename =
      block.metadata?.filename || block.metadata?.name || "PDF file";
    return (
      <div
        data-radius="radius2"
        className={cn(
          "border-border bg-accent/30 relative flex items-center gap-3 border p-1.5 transition-colors",
          className,
        )}
      >
        <div
          data-radius="radius1"
          className="bg-primary/10 flex size-9 flex-shrink-0 items-center justify-center"
        >
          <Pdf01Icon
            className={cn("text-primary", size === "sm" ? "size-4" : "size-5")}
          />
        </div>
        <span
          className={cn(
            "text-foreground min-w-0 flex-1 truncate pr-10 text-sm",
          )}
        >
          {String(filename)}
        </span>
        {removable && (
          <button
            type="button"
            className="absolute top-2 right-2 cursor-pointer transition-all hover:opacity-80"
            onClick={onRemove}
            aria-label="Remove PDF"
          >
            <CancelCircleIcon className="text-foreground size-5" />
          </button>
        )}
      </div>
    );
  }

  // Fallback for unknown types
  return (
    <div
      data-radius="radius2"
      className={cn(
        "border-border bg-accent/30 text-muted-foreground relative flex items-center gap-3 border px-4 py-3 transition-colors",
        className,
      )}
    >
      <div
        data-radius="radius1"
        className="bg-muted flex size-9 flex-shrink-0 items-center justify-center"
      >
        <DocumentCodeIcon className="size-5" />
      </div>
      <span className="truncate pr-6 text-sm">Unsupported file type</span>
      {removable && (
        <button
          type="button"
          className="absolute top-2 right-2 cursor-pointer transition-all hover:opacity-80"
          onClick={onRemove}
          aria-label="Remove file"
        >
          <CancelCircleIcon className="text-foreground size-5" />
        </button>
      )}
    </div>
  );
};
