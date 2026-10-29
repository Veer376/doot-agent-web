import { Button } from "@/components/ui/button";
import { useQueryState, parseAsString } from "nuqs";
import {
  LayersIcon as Layers,
  LoaderIcon as Loader,
  TriangleAlertIcon as TriangleAlert,
  ZapOffIcon as ZapOff,
  ClockIcon as IdleIcon,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { INBOX_PARAM } from "../constants";

const INBOX_ICON_MAP = {
  all: <Layers />,
  interrupted: <ZapOff />,
  idle: <IdleIcon />,
  busy: <Loader />,
  error: <TriangleAlert />,
};

function InboxButton({
  label,
  selectedInbox,
  onClick,
}: {
  label: string;
  selectedInbox: string;
  onClick: () => void;
}) {
  return (
    <Button
      onClick={onClick}
      className={cn(
        "h-doot-control shrink-0 rounded-doot-panel text-sm font-medium",
        selectedInbox === label.toLowerCase()
          ? "bg-doot-selected text-foreground"
          : "text-muted-foreground",
      )}
      variant="ghost"
    >
      {INBOX_ICON_MAP[label.toLowerCase() as keyof typeof INBOX_ICON_MAP]}
      {label}
    </Button>
  );
}

export function InboxButtons() {
  const [selectedInbox, setSelectedInbox] = useQueryState(
    INBOX_PARAM,
    parseAsString.withDefault("interrupted"),
  );

  return (
    <div className="flex w-full items-center justify-start gap-1 overflow-x-auto pb-1">
      <InboxButton
        label="All"
        selectedInbox={selectedInbox || ""}
        onClick={() => setSelectedInbox("all")}
      />
      <InboxButton
        label="Interrupted"
        selectedInbox={selectedInbox || ""}
        onClick={() => setSelectedInbox("interrupted")}
      />
      <InboxButton
        label="Idle"
        selectedInbox={selectedInbox || ""}
        onClick={() => setSelectedInbox("idle")}
      />
      <InboxButton
        label="Busy"
        selectedInbox={selectedInbox || ""}
        onClick={() => setSelectedInbox("busy")}
      />
      <InboxButton
        label="Error"
        selectedInbox={selectedInbox || ""}
        onClick={() => setSelectedInbox("error")}
      />
    </div>
  );
}
