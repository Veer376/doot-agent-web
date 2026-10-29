export type StreamFailureAnalysis = {
  code: string;
  title: string;
  message: string;
  technical_detail: string;
  retryable: boolean;
  thread_id?: string | null;
  run_id?: string | null;
  runtime_instance_id?: string | null;
  run_runtime_instance_id?: string | null;
  restart_detected_at?: number | null;
  events?: DiagnosticEvent[];
};

export type DiagnosticEvent = {
  id: number;
  ts: number;
  runtime_instance_id: string;
  source: string;
  kind: string;
  severity: string;
  thread_id?: string | null;
  run_id?: string | null;
  task_id?: string | null;
  component?: string | null;
  message?: string | null;
  details?: Record<string, unknown>;
};

export function serializeStreamError(error: unknown): string {
  if (error instanceof Error) {
    return error.message || error.name || String(error);
  }
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    for (const key of ["message", "error", "detail", "repr", "name"]) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) return value;
    }
    try {
      const serialized = JSON.stringify(error);
      if (serialized && serialized !== "{}") return serialized;
    } catch {
      // Fall through to the generic string conversion.
    }
  }
  const fallback = String(error ?? "").trim();
  return fallback && fallback !== "[object Object]"
    ? fallback
    : "Unknown stream failure";
}

export function getPersistedRunId(threadId: string | null | undefined) {
  if (!threadId || typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(`lg:stream:${threadId}`);
  } catch {
    return null;
  }
}

function localFallbackAnalysis(
  error: string,
  threadId?: string | null,
  runId?: string | null,
): StreamFailureAnalysis {
  const lowered = error.toLowerCase();
  if (lowered.includes("cancel")) {
    return {
      code: "run_cancelled",
      title: "Run was cancelled",
      message:
        "The run ended before the model finished. This can happen if the local runtime restarts or another run interrupts it.",
      technical_detail: error,
      retryable: true,
      thread_id: threadId,
      run_id: runId,
    };
  }
  if (lowered.includes("timeout") || lowered.includes("timed out")) {
    return {
      code: "timeout",
      title: "Model request timed out",
      message: "The model did not complete within the configured timeout.",
      technical_detail: error,
      retryable: true,
      thread_id: threadId,
      run_id: runId,
    };
  }
  return {
    code: "stream_failure",
    title: "Agent stream failed",
    message: error,
    technical_detail: error,
    retryable: true,
    thread_id: threadId,
    run_id: runId,
  };
}

export async function analyzeStreamFailure(args: {
  apiUrl: string;
  threadId?: string | null;
  runId?: string | null;
  error: unknown;
}): Promise<StreamFailureAnalysis> {
  const rawError = serializeStreamError(args.error);
  try {
    const response = await fetch(`${args.apiUrl}/diagnostics/analyze`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        thread_id: args.threadId ?? null,
        run_id: args.runId ?? null,
        error: rawError,
        phase: "stream",
        client: {
          href: typeof window !== "undefined" ? window.location.href : undefined,
          online:
            typeof navigator !== "undefined" ? navigator.onLine : undefined,
        },
      }),
    });
    if (!response.ok) throw new Error(`Diagnostics HTTP ${response.status}`);
    return (await response.json()) as StreamFailureAnalysis;
  } catch {
    return localFallbackAnalysis(rawError, args.threadId, args.runId);
  }
}

export async function recordDiagnosticEvent(args: {
  apiUrl: string;
  kind: string;
  severity?: "debug" | "info" | "warning" | "error";
  threadId?: string | null;
  runId?: string | null;
  component?: string;
  message?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await fetch(`${args.apiUrl}/diagnostics`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: args.kind,
        severity: args.severity ?? "info",
        thread_id: args.threadId ?? null,
        run_id: args.runId ?? null,
        component: args.component ?? "frontend",
        message: args.message,
        details: args.details ?? {},
      }),
    });
  } catch {
    // Diagnostics must never break the main chat path.
  }
}

export async function fetchDiagnosticEvents(args: {
  apiUrl: string;
  threadId?: string | null;
  runId?: string | null;
  limit?: number;
}): Promise<DiagnosticEvent[]> {
  const params = new URLSearchParams();
  if (args.threadId) params.set("thread_id", args.threadId);
  if (args.runId) params.set("run_id", args.runId);
  params.set("limit", String(args.limit ?? 200));
  const response = await fetch(`${args.apiUrl}/diagnostics?${params.toString()}`);
  if (!response.ok) throw new Error(`Diagnostics HTTP ${response.status}`);
  const payload = (await response.json()) as { events?: DiagnosticEvent[] };
  return payload.events ?? [];
}
