"use client";

import {
  useFetchThreads,
  useUpdateThread,
  useDeleteThread,
  useCopyThread,
} from "@/hooks/use-threads";
// Use shared app icons for consistency
import { NoSignalIcon, SearchIcon, PinIcon, PinOffIcon, PlusSignIcon } from "@/components/icons";
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
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MoreVerticalMenuIcon, EditIcon, DeleteIcon, Copy02Icon } from "@/components/icons";
import { MessageContent } from "@langchain/core/messages";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

// Utility: Get thread title with fallback
function getThreadTitle(thread: Thread): string {
  const customName = thread.metadata?.name as string | undefined;
  if (customName) return customName;
  
  const firstMessage = getFirstHumanMessageContent(thread);
  if (firstMessage) return firstMessage;
  
  // Fallback to "New thread" with thread ID prefix
  return `New thread ${thread.thread_id.slice(0, 5)}`;
}

// Utility: Get date category for grouping
function getDateCategory(date: Date): 'today' | 'yesterday' | 'previous7days' | 'older' {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const threadDate = new Date(date);
  const threadDay = new Date(threadDate.getFullYear(), threadDate.getMonth(), threadDate.getDate());
  
  if (threadDay.getTime() === today.getTime()) return 'today';
  if (threadDay.getTime() === yesterday.getTime()) return 'yesterday';
  if (threadDate >= sevenDaysAgo) return 'previous7days';
  return 'older';
}

// Utility: Group threads by date
function groupThreadsByDate(threads: Thread[]) {
  const groups: {
    today: Thread[];
    yesterday: Thread[];
    previous7days: Thread[];
    older: Thread[];
  } = {
    today: [],
    yesterday: [],
    previous7days: [],
    older: [],
  };

  threads.forEach((thread) => {
    // Use created_at or updated_at for grouping
    const dateStr = (thread as any).created_at || (thread as any).updated_at;
    if (!dateStr) {
      groups.older.push(thread);
      return;
    }
    
    const category = getDateCategory(new Date(dateStr));
    groups[category].push(thread);
  });

  return groups;
}

