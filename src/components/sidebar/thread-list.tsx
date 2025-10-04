"use client";

import { useThreads } from "@/hooks/use-threads";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { FileClock, MessageCircle, Plus, Search } from "lucide-react";
import { useState } from "react";
import { useQueryState } from "nuqs";
import { MessageContent } from "@langchain/core/messages";
import type { Message, Thread } from "@langchain/langgraph-sdk";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

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

// Utility: Format date string
const formatDate = (date: string) => {
  try {
    return format(new Date(date), "MM/dd/yyyy - h:mm a");
  } catch (e) {
    console.error("Failed to format date", { date, error: e });
    return "";
  }
};

export function ThreadList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [threadId, setThreadId] = useQueryState("threadId");
  const { data: threads = [], isLoading } = useThreads(); // Fetch ALL threads (global)

  // Filter threads by search query
  const filteredThreads = threads.filter((thread) => {
    if (!searchQuery.trim()) return true;
    const title = getFirstHumanMessageContent(thread) || thread.thread_id;
    return title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleCreateNewThread = () => {
    setThreadId(null); // Setting to null creates new thread
  };

  const handleSelectThread = (id: string) => {
    setThreadId(id);
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Threads</SidebarGroupLabel>

      {/* Search Input */}
      <div className="px-2 pb-2">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
          <Input
            placeholder="Search threads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8"
          />
        </div>
      </div>

      {/* New Thread Button */}
      <div className="px-2 pb-2">
        <Button
          onClick={handleCreateNewThread}
          className="w-full"
          variant="outline"
          size="sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Thread
        </Button>
      </div>

      {/* Thread List */}
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
              getFirstHumanMessageContent(thread) || thread.thread_id;
            const isActive = thread.thread_id === threadId;

            return (
              <SidebarMenuItem key={thread.thread_id}>
                <SidebarMenuButton
                  onClick={() => handleSelectThread(thread.thread_id)}
                  isActive={isActive}
                  className="h-auto flex-col items-start gap-0.5 py-2"
                >
                  <div className="flex w-full items-center gap-2 overflow-hidden">
                    <MessageCircle className="h-4 w-4 shrink-0" />
                    <span className="truncate text-sm font-medium">
                      {title}
                    </span>
                  </div>
                  <span className="text-muted-foreground ml-6 truncate text-xs">
                    {formatDate(thread.created_at)}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
