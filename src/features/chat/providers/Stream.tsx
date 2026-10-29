"use client";

import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useStream } from "@langchain/langgraph-sdk/react";
import { type Message, type ThreadStatus } from "@langchain/langgraph-sdk";
import {
  uiMessageReducer,
  type UIMessage,
  type RemoveUIMessage,
} from "@langchain/langgraph-sdk/react-ui";
import { useQueryState } from "nuqs";
import { toast } from "sonner";
import { useAuthSession } from "@/providers/Auth";
import { useAgentContext } from "@/providers/Agent";
import { useHasApiKeys } from "@/hooks/use-api-keys";
import { checkApiKeysWarning } from "@/lib/agent-utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { config } from "@/config";
import {
  threadKeys,
  useUpdateThread,
  useFetchThreadState,
} from "@/hooks/use-threads";

import {
  approvalInterrupts,
  type PermissionMode,
  type PermissionSettings,
} from "@/features/chat/utils/permissions";
import {
  recordDiagnosticEvent,
  serializeStreamError,
} from "@/features/chat/utils/stream-diagnostics";
import {
  findActiveRun,
  waitForNoActiveRuns,
} from "@/hooks/use-thread-runtime";
import { useActiveRuns } from "@/providers/ActiveRuns";

export type StateType = { messages: Message[]; ui?: UIMessage[] };

const useTypedStream = useStream<
  StateType,
  {
    UpdateType: {
      messages?: Message[] | Message | string;
      ui?: (UIMessage | RemoveUIMessage)[] | UIMessage | RemoveUIMessage;
    };
    CustomEventType: UIMessage | RemoveUIMessage;
  }
>;

type StreamContextType = ReturnType<typeof useTypedStream> & {
  workspace: string | null;
  workspaceReady: boolean;
  permissionMode: PermissionMode;
  permissionReady: boolean;
  isStopping: boolean;
  runtimeStatus?: ThreadStatus;
  connectionStatus: "connected" | "reconnecting" | "disconnected";
  selectPermissionMode: (mode: PermissionMode) => Promise<void>;
  selectWorkspace: (path: string | null) => Promise<void>;
};
const StreamContext = createContext<StreamContextType | undefined>(undefined);

