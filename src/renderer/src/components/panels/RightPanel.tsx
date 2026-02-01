"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronRight,
  RefreshCw,
  Loader2,
  X,
  FolderOpen,
  Folder,
  File,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useRightPanel, useThreadFileState, type FileInfo } from "@/features/chat/providers/ThreadState";
import { useQueryState } from "@/hooks/use-query-state";

// ============================================================================
// Helper to get filename from path
// ============================================================================

function getFileName(path: string): string {
  return path.split(/[/\\]/).pop() || path;
}

// ============================================================================
// File Tree Node Component
// ============================================================================

interface FileTreeNodeProps {
  file: FileInfo;
  depth: number;
  isExpanded: boolean;
  children: FileInfo[];
  onToggle: (path: string) => void;
  onFileClick: (path: string) => void;
  expandedDirs: Set<string>;
  allFiles: Map<string, FileInfo[]>;
}

function FileTreeNode({
  file,
  depth,
  isExpanded,
  children,
  onToggle,
  onFileClick,
  expandedDirs,
  allFiles,
}: FileTreeNodeProps): React.JSX.Element {
  const paddingLeft = 12 + depth * 16;
  const fileName = getFileName(file.path);
  const isDirectory = file.is_dir === true;

  if (isDirectory) {
    return (
      <div>
        <button
          onClick={() => onToggle(file.path)}
          className="flex items-center gap-2 w-full px-2 py-1.5 text-sm hover:bg-muted/50 transition-colors text-left"
          style={{ paddingLeft }}
        >
          <ChevronRight
            className={cn(
              "size-3.5 text-muted-foreground transition-transform duration-150 shrink-0",
              isExpanded && "rotate-90"
            )}
          />
          {isExpanded ? (
            <FolderOpen className="size-4 text-amber-500 shrink-0" />
          ) : (
            <Folder className="size-4 text-amber-500 shrink-0" />
          )}
          <span className="truncate">{fileName}</span>
        </button>

        {/* Render children when expanded */}
        {isExpanded && children.length > 0 && (
          <div>
            {children.map((child) => (
              <FileTreeNode
                key={child.path}
                file={child}
                depth={depth + 1}
                isExpanded={expandedDirs.has(child.path)}
                children={allFiles.get(child.path) || []}
                onToggle={onToggle}
                onFileClick={onFileClick}
                expandedDirs={expandedDirs}
                allFiles={allFiles}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // File (non-directory)
  return (
    <button
      onClick={() => onFileClick(file.path)}
      className="flex items-center gap-2 w-full px-2 py-1.5 text-sm hover:bg-muted/50 transition-colors cursor-pointer text-left"
      style={{ paddingLeft: paddingLeft + 18 }}
    >
      <File className="size-4 text-muted-foreground shrink-0" />
      <span className="truncate text-foreground/80">{fileName}</span>
    </button>
  );
}

// ============================================================================
// Right Panel Component
// ============================================================================

interface RightPanelProps {
  className?: string;
}

/**
 * RightPanel - Simple file browser panel
 * Shows workspace files in a tree view with scroll support
 */
export function RightPanel({ className }: RightPanelProps): React.JSX.Element {
  const [threadId] = useQueryState("threadId");
  const { isOpen, setOpen } = useRightPanel();
  const { workspaceFiles, workspacePath, setWorkspaceFiles, setWorkspacePath, openFile } = useThreadFileState(threadId);

  // Handle file click - open file as tab
  const handleFileClick = useCallback((path: string) => {
    const name = getFileName(path);
    openFile(path, name);
  }, [openFile]);

  const [loading, setLoading] = useState(false);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  // Load workspace files from disk (doesn't require workspacePath in state)
  const loadWorkspaceFiles = useCallback(async () => {
    if (!threadId) {
      console.log("[RightPanel] loadWorkspaceFiles - skipped, no threadId");
      return;
    }

    console.log("[RightPanel] loadWorkspaceFiles - loading for threadId:", threadId);
    setLoading(true);
    try {
      if (window.electron?.invoke) {
        const result = await window.electron.invoke("workspace:loadFromDisk", threadId);
        console.log("[RightPanel] loadWorkspaceFiles - result:", result);
        const typedResult = result as { success: boolean; files?: FileInfo[]; error?: string };
        if (typedResult.success && typedResult.files) {
          setWorkspaceFiles(typedResult.files);
        } else if (typedResult.error) {
          console.log("[RightPanel] loadWorkspaceFiles - no workspace or error:", typedResult.error);
        }
      }
    } catch (error) {
      console.error("Failed to load workspace files:", error);
    } finally {
      setLoading(false);
    }
  }, [threadId, setWorkspaceFiles]);

  // Load workspace path and files on mount/thread change  
  useEffect(() => {
    const loadWorkspace = async () => {
      if (!threadId) return;
      
      console.log("[RightPanel] Loading workspace for thread:", threadId);
      // Load workspace path from thread metadata
      if (window.electron?.invoke) {
        const path = await window.electron.invoke("workspace:get", threadId);
        console.log("[RightPanel] workspace:get result:", path);
        if (path) {
          setWorkspacePath(path as string);
        }
        // Always try to load files (IPC handler will check if workspace exists)
        await loadWorkspaceFiles();
      }
    };
    loadWorkspace();
  }, [threadId, setWorkspacePath, loadWorkspaceFiles]);

  // Toggle directory expansion
  const toggleDir = useCallback((path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  // Select workspace folder
  const handleSelectFolder = async () => {
    if (!threadId) return;

    setLoading(true);
    try {
      if (window.electron?.invoke) {
        // Use workspace:select which opens dialog and saves path to thread metadata
        const path = await window.electron.invoke("workspace:select", threadId);
        if (path) {
          setWorkspacePath(path as string);
          // Load files for the new workspace (path is now in thread metadata)
          const filesResult = await window.electron.invoke("workspace:loadFromDisk", threadId);
          const typedFilesResult = filesResult as { success: boolean; files?: FileInfo[]; error?: string };
          if (typedFilesResult.success && typedFilesResult.files) {
            setWorkspaceFiles(typedFilesResult.files);
          }
        }
      }
    } catch (error) {
      console.error("Failed to select folder:", error);
    } finally {
      setLoading(false);
    }
  };

  // Build tree structure from flat file list
  const buildTree = useCallback((files: FileInfo[]): Map<string, FileInfo[]> => {
    const tree = new Map<string, FileInfo[]>();
    tree.set("/", []);

    // Sort files: directories first, then alphabetically
    const sortedFiles = [...files].sort((a, b) => {
      const aIsDir = a.is_dir === true;
      const bIsDir = b.is_dir === true;
      if (aIsDir !== bIsDir) {
        return aIsDir ? -1 : 1;
      }
      return getFileName(a.path).localeCompare(getFileName(b.path));
    });

    for (const file of sortedFiles) {
      // Normalize path - remove leading slash if present
      const normalizedPath = file.path.startsWith("/") ? file.path.slice(1) : file.path;
      const pathParts = normalizedPath.split(/[/\\]/).filter(Boolean);
      
      // Parent is "/" for top-level items, otherwise join parent parts
      const parentPath = pathParts.length <= 1 
        ? "/" 
        : pathParts.slice(0, -1).join("/");

      if (!tree.has(parentPath)) {
        tree.set(parentPath, []);
      }
      
      // Store with normalized path
      const normalizedFile = { ...file, path: normalizedPath };
      tree.get(parentPath)!.push(normalizedFile);

      if (file.is_dir) {
        const dirPath = normalizedPath;
        if (!tree.has(dirPath)) {
          tree.set(dirPath, []);
        }
      }
    }

    console.log("[RightPanel] buildTree - root items:", tree.get("/")?.length, "total keys:", tree.size);
    return tree;
  }, []);

  const tree = buildTree(workspaceFiles);
  const rootItems = tree.get("/") || [];

  if (!isOpen) {
    return <></>;
  }

  return (
    <aside
      className={cn(
        "flex flex-col h-full border-l border-border bg-sidebar",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <span className="text-sm font-medium">Files</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(false)}
          className="h-6 w-6"
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* Workspace header */}
      {workspacePath && (
        <div className="px-3 py-2 border-b border-border shrink-0 bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Workspace
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={loadWorkspaceFiles}
                disabled={loading}
                className="h-6 w-6"
                title="Refresh files"
              >
                {loading ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <RefreshCw className="size-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectFolder}
                disabled={loading || !threadId}
                className="h-6 px-2 text-xs"
                title="Change workspace"
              >
                Change
              </Button>
            </div>
          </div>
          <div
            className="text-xs text-muted-foreground truncate mt-1"
            title={workspacePath}
          >
            {workspacePath.split(/[/\\]/).pop()}
          </div>
        </div>
      )}

      {/* File tree - scrollable area */}
      <div className="flex-1 overflow-y-auto">
        {!workspacePath ? (
          // No workspace selected
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
            <FolderOpen className="size-12 mb-4 text-muted-foreground opacity-50" />
            <span className="text-sm font-medium mb-2">No workspace selected</span>
            <span className="text-xs text-muted-foreground mb-4">
              Select a folder for the agent to work in
            </span>
            <Button
              variant="default"
              size="sm"
              onClick={handleSelectFolder}
              disabled={loading || !threadId}
              className="h-8 px-4"
            >
              {loading ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <FolderOpen className="size-4 mr-2" />
              )}
              Select Folder
            </Button>
          </div>
        ) : rootItems.length === 0 ? (
          // Empty workspace
          <div className="flex flex-col items-center text-center text-sm text-muted-foreground py-8 px-4">
            <FolderOpen className="size-8 mb-2 opacity-50" />
            <span>Empty workspace</span>
            <span className="text-xs mt-1 opacity-75">
              Files will appear when the agent creates them
            </span>
          </div>
        ) : (
          // File tree
          <div className="py-2">
            {rootItems.map((file) => (
              <FileTreeNode
                key={file.path}
                file={file}
                depth={0}
                isExpanded={expandedDirs.has(file.path)}
                children={tree.get(file.path) || []}
                onToggle={toggleDir}
                onFileClick={handleFileClick}
                expandedDirs={expandedDirs}
                allFiles={tree}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

export default RightPanel;
