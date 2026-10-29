"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { config } from "@/config";
import {
  fetchDiagnosticEvents,
  type DiagnosticEvent,
} from "@/features/chat/utils/stream-diagnostics";

function formatTime(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  });
}

export default function DiagnosticsPage() {
  const searchParams = useSearchParams();
  const threadId = searchParams.get("threadId");
  const runId = searchParams.get("runId");
  const [events, setEvents] = useState<DiagnosticEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchDiagnosticEvents({
        apiUrl: config.apiUrl,
        threadId,
        runId,
        limit: 500,
      });
      setEvents(next);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, [runId, threadId]);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 3000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  const timeline = useMemo(() => [...events].reverse(), [events]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Doot diagnostics</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Local trace timeline for frontend stream, agent, model, and tool events.
          </p>
        </div>
        <Button variant="outline" onClick={() => void refresh()} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trace</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground">Thread</span>
            <code className="ml-2 break-all">{threadId ?? "all"}</code>
          </div>
          <div>
            <span className="text-muted-foreground">Run</span>
            <code className="ml-2 break-all">{runId ?? "all"}</code>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div data-radius="surface" className="border-destructive/40 bg-destructive/10 text-destructive border p-3 text-sm">
          Diagnostics request failed: {error}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {timeline.length === 0 && !loading ? (
          <div className="text-muted-foreground py-10 text-center text-sm">
            No diagnostic events match this trace yet.
          </div>
        ) : (
          timeline.map((event) => (
            <Card key={event.id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <code>{formatTime(event.ts)}</code>
                  <strong>{event.kind}</strong>
                  <span className="text-muted-foreground">{event.source}</span>
                  {event.component && (
                    <span className="text-muted-foreground">{event.component}</span>
                  )}
                  {event.run_id && (
                    <code className="text-muted-foreground">
                      run {event.run_id.slice(0, 8)}
                    </code>
                  )}
                </div>
                {event.message && <p className="mt-2 text-sm">{event.message}</p>}
                {event.details && Object.keys(event.details).length > 0 && (
                  <details className="mt-2 text-xs">
                    <summary className="text-muted-foreground cursor-pointer">
                      Details
                    </summary>
                    <pre className="bg-muted mt-2 max-h-80 overflow-auto p-3 font-mono text-xs" data-radius="surface">
                      {JSON.stringify(event.details, null, 2)}
                    </pre>
                  </details>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
