"use client";

import { File, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BinaryFileViewerProps {
  filePath: string;
  size?: number;
}

export function BinaryFileViewer({
  filePath,
  size,
}: BinaryFileViewerProps): React.JSX.Element {
  const fileName = filePath.split("/").pop() || filePath;
  const ext = fileName.includes(".")
    ? fileName.split(".").pop()?.toUpperCase()
    : "FILE";

  const formatSize = (bytes?: number): string => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const handleOpenExternally = async () => {
    if (window.electron?.openExternal) {
      try {
        // For local files, we'd need an IPC handler to open them
        // For now, this is a placeholder
        console.log("[BinaryFileViewer] Opening externally:", filePath);
      } catch (err) {
        console.error("Failed to open file externally:", err);
      }
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-background/50 flex shrink-0 items-center gap-2 border-b border-border px-4 py-2 text-xs text-muted-foreground">
        <span className="truncate">{fileName}</span>
        <span className="text-muted-foreground/50">•</span>
        <span>Binary File</span>
        {size && (
          <>
            <span className="text-muted-foreground/50">•</span>
            <span>{formatSize(size)}</span>
          </>
        )}
      </div>

      {/* Binary file info */}
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="bg-accent/10 flex h-24 w-24 items-center justify-center rounded-2xl">
          <File className="text-muted-foreground/50 size-12" />
        </div>

        <div>
          <div className="mb-1 font-medium text-foreground">{fileName}</div>
          <div className="mb-2 text-sm text-muted-foreground">
            {ext} file • {formatSize(size)}
          </div>
          <div className="max-w-md text-xs text-muted-foreground">
            This file type cannot be previewed in the viewer. You can open it
            with an external application.
          </div>
        </div>

        <Button
          variant="outline"
          className="gap-2"
          onClick={handleOpenExternally}
        >
          <ExternalLink className="size-4" />
          Open Externally
        </Button>
      </div>
    </div>
  );
}
