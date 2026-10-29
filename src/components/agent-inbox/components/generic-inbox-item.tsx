import { cn } from "@/lib/utils";
import { Thread } from "@langchain/langgraph-sdk";
import { ThreadIdCopyable } from "./thread-id";
import { InboxItemStatuses } from "./statuses";
import { format } from "date-fns";
import { useQueryState, parseAsString } from "nuqs";
import {
  STUDIO_NOT_WORKING_TROUBLESHOOTING_URL,
  VIEW_STATE_THREAD_QUERY_PARAM,
} from "../constants";
import { GenericThreadData } from "../types";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

import { constructOpenInStudioURL } from "../utils";

interface GenericInboxItemProps<
  ThreadValues extends Record<string, any> = Record<string, any>,
> {
  threadData:
    | GenericThreadData<ThreadValues>
    | {
        thread: Thread<ThreadValues>;
        status: "interrupted";
        interrupts?: undefined;
      };
  isLast: boolean;
}

export function GenericInboxItem<
  ThreadValues extends Record<string, any> = Record<string, any>,
>({ threadData, isLast }: GenericInboxItemProps<ThreadValues>) {
  const [, setSelectedThreadIdParam] = useQueryState(
    VIEW_STATE_THREAD_QUERY_PARAM,
    parseAsString,
  );
  const [agentInboxId] = useQueryState("agentInbox");

  const handleOpenInStudio = () => {
    if (!agentInboxId) {
      toast.error("No agent inbox selected.", {
        duration: 5000,
      });
      return;
    }

    const assistantId = agentInboxId.split(":")[0];

    const studioUrl = constructOpenInStudioURL(
      assistantId,
      threadData.thread.thread_id,
    );

    if (studioUrl === "#") {
      toast.error(
        "Could not construct Studio URL. Check if inbox has necessary details (Project ID, Tenant ID).",
        {
          description: (
            <>
              <p>
                Could not construct Studio URL. Check if inbox has necessary
                details (Project ID, Tenant ID).
              </p>
              <p>
                If the issue persists, see the{" "}
                <a
                  href={STUDIO_NOT_WORKING_TROUBLESHOOTING_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  troubleshooting section
                </a>
              </p>
            </>
          ),
          duration: 10000,
        },
      );
    } else {
      window.open(studioUrl, "_blank");
    }
  };

  const updatedAtDateString = format(
    new Date(threadData.thread.updated_at),
    "MM/dd h:mm a",
  );

  return (
    <div
      onClick={() => setSelectedThreadIdParam(threadData.thread.thread_id)}
      className={cn(
        "grid min-h-doot-inbox-row w-full cursor-pointer grid-cols-12 px-4 py-3 transition-colors ease-in-out hover:bg-accent max-md:grid-cols-1 max-md:gap-2",
        !isLast && "border-b border-border-subtle",
      )}
    >
      <div className="col-span-1 flex items-center justify-center max-md:hidden">
        {/* Empty space for alignment with interrupted items */}
      </div>

      <div
        className={cn(
          "col-span-6 flex items-center justify-start gap-2",
          "max-md:col-span-full max-md:flex-wrap",
          !agentInboxId && "col-span-9",
        )}
      >
        <p className="text-sm font-medium text-foreground">Thread ID:</p>
        <ThreadIdCopyable
          showUUID
          threadId={threadData.thread.thread_id}
        />
      </div>

      {agentInboxId && (
        <div className="col-span-2 flex items-center max-md:col-span-full">
          <Button
            size="sm"
            variant="outline"
            className="flex items-center gap-1 bg-background"
            onClick={handleOpenInStudio}
          >
            Studio
          </Button>
        </div>
      )}

      <div
        className={cn(
          "col-span-2 flex items-center",
          "max-md:col-span-full max-md:col-start-auto",
          !agentInboxId && "col-start-10",
        )}
      >
        <InboxItemStatuses status={threadData.status} />
      </div>

      <p className="col-span-1 pt-2 text-right text-sm text-muted-foreground max-md:col-span-full max-md:pt-0 max-md:text-left">
        {updatedAtDateString}
      </p>
    </div>
  );
}
