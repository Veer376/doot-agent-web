"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Thread } from "@langchain/langgraph-sdk";

import { useAuthSession } from "@/providers/Auth";
import { createClient } from "@/lib/client";
import { findActiveRun } from "@/hooks/use-thread-runtime";

export type ThreadRuntimeStatus = "busy" | "interrupted" | "error";

export interface ThreadRuntimeActivity {
  threadId: string;
  status: ThreadRuntimeStatus;
  updatedAt?: string;
  runId?: string;
}

type ActivityMap = Record<string, ThreadRuntimeActivity>;

interface ActiveRunsContextValue {
  activities: ActivityMap;
  hasBusyThreads: boolean;
  getActivity: (threadId: string) => ThreadRuntimeActivity | undefined;
  refresh: () => Promise<void>;
  markBusy: (threadId: string, runId?: string) => void;
  refreshSoon: () => void;
}

const ActiveRunsContext = createContext<ActiveRunsContextValue | undefined>(
  undefined,
);

const ACTIVE_POLL_MS = 2_500;
const IDLE_POLL_MS = 12_000;

function activityFromThread(
  thread: Thread,
  status: ThreadRuntimeStatus,
): ThreadRuntimeActivity {
  return {
    threadId: thread.thread_id,
    status,
    updatedAt: thread.updated_at,
  };
}

export function ActiveRunsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuthSession();
  const accessToken = session?.accessToken;
  const [activities, setActivities] = useState<ActivityMap>({});
  const refreshGeneration = useRef(0);
  const refreshSoonTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    if (!accessToken) {
      setActivities({});
      return;
    }

    const generation = ++refreshGeneration.current;
    const client = createClient(accessToken);

    try {
      const [busyThreads, interruptedThreads, errorThreads] = await Promise.all([
        client.threads.search({
          status: "busy",
          limit: 100,
          select: ["thread_id", "status", "updated_at"],
        }),
        client.threads.search({
          status: "interrupted",
          limit: 100,
          select: ["thread_id", "status", "updated_at"],
        }),
        client.threads.search({
          status: "error",
          limit: 100,
          select: ["thread_id", "status", "updated_at"],
        }),
      ]);

      // Thread.status is useful for discovery but can briefly lag behind the
      // run table after completion. Verify busy threads against active runs so
      // the sidebar never claims "Working" solely from a stale thread status.
      const verifiedBusyThreads = await Promise.all(
        busyThreads.map(async (thread) => ({
          thread,
          run: await findActiveRun(client, thread.thread_id),
        })),
      );

      if (generation !== refreshGeneration.current) return;

      setActivities((previous) => {
        const next: ActivityMap = {};

        for (const { thread, run } of verifiedBusyThreads) {
          if (!run) continue;
          next[thread.thread_id] = {
            ...activityFromThread(thread, "busy"),
            runId: run.run_id,
          };
        }
        for (const thread of interruptedThreads) {
          next[thread.thread_id] = activityFromThread(thread, "interrupted");
        }
        for (const thread of errorThreads) {
          next[thread.thread_id] = activityFromThread(thread, "error");
        }

        return next;
      });
    } catch (error) {
      // Status discovery is best-effort UI state. The selected thread stream
      // still performs its own authoritative run discovery/reconnection.
      console.warn("Failed to refresh thread runtime statuses", error);
    }
  }, [accessToken]);

  const markBusy = useCallback((threadId: string, runId?: string) => {
    setActivities((previous) => ({
      ...previous,
      [threadId]: {
        threadId,
        status: "busy",
        runId: runId ?? previous[threadId]?.runId,
        updatedAt: new Date().toISOString(),
      },
    }));
  }, []);

  const refreshSoon = useCallback(() => {
    if (refreshSoonTimer.current) clearTimeout(refreshSoonTimer.current);
    refreshSoonTimer.current = setTimeout(() => {
      refreshSoonTimer.current = null;
      void refresh();
    }, 250);
  }, [refresh]);

  const hasBusyThreads = useMemo(
    () => Object.values(activities).some((entry) => entry.status === "busy"),
    [activities],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!accessToken) return;
    const interval = window.setInterval(
      () => void refresh(),
      hasBusyThreads ? ACTIVE_POLL_MS : IDLE_POLL_MS,
    );
    return () => window.clearInterval(interval);
  }, [accessToken, hasBusyThreads, refresh]);

  useEffect(() => {
    if (!accessToken) return;

    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const refreshOnFocus = () => void refresh();
    const refreshOnOnline = () => void refresh();

    window.addEventListener("focus", refreshOnFocus);
    window.addEventListener("online", refreshOnOnline);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      window.removeEventListener("focus", refreshOnFocus);
      window.removeEventListener("online", refreshOnOnline);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [accessToken, refresh]);

  useEffect(
    () => () => {
      if (refreshSoonTimer.current) clearTimeout(refreshSoonTimer.current);
    },
    [],
  );

  const value = useMemo<ActiveRunsContextValue>(
    () => ({
      activities,
      hasBusyThreads,
      getActivity: (threadId) => activities[threadId],
      refresh,
      markBusy,
      refreshSoon,
    }),
    [activities, hasBusyThreads, markBusy, refresh, refreshSoon],
  );

  return (
    <ActiveRunsContext.Provider value={value}>
      {children}
    </ActiveRunsContext.Provider>
  );
}

export function useActiveRuns() {
  const context = useContext(ActiveRunsContext);
  if (!context) {
    throw new Error("useActiveRuns must be used within ActiveRunsProvider");
  }
  return context;
}
