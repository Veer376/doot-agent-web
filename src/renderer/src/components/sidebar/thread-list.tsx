"use client";

import {
  useFetchCloudThreadsInfinite,
  useUpdateCloudThread,
  useDeleteCloudThread,
  useCopyThread,
} from "@/hooks/use-cloud-threads";
import { useThreads } from "@/hooks/use-threads";
import { useLocalThreads } from "@/hooks/use-local-threads";
import { useFetchCloudAgents } from "@/hooks/use-cloud-agents";
import { useAuthSession } from "@/providers/Auth";
import type { Agent } from "@/types/agent";
import {
  SearchIcon,
  PinIcon,
  PinOffIcon,
  PlusIcon,
  DownloadIcon,
  PdfIcon,
} from "@/components/icons";
import {
  MessageSquareIcon,
  FileTextIcon,
  FileJsonIcon,
} from "@/components/icons";
import { useQueryState } from "@/hooks/use-query-state";
import { useNavigate } from "react-router-dom";
import type { Message, Thread } from "@langchain/langgraph-sdk";
import {
  SidebarGroup,
  SidebarGroupLabel,
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
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  MoreVerticalMenuIcon,
  EditIcon,
  DeleteIcon,
  Copy02Icon,
} from "@/components/icons";
import { MessageContent } from "@langchain/core/messages";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { cloudThreadKeys } from "@/hooks/use-cloud-threads";
import {
  exportThreadAsMarkdown,
  exportThreadAsJSON,
  exportThreadAsPDF,
} from "@/lib/export-thread";

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
    // Check if thread.values exists and is not an array
    if (!thread.values || Array.isArray(thread.values)) {
      return "";
    }

    // Check if messages exist in values
    if (!("messages" in thread.values) || !thread.values.messages) {
      return "";
    }

    // Check if messages is an array with length
    if (
      !Array.isArray(thread.values.messages) ||
      !thread.values.messages.length
    ) {
      return "";
    }

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
  // First check for title property (used by local threads)
  if (thread.title) return thread.title;

  // Then check metadata.name
  const customName = thread.metadata?.name as string | undefined;
  if (customName) return customName;

  // Try to get first message content
  const firstMessage = getFirstHumanMessageContent(thread);
  if (firstMessage) return firstMessage;

  // Fallback to "New thread" with thread ID prefix
  return `New thread ${thread.thread_id.slice(0, 5)}`;
}

// Utility: Get agent display info from metadata
function getAgentDisplayInfo(thread: Thread, agents: Agent[]): string | null {
  const mode = thread.metadata?.mode as string | undefined;
  const assistantId = thread.metadata?.assistant_id as string | undefined;

  // If mode is agent, return the agent name
  if (mode === "agent" && assistantId) {
    const agent = agents.find((a) => a.assistant_id === assistantId);
    return agent?.name || assistantId;
  }

  // For chat mode or any other mode, return null (don't display anything)
  return null;
}