const StreamSession = ({
  children,
  agentId,
  mode,
  accessToken,
  threadId: currentThreadId,
}: {
  children: ReactNode;
  agentId: string;
  mode: "agent" | "chat";
  accessToken: string;
  threadId: string | null;
}) => {
  const [threadId, setThreadId] = useQueryState("threadId");
  const queryClient = useQueryClient();
  const { mutate: updateThread } = useUpdateThread();
  const [isStopping, setIsStopping] = useState(false);
  const [isRejoining, setIsRejoining] = useState(false);
  const [userStopRequested, setUserStopRequested] = useState(false);
  const userStopRequestedRef = useRef(false);
  const streamLoadingRef = useRef(false);
  const lastRejoinRunRef = useRef<string | null>(null);
  const initialDiscoveryThreadRef = useRef<string | null>(null);
  const joinStreamRef = useRef<ReturnType<typeof useTypedStream>["joinStream"]>(
    null as unknown as ReturnType<typeof useTypedStream>["joinStream"],
  );
  const sdkStopRef = useRef<ReturnType<typeof useTypedStream>["stop"]>(
    null as unknown as ReturnType<typeof useTypedStream>["stop"],
  );
  const { getActivity, markBusy, refresh, refreshSoon } = useActiveRuns();
  const runtimeActivity = currentThreadId
    ? getActivity(currentThreadId)
    : undefined;
  const runtimeStatus = runtimeActivity?.status;
  const [permissionOverride, setPermissionOverride] = useState<{
    threadId: string | null;
    mode: PermissionMode;
  } | null>(null);
  const policy = useQuery({
    queryKey: ["permission-settings"],
    enabled: config.features.localAgentEnabled,
    queryFn: async (): Promise<PermissionSettings> => {
      const response = await fetch(`${config.apiUrl}/permissions`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error("Could not load permission settings");
      return response.json();
    },
  });
  const [workspaceOverride, setWorkspaceOverride] = useState<{
    threadId: string | null;
    path: string | null;
  } | null>(null);
  useEffect(() => {
    if (currentThreadId) return;
    try {
      setWorkspaceOverride({
        threadId: null,
        path: localStorage.getItem("doot:new-chat-workspace"),
      });
    } catch {
      // Storage can be unavailable in private browser sessions.
    }
  }, [currentThreadId]);
  const { data: threadInfo, isSuccess: workspaceLoaded } = useQuery({
    queryKey: ["thread-workspace", currentThreadId],
    enabled: Boolean(currentThreadId),
    queryFn: async () => {
      const response = await fetch(
        `${config.apiUrl}/threads/${currentThreadId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "x-supabase-access-token": accessToken,
          },
        },
      );
      if (!response.ok) throw new Error("Could not load thread workspace");
      return response.json() as Promise<{
        metadata?: {
          workspace?: string | null;
          permission_mode?: PermissionMode;
        };
      }>;
    },
  });
  const hasWorkspaceOverride = workspaceOverride?.threadId === currentThreadId;
  const workspace = hasWorkspaceOverride
    ? workspaceOverride!.path
    : (threadInfo?.metadata?.workspace ?? null);
  const workspaceReady =
    !currentThreadId || hasWorkspaceOverride || workspaceLoaded;

  const permissionMode =
    permissionOverride?.threadId === currentThreadId
      ? permissionOverride.mode
      : (threadInfo?.metadata?.permission_mode ??
        policy.data?.default_mode ??
        "ask");
  const permissionReady =
    !config.features.localAgentEnabled ||
    (policy.isSuccess && (!currentThreadId || workspaceLoaded));

  // Fetch cached thread state for instant display with initialValues
  // This shows cached data immediately while SDK loads fresh data in background
  // Result: sub-100ms perceived load time for previously visited threads
  const { data: cachedThreadState } = useFetchThreadState(threadId);

  // Use a stable assistantId for the stream connection
  // The actual agent/mode will be determined by the submit config, not the stream connection
  // This prevents stream reconnections when user changes agent/mode in UI
  const effectiveAgentId = config.features.localAgentEnabled
    ? agentId
    : mode === "chat"
      ? "chat_agent"
      : agentId;

  const streamValue = useTypedStream({
    apiUrl: config.apiUrl,
    assistantId: effectiveAgentId,
    threadId: threadId ?? null,
    reconnectOnMount: true,
    fetchStateHistory: { limit: 500 },
    initialValues: (cachedThreadState?.values as StateType) || null, // Show cached data instantly
    onCustomEvent: (event, options) => {
      options.mutate((prev) => {
        const ui = uiMessageReducer(prev.ui ?? [], event);
        return { ...prev, ui };
      });
    },
    onCreated: (run) => {
      // A newly-created run starts a fresh lifecycle. Any cancellation/error
      // suppression belongs only to the run the user explicitly stopped.
      userStopRequestedRef.current = false;
      setUserStopRequested(false);
      markBusy(run.thread_id, run.run_id);
      void recordDiagnosticEvent({
        apiUrl: config.apiUrl,
        kind: "stream.created",
        threadId: run.thread_id,
        runId: run.run_id,
        component: "stream",
      });
    },
    onFinish: (_state, run) => {
      refreshSoon();
      void recordDiagnosticEvent({
        apiUrl: config.apiUrl,
        kind: "stream.completed",
        threadId: run?.thread_id ?? threadId,
        runId: run?.run_id,
        component: "stream",
      });
    },
    onError: (error, run) => {
      refreshSoon();
      if (userStopRequestedRef.current) {
        // User-initiated cancellation commonly closes the SSE with a
        // CancelledError/UserInterrupt. That is an expected terminal path, not
        // a transport failure, so keep it out of error diagnostics/UI.
        void recordDiagnosticEvent({
          apiUrl: config.apiUrl,
          kind: "stream.cancelled_by_user",
          severity: "info",
          threadId: run?.thread_id ?? threadId,
          runId: run?.run_id,
          component: "stream",
          message: serializeStreamError(error),
        });
        return;
      }
      void recordDiagnosticEvent({
        apiUrl: config.apiUrl,
        kind: "stream.transport_error",
        severity: "error",
        threadId: run?.thread_id ?? threadId,
        runId: run?.run_id,
        component: "stream",
        message: serializeStreamError(error),
      });
    },
    onThreadId: (id) => {
      setWorkspaceOverride({ threadId: id, path: workspace });
      setPermissionOverride({ threadId: id, mode: permissionMode });
      setThreadId(id);

      // For new threads (when threadId was null before), save agent/mode metadata
      if (!threadId) {
        updateThread({
          threadId: id,
          metadata: {
            assistant_id: agentId,
            mode: mode,
            workspace,
            permission_mode: permissionMode,
          },
        });
      }

      // Invalidate thread list cache to show new thread immediately
      queryClient.invalidateQueries({ queryKey: threadKeys.lists() });
      refreshSoon();
    },
    defaultHeaders: {
      Authorization: `Bearer ${accessToken}`,
      "x-supabase-access-token": accessToken,
    },
  });

  joinStreamRef.current = streamValue.joinStream;
  sdkStopRef.current = streamValue.stop;

  useEffect(() => {
    userStopRequestedRef.current = false;
    setUserStopRequested(false);
  }, [currentThreadId]);

  useEffect(() => {
    streamLoadingRef.current = streamValue.isLoading;
    if (streamValue.isLoading) setIsRejoining(false);
  }, [streamValue.isLoading]);

  /**
   * The backend owns run lifecycle; browser storage is only a fast reconnect
   * hint. On first selection/reload we always ask the backend for an active run.
   * If another tab/device starts work later, the ActiveRuns poll flips this
   * thread to `busy` and triggers the same discovery path. The selected thread
   * alone joins its detailed SSE stream; background threads remain status-only.
   */
  useEffect(() => {
    if (!currentThreadId || isStopping || streamValue.isLoading) return;

    const isInitialDiscovery =
      initialDiscoveryThreadRef.current !== currentThreadId;
    if (!isInitialDiscovery && runtimeStatus !== "busy") return;
    initialDiscoveryThreadRef.current = currentThreadId;

    let disposed = false;
    const timer = window.setTimeout(
      () => {
        void (async () => {
          if (disposed || streamLoadingRef.current) return;

          let cachedRunId: string | null = null;
          try {
            cachedRunId = sessionStorage.getItem(
              `lg:stream:${currentThreadId}`,
            );
          } catch {
            // Storage is an optimization only; backend discovery still works.
          }
          cachedRunId ??= runtimeActivity?.runId ?? null;

          try {
            const activeRun = await findActiveRun(
              streamValue.client,
              currentThreadId,
              cachedRunId,
            );
            if (disposed || streamLoadingRef.current) return;

            if (!activeRun) {
              if (runtimeStatus === "busy") refreshSoon();
              return;
            }

            if (lastRejoinRunRef.current === activeRun.run_id) return;
            lastRejoinRunRef.current = activeRun.run_id;
            setIsRejoining(true);
            markBusy(currentThreadId, activeRun.run_id);
            try {
              sessionStorage.setItem(
                `lg:stream:${currentThreadId}`,
                activeRun.run_id,
              );
            } catch {
              // Rejoin does not depend on storage once the run was discovered.
            }

            try {
              await joinStreamRef.current(activeRun.run_id);
            } catch (error) {
              if (!disposed) {
                toast.error("Could not reconnect to the active run", {
                  description: serializeStreamError(error),
                });
              }
            } finally {
              lastRejoinRunRef.current = null;
              if (!disposed) setIsRejoining(false);
              refreshSoon();
            }
          } catch (error) {
            if (!disposed && runtimeStatus === "busy") {
              console.warn("Failed to discover active backend run", error);
              refreshSoon();
            }
          }
        })();
      },
      // Give the SDK's sessionStorage reconnect a brief head start. If that
      // hint is missing/stale, authoritative backend discovery takes over.
      isInitialDiscovery ? 350 : 0,
    );

    return () => {
      disposed = true;
      window.clearTimeout(timer);
    };
  }, [
    currentThreadId,
    isStopping,
    markBusy,
    refreshSoon,
    runtimeActivity?.runId,
    runtimeStatus,
    streamValue.isLoading,
    streamValue.client,
  ]);

  const reliableStop = useCallback(async () => {
    if (isStopping) return;
    if (!currentThreadId) {
      await sdkStopRef.current();
      return;
    }

    userStopRequestedRef.current = true;
    setUserStopRequested(true);
    setIsStopping(true);
    let stopConfirmed = false;
    let stopFailure: unknown = null;

    try {
      // Do not equate closing the browser SSE with stopping the agent. Cancel
      // on the backend first, then verify no pending/running run remains.
      // Cancellation races are normal: a run may become terminal between our
      // discovery request and the cancel request. In that case the cancel HTTP
      // call can fail even though the requested end state was achieved, so the
      // backend's active-run table is the authority rather than the HTTP result.
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const activeRun = await findActiveRun(
          streamValue.client,
          currentThreadId,
        );
        if (!activeRun) break;

        try {
          // We verify terminal state ourselves below, so there is no need to
          // keep the cancel request open waiting for the run to finish.
          await streamValue.client.runs.cancel(
            currentThreadId,
            activeRun.run_id,
            false,
            "interrupt",
          );
        } catch (error) {
          let stillActive = await findActiveRun(
            streamValue.client,
            currentThreadId,
          );
          // The cancel endpoint can lose a race with the worker persisting its
          // terminal state. Give that state a short grace period before
          // deciding cancellation truly failed.
          for (
            let raceAttempt = 0;
            stillActive?.run_id === activeRun.run_id && raceAttempt < 3;
            raceAttempt += 1
          ) {
            await new Promise((resolve) => setTimeout(resolve, 150));
            stillActive = await findActiveRun(
              streamValue.client,
              currentThreadId,
            );
          }
          if (stillActive?.run_id === activeRun.run_id) {
            throw error;
          }
          // The run became terminal while cancellation was in flight. Treat
          // that as successful/idempotent Stop and continue in case another
          // queued run exists.
        }
      }
      await waitForNoActiveRuns(streamValue.client, currentThreadId, 20, 250);
      stopConfirmed = true;
    } catch (error) {
      stopFailure = error;
    }

    try {
      if (stopConfirmed) {
        // Clear the SDK reconnect hint before stopping the local SSE. The SDK's
        // stop hook otherwise attempts another backend cancellation, which is
        // both redundant and prone to the same terminal-state race above.
        try {
          sessionStorage.removeItem(`lg:stream:${currentThreadId}`);
        } catch {
          // Backend verification above is authoritative.
        }

        try {
          await sdkStopRef.current();
        } catch {
          // The backend is already verified terminal. A local stream teardown
          // error must not resurrect the run or surface as a failed Stop.
        }

        // Cache/status refresh is best-effort after terminal state is already
        // verified. It must never leave the composer stuck in Stopping….
        try {
          await queryClient.invalidateQueries({
            queryKey: threadKeys.state(currentThreadId),
          });
          await refresh();
        } catch {
          refreshSoon();
        }
      } else {
        // Stop genuinely failed and the backend still has active work. Restore
        // normal error handling so an unexpected stream failure is visible.
        userStopRequestedRef.current = false;
        setUserStopRequested(false);
        try {
          await refresh();
        } catch {
          refreshSoon();
        }
        toast.error("Could not stop the agent", {
          description: serializeStreamError(stopFailure),
        });
      }
    } finally {
      setIsStopping(false);
    }
  }, [
    currentThreadId,
    isStopping,
    queryClient,
    refresh,
    streamValue.client,
  ]);

  // A terminal backend status is authoritative over a stale local SSE state.
  // This prevents an interrupted/error thread from continuing to render
  // "Working" simply because the browser stream has not finished unwinding.
  const backendIsTerminal =
    runtimeStatus === "interrupted" || runtimeStatus === "error";
  const userStopIsTerminal = userStopRequested && !isStopping;
  const effectiveIsLoading = backendIsTerminal || userStopIsTerminal
    ? false
    : streamValue.isLoading ||
      runtimeStatus === "busy" ||
      isRejoining ||
      isStopping;
  const connectionStatus: StreamContextType["connectionStatus"] =
    backendIsTerminal
      ? "disconnected"
      : streamValue.isLoading
      ? "connected"
      : runtimeStatus === "busy" || isRejoining
        ? "reconnecting"
        : "disconnected";

  const submitWithLifecycleReset: typeof streamValue.submit = (...args) => {
    // Clear terminal Stop state before starting another run on the same thread
    // instead of waiting for the backend's onCreated callback to arrive.
    userStopRequestedRef.current = false;
    setUserStopRequested(false);
    return streamValue.submit(...args);
  };

  const selectWorkspace = async (path: string | null) => {
    if (
      effectiveIsLoading ||
      approvalInterrupts(streamValue.interrupts).length > 0
    )
      throw new Error(
        "Finish the current run or approval before changing workspace",
      );
    if (currentThreadId) {
      await streamValue.client.threads.update(currentThreadId, {
        metadata: { workspace: path },
      });
      await queryClient.invalidateQueries({
        queryKey: ["thread-workspace", currentThreadId],
      });
    }
    setWorkspaceOverride({ threadId: currentThreadId, path });
    try {
      if (path) localStorage.setItem("doot:new-chat-workspace", path);
      else localStorage.removeItem("doot:new-chat-workspace");
    } catch {
      // Thread metadata remains the source of truth for existing chats.
    }
  };

  const selectPermissionMode = async (mode: PermissionMode) => {
    if (
      effectiveIsLoading ||
      approvalInterrupts(streamValue.interrupts).length > 0
    )
      throw new Error(
        "Finish the current run or approval before changing permissions",
      );
    if (currentThreadId) {
      await streamValue.client.threads.update(currentThreadId, {
        metadata: { permission_mode: mode },
      });
      await queryClient.invalidateQueries({
        queryKey: ["thread-workspace", currentThreadId],
      });
    }
    setPermissionOverride({ threadId: currentThreadId, mode });
  };

  return (
    <StreamContext.Provider
      value={{
        ...streamValue,
        // Expected cancellation errors from an explicit Stop are not product
        // errors. Keep them out of the thread error banner/toast; if Stop
        // genuinely fails we clear this flag above and the error is exposed.
        error: userStopRequested ? undefined : streamValue.error,
        isLoading: effectiveIsLoading,
        stop: reliableStop,
        submit: submitWithLifecycleReset,
        isStopping,
        runtimeStatus,
        connectionStatus,
        workspace,
        workspaceReady,
        permissionMode,
        permissionReady,
        selectPermissionMode,
        selectWorkspace,
      }}
    >
      {children}
    </StreamContext.Provider>
  );
};

/**
 * StreamProvider: Feature-level stream session management
 *
 * This provider manages the stream session for the chat feature.
 * Agent selection is now handled by the global AgentProvider.
 *
 * Provider Responsibilities:
 * - Stream session lifecycle
 * - Thread synchronization
 * - API key warnings
 * - Mode reset on new thread
 */
export const StreamProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { agentId, mode, setMode } = useAgentContext(); // Get from global context
  const { session } = useAuthSession();
  const [threadId] = useQueryState("threadId");
  const hasApiKeys = useHasApiKeys();
  const warningShownRef = useRef<string>("");

  // When threadId changes to null (new thread), reset to chat mode
  useEffect(() => {
    if (threadId === null) {
      setMode("chat");
    }
  }, [threadId, setMode]);

  // API key warning
  useEffect(() => {
    if (agentId && warningShownRef.current !== agentId) {
      checkApiKeysWarning(hasApiKeys);
      warningShownRef.current = agentId;
    }
  }, [agentId, hasApiKeys]);

  return (
    <>
      {!session?.accessToken ? (
        // Render children without StreamSession for unauthenticated users
        // This allows them to see the UI and interact with the composer
        // Auth will be required when they try to submit a message
        <>{children}</>
      ) : (
        <StreamSession
          key={`stream-${session.accessToken.substring(0, 20)}`} // Force re-mount when session changes
          agentId={agentId || "chat_agent"}
          mode={mode}
          accessToken={session.accessToken}
          threadId={threadId}
        >
          {children}
        </StreamSession>
      )}
    </>
  );
};

// Create a custom hook to use the context
export const useStreamContext = (): StreamContextType => {
  const context = useContext(StreamContext);

  // For unauthenticated users, return a default/empty stream context
  // This allows the UI to render without errors
  if (context === undefined) {
    return {
      messages: [],
      interrupts: [],
      isLoading: false,
      workspace: null,
      workspaceReady: true,
      permissionMode: "ask",
      permissionReady: true,
      selectPermissionMode: async () => {},
      selectWorkspace: async () => {},
      error: undefined,
      isStopping: false,
      runtimeStatus: undefined,
      connectionStatus: "disconnected",
      stop: () => {},
      submit: () => {},
      rewind: () => {},
      next: () => {},
      mutate: () => {},
    } as unknown as StreamContextType;
  }

  return context;
};

export default StreamContext;
