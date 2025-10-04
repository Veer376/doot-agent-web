import { v4 as uuidv4 } from "uuid";
import {
  ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { cn } from "@/lib/utils";
import {
  useStreamContext,
  useAgentContext,
} from "@/features/chat/providers/Stream";
import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Checkpoint, Message } from "@langchain/langgraph-sdk";
import {
  AssistantMessage,
  AssistantMessageLoading,
} from "@/features/chat/components/thread/messages/ai";
import { HumanMessage } from "@/features/chat/components/thread/messages/human";
import { LangGraphLogoSVG } from "@/components/icons/langgraph";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { ArrowDown, LoaderCircle, AlertCircle } from "lucide-react";
import { ArrowDownIcon } from "@/components/icons";
import { AttachIcon, CancelIcon } from "@/components/icons";
import { useQueryState } from "nuqs";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
import { toast } from "sonner";
import { ensureToolCallsHaveResponses } from "@/features/chat/utils/tool-responses";
import { DO_NOT_RENDER_ID_PREFIX } from "@/constants";
import { useConfigStore } from "../../hooks/use-config-store";
import { useAuthContext } from "@/providers/Auth";
import { useAgentsContext } from "@/providers/Agents";
import {
  isUserSpecifiedDefaultAgent,
  requiresApiKeysButNotSet,
} from "@/lib/agent-utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useApiKeys, useHasApiKeys } from "@/hooks/use-api-keys";
import { Composer } from "./composer";
import { useThreadAgent } from "@/hooks/use-thread-agent";

