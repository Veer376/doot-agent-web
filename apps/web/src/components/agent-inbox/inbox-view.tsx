import { useThreadsContext } from "@/components/agent-inbox/contexts/ThreadContext";
import { InboxItem } from "./components/inbox-item";
import React from "react";
import { ThreadStatusWithAll } from "./types";
import { Pagination } from "./components/pagination";
import { Inbox as InboxIcon, LoaderCircle } from "lucide-react";
import { InboxButtons } from "./components/inbox-buttons";
import { BackfillBanner } from "./components/backfill-banner";
import { forceInboxBackfill } from "./utils/backfill";
import { logger } from "./utils/logger";
import { ThreadLoadingIndicator } from "./components/ThreadLoadingIndicator";
import { useInboxQueryState } from "./hooks/useInboxQueryState";

interface AgentInboxViewProps<
  _ThreadValues extends Record<string, any> = Record<string, any>,
> {
  saveScrollPosition: (element?: HTMLElement | null) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

export function AgentInboxView<
  ThreadValues extends Record<string, any> = Record<string, any>,
>({ saveScrollPosition, containerRef }: AgentInboxViewProps<ThreadValues>) {
  const [inboxState, updateInboxState] = useInboxQueryState();
  const selectedInbox = inboxState.status;

  const { loading, threadData, agentInboxes, clearThreadData } =
    useThreadsContext<ThreadValues>();
  const scrollableContentRef = React.useRef<HTMLDivElement>(null);
  const [hasAttemptedRefresh, setHasAttemptedRefresh] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const sessionId = new Date().toDateString();
      const hasRefreshed = localStorage.getItem(`inbox-refreshed-${sessionId}`);
      setHasAttemptedRefresh(hasRefreshed === "true");
    }
  }, []);

  React.useEffect(() => {
    const autoRefreshInboxes = async () => {
      if (typeof window === "undefined") return;

      const sessionId = new Date().toDateString();
      const hasRefreshed = localStorage.getItem(`inbox-refreshed-${sessionId}`);

      if (hasRefreshed === "true") return;

      if (
        !loading &&
        !hasAttemptedRefresh &&
        threadData.length === 0 &&
        agentInboxes.length > 0
      ) {
        localStorage.setItem(`inbox-refreshed-${sessionId}`, "true");
        setHasAttemptedRefresh(true);

        logger.log("Automatically refreshing inbox IDs...");
        try {
          await forceInboxBackfill();

          // Set a flag to prevent multiple page reloads
          const reloadKey = "inbox-page-reloaded";
          if (localStorage.getItem(reloadKey) !== "true") {
            localStorage.setItem(reloadKey, "true");

            // Delay reload to avoid race conditions
            setTimeout(() => {
              window.location.reload();
            }, 500);
          }
        } catch (error) {
          logger.error("Error during auto-refresh:", error);
        }
      }
    };

    autoRefreshInboxes();
  }, [loading, threadData, agentInboxes, hasAttemptedRefresh]);

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

  const changeInbox = async (inbox: ThreadStatusWithAll) => {
    // Clear data before changing to prevent flashing old data
    clearThreadData();

    updateInboxState({
      status: inbox,
      offset: 0,
      limit: 10,
    });
  };

  const threadDataToRender = React.useMemo(
    () =>
      threadData.filter((t) => {
        if (selectedInbox === "all") return true;
        return t.status === selectedInbox;
      }),
    [selectedInbox, threadData],
  );
  const noThreadsFound = !threadDataToRender.length;

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
      className="h-full min-w-[1000px] overflow-y-auto"
    >
      <div className="pt-4 pl-5">
        <BackfillBanner />
        <InboxButtons changeInbox={changeInbox} />
      </div>
      <ThreadLoadingIndicator />
      <div
        ref={scrollableContentRef}
        className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 mt-3 flex h-full max-h-fit w-full flex-col items-start overflow-y-auto border-y-[1px] border-gray-50"
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
        {noThreadsFound && !loading && (
          <div className="flex w-full flex-col items-center justify-center py-16">
            <div className="mb-4 flex items-center justify-center gap-2 text-gray-700">
              <InboxIcon className="h-6 w-6" />
              <p className="font-medium">No threads found in this inbox</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 text-blue-600 hover:underline focus:outline-none"
            >
              Click to refresh
            </button>
          </div>
        )}
        {loading && (
          <div className="flex w-full items-center justify-center py-16">
            <div className="flex items-center justify-center gap-2 text-gray-700">
              <LoaderCircle className="h-6 w-6 animate-spin" />
              <p className="font-medium">Loading threads...</p>
            </div>
          </div>
        )}
      </div>
      <div className="flex w-full justify-start p-5">
        <Pagination />
      </div>
    </div>
  );
}
