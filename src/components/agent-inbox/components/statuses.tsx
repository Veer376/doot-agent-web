import { cn } from "@/lib/utils";
import { HumanInterruptConfig } from "../types";
import { prettifyText } from "../utils";

export function InboxItemStatuses({
  config,
  status,
}: {
  config?: HumanInterruptConfig;
  status?: "idle" | "busy" | "error" | "interrupted" | "human_response_needed";
}) {
  if (!config && !status) {
    throw new Error("Either config or status must be provided");
  }
  if (config && status) {
    throw new Error("Only one of config or status can be provided");
  }

  if (config) {
    const isOnlyIgnoreAllowed =
      config.allow_ignore &&
      !config.allow_respond &&
      !config.allow_edit &&
      !config.allow_accept;

    return (
      <div
        className={cn(
          "flex w-fit items-center justify-center rounded-full border-1.5 px-2 py-0.5 font-medium text-nowrap",
          "transition-colors ease-in-out hover:bg-accent",
          isOnlyIgnoreAllowed
            ? "border-border text-muted-foreground"
            : "border-semantic-success/40 text-semantic-success",
        )}
      >
        <div className="flex items-center justify-center gap-2 text-sm">
          <div
            className={cn(
              "size-doot-status-dot rounded-full",
              isOnlyIgnoreAllowed ? "bg-muted-foreground" : "bg-semantic-success-light",
            )}
          />
          <span>{isOnlyIgnoreAllowed ? "Ignore" : "Requires Action"}</span>
        </div>
      </div>
    );
  } else if (status) {
    return (
      <div
        className={cn(
          "flex w-fit items-center justify-center rounded-full border-2 px-2 py-0.5 font-medium text-nowrap",
          status === "idle" && "border-border text-muted-foreground",
          status === "busy" && "border-semantic-warning/40 text-semantic-warning",
          status === "error" && "border-destructive/40 text-destructive",
          status === "interrupted" && "border-semantic-success/40 text-semantic-success",
          status === "human_response_needed" && "border-semantic-info/40 text-semantic-info",
        )}
      >
        <p className="text-sm">{prettifyText(status)}</p>
      </div>
    );
  }

  return null;
}
