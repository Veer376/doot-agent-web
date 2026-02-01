"use client";

import React, { useEffect, useState } from "react";
import { CodeViewer } from "@/components/tabs/CodeViewer";
import { Loader2, FileWarning, ImageIcon } from "lucide-react";
import { useQueryState } from "@/hooks/use-query-state";
import { useThreadFileState } from "@/features/chat/providers/ThreadState";

interface FileViewerPanelProps {
  filePath: string;
}

// Image extensions
const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "svg", "webp", "ico", "bmp"]);

// Get file extension
function getFileExtension(path: string): string {
  const fileName = path.split(/[/\\]/).pop() || "";
  const ext = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() : "";
  return ext || "";
}

// Check if file is an image
function isImageFile(path: string): boolean {
  const ext = getFileExtension(path);
  return IMAGE_EXTENSIONS.has(ext);
}

/**
 * FileViewerPanel - Renders file content in the main content area
 * 
 * Handles loading file content from disk and displaying it
 * using the appropriate viewer (CodeViewer for text, ImageViewer for images)
 */
export function FileViewerPanel({ filePath }: FileViewerPanelProps): React.JSX.Element {
  const [threadId] = useQueryState("threadId");
  const { workspacePath } = useThreadFileState(threadId);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load file content on mount or when path changes
  useEffect(() => {
    let cancelled = false;

    async function loadFile() {
      if (!threadId) {
        setError("No thread selected");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setContent(null);

      try {
        if (window.electron?.invoke) {
          const result = await window.electron.invoke("workspace:readFile", {
            threadId,
            filePath,
          });
          const typedResult = result as { success: boolean; content?: string; error?: string };
          
          if (!cancelled) {
            if (typedResult.success && typedResult.content !== undefined) {
              setContent(typedResult.content);
            } else {
              setError(typedResult.error || "Failed to read file");
            }
          }
        } else {
          if (!cancelled) {
            setError("File system not available");
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to read file");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    // Don't load content for images - they use file:// URL
    if (isImageFile(filePath)) {
      setLoading(false);
    } else {
      loadFile();
    }

    return () => {
      cancelled = true;
    };
  }, [filePath, threadId]);

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
          <span className="text-sm">Loading file...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground max-w-md text-center px-4">
          <FileWarning className="size-8 text-destructive/70" />
          <span className="text-sm font-medium">Failed to load file</span>
          <span className="text-xs opacity-70">{error}</span>
          <span className="text-xs opacity-50 truncate max-w-full" title={filePath}>
            {filePath}
          </span>
        </div>
      </div>
    );
  }

  // Image viewer
  if (isImageFile(filePath)) {
    // Build full path for images
    const fullImagePath = workspacePath ? `${workspacePath}/${filePath}` : filePath;
    
    return (
      <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
        {/* Image path header */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-background/50 text-xs text-muted-foreground shrink-0">
          <ImageIcon className="size-3.5" />
          <span className="truncate">{filePath}</span>
        </div>
        
        {/* Image preview */}
        <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center p-4 bg-muted/30">
          <img
            src={`file://${fullImagePath}`}
            alt={filePath.split(/[/\\]/).pop()}
            className="max-w-full max-h-full object-contain"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              setError("Failed to load image");
            }}
          />
        </div>
      </div>
    );
  }

  // Code viewer for text files
  return <CodeViewer filePath={filePath} content={content || ""} />;
}

export default FileViewerPanel;
