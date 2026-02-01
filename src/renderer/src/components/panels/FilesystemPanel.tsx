"use client";

import { useState, useEffect } from "react";
import {
  Folder,
  FolderOpen,
  File,
  ChevronRight,
  ChevronDown,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useThreadFileState, type FileInfo } from "@/features/chat/providers/ThreadState";
import { useQueryState } from "@/hooks/use-query-state";

// ============================================================================
// File Tree Node Component
// ============================================================================

interface FileTreeNodeProps {
  file: FileInfo;
  depth: number;
  isExpanded: boolean;
  children: FileInfo[];
  onToggle: (path: string) => void;
  onFileClick: (file: FileInfo) => void;
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
}: FileTreeNodeProps) {
  const name = file.path.split("/").pop() || file.path;
  const isDir = file.is_dir;

  const handleClick = () => {
    if (isDir) {
      onToggle(file.path);
    } else {
      onFileClick(file);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className={cn(
          "flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50 transition-colors"
        )}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
      >
        {isDir ? (
          <>
            {isExpanded ? (
              <ChevronDown className="size-3 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="size-3 text-muted-foreground shrink-0" />
            )}
            {isExpanded ? (
              <FolderOpen className="size-4 text-amber-500 shrink-0" />
            ) : (
              <Folder className="size-4 text-amber-500 shrink-0" />
            )}
          </>
        ) : (
          <>
            <span className="w-3 shrink-0" />
            <File className="size-4 text-muted-foreground shrink-0" />
          </>
        )}
        <span className="flex-1 text-left truncate">{name}</span>
        {!isDir && file.size !== undefined && (
          <span className="text-xs text-muted-foreground tabular-nums shrink-0">
            {formatSize(file.size)}
          </span>
        )}
      </button>

      {isDir &&
        isExpanded &&
        children.map((child) => (
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
  );
}

// ============================================================================
// Filesystem Panel Component
// ============================================================================

interface FilesystemPanelProps {
  className?: string;
}

export function FilesystemPanel({ className }: FilesystemPanelProps) {
  const [threadId] = useQueryState("threadId");
  const {
    workspaceFiles,
    workspacePath,
    setWorkspacePath,
    setWorkspaceFiles,
    openFile,
  } = useThreadFileState(threadId);

  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Load workspace path for current thread
  useEffect(() => {
    async function loadWorkspacePath() {
      if (threadId && window.electron?.invoke) {
        const path = await window.electron.invoke("workspace:get", threadId);
        if (path) {
          setWorkspacePath(path as string);
        }
      }
    }
    loadWorkspacePath();
  }, [threadId, setWorkspacePath]);

  // Auto-expand root when workspace path changes
  useEffect(() => {
    if (workspacePath) {
      setExpandedDirs(new Set([workspacePath]));
    }
  }, [workspacePath]);

  // Handle selecting a workspace folder
  async function handleSelectFolder() {
    if (!threadId) return;

    setLoading(true);
    try {
      if (window.electron?.invoke) {
        const path = await window.electron.invoke("workspace:select", threadId);
        if (path) {
          setWorkspacePath(path as string);
          // Load files from disk
          const result = await window.electron.invoke("workspace:loadFromDisk", threadId);
          const typedResult = result as { success: boolean; files: FileInfo[] };
          if (typedResult.success) {
            setWorkspaceFiles(typedResult.files);
          }
        }
      }
    } catch (e) {
      console.error("[FilesystemPanel] Select folder error:", e);
    } finally {
      setLoading(false);
    }
  }

  // Handle refreshing files from disk
  async function handleRefresh() {
    if (!threadId) return;

    setLoading(true);
    try {
      if (window.electron?.invoke) {
        const result = await window.electron.invoke("workspace:loadFromDisk", threadId);
        const typedResult = result as { success: boolean; files: FileInfo[] };
        if (typedResult.success) {
          setWorkspaceFiles(typedResult.files);
        }
      }
    } catch (e) {
      console.error("[FilesystemPanel] Refresh error:", e);
    } finally {
      setLoading(false);
    }
  }

  // Toggle directory expansion
  const toggleDir = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  // Handle file click - open in viewer
  const handleFileClick = (file: FileInfo) => {
    if (!file.is_dir) {
      const name = file.path.split("/").pop() || file.path;
      openFile(file.path, name);
    }
  };

  // Normalize path to always start with /
  const normalizePath = (p: string) => (p.startsWith("/") ? p : "/" + p);

  // Get parent path
  const getParentPath = (p: string) => {
    const normalized = normalizePath(p);
    const lastSlash = normalized.lastIndexOf("/");
    if (lastSlash <= 0) return "/";
    return normalized.substring(0, lastSlash);
  };

  // Build tree structure
  const buildTree = (files: FileInfo[]) => {
    const tree: Map<string, FileInfo[]> = new Map();

    files.forEach((file) => {
      const normalized = normalizePath(
        file.path.endsWith("/") ? file.path.slice(0, -1) : file.path
      );
      const parentPath = getParentPath(normalized);

      if (!tree.has(parentPath)) {
        tree.set(parentPath, []);
      }

      const normalizedFile = { ...file, path: normalized };
      const existing = tree.get(parentPath)!;

      // Avoid duplicates
      if (!existing.some((f) => f.path === normalized)) {
        existing.push(normalizedFile);
      }
    });

    // Sort: directories first, then alphabetically
    tree.forEach((children, _key) => {
      children.sort((a, b) => {
        if (a.is_dir && !b.is_dir) return -1;
        if (!a.is_dir && b.is_dir) return 1;
        return a.path.localeCompare(b.path);
      });
    });

    return tree;
  };

  const tree = buildTree(workspaceFiles);
  const rootItems = tree.get("/") || [];

  // If no workspace is selected, show selection prompt
  if (!workspacePath) {
    return (
      <div className={cn("flex flex-1 flex-col min-h-0 overflow-hidden", className)}>
        <div className="flex flex-col items-center justify-center flex-1 text-center px-4 py-8">
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
      </div>
    );
  }

  return (
    <div className={cn("flex flex-1 flex-col min-h-0 overflow-hidden", className)}>
      {/* Header */}
      <div className="px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Workspace
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
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
              title="Change workspace folder"
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

      {/* File tree */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="py-2">
            {rootItems.length === 0 ? (
              <div className="flex flex-col items-center text-center text-sm text-muted-foreground py-8 px-4">
                <FolderOpen className="size-8 mb-2 opacity-50" />
                <span>Empty workspace</span>
                <span className="text-xs mt-1 opacity-75">
                  Files will appear when the agent creates them
                </span>
              </div>
            ) : (
              rootItems.map((file) => (
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
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

// ============================================================================
// Utilities
// ============================================================================

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
