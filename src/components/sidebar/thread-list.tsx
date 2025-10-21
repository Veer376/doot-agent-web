"use client";

import {
  useThreads,
  useUpdateThread,
  useDeleteThread,
} from "@/hooks/use-threads";
// Use shared app icons for consistency
import { NoSignalIcon, SearchIcon } from "@/components/icons";
import { useQueryState } from "nuqs";
import { useRouter } from "next/navigation";
import type { Message, Thread } from "@langchain/langgraph-sdk";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuAction,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MoreVerticalMenuIcon, EditIcon, DeleteIcon } from "@/components/icons";
import { MessageContent } from "@langchain/core/messages";

// Utility: Extract text content from MessageContent
const getMessageStringContent = (
  content: MessageContent | undefined,
): string => {
  if (!content) return "";
  if (typeof content === "string") return content;
  const texts = content
    .filter((c): c is { type: "text"; text: string } => c.type === "text")
    .map((c) => c.text);
  return texts.join(" ");
};

// Utility: Get first human message from thread as title
function getFirstHumanMessageContent(thread: Thread) {
  try {
    if (
      Array.isArray(thread.values) ||
      !("messages" in thread.values) ||
      !thread.values.messages ||
      !Array.isArray(thread.values.messages) ||
      !thread.values.messages.length
    )
      return "";
    const castMessages = thread.values.messages as Message[];

    const firstHumanMsg = castMessages.find((msg) => msg.type === "human");
    return getMessageStringContent(firstHumanMsg?.content);
  } catch (e) {
    console.error("Failed to get human message from thread", {
      thread,
      error: e,
    });
    return "";
  }
}
export function ThreadList() {
  const [threadId, setThreadId] = useQueryState("threadId");
  const router = useRouter();
  const { data: threads = [], isLoading } = useThreads();
  const updateThread = useUpdateThread();
  const deleteThread = useDeleteThread();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // Inline edit state
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingThreadName, setEditingThreadName] = useState("");
  const [originalThreadName, setOriginalThreadName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { state } = useSidebar();

  // Focus input when entering edit mode
  useEffect(() => {
    if (editingThreadId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingThreadId]);

  // Don't render thread list when sidebar is collapsed
  if (state === "collapsed") {
    return null;
  }

  // Filter threads by search query
  const filteredThreads = threads.filter((thread) => {
    if (!searchQuery.trim()) return true;
    const title =
      getFirstHumanMessageContent(thread) ||
      (thread.metadata?.name as string) ||
      `New thread-${thread.thread_id}`;
    return title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleSelectThread = (id: string) => {
    // Navigate to base path with threadId query param
    router.push(`/?threadId=${id}`);
  };

  const handleStartEdit = (threadId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const thread = threads.find((t) => t.thread_id === threadId);
    const currentName =
      getFirstHumanMessageContent(thread!) ||
      (thread?.metadata?.name as string) ||
      "";
    setEditingThreadId(threadId);
    setEditingThreadName(currentName);
    setOriginalThreadName(currentName); // Store original for comparison
  };

  const handleCancelEdit = () => {
    setEditingThreadId(null);
    setEditingThreadName("");
    setOriginalThreadName("");
  };

  const handleSaveEdit = async () => {
    // If no thread ID or empty name, cancel edit
    if (!editingThreadId || !editingThreadName.trim()) {
      handleCancelEdit();
      return;
    }

    // Check if the name actually changed
    const trimmedNewName = editingThreadName.trim();
    const trimmedOriginalName = originalThreadName.trim();

    if (trimmedNewName === trimmedOriginalName) {
      // No changes made, just close edit mode without API call
      handleCancelEdit();
      return;
    }

    try {
      await updateThread.mutateAsync({
        threadId: editingThreadId,
        metadata: { name: trimmedNewName },
      });
      setEditingThreadId(null);
      setEditingThreadName("");
      setOriginalThreadName("");
    } catch (error) {
      console.error("Failed to rename thread:", error);
      // TODO: Show error toast
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  const handleDeleteThread = async (threadIdToDelete: string) => {
    try {
      await deleteThread.mutateAsync(threadIdToDelete);
      // If we're deleting the currently active thread, clear the selection
      if (threadIdToDelete === threadId) {
        setThreadId(null);
      }
    } catch (error) {
      console.error("Failed to delete thread:", error);
      // TODO: Show error toast
    }
  };

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>
          Threads
          <SidebarGroupAction
            onClick={() => setSearchOpen(true)}
            title="Search chats"
          >
            <SearchIcon />
          </SidebarGroupAction>
        </SidebarGroupLabel>
        <SidebarMenu>
          {isLoading && (
            <>
              {Array.from({ length: 5 }).map((_, index) => (
                <SidebarMenuItem key={`skeleton-${index}`}>
                  <Skeleton className="h-12 w-full" />
                </SidebarMenuItem>
              ))}
            </>
          )}

          {!isLoading && filteredThreads.length === 0 && (
            <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 py-8 text-center">
              <NoSignalIcon size="xl" />
              <p className="text-sm">
                {searchQuery ? "No threads found" : "No threads yet"}
              </p>
            </div>
          )}

          {!isLoading &&
            filteredThreads.map((thread) => {
              const title =
                getFirstHumanMessageContent(thread) ||
                (thread.metadata?.name as string) ||
                `New thread ${thread.thread_id.slice(0, 5)}`;
              const isActive = thread.thread_id === threadId;
              const isEditing = editingThreadId === thread.thread_id;

              return (
                <SidebarMenuItem key={thread.thread_id}>
                  {isEditing ? (
                    <div className="flex items-center px-1 py-1">
                      <Input
                        ref={inputRef}
                        value={editingThreadName}
                        onChange={(e) => setEditingThreadName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleSaveEdit}
                        className="bg-card text-sidebar-foreground placeholder:text-sidebar-foreground/60 border-border focus-visible:border-primary/30 h-9 rounded-3xl border text-sm transition-all focus-visible:ring-0 focus-visible:ring-transparent"
                        placeholder="Thread name..."
                      />
                    </div>
                  ) : (
                    <>
                      <SidebarMenuButton
                        onClick={() => handleSelectThread(thread.thread_id)}
                        isActive={isActive}
                      >
                        <span className="truncate text-sm">{title}</span>
                      </SidebarMenuButton>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <SidebarMenuAction
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            showOnHover
                          >
                            <MoreVerticalMenuIcon />
                            <span className="sr-only">More options</span>
                          </SidebarMenuAction>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          side="right"
                          align="start"
                        >
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEdit(thread.thread_id);
                            }}
                          >
                            <EditIcon size="sm" />
                            <span>Rename</span>
                          </DropdownMenuItem>
                          {/* For now we're disabling thread copy functionality
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyThread(thread.thread_id);
                            }}
                          >
                            <CopyIcon size="sm" />
                            <span>Clone thread</span>
                          </DropdownMenuItem> */}
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteThread(thread.thread_id);
                            }}
                          >
                            <DeleteIcon size="sm" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </SidebarMenuItem>
              );
            })}
        </SidebarMenu>
      </SidebarGroup>

      {/* Search Dialog */}
      <Dialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Search chats</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <SearchIcon className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
            <Input
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