// Utility: Get date category for grouping
function getDateCategory(
  date: Date,
): "today" | "yesterday" | "previous7days" | "older" {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const threadDate = new Date(date);
  const threadDay = new Date(
    threadDate.getFullYear(),
    threadDate.getMonth(),
    threadDate.getDate(),
  );

  if (threadDay.getTime() === today.getTime()) return "today";
  if (threadDay.getTime() === yesterday.getTime()) return "yesterday";
  if (threadDate >= sevenDaysAgo) return "previous7days";
  return "older";
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
  const navigate = useNavigate();
  const { session } = useAuthSession();
  const { state, isMobile } = useSidebar();
  const queryClient = useQueryClient();
  const THREADS_PER_PAGE = 20;

  // Use unified threads to get both local and cloud threads
  const {
    threads: unifiedThreads,
    isLoading: unifiedLoading,
    refetch: refetchUnified,
  } = useThreads({ limit: 100 });

  // Keep infinite scroll for cloud threads in search (fallback)
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useFetchCloudThreadsInfinite(undefined, THREADS_PER_PAGE);

  const { data: agents = [] } = useFetchCloudAgents();
  const updateThread = useUpdateCloudThread();
  const deleteThread = useDeleteCloudThread();
  const copyThread = useCopyThread();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);
  const searchLoadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const searchScrollContainerRef = useRef<HTMLDivElement>(null);
  // Ref to track isFetchingNextPage without causing effect re-runs
  const isFetchingNextPageRef = useRef(isFetchingNextPage);
  // Ref to store the IntersectionObserver instance
  const observerRef = useRef<IntersectionObserver | null>(null);
  // Inline edit state
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingThreadName, setEditingThreadName] = useState("");
  const [originalThreadName, setOriginalThreadName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Flatten all pages into a single array (for search fallback)
  const cloudThreads = useMemo(() => {
    return data?.pages.flat() ?? [];
  }, [data]);

  // Use unified threads as primary source
  const allLoadedThreads = useMemo(() => {
    return unifiedThreads;
  }, [unifiedThreads]);

  // Sync isFetchingNextPage state to ref to avoid stale closures in observer callback
  useEffect(() => {
    isFetchingNextPageRef.current = isFetchingNextPage;
  }, [isFetchingNextPage]);

  // Callback ref for trigger element - sets up observer when element is mounted
  const loadMoreTriggerRef = useCallback(
    (node: HTMLDivElement | null) => {
      // Cleanup existing observer
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      // If no node or no more pages, don't create observer
      if (!node || !hasNextPage) return;

      // Find scroll container - guaranteed to exist now because DOM element is mounted
      const scrollContainer = node.closest('[data-sidebar="content"]');

      // Defensive check - should never happen but prevents observer with null root
      if (!scrollContainer) {
        console.warn(
          "Scroll container not found - infinite scroll will not work",
        );
        return;
      }

      // Create observer with correct root
      const observer = new IntersectionObserver(
        (entries) => {
          // Guard against double-fetching by reading current value from ref (avoids stale closure)
          if (
            entries[0]?.isIntersecting &&
            hasNextPage &&
            !isFetchingNextPageRef.current
          ) {
            fetchNextPage();
          }
        },
        {
          root: scrollContainer,
          threshold: 0.1,
          rootMargin: "20px",
        },
      );

      observer.observe(node);
      observerRef.current = observer;
    },
    [hasNextPage, fetchNextPage],
  );

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Infinite scroll for search dialog
  useEffect(() => {
    if (!searchLoadMoreTriggerRef.current || !hasNextPage || !searchOpen)
      return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Guard against double-fetching by reading current value from ref (avoids stale closure)
        if (
          entries[0]?.isIntersecting &&
          hasNextPage &&
          !isFetchingNextPageRef.current
        ) {
          fetchNextPage();
        }
      },
      {
        root: searchScrollContainerRef.current,
        threshold: 0.1,
        rootMargin: "20px",
      },
    );

    observer.observe(searchLoadMoreTriggerRef.current);

    return () => observer.disconnect();
  }, [hasNextPage, searchOpen, fetchNextPage]);

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

  // Listen for custom event to open search dialog
  useEffect(() => {
    const handleOpenSearch = () => {
      setSearchOpen(true);
    };

    window.addEventListener("openThreadSearch", handleOpenSearch);

    return () => {
      window.removeEventListener("openThreadSearch", handleOpenSearch);
    };
  }, []);

  // Filter threads by search query
  const filteredThreads = useMemo(() => {
    return allLoadedThreads.filter((thread) => {
      if (!searchQuery.trim()) return true;
      const title = getThreadTitle(thread);
      return title.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [allLoadedThreads, searchQuery]);

  // Sort threads: pinned first, then by most recent
  const sortedThreads = useMemo(() => {
    return [...filteredThreads].sort((a, b) => {
      const aPinned = a.metadata?.pinned === true;
      const bPinned = b.metadata?.pinned === true;

      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      return 0;
    });
  }, [filteredThreads]);

  // Memoize grouped threads for search dialog
  const groupedThreads = useMemo(() => {
    return groupThreadsByDate(sortedThreads);
  }, [sortedThreads]);

  // Handler functions - must be before early return
  const handleSelectThread = (id: string) => {
    // Navigate to base path with threadId query param
    navigate(`/?threadId=${id}`);
  };

  const handleStartEdit = (threadId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const thread = allLoadedThreads.find((t) => t.thread_id === threadId);
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
    if (!editingThreadId || !editingThreadName.trim()) {
      handleCancelEdit();
      return;
    }

    const trimmedNewName = editingThreadName.trim();
    const trimmedOriginalName = originalThreadName.trim();

    if (trimmedNewName === trimmedOriginalName) {
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
      toast.error("Failed to rename thread");
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
        prev < sortedThreads.length - 1 ? prev + 1 : prev,
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
    // Track state with object to ensure consistent reference in closures
    const deleteState = {
      undoClicked: false,
      deleteCompleted: false,
    };
    let deleteTimeout: NodeJS.Timeout | null = null;

    // Use a consistent grace period for both toast and delete timeout
    const UNDO_GRACE_PERIOD_MS = 5000;

    try {
      // Optimistically remove from UI (without actually deleting from DB)
      await deleteThread.mutateAsync({
        threadId: threadIdToDelete,
        skipToast: false,
      });

      // If we're deleting the currently active thread, clear the selection
      if (threadIdToDelete === threadId) {
        setThreadId(null);
      }

      // Show toast with undo button
      toast("Thread deleted", {
        description: `You can undo this action within ${UNDO_GRACE_PERIOD_MS / 1000} seconds`,
        duration: UNDO_GRACE_PERIOD_MS,
        action: {
          label: "Undo",
          onClick: () => {
            // Check if deletion has already completed
            if (deleteState.deleteCompleted) {
              toast.error("Cannot undo", {
                description: "The thread has already been permanently deleted",
              });
              return;
            }

            // Mark undo as clicked and cancel the pending deletion
            deleteState.undoClicked = true;
            if (deleteTimeout) {
              clearTimeout(deleteTimeout);
              deleteTimeout = null;
            }

            // Restore the thread in the UI by invalidating queries
            queryClient.invalidateQueries({
              queryKey: cloudThreadKeys.lists(),
            });
            toast.success("Thread restored");
          },
        },
      });

      // Set timeout to permanently delete after grace period
      deleteTimeout = setTimeout(async () => {
        // Only proceed if undo wasn't clicked
        if (!deleteState.undoClicked) {
          try {
            // Mark deletion as completed before making the API call
            // This prevents race condition where undo is clicked during API call
            deleteState.deleteCompleted = true;

            // Actually delete from database
            await deleteThread.mutateAsync({
              threadId: threadIdToDelete,
              skipToast: true,
            });
          } catch (error) {
            // Reset completion flag on error since deletion failed
            deleteState.deleteCompleted = false;

            console.error("Failed to permanently delete thread:", error);
            toast.error("Failed to delete thread", {
              description:
                error instanceof Error ? error.message : "Unknown error",
            });
            // Restore thread in UI on error
            queryClient.invalidateQueries({
              queryKey: cloudThreadKeys.lists(),
            });
          }
        }
      }, UNDO_GRACE_PERIOD_MS);
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

  const handleTogglePin = async (
    threadIdToPin: string,
    currentPinState: boolean,
  ) => {
    try {
      await updateThread.mutateAsync({
        threadId: threadIdToPin,
        metadata: { pinned: !currentPinState },
      });
      toast.success(currentPinState ? "Thread unpinned" : "Thread pinned", {
        duration: 2000,
      });
    } catch (error) {
      console.error("Failed to toggle pin:", error);
      toast.error("Failed to update thread", {
        description: error instanceof Error ? error.message : "Unknown error",
        duration: 5000,
      });
    }
  };

  const handleExportMarkdown = async (thread: Thread) => {
    if (!session?.accessToken) {
      toast.error("Authentication required");
      return;
    }
    try {
      await exportThreadAsMarkdown(thread, session.accessToken);
      toast.success("Thread exported as Markdown");
    } catch (error) {
      console.error("Failed to export as Markdown:", error);
      toast.error("Failed to export thread");
    }
  };

  const handleExportJSON = async (thread: Thread) => {
    if (!session?.accessToken) {
      toast.error("Authentication required");
      return;
    }
    try {
      await exportThreadAsJSON(thread, session.accessToken);
      toast.success("Thread exported as JSON");
    } catch (error) {
      console.error("Failed to export as JSON:", error);
      toast.error("Failed to export thread");
    }
  };

  const handleExportPDF = async (thread: Thread) => {
    if (!session?.accessToken) {
      toast.error("Authentication required");
      return;
    }
    try {
      await exportThreadAsPDF(thread, session.accessToken);
      toast.success("Thread exported as PDF");
    } catch (error) {
      console.error("Failed to export as PDF:", error);
      toast.error("Failed to export thread");
    }
  };

  // Handle creating new thread from search
  const handleCreateNewThread = () => {
    setSearchOpen(false);
    setSearchQuery("");
    // Navigate to home to create new thread
    navigate("/");
  };

  // Helper function to render individual thread item
  const renderThreadItem = (thread: Thread, index: number) => {
    const title = getThreadTitle(thread);
    const isActive = thread.thread_id === threadId;
    const isPinned = thread.metadata?.pinned === true;
    const isSelected = index === selectedIndex;

    // Get agent name (only shown for agent mode)
    const agentName = getAgentDisplayInfo(thread, agents);

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
          "w-full px-3 py-3 text-left transition-colors",
          isSelected && "bg-accent",
          !isSelected && "hover:bg-accent/50",
        )}
        data-radius="radius1"
      >
        <div className="flex flex-col gap-1.5">
          {/* Thread Title */}
          <div className="flex items-center gap-2 truncate text-sm font-medium">
            {title}
            {isPinned && (
              <PinIcon
                className="flex-shrink-0 text-muted-foreground"
                size="xs"
              />
            )}
            {isActive && (
              <span className="bg-primary/10 flex-shrink-0 rounded-full px-2 py-0.5 text-xs text-primary">
                Current
              </span>
            )}
          </div>
          {/* Agent Name - only shown for agent mode */}
          {agentName && (
            <div className="truncate text-xs text-muted-foreground">
              {agentName}
            </div>
          )}
        </div>
      </button>
    );
  };

  return (
    <>
      {/* Search Dialog - Thread Browser */}
      <Dialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
      >
        <DialogContent className="flex h-[80vh] flex-col gap-0 p-0 sm:max-w-2xl [&>button]:hidden">
          <DialogTitle className="sr-only">Search Threads</DialogTitle>
          <DialogDescription className="sr-only">
            Browse and search all your conversation threads
          </DialogDescription>
          <div className="flex flex-shrink-0 items-center gap-3 border-b px-4 pb-3 pt-4">
            <SearchIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Search threads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="flex-1 border-0 px-0 shadow-none focus-visible:ring-0"
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
            ref={searchScrollContainerRef}
            className="flex-1 overflow-y-auto"
            onMouseLeave={() => setSelectedIndex(-1)}
          >
            {isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton
                    key={`search-skeleton-${index}`}
                    className="h-14 w-full"
                  />
                ))}
              </div>
            ) : sortedThreads.length === 0 ? (
              <EmptyState
                icon={MessageSquareIcon}
                title={searchQuery ? "No threads found" : "No threads yet"}
                description={
                  searchQuery
                    ? "Try adjusting your search terms or filters"
                    : "Create your first thread to start a conversation"
                }
                action={
                  searchQuery
                    ? undefined
                    : {
                        label: "New Thread",
                        onClick: handleCreateNewThread,
                        variant: "default",
                      }
                }
                className="py-16"
              />
            ) : (
              <div className="p-3">
                {/* New Thread Button */}
                <button
                  onClick={handleCreateNewThread}
                  className="hover:bg-accent/50 mb-4 w-full px-3 py-2.5 text-left transition-colors"
                  data-radius="radius1"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <PlusIcon size="sm" />
                      New Thread
                    </div>
                  </div>
                </button>

                {/* Today */}
                {groupedThreads.today.length > 0 && (
                  <div className="mb-4">
                    <div className="mb-2 px-3 text-xs font-semibold text-muted-foreground">
                      Today
                    </div>
                    <div className="space-y-1">
                      {groupedThreads.today.map((thread, index) => {
                        const globalIndex = sortedThreads.findIndex(
                          (t) => t.thread_id === thread.thread_id,
                        );
                        return renderThreadItem(thread, globalIndex);
                      })}
                    </div>
                  </div>
                )}

                {/* Yesterday */}
                {groupedThreads.yesterday.length > 0 && (
                  <div className="mb-4">
                    <div className="mb-2 px-3 text-xs font-semibold text-muted-foreground">
                      Yesterday
                    </div>
                    <div className="space-y-1">
                      {groupedThreads.yesterday.map((thread, index) => {
                        const globalIndex = sortedThreads.findIndex(
                          (t) => t.thread_id === thread.thread_id,
                        );
                        return renderThreadItem(thread, globalIndex);
                      })}
                    </div>
                  </div>
                )}

                {/* Previous 7 Days */}
                {groupedThreads.previous7days.length > 0 && (
                  <div className="mb-4">
                    <div className="mb-2 px-3 text-xs font-semibold text-muted-foreground">
                      Previous 7 Days
                    </div>
                    <div className="space-y-1">
                      {groupedThreads.previous7days.map((thread, index) => {
                        const globalIndex = sortedThreads.findIndex(
                          (t) => t.thread_id === thread.thread_id,
                        );
                        return renderThreadItem(thread, globalIndex);
                      })}
                    </div>
                  </div>
                )}

                {/* Older */}
                {groupedThreads.older.length > 0 && (
                  <div>
                    <div className="mb-2 px-3 text-xs font-semibold text-muted-foreground">
                      Older
                    </div>
                    <div className="space-y-1">
                      {groupedThreads.older.map((thread, index) => {
                        const globalIndex = sortedThreads.findIndex(
                          (t) => t.thread_id === thread.thread_id,
                        );
                        return renderThreadItem(thread, globalIndex);
                      })}
                    </div>
                  </div>
                )}

                {/* Infinite scroll trigger */}
                <div
                  ref={searchLoadMoreTriggerRef}
                  className={!hasNextPage ? "hidden" : "h-2"}
                />

                {/* Loading skeletons for search dialog pagination */}
                {isFetchingNextPage && (
                  <div className="space-y-2 px-3 pb-4">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Skeleton
                        key={`search-pagination-skeleton-${index}`}
                        className="h-14 w-full"
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Thread List in Sidebar - Render when sidebar is expanded OR on mobile */}
      {state === "collapsed" && !isMobile ? null : (
        <SidebarGroup>
          <SidebarGroupLabel>Threads</SidebarGroupLabel>
          <SidebarMenu>
            {unifiedLoading && (
              <>
                {Array.from({ length: 5 }).map((_, index) => (
                  <SidebarMenuItem key={`skeleton-${index}`}>
                    <Skeleton className="h-12 w-full" />
                  </SidebarMenuItem>
                ))}
              </>
            )}

            {!unifiedLoading && sortedThreads.length === 0 && (
              <EmptyState
                icon={MessageSquareIcon}
                title="No threads yet"
                description="Create your first thread to start a conversation with the agent"
                className="py-12"
              />
            )}

            {!unifiedLoading &&
              sortedThreads.map((thread) => {
                const title = getThreadTitle(thread);
                const isActive = thread.thread_id === threadId;
                const isEditing = editingThreadId === thread.thread_id;
                const isPinned = thread.metadata?.pinned === true;
                const agentName = getAgentDisplayInfo(thread, agents);

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
                          className="placeholder:text-sidebar-foreground/60 focus-visible:border-primary/30 h-9 border border-border bg-card text-sm text-sidebar-foreground transition-all focus-visible:ring-0 focus-visible:ring-transparent"
                          data-radius="radius2"
                          placeholder="Thread name..."
                        />
                      </div>
                    ) : (
                      <>
                        <SidebarMenuButton
                          onClick={() => handleSelectThread(thread.thread_id)}
                          isActive={isActive}
                          className="!h-auto !py-2 px-3"
                        >
                          <div className="gap-0.3 flex min-w-0 flex-1 flex-col">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="flex-1 truncate text-sm leading-tight">
                                {title}
                              </span>
                              {thread.metadata?.source === "local" && (
                                <Badge
                                  variant="outline"
                                  className="h-4 shrink-0 px-1.5 py-0 text-[10px]"
                                >
                                  Local
                                </Badge>
                              )}
                            </div>
                            {agentName && (
                              <span className="truncate text-xs leading-tight text-muted-foreground">
                                {agentName}
                              </span>
                            )}
                          </div>
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
                                "!right-3 !top-1/2 !h-8 !w-8 !-translate-y-1/2 data-[state=open]:opacity-100",
                                isPinned && "md:opacity-100",
                              )}
                            >
                              <span className="group-hover/menu-item:hidden">
                                {isPinned ? (
                                  <PinIcon
                                    className="text-muted-foreground"
                                    size="xs"
                                  />
                                ) : (
                                  <MoreVerticalMenuIcon size={5} />
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
                              <span>
                                {isPinned ? "Unpin thread" : "Pin thread"}
                              </span>
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
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <DropdownMenuItem
                                  onSelect={(e) => e.preventDefault()}
                                >
                                  <DownloadIcon size="sm" />
                                  <span>Export thread</span>
                                </DropdownMenuItem>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                side="right"
                                align="start"
                              >
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExportMarkdown(thread);
                                  }}
                                >
                                  <FileTextIcon className="h-4 w-4" />
                                  <span>Markdown</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExportJSON(thread);
                                  }}
                                >
                                  <FileJsonIcon className="h-4 w-4" />
                                  <span>JSON</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExportPDF(thread);
                                  }}
                                >
                                  <PdfIcon size="sm" />
                                  <span>PDF</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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

            {/* Infinite scroll trigger */}
            <SidebarMenuItem className={!hasNextPage ? "hidden" : ""}>
              <div
                ref={loadMoreTriggerRef}
                className="h-2"
              />
            </SidebarMenuItem>

            {/* Loading skeletons for pagination */}
            {isFetchingNextPage && (
              <>
                {Array.from({ length: 3 }).map((_, index) => (
                  <SidebarMenuItem key={`pagination-skeleton-${index}`}>
                    <Skeleton className="h-12 w-full" />
                  </SidebarMenuItem>
                ))}
              </>
            )}
          </SidebarMenu>
        </SidebarGroup>
      )}
    </>
  );
}
