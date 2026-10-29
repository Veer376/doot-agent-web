"use client";

/**
 * Message tuple manager for tracking message metadata during streaming.
 * Ported from @langchain/langgraph-sdk/ui/messages.js
 */

import type { Message } from "@langchain/langgraph-sdk";
import {
  MessageTupleManager as SDKMessageTupleManager,
  toMessageDict,
} from "@langchain/langgraph-sdk/ui";

interface MessageData {
  id: string;
  message: Message;
  metadata: Record<string, unknown>;
  index?: number;
}

/**
 * Manages message tuples and their metadata during streaming.
 * Tracks which messages have been seen and their streaming metadata.
 */
export class MessageTupleManager {
  private manager = new SDKMessageTupleManager();

  /**
   * Add a streamed message tuple and merge chunks that share an ID.
   * LangGraph's current messages-tuple stream mode emits
   * [messageChunk, metadata]. The SDK manager understands LangChain message
   * chunk concatenation, including structured content and tool-call chunks.
   */
  add(
    message: Message,
    metadata?: Record<string, unknown>,
    defaultIndex?: number,
  ): MessageData | undefined {
    const messageId = this.manager.add(message, metadata);
    if (!messageId) return undefined;

    const data = this.manager.get(messageId, defaultIndex);
    if (!data?.chunk) return undefined;

    return {
      id: messageId,
      message: toMessageDict(data.chunk) as Message,
      metadata: data.metadata ?? metadata ?? {},
      index: data.index,
    };
  }

  /**
   * Set message data for a message ID.
   */
  set(
    messageId: string,
    message: Message,
    metadata?: Record<string, unknown>,
  ): void {
    void messageId;
    this.manager.add(message, metadata);
  }

  /**
   * Get message data for a message ID.
   */
  get(
    messageId: string | undefined,
    defaultIndex?: number,
  ): MessageData | undefined {
    if (!messageId) return undefined;
    const data = this.manager.get(messageId, defaultIndex);
    if (!data?.chunk) return undefined;

    return {
      id: messageId,
      message: toMessageDict(data.chunk) as Message,
      metadata: data.metadata ?? {},
      index: data.index,
    };
  }

  /**
   * Check if a message ID exists.
   */
  has(messageId: string): boolean {
    return this.manager.get(messageId) != null;
  }

  /**
   * Clear all message data.
   */
  clear(): void {
    this.manager.clear();
  }

  /**
   * Update metadata for a message.
   */
  updateMetadata(messageId: string, metadata: Record<string, unknown>): void {
    const existing = this.manager.get(messageId);
    if (!existing?.chunk) return;
    this.manager.add(toMessageDict(existing.chunk) as Message, {
      ...(existing.metadata ?? {}),
      ...metadata,
    });
  }
}
