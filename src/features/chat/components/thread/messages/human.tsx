import { useStreamContext } from "@/features/chat/providers/Stream";
import { useAgentContext } from "@/providers/Agent";
import { Message } from "@langchain/langgraph-sdk";
import { useState } from "react";
import { getContentString } from "@/features/chat/utils/content-string";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { BranchSwitcher, CommandBar } from "./shared";
import { useConfigStore } from "@/features/chat/hooks/use-config-store";
import { ChevronDownIcon } from "@/components/icons";
import { useAuthSession } from "@/providers/Auth";
import { MultimodalPreview } from "./MultimodalPreview";
import { isBase64ContentBlock } from "@/lib/multimodal-utils";

function EditableContent({
  value,
  setValue,
  onSubmit,
}: {
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
  onSubmit: () => void;
}) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <Textarea
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      className="bg-muted border-border min-h-11 resize-none rounded-3xl px-5 py-3 text-base leading-7 shadow-none focus-visible:ring-2"
    />
  );
}

export function HumanMessage({
  message,
  isLoading,
}: {
  message: Message;
  isLoading: boolean;
}) {
  const { session } = useAuthSession();
  // PHASE 3: Get agentId from context instead of URL
  const { agentId } = useAgentContext();

  const thread = useStreamContext();
  // getMessagesMetadata only exists on cloud streams, not local streams
  const meta = thread.getMessagesMetadata
    ? thread.getMessagesMetadata(message)
    : null;
  const parentCheckpoint = meta?.firstSeenState?.parent_checkpoint;

  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const contentString = getContentString(message.content);

  // Check if content is long enough to need expansion
  const needsExpansion =
    contentString.split("\n").length > 5 || contentString.length > 300;

  const handleSubmitEdit = () => {
    if (!agentId) return;

    setIsEditing(false);

    const newMessage: Message = { type: "human", content: value };
    const { getAgentConfig } = useConfigStore.getState();

    thread.submit(
      { messages: [newMessage] },
      {
        checkpoint: parentCheckpoint,
        streamMode: ["values"],
        optimisticValues: (prev) => {
          const values = meta?.firstSeenState?.values;
          if (!values) return prev;

          return {
            ...values,
            messages: [...(values.messages.slice(0, -1) ?? []), newMessage],
          };
        },
        config: {
          configurable: getAgentConfig(agentId),
        },
        metadata: {
          supabaseAccessToken: session?.accessToken,
        },
        streamSubgraphs: true,
        streamResumable: true,
      },
    );
  };

  return (
    <div
      className={cn(
        "group ml-auto flex min-w-0 max-w-[90%] items-center gap-2 sm:max-w-[80%]",
        isEditing && "w-full max-w-xl",
      )}
    >
      <div className={cn("flex min-w-0 flex-col gap-1", isEditing && "w-full")}>
        {isEditing ? (
          <EditableContent
            value={value}
            setValue={setValue}
            onSubmit={handleSubmitEdit}
          />
        ) : (
          <div className="flex flex-col gap-2">
            {/* Render images and files if no text */}
            {Array.isArray(message.content) && message.content.length > 0 && (
              <div className="flex flex-wrap items-end justify-end gap-2">
                {message.content.reduce<React.ReactNode[]>(
                  (acc, block, idx) => {
                    if (isBase64ContentBlock(block)) {
                      // Increase beyond lg: use new xl size for images in sent human messages
                      acc.push(
                        <MultimodalPreview
                          key={idx}
                          block={
                            block as import("@/types/multimodal").Base64ContentBlock
                          }
                          size="xl"
                        />,
                      );
                    }
                    return acc;
                  },
                  [],
                )}
              </div>
            )}
            {/* Render text if present, otherwise fallback to file/image name */}
            {contentString ? (
              <div className="relative ml-auto min-w-0 max-w-full">
                <p
                  className={cn(
                    "bg-muted rounded-3xl px-5 py-3 text-left text-base leading-7 whitespace-pre-wrap [overflow-wrap:anywhere] transition-all duration-200",
                    !isExpanded &&
                      needsExpansion &&
                      "max-h-[120px] overflow-hidden",
                    needsExpansion && "pb-8", // Extra padding when expandable to prevent content overlap with button
                  )}
                >
                  {contentString}
                </p>
                {!isExpanded && needsExpansion && (
                  <div
                    className="pointer-events-none absolute right-0 bottom-0 left-0 h-12 rounded-b-3xl bg-gradient-to-t from-muted to-transparent"
                  />
                )}
                {!isExpanded && needsExpansion && (
                  <div className="pointer-events-none absolute bottom-2 left-4 flex items-center gap-1"></div>
                )}
                {needsExpansion && (
                  <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    data-radius="small-radius"
                    className="hover:bg-muted-foreground/10 group absolute bottom-2 right-4 cursor-pointer p-1 transition-colors"
                    aria-label={
                      isExpanded ? "Collapse message" : "Expand message"
                    }
                  >
                    <ChevronDownIcon
                      size={16}
                      className={cn(
                        "text-muted-foreground transition-all group-hover:text-foreground",
                        isExpanded && "rotate-180",
                      )}
                    />
                  </button>
                )}
              </div>
            ) : null}
          </div>
        )}

        <div
          className={cn(
            "ml-auto flex items-center gap-2 transition-opacity duration-200 ease-in-out",
            // Show instantly on hover/focus, delay hiding when leaving hover
            // Always visible on mobile (below md), hidden on desktop until hover
            "md:delay-[600ms] opacity-100 group-focus-within:opacity-100 group-focus-within:delay-0 group-hover:opacity-100 group-hover:delay-0 md:opacity-0",
            isEditing && "opacity-100 delay-0",
          )}
        >
          <BranchSwitcher
            branch={meta?.branch}
            branchOptions={meta?.branchOptions}
            onSelect={(branch) => thread.setBranch(branch)}
            isLoading={isLoading}
          />
          <CommandBar
            isLoading={isLoading}
            content={contentString}
            isEditing={isEditing}
            setIsEditing={(c) => {
              if (c) {
                setValue(contentString);
              }
              setIsEditing(c);
            }}
            handleSubmitEdit={handleSubmitEdit}
            isHumanMessage={true}
          />
        </div>
      </div>
    </div>
  );
}