export function ThreadList() {
  const [threadId, setThreadId] = useQueryState("threadId");
  const router = useRouter();
  const { data: threads = [], isLoading } = useFetchThreads();
  const updateThread = useUpdateThread();
  const deleteThread = useDeleteThread();
  const copyThread = useCopyThread();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);
  // Inline edit state
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingThreadName, setEditingThreadName] = useState("");
  const [originalThreadName, setOriginalThreadName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { state } = useSidebar();

  // Focus search input when dialog opens
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  // Clear search when dialog closes and reset selected index
  useEffect(() => {
    if (!searchOpen) {
      setSearchQuery("");
      setSelectedIndex(-1);
    }
  }, [searchOpen]);

  // Reset selected index when search query changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchQuery]);

  // Auto-scroll to selected item
  useEffect(() => {
    if (selectedItemRef.current && selectedIndex >= 0) {
      selectedItemRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedIndex]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (editingThreadId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingThreadId]);

  // REFACTOR-TODO: Replace custom DOM events with Context API or callback props for type safety
  // Why: String-based events are fragile and not type-safe, typos won't be caught at compile time
  // Listen for custom event to open search dialog
  useEffect(() => {
    const handleOpenSearch = () => {
      setSearchOpen(true);
    };

    window.addEventListener('openThreadSearch', handleOpenSearch);
    
    return () => {
      window.removeEventListener('openThreadSearch', handleOpenSearch);
    };
  }, []);

  // PERF-TODO: Wrap in useMemo with [threads, searchQuery] dependencies
  // Why: getFirstHumanMessageContent() is expensive and runs on every render
  // Filter threads by search query
  const filteredThreads = threads.filter((thread) => {
    if (!searchQuery.trim()) return true;
    const title =
      getFirstHumanMessageContent(thread) ||
      (thread.metadata?.name as string) ||
      `New thread-${thread.thread_id}`;
    return title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // PERF-TODO: Wrap in useMemo with [filteredThreads] dependency
  // Why: Creating new array and sorting on every render is expensive
  // Sort threads: pinned first, then by most recent
  const sortedThreads = [...filteredThreads].sort((a, b) => {
    const aPinned = a.metadata?.pinned === true;
    const bPinned = b.metadata?.pinned === true;
    
    // If one is pinned and the other isn't, pinned comes first
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    
    // Otherwise, maintain original order (most recent first from API)
    return 0;
  });

  // Memoize grouped threads for search dialog
  const groupedThreads = useMemo(() => {
    return groupThreadsByDate(sortedThreads);
  }, [sortedThreads]);

  // Handler functions - must be before early return
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
    // RACE-CONDITION-TODO: Add loading state to prevent double-submit and only clear state on success
    // Why: User can trigger save multiple times (blur + Enter) causing duplicate API calls, state clears even on error
    
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

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (sortedThreads.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => 
        prev < sortedThreads.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > -1 ? prev - 1 : prev));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0) {
        const selectedThread = sortedThreads[selectedIndex];
        if (selectedThread) {
          handleSelectThread(selectedThread.thread_id);
          setSearchOpen(false);
        }
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setSearchOpen(false);
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
      toast.error("Failed to delete thread", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleCopyThread = async (threadIdToCopy: string) => {
    try {
      const copiedThread = await copyThread.mutateAsync(threadIdToCopy);
      toast.success("Thread copied successfully", {
        description: `New thread: ${copiedThread.thread_id.substring(0, 8)}...`,
        duration: 3000,
      });
      // Optionally navigate to the new thread
      // router.push(`/?threadId=${copiedThread.thread_id}`);
    } catch (error) {
      console.error("Failed to copy thread:", error);
      toast.error("Failed to copy thread", {
        description: error instanceof Error ? error.message : "Unknown error",
        duration: 5000,
      });
    }
  };

  const handleTogglePin = async (threadIdToPin: string, currentPinState: boolean) => {
    try {
      await updateThread.mutateAsync({
        threadId: threadIdToPin,
        metadata: { pinned: !currentPinState },
      });
      toast.success(
        currentPinState ? "Thread unpinned" : "Thread pinned",
        {
          duration: 2000,
        }
      );
    } catch (error) {
      console.error("Failed to toggle pin:", error);
      toast.error("Failed to update thread", {
        description: error instanceof Error ? error.message : "Unknown error",
        duration: 5000,
      });
    }
  };

  // Handle creating new thread from search
  const handleCreateNewThread = () => {
    setSearchOpen(false);
    setSearchQuery("");
    // Navigate to home to create new thread
    router.push("/");
  };

  // Helper function to render individual thread item
  const renderThreadItem = (thread: Thread, index: number) => {
    const title = getThreadTitle(thread);
    const isActive = thread.thread_id === threadId;
    const isPinned = thread.metadata?.pinned === true;
    const isSelected = index === selectedIndex;
    
    // Get agent and mode info
    const mode = typeof thread.metadata?.mode === 'string' 
      ? thread.metadata.mode 
      : 'Chat';
    const agentName = typeof thread.metadata?.assistant_id === 'string' 
      ? thread.metadata.assistant_id 
      : 'Agent';

    return (
      <button
        key={thread.thread_id}
        ref={isSelected ? selectedItemRef : null}
        onClick={() => {
          handleSelectThread(thread.thread_id);
          setSearchOpen(false);
        }}
        onMouseEnter={() => setSelectedIndex(index)}
        className={cn(
          "w-full text-left px-3 py-2.5 rounded-lg transition-colors",
          isSelected && "bg-accent",
          !isSelected && "hover:bg-accent/50"
        )}
      >
        <div className="flex flex-col gap-1">
          {/* Thread Title */}
          <div className="text-sm font-medium truncate flex items-center gap-2">
            {title}
            {isPinned && (
              <PinIcon className="text-muted-foreground flex-shrink-0" size="xs" />
            )}
            {isActive && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex-shrink-0">
                Current
              </span>
            )}
          </div>
          {/* Mode - Agent Name */}
          <div className="text-xs text-muted-foreground">
            {mode} • {agentName}
          </div>
        </div>
      </button>
    );
  };

  // Don't render thread list when sidebar is collapsed
  if (state === "collapsed") {
    return null;
  }

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>
          Threads
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

          {!isLoading && sortedThreads.length === 0 && (
            <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 py-8 text-center">
              <NoSignalIcon size="xl" />
              <p className="text-sm">
                {searchQuery ? "No threads found" : "No threads yet"}
              </p>
            </div>
          )}

          {!isLoading &&
            sortedThreads.map((thread) => {
              const title =
                getFirstHumanMessageContent(thread) ||
                (thread.metadata?.name as string) ||
                `New thread ${thread.thread_id.slice(0, 5)}`;
              const isActive = thread.thread_id === threadId;
              const isEditing = editingThreadId === thread.thread_id;
              const isPinned = thread.metadata?.pinned === true;

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
                        // TODO: Optional performance enhancement - Pre-fetch thread state on hover
                        // This will load thread data in the background before user clicks
                        // Implementation example:
                        // onMouseEnter={() => {
                        //   queryClient.prefetchQuery({
                        //     queryKey: threadKeys.state(thread.thread_id),
                        //     queryFn: () => fetchThreadState(thread.thread_id),
                        //     staleTime: 1000 * 30,
                        //   });
                        // }}
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
                            showOnHover={!isPinned}
                            className={cn(
                              "data-[state=open]:opacity-100",
                              isPinned && "md:opacity-100"
                            )}
                          >
                            <span className="group-hover/menu-item:hidden">
                              {isPinned ? (
                                <PinIcon className="text-muted-foreground" size="xs"/>
                              ) : (
                                <MoreVerticalMenuIcon />
                              )}
                            </span>
                            <span className="hidden group-hover/menu-item:block">
                              <MoreVerticalMenuIcon />
                            </span>
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
                              handleTogglePin(thread.thread_id, isPinned);
                            }}
                          >
                            {isPinned ? (
                              <PinOffIcon size="sm" />
                            ) : (
                              <PinIcon size="sm" />
                            )}
                            <span>{isPinned ? "Unpin thread" : "Pin thread"}</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEdit(thread.thread_id);
                            }}
                          >
                            <EditIcon size="sm" />
                            <span>Rename</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyThread(thread.thread_id);
                            }}
                          >
                            <Copy02Icon size="sm" />
                            <span>Clone thread</span>
                          </DropdownMenuItem>
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

      {/* Search Dialog - Thread Browser */}
      <Dialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
      >
        <DialogContent className="sm:max-w-2xl h-[80vh] p-0 gap-0 flex flex-col [&>button]:hidden">
          {/* Accessibility: Hidden title for screen readers */}
          <DialogTitle className="sr-only">Search Threads</DialogTitle>
          <DialogDescription className="sr-only">
            Browse and search all your conversation threads
          </DialogDescription>

          {/* Top Bar: Icon + Search Field + Close Button */}
          <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b flex-shrink-0">
            <SearchIcon className="text-muted-foreground h-4 w-4 flex-shrink-0" />
            <Input
              ref={searchInputRef}
              placeholder="Search threads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="flex-1 border-0 shadow-none focus-visible:ring-0 px-0"
            />
            <DialogClose asChild>
              <button className="flex-shrink-0 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
                <span className="sr-only">Close</span>
              </button>
            </DialogClose>
          </div>

          {/* Thread List with Date Grouping */}
          <div 
            className="flex-1 overflow-y-auto"
            onMouseLeave={() => setSelectedIndex(-1)}
          >
            {isLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={`search-skeleton-${index}`} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : sortedThreads.length === 0 ? (
              <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 py-12 text-center">
                <NoSignalIcon size="xl" />
                <p className="text-sm">
                  {searchQuery ? "No threads found" : "No threads yet"}
                </p>
                {searchQuery && (
                  <p className="text-xs text-muted-foreground">
                    Try a different search term
                  </p>
                )}
              </div>
            ) : (
              <div className="p-3">
                {/* PERF-TODO: Pre-compute threadIndexMap using useMemo to avoid O(n²) complexity */}
                {/* Why: Each findIndex call is O(n), called for every thread in every group = O(n²) performance issue */}
                {/* Fix: const threadIndexMap = useMemo(() => new Map(sortedThreads.map((t, i) => [t.thread_id, i])), [sortedThreads]) */}
                
                {/* New Thread Button - Thread Format */}
                <button
                  onClick={handleCreateNewThread}
                  className="w-full text-left px-3 py-2.5 mb-4 rounded-lg transition-colors hover:bg-accent/50"
                >
                  <div className="flex flex-col gap-1">
                    <div className="text-sm font-medium flex items-center gap-2">
                      <PlusSignIcon size="sm" />
                      New Thread
                    </div>
                  </div>
                </button>

                {/* Today */}
                {groupedThreads.today.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-muted-foreground px-3 mb-2">
                      Today
                    </div>
                    <div className="space-y-1">
                      {groupedThreads.today.map((thread, index) => {
                        const globalIndex = sortedThreads.findIndex(t => t.thread_id === thread.thread_id);
                        return renderThreadItem(thread, globalIndex);
                      })}
                    </div>
                  </div>
                )}

                {/* Yesterday */}
                {groupedThreads.yesterday.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-muted-foreground px-3 mb-2">
                      Yesterday
                    </div>
                    <div className="space-y-1">
                      {groupedThreads.yesterday.map((thread, index) => {
                        const globalIndex = sortedThreads.findIndex(t => t.thread_id === thread.thread_id);
                        return renderThreadItem(thread, globalIndex);
                      })}
                    </div>
                  </div>
                )}

                {/* Previous 7 Days */}
                {groupedThreads.previous7days.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-muted-foreground px-3 mb-2">
                      Previous 7 Days
                    </div>
                    <div className="space-y-1">
                      {groupedThreads.previous7days.map((thread, index) => {
                        const globalIndex = sortedThreads.findIndex(t => t.thread_id === thread.thread_id);
                        return renderThreadItem(thread, globalIndex);
                      })}
                    </div>
                  </div>
                )}

                {/* Older */}
                {groupedThreads.older.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground px-3 mb-2">
                      Older
                    </div>
                    <div className="space-y-1">
                      {groupedThreads.older.map((thread, index) => {
                        const globalIndex = sortedThreads.findIndex(t => t.thread_id === thread.thread_id);
                        return renderThreadItem(thread, globalIndex);
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
