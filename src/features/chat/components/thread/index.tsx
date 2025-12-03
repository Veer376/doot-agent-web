import { v4 as uuidv4 } from "uuid";
import React, {
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";
import { cn } from "@/lib/utils";
import { useStreamContext } from "@/features/chat/providers/Stream";
import { useAgentContext } from "@/providers/Agent";
import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Checkpoint, Message } from "@langchain/langgraph-sdk";
import { HumanMessage } from "@/features/chat/components/thread/messages/human";
import { AITurn } from "@/features/chat/components/thread/messages/ai-turn";
import {
  LoaderIcon,
  AlertCircleIconHuge,
  MessageSquareIcon,
} from "@/components/icons";
import { ArrowDownIcon } from "@/components/icons";
import { EmptyState } from "@/components/ui/empty-state";
import { useQueryState } from "nuqs";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
import { toast } from "sonner";
import { ensureToolCallsHaveResponses } from "@/features/chat/utils/tool-responses";
import { DO_NOT_RENDER_ID_PREFIX } from "@/constants";
import { useConfigStore } from "../../hooks/use-config-store";
import { useAuthSession } from "@/providers/Auth";
import { requiresApiKeysButNotSet } from "@/lib/agent-utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useApiKeys, useHasApiKeys } from "@/hooks/use-api-keys";
import { Composer } from "./composer";
import { DootIcon } from "@/components/icons";
import { PreviewPanel } from "./PreviewPanel";
import { EnhancedLoader } from "@/components/ai-elements/enhanced-loader";
import {
  useUpdateThread,
  useFetchThreads,
  useFetchThreadState,
  threadKeys,
} from "@/hooks/use-threads";
import { useQueryClient } from "@tanstack/react-query";
import { useComposerDraft } from "@/hooks/use-composer-draft";
import { AuthDialog } from "@/components/auth/auth-dialog";
import { usePendingMessage } from "@/hooks/use-pending-message";

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
      variant="secondary"
      size="icon"
      data-radius="radius2"
      className={cn("hover:bg-secondary cursor-pointer", props.className)}
      onClick={() => scrollToBottom()}
    >
      <ArrowDownIcon />
    </Button>
  );
}

// Helper function to group messages into turns
type MessageTurn =
  | { type: "human"; message: Message; index: number }
  | {
      type: "ai-turn";
      messages: Message[];
      startIndex: number;
      endIndex: number;
      lastHumanIndex: number;
    };

function groupMessagesIntoTurns(messages: Message[]): MessageTurn[] {
  const turns: MessageTurn[] = [];
  let i = 0;
  let lastHumanIndex = -1;

  while (i < messages.length) {
    const msg = messages[i];

    if (msg.type === "human") {
      lastHumanIndex = i;
      turns.push({ type: "human", message: msg, index: i });
      i++;
    } else if (msg.type === "ai" || msg.type === "tool") {
      // Start collecting AI turn
      const start = i;
      const turnMessages: Message[] = [];

      while (
        i < messages.length &&
        (messages[i].type === "ai" || messages[i].type === "tool")
      ) {
        turnMessages.push(messages[i]);
        i++;
      }

      turns.push({
        type: "ai-turn",
        messages: turnMessages,
        startIndex: start,
        endIndex: i - 1,
        lastHumanIndex: lastHumanIndex,
      });
    } else {
      // Unknown message type, skip
      i++;
    }
  }

  return turns;
}

