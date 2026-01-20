
import React, { useState, useEffect } from "react";
import { FolderIcon, CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useQueryClient } from "@tanstack/react-query";
import { localThreadKeys } from "@/hooks/use-local-threads";
import { threadKeys } from "@/hooks/use-threads";

interface WorkspaceSelectProps {
  threadId?: string | null;
  onWorkspaceSelect?: (path: string) => void;
  className?: string;
  currentPath?: string | null;
}

export function WorkspaceSelect({ 
  threadId, 
  onWorkspaceSelect, 
  className,
  currentPath: initialPath 
}: WorkspaceSelectProps) {
  const [workspacePath, setWorkspacePath] = useState<string | null>(initialPath || null);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  // Sync with prop updates
  useEffect(() => {
    if (initialPath !== undefined) {
      setWorkspacePath(initialPath);
    }
  }, [initialPath]);

  // Load initial workspace if threadId is present
  useEffect(() => {
    if (threadId && !initialPath) {
      const loadWorkspace = async () => {
        try {
          if (window.electron?.invoke) {
            const path = await window.electron.invoke('workspace:get', threadId);
            if (path) {
              setWorkspacePath(path as string);
              onWorkspaceSelect?.(path as string);
            }
          }
        } catch (err) {
          console.error("Failed to load workspace path:", err);
        }
      };
      loadWorkspace();
    }
  }, [threadId, initialPath]);

  const handleSelectWorkspace = async () => {
    setIsLoading(true);
    try {
      if (window.electron?.invoke) {
        const path = await window.electron.invoke('workspace:select', threadId);
        if (path) {
          setWorkspacePath(path as string);
          onWorkspaceSelect?.(path as string);
          
          // Invalidate thread lists to update metadata in other components
          queryClient.invalidateQueries({ queryKey: localThreadKeys.lists() });
          queryClient.invalidateQueries({ queryKey: threadKeys.lists() });
        }
      } else {
        console.warn("Electron API not available");
      }
    } catch (err) {
      console.error("Failed to select workspace:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={handleSelectWorkspace}
        disabled={isLoading}
        className={cn(
          "h-8 gap-2 text-xs font-normal border-dashed transition-all duration-300",
          workspacePath 
            ? "border-green-500/50 bg-green-500/10 text-green-600 hover:bg-green-500/20 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300" 
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {workspacePath ? (
          <>
            <CheckIcon className="h-3.5 w-3.5" />
            <span className="max-w-[200px] truncate" title={workspacePath}>
              {workspacePath.split(/[/\\]/).pop()}
            </span>
          </>
        ) : (
          <>
            <FolderIcon className="h-3.5 w-3.5" />
            <span>Select Workspace</span>
          </>
        )}
      </Button>
    </div>
  );
}
