"use client";

import { useEffect, useState } from "react";
import { Shield, Settings, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { config } from "@/config";
import { useStreamContext } from "@/features/chat/providers/Stream";
import {
  approvalInterrupts,
  type ApprovalDecision,
  type ApprovalScope,
  type PermissionMode,
  type PermissionSettings,
} from "@/features/chat/utils/permissions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const modes = [
  { value: "ask", label: "Ask for approval" },
  { value: "auto", label: "Approve for me" },
  { value: "full", label: "Full access" },
] as const;

export function PermissionSelector() {
  const stream = useStreamContext();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const settings = useQuery({
    queryKey: ["permission-settings"],
    enabled: config.features.localAgentEnabled && open,
    queryFn: async (): Promise<PermissionSettings> => {
      const response = await fetch(`${config.apiUrl}/permissions`);
      if (!response.ok) throw new Error("Could not load permission settings");
      return response.json();
    },
  });
  if (!config.features.localAgentEnabled) return null;
  const locked =
    stream.isLoading || approvalInterrupts(stream.interrupts).length > 0;
  const mutate = async (method: string, body: unknown) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${config.apiUrl}/permissions`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "Could not save permissions");
      client.setQueryData(["permission-settings"], data);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not save permissions",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <button
        type="button"
        disabled={locked}
        aria-label="Permission settings"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:bg-accent rounded-doot-control flex items-center gap-1.5 px-2 py-1.5 text-sm disabled:opacity-50"
      >
        <Shield className="size-4" />
        <span>
          {modes.find((mode) => mode.value === stream.permissionMode)?.label}
        </span>
      </button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Permissions</DialogTitle>
          </DialogHeader>
          <label className="text-sm">
            This conversation
            <select
              aria-label="Conversation permission mode"
              value={stream.permissionMode}
              disabled={locked || busy || !stream.permissionReady}
              onChange={async (event) => {
                setBusy(true);
                setError("");
                try {
                  await stream.selectPermissionMode(
                    event.target.value as PermissionMode,
                  );
                } catch (reason) {
                  setError(String(reason));
                } finally {
                  setBusy(false);
                }
              }}
              className="rounded-doot-control bg-background mt-2 w-full border p-2"
            >
              {modes.map((mode) => (
                <option
                  key={mode.value}
                  value={mode.value}
                >
                  {mode.label}
                </option>
              ))}
            </select>
          </label>
          <p className="text-muted-foreground text-sm">
            Ask reviews writes and commands. Approve for me allows routine
            workspace reads and edits, and asks before shell commands. Full
            access runs available tools without approval. Shell commands run on
            your Mac; this is not an operating-system sandbox.
          </p>
          <label className="text-sm">
            Default for new conversations
            <select
              aria-label="Default permission mode"
              value={settings.data?.default_mode ?? "ask"}
              disabled={locked || busy || !settings.data}
              onChange={(event) =>
                mutate("PATCH", { default_mode: event.target.value })
              }
              className="rounded-doot-control bg-background mt-2 w-full border p-2"
            >
              {modes.map((mode) => (
                <option
                  key={mode.value}
                  value={mode.value}
                >
                  {mode.label}
                </option>
              ))}
            </select>
          </label>
          <div className="max-h-56 space-y-2 overflow-auto">
            <h3 className="text-sm font-medium">Remembered approvals</h3>
            {settings.data?.grants.length === 0 && (
              <p className="text-muted-foreground text-sm">
                No remembered approvals.
              </p>
            )}
            {settings.data?.grants.map((grant) => (
              <div
                key={`${grant.workspace}:${grant.scope}:${grant.operation}`}
                className="rounded-doot-control flex items-start gap-2 border p-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p>
                    {grant.tool} ·{" "}
                    {grant.scope === "always" ? "Always" : "This conversation"}
                  </p>
                  <p className="font-mono text-xs break-all">
                    {grant.description}
                  </p>
                  <p className="text-muted-foreground text-xs break-all">
                    {grant.workspace}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Revoke ${grant.tool} approval`}
                  disabled={locked || busy}
                  onClick={() => mutate("DELETE", grant)}
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>
          {settings.data?.path && (
            <p className="text-muted-foreground text-xs break-all">
              Saved locally: {settings.data.path}
            </p>
          )}
          {(error || settings.error) && (
            <p
              role="alert"
              className="text-destructive text-sm"
            >
              {error || settings.error?.message}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ApprovalPanel({ model }: { model?: string }) {
  const stream = useStreamContext();
  const query = useQueryClient();
  const interrupts = approvalInterrupts(stream.interrupts);
  const signature = JSON.stringify(interrupts.map((item) => item.id));
  const [decisions, setDecisions] = useState<Record<string, ApprovalDecision>>(
    {},
  );
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setDecisions({});
    setAnswers({});
    setError("");
    setBusy(false);
  }, [signature]);
  if (!interrupts.length) return null;
  const allChosen = interrupts.every((item) =>
    item.value.action_requests.every(
      (_, index) => decisions[`${item.id}:${index}`],
    ),
  );
  const resume = async (selected: Record<string, ApprovalDecision>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const responses = Object.fromEntries(
        interrupts.map((item) => [
          item.id,
          {
            decisions: item.value.action_requests.map((_, index) => {
              const decision = selected[`${item.id}:${index}`];
              return decision.type === "approve"
                ? { type: "approve" }
                : decision;
            }),
          },
        ]),
      );
      await stream.submit(undefined, {
        command: { resume: responses },
        context: {
          approval_grants: interrupts.flatMap((item) =>
            item.value.action_requests.flatMap((action, index) => {
              const decision = selected[`${item.id}:${index}`];
              return decision.type === "approve" && decision.scope !== "once"
                ? [
                    {
                      name: action.name,
                      args: action.args,
                      scope: decision.scope,
                    },
                  ]
                : [];
            }),
          ),
          workspace: stream.workspace,
          permission_mode: stream.permissionMode,
          ...(model ? { model } : {}),
        },
        streamMode: ["messages-tuple", "values"],
        streamResumable: true,
        multitaskStrategy: "reject",
      });
      await query.invalidateQueries({ queryKey: ["permission-settings"] });
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not resume the agent",
      );
      setBusy(false);
    }
  };
  const choose = (key: string, decision: ApprovalDecision) => {
    const selected = { ...decisions, [key]: decision };
    setDecisions(selected);
    if (
      interrupts.every((item) =>
        item.value.action_requests.every(
          (_, index) => selected[`${item.id}:${index}`],
        ),
      )
    )
      void resume(selected);
  };
  return (
    <section
      aria-label="Agent approval"
      className="border-border bg-muted/30 rounded-doot-surface mx-2 mt-2 space-y-3 border p-3"
    >
      <p className="flex items-center gap-2 text-sm font-medium">
        <Shield className="size-4" />
        {busy ? "Resuming agent…" : "Agent needs your input"}
      </p>
      {interrupts.flatMap((item) =>
        item.value.action_requests.map((action, index) => {
          const key = `${item.id}:${index}`;
          const allowed =
            item.value.review_configs[index]?.allowed_decisions ?? [];
          const question = allowed.includes("respond");
          return (
            <div
              key={key}
              className="space-y-2 text-sm"
            >
              <p className="font-medium">
                {question
                  ? String(
                      action.args.question ?? action.description ?? action.name,
                    )
                  : action.name}
              </p>
              {!question && (
                <>
                  <pre className="rounded-doot-control bg-background/50 max-h-40 overflow-auto p-2 font-mono text-xs break-all whitespace-pre-wrap">
                    {JSON.stringify(action.args, null, 2)}
                  </pre>
                  <p className="text-muted-foreground text-xs">
                    {!config.features.localAgentEnabled
                      ? "This decision applies to this report write only."
                      : action.name === "execute_command"
                      ? "Remembered approval covers this exact command and working directory in this workspace."
                      : "Remembered approval covers this file-editing tool in this workspace."}
                  </p>
                </>
              )}
              {question ? (
                <div className="space-y-2">
                  {Array.isArray(action.args.options) && (
                    <div className="flex flex-wrap gap-2">
                      {action.args.options.map((option, n) => (
                        <button
                          type="button"
                          key={n}
                          disabled={busy || Boolean(decisions[key])}
                          onClick={() =>
                            setAnswers((previous) => ({
                              ...previous,
                              [key]: String(option),
                            }))
                          }
                          className="rounded-doot-control border px-2 py-1"
                        >
                          {String(option)}
                        </button>
                      ))}
                    </div>
                  )}
                  <textarea
                    aria-label="Answer agent question"
                    value={answers[key] ?? ""}
                    onChange={(event) =>
                      setAnswers((previous) => ({
                        ...previous,
                        [key]: event.target.value,
                      }))
                    }
                    className="rounded-doot-control bg-background w-full border p-2"
                  />
                  <button
                    type="button"
                    disabled={
                      busy || !answers[key]?.trim() || Boolean(decisions[key])
                    }
                    onClick={() =>
                      choose(key, {
                        type: "respond",
                        message: answers[key].trim(),
                      })
                    }
                    className="rounded-doot-control border px-2 py-1"
                  >
                    Send answer
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {allowed.includes("approve") &&
                    (
                      [
                        { scope: "once", label: "Allow once" },
                        {
                          scope: "conversation",
                          label: "Allow in this conversation",
                        },
                        { scope: "always", label: "Always allow" },
                      ] as const
                    ).filter((choice) => config.features.localAgentEnabled || choice.scope === "once").map((choice) => (
                      <button
                        key={choice.scope}
                        type="button"
                        disabled={busy || Boolean(decisions[key])}
                        onClick={() =>
                          choose(key, { type: "approve", scope: choice.scope })
                        }
                        className="hover:bg-accent rounded-doot-control border px-2 py-1 text-xs"
                      >
                        {choice.label}
                      </button>
                    ))}
                  {allowed.includes("reject") && (
                    <button
                      type="button"
                      disabled={busy || Boolean(decisions[key])}
                      onClick={() =>
                        choose(key, {
                          type: "reject",
                          message: "The user declined this action.",
                        })
                      }
                      className="text-destructive rounded-doot-control border px-2 py-1 text-xs"
                    >
                      Reject
                    </button>
                  )}
                </div>
              )}
              {decisions[key] && !busy && (
                <p className="text-muted-foreground text-xs">
                  Decision saved; review the remaining actions.
                </p>
              )}
            </div>
          );
        }),
      )}
      {error && (
        <>
          <p
            role="alert"
            className="text-destructive text-sm"
          >
            {error}
          </p>
          {allChosen && (
            <button
              type="button"
              disabled={busy}
              onClick={() => resume(decisions)}
              className="rounded-doot-control border px-2 py-1 text-sm"
            >
              Retry resume
            </button>
          )}
        </>
      )}
    </section>
  );
}
