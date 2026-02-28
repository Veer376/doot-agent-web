"use client";

/**
 * Message tuple manager for tracking message metadata during streaming.
 * Ported from @langchain/langgraph-sdk/ui/messages.js
 */

import type { Message } from "@langchain/langgraph-sdk";

interface MessageData {
  id: string;
  message: Message;
  metadata: Record<string, unknown>;
}

/**
 * Manages message tuples and their metadata during streaming.
 * Tracks which messages have been seen and their streaming metadata.
 */
export class MessageTupleManager {
  private messages: Map<string, MessageData> = new Map();

  /**
   * Set message data for a message ID.
   */
  set(
    messageId: string,
    message: Message,
    metadata?: Record<string, unknown>,
  ): void {
    this.messages.set(messageId, {
      id: messageId,
      message,
      metadata: metadata ?? {},
    });
  }

  /**
   * Get message data for a message ID.
   */
  get(messageId: string | undefined): MessageData | undefined {
    if (!messageId) return undefined;
    return this.messages.get(messageId);
  }

  /**
   * Check if a message ID exists.
   */
  has(messageId: string): boolean {
    return this.messages.has(messageId);
  }

  /**
   * Clear all message data.
   */
  clear(): void {
    this.messages.clear();
  }

  /**
   * Update metadata for a message.
   */
  updateMetadata(messageId: string, metadata: Record<string, unknown>): void {
    const existing = this.messages.get(messageId);
    if (existing) {
      existing.metadata = { ...existing.metadata, ...metadata };
    }
  }
}
