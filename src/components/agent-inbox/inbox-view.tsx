import { useThreadsContext } from "@/components/agent-inbox/contexts/ThreadContext";
import { InboxItem } from "./components/inbox-item";
import React from "react";
import { Pagination } from "./components/pagination";
import {
  InboxIcon,
  LoaderIcon as LoaderCircle,
} from "@/components/icons";
import { InboxButtons } from "./components/inbox-buttons";
import { useQueryState, parseAsString } from "nuqs";

interface AgentInboxViewProps<
  _ThreadValues extends Record<string, any> = Record<string, any>,
> {
  saveScrollPosition: (element?: HTMLElement | null) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

export function AgentInboxView<
  ThreadValues extends Record<string, any> = Record<string, any>,
>({ saveScrollPosition, containerRef }: AgentInboxViewProps<ThreadValues>) {
  const [selectedInbox] = useQueryState(
    "inbox",
    parseAsString.withDefault("interrupted"),
  );

  const { loading, threadData, isChangingThreads } =
    useThreadsContext<ThreadValues>();

  const scrollableContentRef = React.useRef<HTMLDivElement>(null);

  // Effective loading state
  const isLoading = loading || isChangingThreads;

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const handleScroll = () => {
      if (
        scrollableContentRef.current &&
        scrollableContentRef.current.scrollTop > 0
      ) {
        saveScrollPosition(scrollableContentRef.current);
      } else if (containerRef.current && containerRef.current.scrollTop > 0) {
        saveScrollPosition(containerRef.current);
      } else if (window.scrollY > 0) {
        saveScrollPosition();
      }
    };

    let timeout: NodeJS.Timeout | null = null;
    const throttledScrollHandler = () => {
      if (!timeout) {
        timeout = setTimeout(() => {
          handleScroll();
          timeout = null;
        }, 300);
      }
    };

    window.addEventListener("scroll", throttledScrollHandler, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", throttledScrollHandler);
      if (timeout) clearTimeout(timeout);
    };
  }, [containerRef, saveScrollPosition]);

  const threadDataToRender = React.useMemo(
    () =>
      threadData.filter((t) => {
        if (selectedInbox === "all") return true;
        return t.status === selectedInbox;
      }),
    [selectedInbox, threadData],
  );

  // Only show no threads when we're not loading
  const noThreadsFound = !threadDataToRender.length && !isLoading;

  const handleThreadClick = () => {
    if (
      scrollableContentRef.current &&
      scrollableContentRef.current.scrollTop > 0
    ) {
      saveScrollPosition(scrollableContentRef.current);
    } else if (containerRef.current && containerRef.current.scrollTop > 0) {
      saveScrollPosition(containerRef.current);
    } else if (window.scrollY > 0) {
      saveScrollPosition();
    } else {
      const scrollableElements = document.querySelectorAll(
        '[class*="overflow"]',
      );
      scrollableElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.scrollTop > 0) {
          saveScrollPosition(htmlEl);
          return;
        }
      });
    }
  };

  return (
    <div
      ref={containerRef}
      className="h-full min-w-0 overflow-y-auto"
    >
      <div className="px-4 pt-4 sm:px-5">
        <InboxButtons />
      </div>
      <div
        ref={scrollableContentRef}
        className="mt-3 flex h-full max-h-fit w-full flex-col items-start overflow-y-auto border-y border-border"
      >
        {threadDataToRender.map((threadData, idx) => {
          return (
            <InboxItem<ThreadValues>
              key={`inbox-item-${threadData.thread.thread_id}`}
              threadData={threadData}
              isLast={idx === threadDataToRender.length - 1}
              onThreadClick={handleThreadClick}
            />
          );
        })}
        {noThreadsFound && (
          <div className="flex w-full flex-col items-center justify-center py-16">
            <div className="mb-4 flex items-center justify-center gap-2 text-muted-foreground">
              <InboxIcon className="h-6 w-6" />
              <p className="font-medium">No threads found in this inbox</p>
            </div>
          </div>
        )}
        {isLoading && threadData.length === 0 && (
          <div className="flex w-full items-center justify-center py-16">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <LoaderCircle className="h-6 w-6 animate-spin" />
              <p className="font-medium">Loading threads...</p>
            </div>
          </div>
        )}
      </div>
      <div className="flex w-full justify-start p-4 sm:p-5">
        <Pagination />
      </div>
    </div>
  );
}