export function Thread() {
  // PHASE 3: Get agentId from context instead of URL
  const { agentId, mode, setSelectedAgent, setMode } = useAgentContext();
  const [threadId] = useQueryState("threadId");
  const [inputValue, setInputValue] = useState("");

  // Auth state for pending message flow
  const { isAuthenticated } = useAuthSession();
  const {
    pendingMessage,
    pendingMode,
    setPendingMessage,
    consumePendingMessage,
  } = usePendingMessage();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  // Auto-save composer drafts to localStorage
  const { clearDraft } = useComposerDraft(threadId, inputValue, setInputValue);

  const {
    contentBlocks,
    setContentBlocks,
    handleFileUpload,
    dropRef,
    removeBlock,
    dragOver,
    handlePaste,
  } = useFileUpload();

  const [selectedComposioProfiles, setSelectedComposioProfiles] = useState<
    string[]
  >([]);

  const { apiKeys } = useApiKeys();
  const hasApiKeys = useHasApiKeys();

  const { session } = useAuthSession();

  const stream = useStreamContext();
  const messages = stream.messages;
  const isLoading = stream.isLoading;

  const { isLoading: isLoadingThreadState } = useFetchThreadState(threadId);

  const queryClient = useQueryClient();

  // Hook for updating thread metadata
  const { mutate: updateThread } = useUpdateThread();

  // Fetch all threads to access thread metadata
  const { data: threads = [] } = useFetchThreads();

  // Track the last saved agent/mode to avoid redundant updates
  const lastSavedMetadataRef = useRef<{ agentId: string; mode: string } | null>(
    null,
  );

  // Restore agent/mode from thread metadata when thread changes
  // Only restore on threadId change, not when user changes agent/mode
  useEffect(() => {
    if (!threadId || !threads.length) {
      // Reset tracking when no thread
      lastSavedMetadataRef.current = null;
      return;
    }

    const currentThread = threads.find((t) => t.thread_id === threadId);
    if (!currentThread?.metadata) return;

    const { assistant_id, mode: threadMode } = currentThread.metadata;

    // Track what's saved in this thread
    if (
      typeof assistant_id === "string" &&
      typeof threadMode === "string" &&
      (threadMode === "agent" || threadMode === "chat")
    ) {
      lastSavedMetadataRef.current = {
        agentId: assistant_id,
        mode: threadMode,
      };
    }

    // Restore agent if saved in metadata
    if (typeof assistant_id === "string") {
      setSelectedAgent(assistant_id);
    }

    // Restore mode if saved in metadata
    if (threadMode && (threadMode === "agent" || threadMode === "chat")) {
      setMode(threadMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, threads]);

  // Handle cancellation of the current stream
  const handleCancel = useCallback(() => {
    stream.stop();
  }, [stream]);

  // Effect: Auto-submit pending message after authentication
  // This runs when component mounts after successful login
  useEffect(() => {
    // Only proceed if authenticated and there's a pending message from localStorage
    if (isAuthenticated && session?.accessToken && pendingMessage) {
      // Wait for StreamProvider to be fully ready
      const timeoutId = setTimeout(() => {
        // Consume the pending message (this will clear it from localStorage)
        const pendingData = consumePendingMessage();

        if (!pendingData || pendingData.message.trim().length === 0) {
          return;
        }

        const { message: content, mode: storedMode } = pendingData;

        // Restore the mode that was active when the message was stored
        if (storedMode && storedMode !== mode) {
          setMode(storedMode);
        }

        // In agent mode, we need an agentId selected
        // For agent mode without agentId, we'll use the primary agent (handled below)
        const effectiveMode = storedMode || mode;

        const newHumanMessage: Message = {
          id: uuidv4(),
          type: "human",
          content: [
            { type: "text", text: content },
            ...contentBlocks,
          ] as Message["content"],
        };

        const toolMessages = ensureToolCallsHaveResponses(stream.messages);
        const { getAgentConfig } = useConfigStore.getState();

        // Determine which agent config to use based on stored mode
        // In agent mode without a selected agent, the primary agent should already be selected by the agent context
        const effectiveAgentId =
          effectiveMode === "chat" ? "chat_agent" : agentId;

        // Skip if in agent mode but no agent is selected
        if (effectiveMode === "agent" && !effectiveAgentId) {
          return;
        }

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
                ...getAgentConfig(effectiveAgentId),
                apiKeys,
              },
            },
            context: {
              connection_ids: selectedComposioProfiles,
            },
            metadata: {
              supabaseAccessToken: session?.accessToken,
            },
            streamSubgraphs: true,
            streamResumable: true,
          },
        );

        setContentBlocks([]);

        // Save agent/mode to thread metadata after message is sent
        if (threadId) {
          const hasChanged =
            !lastSavedMetadataRef.current ||
            lastSavedMetadataRef.current.agentId !== agentId ||
            lastSavedMetadataRef.current.mode !== mode;

          if (hasChanged) {
            updateThread({
              threadId,
              metadata: {
                assistant_id: agentId,
                mode: mode,
              },
            });
            lastSavedMetadataRef.current = { agentId, mode };
          }

          queryClient.invalidateQueries({
            queryKey: threadKeys.state(threadId),
          });
        }

        const api = stickApiRef.current;
        if (api && !api.isAtBottom) {
          api.scrollToBottom();
        }
      }, 500); // Wait 500ms for StreamProvider to be fully ready

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [
    isAuthenticated,
    session,
    pendingMessage,
    stream,
    agentId,
    mode,
    setMode,
    contentBlocks,
    selectedComposioProfiles,
    apiKeys,
    threadId,
    updateThread,
    queryClient,
    consumePendingMessage,
  ]);

  const lastError = useRef<string | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState("");
  // Bridge to access StickToBottom API from within this component
  type StickApiHandle = { isAtBottom: boolean; scrollToBottom: () => void };
  const stickApiRef = useRef<StickApiHandle | null>(null);

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

  // Handle auth requirement - store pending message and mode, then show dialog
  const handleAuthRequired = (message: string) => {
    setPendingMessage(message, mode);
    setAuthDialogOpen(true);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const content = inputValue.trim();

    setInputValue(""); // Clear the input after submission
    clearDraft(threadId); // Clear the saved draft
    // In chat mode, agentId can be empty since we use chat_agent
    // In agent mode, we need an agentId selected
    if (mode === "agent" && !agentId) return;
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

    // Determine which agent config to use based on current mode
    // This MUST match the effectiveAgentId used in the stream connection
    // to ensure the submit goes to the same assistant the stream is connected to
    const effectiveAgentId = mode === "chat" ? "chat_agent" : agentId;

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
            ...getAgentConfig(effectiveAgentId),
            apiKeys,
          },
        },
        context: {
          connection_ids: selectedComposioProfiles,
        },
        metadata: {
          supabaseAccessToken: session?.accessToken,
        },
        streamSubgraphs: true,
        streamResumable: true,
      },
    );

    setContentBlocks([]);

    // Save agent/mode to thread metadata after message is sent
    // This captures the agent and mode used for this conversation
    // Only update if metadata has changed to avoid redundant API calls
    if (threadId) {
      const hasChanged =
        !lastSavedMetadataRef.current ||
        lastSavedMetadataRef.current.agentId !== agentId ||
        lastSavedMetadataRef.current.mode !== mode;

      if (hasChanged) {
        // For existing threads, update metadata only if changed
        updateThread({
          threadId,
          metadata: {
            assistant_id: agentId,
            mode: mode,
          },
        });
        // Update tracking
        lastSavedMetadataRef.current = { agentId, mode };
      }

      // Invalidate thread state cache after message send
      // This ensures the next thread load will fetch fresh data
      // The cache will be repopulated when the thread is revisited
      queryClient.invalidateQueries({
        queryKey: threadKeys.state(threadId),
      });
    }
    // Note: For new threads, the metadata will be set automatically
    // when the thread is created (via onThreadId callback in Stream.tsx)

    // If user submits while scrolled up, politely re-pin so they see the response
    const api = stickApiRef.current;
    if (api && !api.isAtBottom) {
      api.scrollToBottom();
    }
  };

  const handleRegenerate = (
    parentCheckpoint: Checkpoint | null | undefined,
    optimisticValues?: (prev: { messages?: Message[] }) => {
      messages?: Message[] | undefined;
    },
  ) => {
    if (!agentId) return;
    const { getAgentConfig } = useConfigStore.getState();

    // Determine which agent config to use based on current mode
    // This MUST match the effectiveAgentId used in the stream connection
    const effectiveAgentId = mode === "chat" ? "chat_agent" : agentId;

    stream.submit(undefined, {
      checkpoint: parentCheckpoint,
      streamMode: ["values"],
      config: {
        configurable: {
          ...getAgentConfig(effectiveAgentId),
          apiKeys,
        },
      },
      optimisticValues,
      context: {
        connection_ids: selectedComposioProfiles,
      },
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

  const StickApi = forwardRef<StickApiHandle>(function StickApi(_props, ref) {
    const { isAtBottom, scrollToBottom } = useStickToBottomContext();
    useImperativeHandle(ref, () => ({ isAtBottom, scrollToBottom }), [
      isAtBottom,
      scrollToBottom,
    ]);
    return null;
  });

  return (
    <div className="flex h-full w-full overflow-hidden">
      <StickToBottom className="relative min-w-0 flex-1 overflow-hidden">
        <StickyToBottomContent
          className={cn(
            "absolute inset-0 overflow-y-auto px-4 transition-all duration-500 ease-out",
            !hasMessages &&
              !threadId &&
              "mt-[25vh] flex flex-col items-stretch",
            (hasMessages || threadId) && "grid grid-rows-[1fr_auto]",
          )}
          contentClassName="pt-8 pb-12 max-w-3xl mx-auto flex flex-col gap-4 w-full"
          content={
            <>
              {!hasMessages && threadId && isLoadingThreadState ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-muted-foreground flex items-center gap-2">
                    <LoaderIcon className="h-4 w-4" />
                    <span>Loading thread...</span>
                  </div>
                </div>
              ) : !hasMessages && threadId ? (
                <div className="flex items-center justify-center py-16">
                  <EmptyState
                    icon={MessageSquareIcon}
                    title="No messages yet"
                    description="Start the conversation by sending your first message below"
                  />
                </div>
              ) : (
                <>
                  {groupMessagesIntoTurns(
                    messages
                      .filter((m) => !m.id?.startsWith(DO_NOT_RENDER_ID_PREFIX))
                      // Deduplicate consecutive messages with the same ID to prevent ghosting
                      .filter(
                        (m, i, arr) =>
                          i === 0 || !m.id || m.id !== arr[i - 1].id,
                      ),
                  ).map((turn, turnIndex, allTurns) => {
                    if (turn.type === "human") {
                      return (
                        <HumanMessage
                          key={turn.index}
                          message={turn.message}
                          isLoading={isLoading}
                        />
                      );
                    } else {
                      // Find the last human message index to determine which AI turn is actively loading
                      const lastHumanMessageIndex =
                        allTurns
                          .map((t, i) => (t.type === "human" ? t.index : -1))
                          .filter((i) => i !== -1)
                          .pop() ?? -1;

                      // This AI turn is loading only if we're loading AND it corresponds to the last human message
                      const turnIsLoading =
                        isLoading &&
                        turn.lastHumanIndex === lastHumanMessageIndex;

                      return (
                        <AITurn
                          key={`ai-turn-${turn.startIndex}`}
                          turnMessages={turn.messages}
                          lastHumanIndex={turn.lastHumanIndex}
                          allMessages={messages}
                          isLoading={turnIsLoading}
                          handleRegenerate={handleRegenerate}
                        />
                      );
                    }
                  })}
                  {/* Special rendering case where there are no AI/tool messages, but there is an interrupt.
                      We need to render it outside of the messages list, since there are no messages to render */}
                  {hasNoAIOrToolMessages && !!stream.interrupt && (
                    <AITurn
                      key="interrupt-ai-turn"
                      turnMessages={[]}
                      lastHumanIndex={
                        messages.length > 0 ? messages.length - 1 : -1
                      }
                      allMessages={messages}
                      isLoading={isLoading}
                      handleRegenerate={handleRegenerate}
                    />
                  )}
                  {/* Browser Snapshot moved to PreviewPanel above Composer */}
                  {isLoading && (
                    <div className="flex items-start justify-start">
                      <EnhancedLoader messages={messages} />
                    </div>
                  )}
                  {errorMessage && (
                    <Alert variant="destructive">
                      <AlertCircleIconHuge className="size-4" />
                      <AlertTitle>An error occurred:</AlertTitle>
                      <AlertDescription>{errorMessage}</AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </>
          }
          footer={
            <div className="to-background sticky bottom-0 z-10 flex flex-col items-center gap-3 bg-gradient-to-b from-transparent from-0% to-40%">
              {/* Expose isAtBottom/scrollToBottom to the parent via ref */}
              <StickApi ref={stickApiRef} />
              {!hasMessages && !threadId && (
                <div className="flex items-center gap-3">
                  <DootIcon />
                  <h1 className="text-2xl font-semibold tracking-tight">
                    DootAgent
                  </h1>
                </div>
              )}

              <ScrollToBottom className="animate-in fade-in-0 zoom-in-95 absolute right-[calc(50%-24rem)] bottom-full mb-4" />

              {/* Browser Preview Panel - Floating above Composer */}
              <PreviewPanel />

              <div
                ref={dropRef}
                className={cn(
                  "relative z-20 mx-auto w-full max-w-3xl min-w-0 pb-4 transition-all",
                  dragOver ? "border-primary border-2 border-dotted" : "",
                )}
              >
                <Composer
                  value={inputValue}
                  onChange={setInputValue}
                  onSubmit={isAuthenticated ? handleSubmit : undefined}
                  onAuthRequired={
                    !isAuthenticated ? handleAuthRequired : undefined
                  }
                  onCancel={handleCancel}
                  onPaste={handlePaste}
                  placeholder="Type your message..."
                  disabled={isLoading || requiresApiKeysButNotSet(hasApiKeys)}
                  isLoading={stream.isLoading}
                  contentBlocks={contentBlocks}
                  onRemoveBlock={removeBlock}
                  onFileUpload={handleFileUpload}
                  focusKey={threadId}
                  selectedComposioProfiles={selectedComposioProfiles}
                  onComposioSelectionChange={setSelectedComposioProfiles}
                />
              </div>
            </div>
          }
        />
      </StickToBottom>

      {/* Auth Dialog */}
      <AuthDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        mode="signin"
        pendingMessage={pendingMessage || undefined}
      />
    </div>
  );
}
