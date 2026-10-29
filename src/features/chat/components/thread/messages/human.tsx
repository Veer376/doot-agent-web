import { useStreamContext } from "@/features/chat/providers/Stream";
import { useAgentContext } from "@/providers/Agent";
import { Message } from "@langchain/langgraph-sdk";
import { useState } from "react";
import { getContentString } from "@/features/chat/utils/content-string";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { CommandBar } from "./shared";
import { useConfigStore } from "@/features/chat/hooks/use-config-store";
import { ChevronDownIcon } from "@/components/icons";
import { useAuthSession } from "@/providers/Auth";
import { MultimodalPreview } from "./MultimodalPreview";
import { isBase64ContentBlock } from "@/lib/multimodal-utils";
import { useThreadModel } from "@/hooks/use-thread-model";
import { useApiKeys } from "@/hooks/use-api-keys";
import { config } from "@/config";
import { toast } from "sonner";
import { useQueryState } from "nuqs";

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
      aria-label="Edit message"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      className="doot-human-editor min-h-11 resize-none px-4 py-2.5 text-base leading-[var(--doot-leading-body)] shadow-none focus-visible:ring-2"
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
  const { selectedModel } = useThreadModel();
  const [threadId] = useQueryState("threadId");
  const { apiKeys } = useApiKeys();
  const [isSaving, setIsSaving] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const contentString = getContentString(message.content);

  // Check if content is long enough to need expansion
  const needsExpansion =
    contentString.split("\n").length > 5 || contentString.length > 300;

  const handleSubmitEdit = async () => {
    if (
      !threadId ||
      !message.id ||
      !value.trim() ||
      thread.isLoading ||
      isSaving ||
      !thread.workspaceReady
    )
      return;
    setIsSaving(true);
    try {
      const current = await thread.client.threads.getState<{
        messages: Message[];
      }>(threadId);
      const position = current.values.messages.findIndex(
        (item) => item.id === message.id,
      );
      if (position < 0) return;
      const newMessage: Message = {
        ...message,
        content: Array.isArray(message.content)
          ? [
              { type: "text", text: value },
              ...message.content.filter((block) => block.type !== "text"),
            ]
          : value,
      };
      const { getAgentConfig } = useConfigStore.getState();
      const effectiveAgentId = config.features.localAgentEnabled
        ? agentId
        : thread.assistantId;
      await thread.client.threads.updateState(threadId, {
        values: {
          messages: [
            newMessage,
            ...current.values.messages
              .slice(position + 1)
              .map((item) => ({ type: "remove", id: item.id, content: "" })),
          ],
        },
        asNode: "__start__",
      });
      setIsEditing(false);
      await thread.submit(null, {
        checkpoint: null,
        multitaskStrategy: "reject",
        streamMode: ["messages-tuple", "values"],
        optimisticValues: {
          messages: [...current.values.messages.slice(0, position), newMessage],
        },
        context: {
          ...getAgentConfig(effectiveAgentId || ""),
          apiKeys,
          workspace: thread.workspace,
          model: selectedModel?.id,
        },
        metadata: {
          supabaseAccessToken: session?.accessToken,
        },
        streamSubgraphs: true,
        streamResumable: true,
      });
    } catch (reason) {
      toast.error("Could not edit checkpoint", {
        description: reason instanceof Error ? reason.message : String(reason),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      data-message-role="user"
      data-editing={isEditing}
      className={cn(
        "doot-human-turn group ml-auto flex min-w-0 items-center gap-2",
        isEditing && "w-full",
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
              <div className="relative ml-auto max-w-full min-w-0">
                <p
                  className={cn(
                    "doot-human-bubble px-4 py-2.5 text-left [overflow-wrap:anywhere] whitespace-pre-wrap transition-colors duration-150",
                    !isExpanded &&
                      needsExpansion &&
                      "max-h-[120px] overflow-hidden",
                    needsExpansion && "pb-8", // Extra padding when expandable to prevent content overlap with button
                  )}
                >
                  {contentString}
                </p>
                {!isExpanded && needsExpansion && (
                  <div className="from-muted pointer-events-none absolute right-0 bottom-0 left-0 h-12 rounded-b-3xl bg-gradient-to-t to-transparent" />
                )}
                {!isExpanded && needsExpansion && (
                  <div className="pointer-events-none absolute bottom-2 left-4 flex items-center gap-1"></div>
                )}
                {needsExpansion && (
                  <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    data-radius="control"
                    className="hover:bg-muted-foreground/10 group absolute right-4 bottom-2 cursor-pointer p-1 transition-colors"
                    aria-expanded={isExpanded}
                    aria-label={
                      isExpanded ? "Collapse message" : "Expand message"
                    }
                  >
                    <ChevronDownIcon
                      size={16}
                      className={cn(
                        "text-muted-foreground group-hover:text-foreground transition-all",
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
          data-editing={isEditing}
          className="doot-message-actions ml-auto flex items-center"
        >
          <CommandBar
            isLoading={isLoading || isSaving}
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
