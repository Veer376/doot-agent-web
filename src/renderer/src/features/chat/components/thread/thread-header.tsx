"use client";

import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  FolderIcon,
  PanelRightOpen,
  PanelRightClose,
  CheckIcon,
  X,
} from "lucide-react";
import { useQueryState } from "@/hooks/use-query-state";
import {
  useThreadFileState,
  useRightPanel,
} from "@/features/chat/providers/ThreadState";
import { useFetchCloudThreads } from "@/hooks/use-cloud-threads";
import { useLocalThreads } from "@/hooks/use-local-threads";
import { useAgentContext } from "@/providers/Agent";
import { useQueryClient } from "@tanstack/react-query";
import { localThreadKeys } from "@/hooks/use-local-threads";
import { cloudThreadKeys } from "@/hooks/use-cloud-threads";

// ============================================================================
// Workspace Button Component
// ============================================================================

interface WorkspaceButtonProps {
  threadId: string | null;
  workspacePath: string | null;
  onWorkspaceSelect: (path: string) => void;
}

function WorkspaceButton({
  threadId,
  workspacePath,
  onWorkspaceSelect,
}: WorkspaceButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleSelectWorkspace = async () => {
    setIsLoading(true);
    try {
      if (window.electron?.invoke) {
        const path = await window.electron.invoke("workspace:select", threadId);
        if (path) {
          onWorkspaceSelect(path as string);
          // Invalidate thread lists to update metadata
          queryClient.invalidateQueries({ queryKey: localThreadKeys.lists() });
          queryClient.invalidateQueries({ queryKey: cloudThreadKeys.lists() });
        }
      }
    } catch (err) {
      console.error("Failed to select workspace:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleSelectWorkspace}
      disabled={isLoading}
      className={cn(
        "h-7 gap-1.5 px-2 text-xs font-normal transition-all",
        workspacePath
          ? "text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {workspacePath ? (
        <>
          <CheckIcon className="size-3" />
          <span className="max-w-[120px] truncate" title={workspacePath}>
            {workspacePath.split(/[/\\]/).pop()}
          </span>
        </>
      ) : (
        <>
          <FolderIcon className="size-3" />
          <span>Workspace</span>
        </>
      )}
    </Button>
  );
}

// ============================================================================
// Thread Header Component
// ============================================================================

interface ThreadHeaderProps {
  className?: string;
}

/**
 * ThreadHeader - Top header for the thread view
 *
 * Contains:
 * - Thread name (editable in future)
 * - Workspace selector
 * - Files button (toggles right panel)
 */
export function ThreadHeader({ className }: ThreadHeaderProps) {
  const [threadId] = useQueryState("threadId");
  const { agentId } = useAgentContext();

  // Get thread file state
  const {
    workspacePath,
    setWorkspacePath,
    openFiles,
    activeTab,
    setActiveTab,
    closeFile,
  } = useThreadFileState(threadId);

  // Right panel controls
  const { isOpen: isRightPanelOpen, toggle: toggleRightPanel } = useRightPanel();

  // Fetch threads to get current thread metadata
  const { data: cloudThreads = [] } = useFetchCloudThreads();
  const { data: localThreads = [] } = useLocalThreads();

  // Find current thread
  const currentThread = [...localThreads, ...cloudThreads].find(
    (t) => t.thread_id === threadId
  );

  // Get thread title
  const threadTitle = getThreadTitle(currentThread);

  // Load workspace path from thread metadata on mount
  useEffect(() => {
    const loadWorkspace = async () => {
      if (threadId && window.electron?.invoke) {
        const path = await window.electron.invoke("workspace:get", threadId);
        if (path) {
          setWorkspacePath(path as string);
        }
      }
    };
    loadWorkspace();
  }, [threadId, setWorkspacePath]);

  // Handle workspace selection
  const handleWorkspaceSelect = useCallback(
    (path: string) => {
      setWorkspacePath(path);
    },
    [setWorkspacePath]
  );

  // Only show for local agent (local agent uses workspace)
  const showWorkspaceSelector = agentId === "local-agent";

  // If no thread, show minimal header
  if (!threadId) {
    return <></>;
  }

  return (
    <header
      className={cn(
        "flex h-10 shrink-0 items-center relative glass-header",
        className
      )}
    >
      {/* Left section: Thread name (clickable to go back to chat) + Workspace */}
      <div className="flex items-center gap-1 px-3 shrink-0">
        {/* Thread Name - clickable to switch to chat */}
        <button
          onClick={() => setActiveTab("agent")}
          className={cn(
            "text-sm font-medium truncate max-w-[200px] hover:text-primary transition-colors",
            activeTab === "agent" ? "text-foreground" : "text-muted-foreground"
          )}
          title={`${threadTitle} (click to return to chat)`}
        >
          {threadTitle}
        </button>

        {/* Separator */}
        {showWorkspaceSelector && (
          <div className="h-4 w-px bg-border mx-1" />
        )}

        {/* Workspace Selector */}
        {showWorkspaceSelector && (
          <WorkspaceButton
            threadId={threadId}
            workspacePath={workspacePath}
            onWorkspaceSelect={handleWorkspaceSelect}
          />
        )}

        {/* Thick separator after workspace */}
        <div className="h-5 w-0.5 bg-border ml-2" />
      </div>

      {/* Tabs section: pill-style file tabs */}
      {openFiles.length > 0 && (
        <div className="flex items-center gap-1.5 px-2 overflow-x-auto scrollbar-hide">
          {/* Open File Tabs - Pills */}
          {openFiles.map((file) => (
            <div
              key={file.path}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-full transition-colors group shrink-0",
                activeTab === file.path
                  ? "bg-primary/15 text-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <button
                onClick={() => setActiveTab(file.path)}
                className="text-xs font-medium whitespace-nowrap"
                title={file.path}
              >
                <span className="max-w-[100px] truncate inline-block align-middle">{file.name}</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeFile(file.path);
                }}
                className="flex items-center justify-center size-4 rounded-full text-muted-foreground hover:text-foreground hover:bg-background/50 transition-colors opacity-0 group-hover:opacity-100"
                title="Close file"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right section: Files panel toggle */}
      <div className="flex items-center gap-1 px-2 shrink-0">
        {/* Files button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleRightPanel}
          className={cn(
            "h-7 gap-1.5 px-2 text-xs font-normal",
            isRightPanelOpen
              ? "text-primary bg-primary/10"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {isRightPanelOpen ? (
            <PanelRightClose className="size-4" />
          ) : (
            <PanelRightOpen className="size-4" />
          )}
          <span>Files</span>
        </Button>
      </div>
    </header>
  );
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Thread-like type for title extraction
 * Allows null metadata to be compatible with SDK Thread type
 */
interface ThreadLike {
  thread_id: string;
  title?: string;
  metadata?: Record<string, unknown> | null;
}

/**
 * Get thread title with fallback
 */
function getThreadTitle(thread: ThreadLike | undefined): string {
  if (!thread) return "New Thread";

  // First check for title property (used by local threads)
  if (thread.title) return thread.title;

  // Then check metadata.name (guard against null metadata)
  const customName = thread.metadata?.name as string | undefined;
  if (customName) return customName;

  // Fallback
  return `Thread ${thread.thread_id.slice(0, 6)}`;
}
