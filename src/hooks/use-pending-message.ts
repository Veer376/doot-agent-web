import { useState, useCallback } from "react";

const PENDING_MESSAGE_KEY = "orbit-pending-message";

export type PendingMessageMode = "chat" | "agent";

interface PendingMessageData {
  message: string;
  mode: PendingMessageMode;
  timestamp: number;
}

/**
 * Custom hook to persist pending messages using localStorage.
 * Survives component remounts and auto-clears after consumption.
 * Also stores the mode (chat/agent) that was active when the message was set.
 */
export function usePendingMessage() {
  // Load from localStorage synchronously during initialization
  // Guard against SSR where localStorage is not available
  const [pendingData, setPendingDataState] = useState<{ message: string; mode: PendingMessageMode } | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem(PENDING_MESSAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as PendingMessageData;
        return { message: parsed.message, mode: parsed.mode ?? "chat" };
      } catch (error) {
        console.error("[usePendingMessage] Failed to parse stored message:", error);
        localStorage.removeItem(PENDING_MESSAGE_KEY);
        return null;
      }
    }
    return null;
  });

  // Set pending message with mode and persist to localStorage
  const setPendingMessage = useCallback((message: string | null, mode: PendingMessageMode = "chat") => {
    if (message) {
      setPendingDataState({ message, mode });
    } else {
      setPendingDataState(null);
    }
    
    if (typeof window === "undefined") return;
    
    if (message) {
      const data: PendingMessageData = { message, mode, timestamp: Date.now() };
      localStorage.setItem(PENDING_MESSAGE_KEY, JSON.stringify(data));
    } else {
      localStorage.removeItem(PENDING_MESSAGE_KEY);
    }
  }, []);

  // Consume and clear the pending message, returning both message and mode
  const consumePendingMessage = useCallback((): { message: string; mode: PendingMessageMode } | null => {
    const data = pendingData;
    
    // Clear from both state and storage
    setPendingDataState(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(PENDING_MESSAGE_KEY);
    }
    
    return data;
  }, [pendingData]);

  return {
    pendingMessage: pendingData?.message ?? null,
    pendingMode: pendingData?.mode ?? null,
    setPendingMessage,
    consumePendingMessage,
  };
}
