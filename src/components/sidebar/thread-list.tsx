"use client";

import { useThreads } from "@/hooks/use-threads";
import { FileClock, Search } from "lucide-react";
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
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SearchIcon } from "@/components/icons";
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>
          Threads
          <SidebarGroupAction
            onClick={() => setSearchOpen(true)}
            title="Search chats"
          >
            <Search className="h-4 w-4" />
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
              <FileClock className="h-8 w-8" />
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

              return (
                <SidebarMenuItem key={thread.thread_id}>
                  <SidebarMenuButton
                    onClick={() => handleSelectThread(thread.thread_id)}
                    isActive={isActive}
                  >
                    <span className="truncate text-sm">{title}</span>
                  </SidebarMenuButton>
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