function StickyToBottomContent(props: {
  content: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const context = useStickToBottomContext();
  return (
    <div
      ref={context.scrollRef}
      style={{ width: "100%", height: "100%" }}
      className={props.className}
    >
      <div
        ref={context.contentRef}
        className={props.contentClassName}
      >
        {props.content}
      </div>

      {props.footer}
    </div>
  );
}

function ScrollToBottom(props: { className?: string }) {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  if (isAtBottom) return null;
  return (
    <Button
      variant="outline"
      size="icon"
      className={cn("rounded-full", props.className)}
      onClick={() => scrollToBottom()}
    >
      <ArrowDownIcon />
    </Button>
  );
}

export function Thread() {
  // PHASE 3: Get agentId from context instead of URL
  const { agentId } = useAgentContext();
  const [threadId] = useQueryState("threadId");
  const [hasInput, setHasInput] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const {
    contentBlocks,
    setContentBlocks,
    handleFileUpload,
    dropRef,
    removeBlock,
    dragOver,
    handlePaste,
  } = useFileUpload();

  const { apiKeys } = useApiKeys();
  const hasApiKeys = useHasApiKeys();

  const { session } = useAuthContext();

  const stream = useStreamContext();
  const messages = stream.messages;
  const isLoading = stream.isLoading;

  const lastError = useRef<string | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!stream.error) {
      lastError.current = undefined;
      setErrorMessage("");
      return;
    }
    try {
      const message = (stream.error as any).message;
      if (!message || lastError.current === message) {
        // Message has already been logged. do not modify ref, return early.
        return;
      }

      // Message is defined, and it has not been logged yet. Save it, and send the error
      lastError.current = message;
      setErrorMessage(message);
      toast.error("An error occurred. Please try again.", {
        description: (
          <p>
            <strong>Error:</strong> <code>{message}</code>
          </p>
        ),
        richColors: true,
        closeButton: true,
      });
    } catch {
      // no-op
    }
  }, [stream.error]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const content = inputValue.trim();

    setHasInput(false);
    setInputValue(""); // Clear the input after submission
    if (!agentId) return;
    if ((content.length === 0 && contentBlocks.length === 0) || isLoading)
      return;

    const newHumanMessage: Message = {
      id: uuidv4(),
      type: "human",
      content: [
        ...(content.trim().length > 0 ? [{ type: "text", text: content }] : []),
        ...contentBlocks,
      ] as Message["content"],
    };

    const toolMessages = ensureToolCallsHaveResponses(stream.messages);
    const { getAgentConfig } = useConfigStore.getState();

    stream.submit(
      { messages: [...toolMessages, newHumanMessage] },
      {
        streamMode: ["values"],
        optimisticValues: (prev) => ({
          ...prev,
          messages: [
            ...(prev.messages ?? []),
            ...toolMessages,
            newHumanMessage,
          ],
        }),
        config: {
          configurable: {
            ...getAgentConfig(agentId),
            apiKeys,
          },
        },
        metadata: {
          supabaseAccessToken: session?.accessToken,
        },
        streamSubgraphs: true,
        streamResumable: true,
      },
    );

    setContentBlocks([]);
  };

  const handleRegenerate = (
    parentCheckpoint: Checkpoint | null | undefined,
    optimisticValues?: (prev: { messages?: Message[] }) => {
      messages?: Message[] | undefined;
    },
  ) => {
    if (!agentId) return;
    const { getAgentConfig } = useConfigStore.getState();

    stream.submit(undefined, {
      checkpoint: parentCheckpoint,
      streamMode: ["values"],
      config: {
        configurable: {
          ...getAgentConfig(agentId),
          apiKeys,
        },
      },
      optimisticValues,
      metadata: {
        supabaseAccessToken: session?.accessToken,
      },
      streamSubgraphs: true,
      streamResumable: true,
    });
  };

  const hasMessages = messages.length > 0;
  const hasNoAIOrToolMessages = !messages.find(
    (m) => m.type === "ai" || m.type === "tool",
  );

  return (
    <div className="flex h-full w-full overflow-hidden">
      <StickToBottom className="relative flex-1 overflow-hidden">
        <StickyToBottomContent
          className={cn(
            "absolute inset-0 overflow-y-auto px-4",
            !hasMessages &&
              !threadId &&
              "mt-[25vh] flex flex-col items-stretch",
            (hasMessages || threadId) && "grid grid-rows-[1fr_auto]",
          )}
          contentClassName="pt-8 pb-16 max-w-3xl mx-auto flex flex-col gap-4 w-full"
          content={
            <>
              {!hasMessages && threadId ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-muted-foreground flex items-center gap-2">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    <span>Loading thread...</span>
                  </div>
                </div>
              ) : (
                <>
                  {messages
                    .filter((m) => !m.id?.startsWith(DO_NOT_RENDER_ID_PREFIX))
                    .map((message, index) =>
                      message.type === "human" ? (
                        <HumanMessage
                          key={message.id || `${message.type}-${index}`}
                          message={message}
                          isLoading={isLoading}
                        />
                      ) : (
                        <AssistantMessage
                          key={message.id || `${message.type}-${index}`}
                          message={message}
                          isLoading={isLoading}
                          handleRegenerate={handleRegenerate}
                        />
                      ),
                    )}
                  {/* Special rendering case where there are no AI/tool messages, but there is an interrupt.
                      We need to render it outside of the messages list, since there are no messages to render */}
                  {hasNoAIOrToolMessages && !!stream.interrupt && (
                    <AssistantMessage
                      key="interrupt-msg"
                      message={undefined}
                      isLoading={isLoading}
                      handleRegenerate={handleRegenerate}
                    />
                  )}
                  {isLoading && <AssistantMessageLoading />}
                  {errorMessage && (
                    <Alert variant="destructive">
                      <AlertCircle className="size-4" />
                      <AlertTitle>An error occurred:</AlertTitle>
                      <AlertDescription>{errorMessage}</AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </>
          }
          footer={
            <div className="bg-background sticky bottom-0 flex flex-col items-center gap-8">
              {!hasMessages && !threadId && (
                <div className="flex items-center gap-3">
                  <LangGraphLogoSVG className="h-8 flex-shrink-0" />
                  <h1 className="text-2xl font-semibold tracking-tight">
                    Open Agent Platform
                  </h1>
                </div>
              )}

              <ScrollToBottom className="animate-in fade-in-0 zoom-in-95 absolute bottom-full left-1/2 mb-4 -translate-x-1/2" />

              <div
                ref={dropRef}
                className={cn(
                  "relative z-10 mx-auto mb-8 w-full max-w-3xl transition-all",
                  dragOver ? "border-primary border-2 border-dotted" : "",
                )}
              >
                <Composer
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    setHasInput(!!e.target.value.trim());
                  }}
                  onSubmit={handleSubmit}
                  onPaste={handlePaste}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      !e.shiftKey &&
                      !e.nativeEvent.isComposing
                    ) {
                      e.preventDefault();
                      const form = e.currentTarget.closest("form");
                      form?.requestSubmit();
                    }
                  }}
                  placeholder="Type your message..."
                  disabled={isLoading || requiresApiKeysButNotSet(hasApiKeys)}
                  isLoading={stream.isLoading}
                  contentBlocks={contentBlocks}
                  onRemoveBlock={removeBlock}
                  onFileUpload={handleFileUpload}
                />
              </div>
            </div>
          }
        />
      </StickToBottom>
    </div>
  );
}
