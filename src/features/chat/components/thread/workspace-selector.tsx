"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Folder, ChevronDown, LoaderCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStreamContext } from "@/features/chat/providers/Stream";
import { approvalInterrupts } from "@/features/chat/utils/permissions";
import { useAuthSession } from "@/providers/Auth";
import { config } from "@/config";

type WorkspaceCatalog = {
  projects: { name: string; path: string }[];
  roots: string[];
};

export function WorkspaceSelector() {
  const stream = useStreamContext();
  const { session } = useAuthSession();
  const [open, setOpen] = useState(false);
  const [path, setPath] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);
  const headers = {
    Authorization: `Bearer ${session?.accessToken ?? ""}`,
    "x-supabase-access-token": session?.accessToken ?? "",
  };
  const catalog = useQuery({
    queryKey: ["workspaces"],
    enabled: open,
    queryFn: async (): Promise<WorkspaceCatalog> => {
      const response = await fetch(`${config.apiUrl}/workspaces`, { headers });
      if (!response.ok)
        throw new Error(
          "Could not load workspaces. Check the local LangGraph server.",
        );
      return response.json();
    },
    staleTime: 30_000,
  });

  const select = async (candidate: string | null) => {
    setSelecting(true);
    setError(null);
    try {
      let selected = candidate;
      if (candidate) {
        const response = await fetch(`${config.apiUrl}/workspaces`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ path: candidate }),
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error ?? "Could not select workspace");
        selected = result.path;
      }
      await stream.selectWorkspace(selected);
      setOpen(false);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not select workspace",
      );
    } finally {
      setSelecting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={
          stream.isLoading ||
          approvalInterrupts(stream.interrupts).length > 0 ||
          !stream.workspaceReady ||
          !session
        }
        aria-label="Choose workspace"
        title={stream.workspace ?? "Choose workspace"}
        onClick={() => {
          setPath(stream.workspace ?? "");
          setError(null);
          setOpen(true);
        }}
        className="text-muted-foreground hover:bg-accent flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-sm disabled:opacity-50"
      >
        <Folder className="size-4 shrink-0" />
        <span className="max-w-48 truncate">
          {stream.workspace?.split("/").filter(Boolean).pop() ??
            "Choose workspace"}
        </span>
        <ChevronDown className="size-3 shrink-0" />
      </button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Choose workspace</DialogTitle>
          </DialogHeader>
          <div className="flex max-h-52 flex-col gap-1 overflow-auto">
            <button
              type="button"
              disabled={selecting}
              onClick={() => select(null)}
              className="hover:bg-accent rounded-lg p-3 text-left"
            >
              No workspace
            </button>
            {catalog.isPending && (
              <LoaderCircle className="mx-auto size-5 animate-spin" />
            )}
            {catalog.data?.projects.map((project) => (
              <button
                type="button"
                key={project.path}
                disabled={selecting}
                onClick={() => select(project.path)}
                className="hover:bg-accent rounded-lg p-3 text-left"
              >
                <span className="block text-sm">{project.name}</span>
                <span className="text-muted-foreground block truncate text-xs">
                  {project.path}
                </span>
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 border-t pt-3">
            <label
              htmlFor="workspace-path"
              className="text-sm"
            >
              Workspace directory
            </label>
            <input
              id="workspace-path"
              value={path}
              onChange={(event) => setPath(event.target.value)}
              placeholder="/path/to/project"
              onKeyDown={(event) => {
                if (event.key === "Enter" && path.trim()) select(path.trim());
              }}
              className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={!path.trim() || selecting}
              onClick={() => select(path.trim())}
              className="bg-foreground text-background rounded-lg px-3 py-2 text-sm disabled:opacity-40"
            >
              {selecting ? "Selecting…" : "Use directory"}
            </button>
            {(error || catalog.error) && (
              <p
                role="alert"
                className="text-destructive text-sm"
              >
                {error ?? catalog.error?.message}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
