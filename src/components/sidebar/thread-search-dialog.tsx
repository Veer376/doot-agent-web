"use client";

import type { Message, Thread } from "@langchain/langgraph-sdk";
import type { MessageContent } from "@langchain/core/messages";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { useFetchThreadsInfinite } from "@/hooks/use-threads";
import { useFetchAgents } from "@/hooks/use-agents";
import type { Agent } from "@/types/agent";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  MessageSquareIcon,
  PinIcon,
  SearchIcon,
  XIcon,
} from "@/components/icons";

interface ThreadSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getMessageStringContent(content: MessageContent | undefined): string {
  if (!content) return "";
  if (typeof content === "string") return content;

  return content
    .filter((item): item is { type: "text"; text: string } => item.type === "text")
    .map((item) => item.text)
    .join(" ");
}

function getThreadTitle(thread: Thread): string {
  const customName = thread.metadata?.name as string | undefined;
  if (customName) return customName;

  try {
    if (
      thread.values &&
      !Array.isArray(thread.values) &&
      "messages" in thread.values &&
      Array.isArray(thread.values.messages)
    ) {
      const firstHumanMessage = (thread.values.messages as Message[]).find(
        (message) => message.type === "human",
      );
      const content = getMessageStringContent(firstHumanMessage?.content);
      if (content) return content;
    }
  } catch {
    // Fall through to the stable thread-id fallback.
  }

  return `New thread ${thread.thread_id.slice(0, 5)}`;
}

function getAgentDisplayInfo(thread: Thread, agents: Agent[]): string | null {
  const mode = thread.metadata?.mode as string | undefined;
  const assistantId = thread.metadata?.assistant_id as string | undefined;
  if (mode !== "agent" || !assistantId) return null;

  return (
    agents.find((agent) => agent.assistant_id === assistantId)?.name ??
    assistantId
  );
}

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

function groupThreadsByDate(threads: Thread[]) {
  const groups = {
    today: [] as Thread[],
    yesterday: [] as Thread[],
    previous7days: [] as Thread[],
    older: [] as Thread[],
  };

  threads.forEach((thread) => {
    const dateString =
      (thread as Thread & { created_at?: string; updated_at?: string }).created_at ??
      (thread as Thread & { created_at?: string; updated_at?: string }).updated_at;

    if (!dateString) {
      groups.older.push(thread);
      return;
    }

    groups[getDateCategory(new Date(dateString))].push(thread);
  });

  return groups;
}

