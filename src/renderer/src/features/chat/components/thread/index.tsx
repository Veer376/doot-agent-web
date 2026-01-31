import { v4 as uuidv4 } from "uuid";
import React, {
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  Component,
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
import { useQueryState } from "@/hooks/use-query-state";
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
import { DootLogoIcon } from "@/components/icons";
import { PreviewPanel } from "./PreviewPanel";
import { WorkspaceSelect } from "./workspace-select";
import { EnhancedLoader } from "@/components/ai-elements/enhanced-loader";
import {
  useThreadUpdate,
  useFetchCloudThreads,
  useThreadState,
  cloudThreadKeys as threadKeys,
} from "@/hooks/use-cloud-threads";
import { useQueryClient } from "@tanstack/react-query";
import { useComposerDraft } from "@/hooks/use-composer-draft";
import { AuthDialog } from "@/components/auth/auth-dialog";
import { usePendingMessage } from "@/hooks/use-pending-message";
import { useThreadModel } from "@/hooks/use-thread-model";
import { AVAILABLE_MODELS, type Model } from "@/types/model";
import { PromptGallery } from "@/components/ui/prompt-gallery";

// Error Boundary for Chat Components
class ChatErrorBoundary extends Component<
  { children: ReactNode; context?: string },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; context?: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      `[ChatErrorBoundary${this.props.context ? ` - ${this.props.context}` : ""}] Error caught:`,
      error,
      errorInfo,
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert variant="destructive">
          <AlertCircleIconHuge className="size-4" />
          <AlertTitle>
            Component Error {this.props.context && `(${this.props.context})`}
          </AlertTitle>
          <AlertDescription>
            <p>{this.state.error?.message || "An unexpected error occurred"}</p>
            <details className="mt-2 text-xs opacity-70">
              <summary className="cursor-pointer">Stack trace</summary>
              <pre className="mt-1 overflow-auto whitespace-pre-wrap">
                {this.state.error?.stack}
              </pre>
            </details>
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}

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
      className={cn("cursor-pointer hover:bg-secondary", props.className)}
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
  const { agentId, agentSource, setSelectedAgent } = useAgentContext();
  const [threadId] = useQueryState("threadId");
  const [inputValue, setInputValue] = useState("");
  // Temporary workspace path for new threads
  const [tempWorkspace, setTempWorkspace] = useState<string | null>(null);

  // Auth state for pending message flow
  const { isAuthenticated } = useAuthSession();
  const { pendingMessage, setPendingMessage, consumePendingMessage } =
    usePendingMessage();
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

  const { apiKeys } = useApiKeys();
  const hasApiKeys = useHasApiKeys();

  const { session } = useAuthSession();

  // Model selection for this thread
  const { selectedModel, selectModel } = useThreadModel();

  const stream = useStreamContext();
  const messages = stream.messages;
  const isLoading = stream.isLoading;

  const { isLoading: isLoadingThreadState } = useThreadState(threadId);

  const queryClient = useQueryClient();

  // Hook for updating thread metadata
  const { mutate: updateThread } = useThreadUpdate();

  // Fetch all threads to access thread metadata
  const { data: threads = [] } = useFetchCloudThreads();

  // Track the last saved agent to avoid redundant updates
  const lastSavedMetadataRef = useRef<{
    agentId: string;
    modelId?: string | null;
  } | null>(null);
  // Track which thread has been initialized to prevent race conditions
  const threadInitializedRef = useRef<string | null>(null);

  // Restore agent from thread metadata when thread changes
  // Only restore on threadId change, not when user changes agent
  useEffect(() => {
    if (!threadId || !threads.length) {
      // Reset tracking when no thread
      threadInitializedRef.current = null;
      lastSavedMetadataRef.current = null;
      return;
    }

    // Prevent race condition: only restore metadata once per thread
    if (threadInitializedRef.current === threadId) {
      return;
    }

    const currentThread = threads.find((t) => t.thread_id === threadId);
    if (!currentThread?.metadata) return;

    const { assistant_id, model_id } = currentThread.metadata;

    // Track what's saved in this thread
    if (typeof assistant_id === "string") {
      lastSavedMetadataRef.current = {
        agentId: assistant_id,
        modelId: typeof model_id === "string" ? model_id : null,
      };
    }

    // Restore agent if saved in metadata
    if (typeof assistant_id === "string") {
      setSelectedAgent(assistant_id);
    }

    // Restore model if saved in metadata
    if (typeof model_id === "string" && model_id) {
      const modelToRestore = AVAILABLE_MODELS.find((m) => m.id === model_id);
      if (modelToRestore) {
        selectModel(modelToRestore);
      }
    } else {
      // Clear model selection if not saved in thread
      selectModel(null as unknown as Model);
    }

    // Mark this thread as initialized to prevent re-running restoration
    threadInitializedRef.current = threadId;
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
        const content = consumePendingMessage();

        if (!content || content.trim().length === 0) {
          return;
        }

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

        // Use the selected agent ID
        const effectiveAgentId = agentId;

        // Skip if no agent is selected
        if (!effectiveAgentId) {
          return;
        }

        stream.submit(
          { messages: [...toolMessages, newHumanMessage] },
          {
            streamMode: ["values"],
            optimisticValues: (prev: any) => ({
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
            context: {},
            metadata: {
              supabaseAccessToken: session?.accessToken,
              workspacePath: tempWorkspace,
            },
            streamSubgraphs: true,
            streamResumable: true,
          },
        );

        setContentBlocks([]);

        // Save agent to thread metadata after message is sent
        if (threadId) {
          const hasChanged =
            !lastSavedMetadataRef.current ||
            lastSavedMetadataRef.current.agentId !== agentId ||
            lastSavedMetadataRef.current.modelId !== selectedModel?.id;

          if (hasChanged) {
            updateThread({
              threadId,
              metadata: {
                assistant_id: agentId,
                ...(selectedModel?.id && { model_id: selectedModel.id }),
              },
            });
            lastSavedMetadataRef.current = {
              agentId,
              modelId: selectedModel?.id || null,
            };
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
    contentBlocks,
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
      const message =
        stream.error instanceof Error
          ? stream.error.message
          : "Stream error occurred";
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

  // Handle auth requirement - store pending message, then show dialog
  const handleAuthRequired = (message: string) => {
    setPendingMessage(message);
    setAuthDialogOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const content = inputValue.trim();

    setInputValue("");
    clearDraft(threadId);
    if (!agentId) {
      console.error("[Thread] No agentId - returning");
      return;
    }
    if ((content.length === 0 && contentBlocks.length === 0) || isLoading) {
      return;
    }

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

    stream.submit(
      { messages: [...toolMessages, newHumanMessage] },
      {
        streamMode: ["values"],
        optimisticValues: (prev: any) => ({
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
          workspacePath: tempWorkspace,
        },
        streamSubgraphs: true,
        streamResumable: true,
      },
    );

    setContentBlocks([]);

    // Save agent to thread metadata after message is sent
    if (threadId) {
      const hasChanged =
        !lastSavedMetadataRef.current ||
        lastSavedMetadataRef.current.agentId !== agentId ||
        lastSavedMetadataRef.current.modelId !== selectedModel?.id;

      if (hasChanged) {
        updateThread({
          threadId,
          metadata: {
            assistant_id: agentId,
            ...(selectedModel?.id && { model_id: selectedModel.id }),
          },
        });
        lastSavedMetadataRef.current = {
          agentId,
          modelId: selectedModel?.id || null,
        };
      }

      // Invalidate thread state queries to ensure the next thread load will fetch fresh data
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
      context: {},
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
                  <div className="flex items-center gap-2 text-muted-foreground">
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
                        <ChatErrorBoundary
                          key={`ai-turn-${turn.startIndex}`}
                          context={`AITurn-${turn.startIndex}`}
                        >
                          <AITurn
                            turnMessages={turn.messages}
                            lastHumanIndex={turn.lastHumanIndex}
                            allMessages={messages}
                            isLoading={turnIsLoading}
                            handleRegenerate={handleRegenerate}
                          />
                        </ChatErrorBoundary>
                      );
                    }
                  })}
                  {/* Special rendering case where there are no AI/tool messages, but there is an interrupt.
                      We need to render it outside of the messages list, since there are no messages to render */}
                  {hasNoAIOrToolMessages && !!stream.interrupt && (
                    <ChatErrorBoundary context="InterruptAITurn">
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
                    </ChatErrorBoundary>
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
            <div className="sticky bottom-0 z-10 flex flex-col items-center bg-gradient-to-b from-transparent from-0% to-background to-40%">
              {/* Expose isAtBottom/scrollToBottom to the parent via ref */}
              <StickApi ref={stickApiRef} />

              {/* Title section with independent spacing */}
              {!hasMessages && !threadId && (
                <div className="mb-10 flex items-center gap-3">
                  <DootLogoIcon size={32} />
                  <h1 className="text-2xl font-semibold tracking-tight">
                    What's your boring task for today ?
                  </h1>
                </div>
              )}

              {/* Components group with larger gap */}
              <div className="flex w-full flex-col items-center gap-3">
                <ScrollToBottom className="absolute bottom-full right-4 mb-4" />

                {/* Browser Preview Panel - Floating above Composer */}
                <ChatErrorBoundary context="PreviewPanel">
                  <PreviewPanel />
                </ChatErrorBoundary>

                {/* Workspace Selection - Only for Local Agent */}
                {agentId === "local-agent" && (
                  <div className="w-full max-w-2xl px-1 pb-1">
                    <WorkspaceSelect
                      threadId={threadId}
                      className="justify-start"
                      onWorkspaceSelect={setTempWorkspace}
                    />
                  </div>
                )}

                <div
                  ref={dropRef}
                  className={cn(
                    "relative z-20 mx-auto w-full min-w-0 max-w-2xl pb-4 transition-all",
                    dragOver ? "border-2 border-dotted border-primary" : "",
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
                    selectedModel={selectedModel}
                    onModelSelect={selectModel}
                  />

                  {/* Prompt Template Gallery - only show when no thread */}
                  {/* {!threadId && messages.length === 0 && (
                    <div
                      className="mx-auto mt-6"
                      style={{ width: "85%" }}
                    >
                      <PromptGallery
                        templates={DUMMY_PROMPTS}
                        onPromptClick={(template) => {
                          setInputValue(template.prompt);
                        }}
                      />
                    </div>
                  )} */}
                </div>
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
        onClearPendingMessage={() => setPendingMessage(null)}
      />
    </div>
  );
}
