"use client";

/**
 * Stream manager for handling SSE stream state.
 * Ported from @langchain/langgraph-sdk/ui/manager.js
 */

import type { Message } from "@langchain/langgraph-sdk";
import type {
  StreamState,
  StreamStartOptions,
  UseStreamOptions,
} from "./types";
import { MessageTupleManager } from "./message-manager";

type Listener = () => void;

/**
 * Manages stream state with React's useSyncExternalStore pattern.
 * Handles starting/stopping streams, updating values, and notifying subscribers.
 */
export class StreamManager<StateType extends Record<string, unknown>> {
  private state: StreamState<StateType> = {
    values: null,
    error: undefined,
    isLoading: false,
  };

  private listeners: Set<Listener> = new Set();
  private abortController: AbortController | null = null;
  private messageManager: MessageTupleManager;

  constructor(messageManager: MessageTupleManager) {
    this.messageManager = messageManager;
  }

  // React useSyncExternalStore pattern
  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): StreamState<StateType> => {
    return this.state;
  };

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }

  private setState(update: Partial<StreamState<StateType>>): void {
    this.state = { ...this.state, ...update };
    this.notify();
  }

  // Getters for convenience
  get values(): StateType | null {
    return this.state.values;
  }

  get error(): unknown {
    return this.state.error;
  }

  get isLoading(): boolean {
    return this.state.isLoading;
  }

  /**
   * Set stream values with an updater function.
   */
  setStreamValues(updater: () => StateType): void {
    this.setState({ values: updater() });
  }

  /**
   * Clear all stream state.
   */
  clear = (): void => {
    this.messageManager.clear();
    this.setState({
      values: null,
      error: undefined,
      isLoading: false,
    });
  };

  /**
   * Stop the current stream.
   */
  stop = async (
    historyValues: StateType,
    options?: {
      onStop?: (args: {
        mutate: (
          update:
            | Partial<StateType>
            | ((prev: StateType) => Partial<StateType>),
        ) => void;
      }) => void;
    },
  ): Promise<void> => {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    this.setState({ isLoading: false });

    if (options?.onStop) {
      options.onStop({
        mutate: (update) => {
          const current = this.state.values ?? historyValues;
          const newValues =
            typeof update === "function"
              ? { ...current, ...update(current) }
              : { ...current, ...update };
          this.setState({ values: newValues });
        },
      });
    }
  };

  /**
   * Start a new stream.
   */
  start = async (
    streamFn: (signal: AbortSignal) => Promise<
      AsyncIterable<{
        event: string;
        data: unknown;
      }>
    >,
    options: StreamStartOptions<StateType>,
  ): Promise<void> => {
    // Cancel any existing stream
    if (this.abortController) {
      this.abortController.abort();
    }

    this.abortController = new AbortController();
    const { signal } = this.abortController;

    this.setState({ isLoading: true, error: undefined });

    try {
      const stream = await streamFn(signal);

      for await (const event of stream) {
        if (signal.aborted) break;

        await this.handleStreamEvent(event, options);
      }

      // Stream completed successfully
      const result = await options.onSuccess();
      if (result !== undefined) {
        this.setState({ values: result });
      }
    } catch (error) {
      if (signal.aborted) {
        // Intentional abort, not an error
        return;
      }

      this.setState({ error });
      options.onError(error);
    } finally {
      options.onFinish();
      this.setState({ isLoading: false });
      this.abortController = null;
    }
  };

  /**
   * Handle individual stream events.
   */
  private async handleStreamEvent(
    event: { event: string; data: unknown },
    options: StreamStartOptions<StateType>,
  ): Promise<void> {
    const { getMessages, setMessages, callbacks } = options;

    switch (event.event) {
      case "values": {
        const data = event.data as StateType;
        this.setState({ values: data });
        break;
      }

      case "messages": {
        // Current LangGraph messages-tuple streams emit one tuple per event:
        // [messageChunk, metadata]. Merge chunks by message ID so React sees
        // the assistant response grow while the run is still active.
        const data = event.data as [
          Message,
          Record<string, unknown> | undefined,
        ];
        if (!Array.isArray(data) || !data[0]) break;

        const [message, metadata] = data;
        const currentValues = this.state.values ?? options.initialValues;
        const currentMessages = getMessages(currentValues);
        const managed = this.messageManager.add(
          message,
          metadata,
          currentMessages.length,
        );

        if (!managed) break;

        let updatedMessages = [...currentMessages];
        const existingIndex = updatedMessages.findIndex(
          (item) => item.id === managed.id,
        );
        const targetIndex =
          existingIndex >= 0
            ? existingIndex
            : (managed.index ?? updatedMessages.length);

        if (managed.message.type === "remove") {
          if (managed.id === "__remove_all__") {
            updatedMessages = [];
          } else if (existingIndex >= 0) {
            updatedMessages.splice(existingIndex, 1);
          }
        } else if (targetIndex < updatedMessages.length) {
          updatedMessages[targetIndex] = managed.message;
        } else {
          updatedMessages.push(managed.message);
        }

        const newValues = setMessages(currentValues, updatedMessages);
        this.setState({ values: newValues });
        break;
      }

      case "messages/partial": {
        // Handle message chunks during streaming
        const data = event.data as Array<[Message, Record<string, unknown>]>;
        const currentValues = this.state.values ?? options.initialValues;
        const currentMessages = getMessages(currentValues);

        const updatedMessages = [...currentMessages];

        for (const [message, metadata] of data) {
          const messageId = message.id;
          if (!messageId) continue;

          // Track message metadata
          this.messageManager.set(messageId, message, metadata);

          // Update or add message
          const existingIndex = updatedMessages.findIndex(
            (m) => m.id === messageId,
          );
          if (existingIndex >= 0) {
            updatedMessages[existingIndex] = message;
          } else {
            updatedMessages.push(message);
          }
        }

        const newValues = setMessages(currentValues, updatedMessages);
        this.setState({ values: newValues });
        break;
      }

      case "messages/complete": {
        // Handle complete messages
        const data = event.data as Array<[Message, Record<string, unknown>]>;
        const currentValues = this.state.values ?? options.initialValues;
        const currentMessages = getMessages(currentValues);

        const updatedMessages = [...currentMessages];

        for (const [message, metadata] of data) {
          const messageId = message.id;
          if (!messageId) continue;

          this.messageManager.set(messageId, message, metadata);

          const existingIndex = updatedMessages.findIndex(
            (m) => m.id === messageId,
          );
          if (existingIndex >= 0) {
            updatedMessages[existingIndex] = message;
          } else {
            updatedMessages.push(message);
          }
        }

        const newValues = setMessages(currentValues, updatedMessages);
        this.setState({ values: newValues });
        break;
      }

      case "updates": {
        // Handle state updates
        const data = event.data as {
          namespace?: string[];
          data: Partial<StateType>;
        };
        if (callbacks.onUpdateEvent) {
          callbacks.onUpdateEvent(data.data, {
            namespace: data.namespace,
            mutate: (update) => {
              const current = this.state.values ?? options.initialValues;
              const newValues =
                typeof update === "function"
                  ? { ...current, ...update(current) }
                  : { ...current, ...update };
              this.setState({ values: newValues });
            },
          });
        }
        break;
      }

      case "custom": {
        // Handle custom events
        const data = event.data as { namespace?: string[]; data: unknown };
        if (callbacks.onCustomEvent) {
          callbacks.onCustomEvent(data.data, {
            namespace: data.namespace,
            mutate: (update) => {
              const current = this.state.values ?? options.initialValues;
              const newValues =
                typeof update === "function"
                  ? { ...current, ...update(current) }
                  : { ...current, ...update };
              this.setState({ values: newValues });
            },
          });
        }
        break;
      }

      case "metadata": {
        if (callbacks.onMetadataEvent) {
          callbacks.onMetadataEvent(event.data);
        }
        break;
      }

      case "events": {
        if (callbacks.onLangChainEvent) {
          callbacks.onLangChainEvent(event.data);
        }
        break;
      }

      case "debug": {
        const data = event.data as { namespace?: string[] };
        if (callbacks.onDebugEvent) {
          callbacks.onDebugEvent(event.data, { namespace: data.namespace });
        }
        break;
      }

      case "error": {
        const error = event.data;
        this.setState({ error });
        break;
      }

      default:
        // Unknown event type, ignore
        break;
    }
  }
}
