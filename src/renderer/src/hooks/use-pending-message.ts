import { useState, useCallback } from "react";

const PENDING_MESSAGE_KEY = "doot-pending-message";

interface PendingMessageData {
  message: string;
  timestamp: number;
}

/**
 * Custom hook to persist pending messages using localStorage.
 * Survives component remounts and auto-clears after consumption.
 */
export function usePendingMessage() {
  // Load from localStorage synchronously during initialization
  // Guard against SSR where localStorage is not available
  const [pendingData, setPendingDataState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem(PENDING_MESSAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as PendingMessageData;
        return parsed.message;
      } catch (error) {
        console.error("[usePendingMessage] Failed to parse stored message:", error);
        localStorage.removeItem(PENDING_MESSAGE_KEY);
        return null;
      }
    }
    return null;
  });

  // Set pending message and persist to localStorage
  const setPendingMessage = useCallback((message: string | null) => {
    setPendingDataState(message);

    if (typeof window === "undefined") return;

    if (message) {
      const data: PendingMessageData = { message, timestamp: Date.now() };
      localStorage.setItem(PENDING_MESSAGE_KEY, JSON.stringify(data));
    } else {
      localStorage.removeItem(PENDING_MESSAGE_KEY);
    }
  }, []);

  // Consume and clear the pending message
  const consumePendingMessage = useCallback((): string | null => {
    const data = pendingData;

    // Clear from both state and storage
    setPendingDataState(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(PENDING_MESSAGE_KEY);
    }

    return data;
  }, [pendingData]);

  return {
    pendingMessage: pendingData,
    setPendingMessage,
    consumePendingMessage,
  };
}
