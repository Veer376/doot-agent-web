import { useState, useCallback } from "react";

const PENDING_MESSAGE_KEY = "orbit-pending-message";

/**
 * Custom hook to persist pending messages using localStorage.
 * Survives component remounts and auto-clears after consumption.
 */
export function usePendingMessage() {
  // Load from localStorage synchronously during initialization
  const [pendingMessage, setPendingMessageState] = useState<string | null>(() => {
    const stored = localStorage.getItem(PENDING_MESSAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored).message;
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
    setPendingMessageState(message);
    
    if (message) {
      localStorage.setItem(
        PENDING_MESSAGE_KEY,
        JSON.stringify({ message, timestamp: Date.now() })
      );
    } else {
      localStorage.removeItem(PENDING_MESSAGE_KEY);
    }
  }, []);

  // Consume and clear the pending message
  const consumePendingMessage = useCallback((): string | null => {
    const message = pendingMessage;
    
    // Clear from both state and storage
    setPendingMessageState(null);
    localStorage.removeItem(PENDING_MESSAGE_KEY);
    
    return message;
  }, [pendingMessage]);

  return {
    pendingMessage,
    setPendingMessage,
    consumePendingMessage,
  };
}
