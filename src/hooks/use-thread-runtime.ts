import type { Client, Run } from "@langchain/langgraph-sdk";

export async function findActiveRun(
  client: Client,
  threadId: string,
  cachedRunId?: string | null,
): Promise<Run | null> {
  if (cachedRunId) {
    try {
      const cached = await client.runs.get(threadId, cachedRunId);
      if (cached.status === "running" || cached.status === "pending") {
        return cached;
      }
    } catch {
      // Cache is a hint only. Fall through to backend discovery.
    }
  }

  const running = await client.runs.list(threadId, {
    status: "running",
    limit: 10,
    select: ["run_id", "thread_id", "status", "created_at", "updated_at"],
  });
  if (running.length > 0) return running[0];

  const pending = await client.runs.list(threadId, {
    status: "pending",
    limit: 10,
    select: ["run_id", "thread_id", "status", "created_at", "updated_at"],
  });
  return pending[0] ?? null;
}

export async function waitForNoActiveRuns(
  client: Client,
  threadId: string,
  attempts = 5,
  delayMs = 200,
) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const active = await findActiveRun(client, threadId);
    if (!active) return;
    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error("The backend still reports an active run after cancellation.");
}