export function ThreadSearchDialog({
  open,
  onOpenChange,
}: ThreadSearchDialogProps) {
  const [threadId] = useQueryState("threadId");
  const router = useRouter();
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useFetchThreadsInfinite(undefined, 20);
  const { data: agents = [] } = useFetchAgents();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);
  const searchLoadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const searchScrollContainerRef = useRef<HTMLDivElement>(null);

  const allLoadedThreads = useMemo(() => data?.pages.flat() ?? [], [data]);

  const sortedThreads = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filteredThreads = query
      ? allLoadedThreads.filter((thread) =>
          getThreadTitle(thread).toLowerCase().includes(query),
        )
      : allLoadedThreads;

    return [...filteredThreads].sort((a, b) => {
      const aPinned = a.metadata?.pinned === true;
      const bPinned = b.metadata?.pinned === true;
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    });
  }, [allLoadedThreads, searchQuery]);

  const groupedThreads = useMemo(
    () => groupThreadsByDate(sortedThreads),
    [sortedThreads],
  );

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSelectedIndex(-1);
      return;
    }

    const frame = requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchQuery]);

  useEffect(() => {
    selectedItemRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [selectedIndex]);

  useEffect(() => {
    if (
      !open ||
      !hasNextPage ||
      !searchLoadMoreTriggerRef.current ||
      !searchScrollContainerRef.current
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !isFetchingNextPage) {
          void fetchNextPage();
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
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, open]);

  const selectThread = (id: string) => {
    onOpenChange(false);
    router.push(`/?threadId=${id}`);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onOpenChange(false);
      return;
    }

    if (sortedThreads.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((previous) =>
        previous < sortedThreads.length - 1 ? previous + 1 : previous,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((previous) => (previous > -1 ? previous - 1 : previous));
      return;
    }

    if (event.key === "Enter" && selectedIndex >= 0) {
      event.preventDefault();
      const selectedThread = sortedThreads[selectedIndex];
      if (selectedThread) selectThread(selectedThread.thread_id);
    }
  };

  const groups = [
    ["today", "Today"],
    ["yesterday", "Yesterday"],
    ["previous7days", "Previous 7 days"],
    ["older", "Older"],
  ] as const;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="doot-search-dialog flex flex-col gap-0 p-0 [&>button]:hidden">
        <DialogTitle className="sr-only">Search Threads</DialogTitle>
        <DialogDescription className="sr-only">
          Browse and search all your conversation threads
        </DialogDescription>

        <div className="flex flex-shrink-0 items-center gap-3 border-b px-4 pt-4 pb-3">
          <SearchIcon className="text-muted-foreground h-4 w-4 flex-shrink-0" />
          <Input
            ref={searchInputRef}
            placeholder="Search threads..."
            aria-label="Search threads"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="flex-1 border-0 px-0 shadow-none focus-visible:ring-0"
          />
          <DialogClose asChild>
            <button
              type="button"
              aria-label="Close search"
              className="ring-offset-background focus:ring-ring flex-shrink-0 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:pointer-events-none"
            >
              <XIcon size="xs" />
            </button>
          </DialogClose>
        </div>

        <div
          ref={searchScrollContainerRef}
          className="flex-1 overflow-y-auto"
          onMouseLeave={() => setSelectedIndex(-1)}
        >
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton
                  key={index}
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
                      onClick: () => {
                        onOpenChange(false);
                        router.push("/");
                      },
                      variant: "default",
                    }
              }
              className="py-16"
            />
          ) : (
            <div className="space-y-4 p-3">
              {groups.map(([key, label]) => {
                const threads = groupedThreads[key];
                if (threads.length === 0) return null;

                return (
                  <div key={key}>
                    <div className="text-muted-foreground mb-2 px-3 text-xs font-semibold">
                      {label}
                    </div>
                    <div className="space-y-1">
                      {threads.map((thread) => {
                        const index = sortedThreads.findIndex(
                          (candidate) =>
                            candidate.thread_id === thread.thread_id,
                        );
                        const isSelected = index === selectedIndex;
                        const isCurrent = thread.thread_id === threadId;
                        const isPinned = thread.metadata?.pinned === true;
                        const agentName = getAgentDisplayInfo(thread, agents);

                        return (
                          <button
                            key={thread.thread_id}
                            ref={isSelected ? selectedItemRef : null}
                            type="button"
                            onClick={() => selectThread(thread.thread_id)}
                            onMouseEnter={() => setSelectedIndex(index)}
                            className={cn(
                              "w-full px-3 py-3 text-left transition-colors",
                              isSelected
                                ? "bg-accent"
                                : "hover:bg-accent",
                            )}
                            data-radius="control"
                          >
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-2 truncate text-sm font-medium">
                                {getThreadTitle(thread)}
                                {isPinned && (
                                  <PinIcon
                                    className="text-muted-foreground flex-shrink-0"
                                    size="xs"
                                  />
                                )}
                                {isCurrent && (
                                  <span className="bg-primary/10 text-primary flex-shrink-0 rounded-full px-2 py-0.5 text-xs">
                                    Current
                                  </span>
                                )}
                              </div>
                              {agentName && (
                                <div className="text-muted-foreground truncate text-xs">
                                  {agentName}
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <div
                ref={searchLoadMoreTriggerRef}
                className={hasNextPage ? "h-2" : "hidden"}
              />

              {isFetchingNextPage && (
                <div className="space-y-2 px-3 pb-4">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton
                      key={index}
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
  );
}
