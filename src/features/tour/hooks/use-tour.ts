"use client";

import { useState, useEffect, useCallback } from "react";

const TOUR_STORAGE_KEY = "dootagent-tour-completed";

/**
 * Hook to manage tour state using localStorage.
 * Tracks whether the agent selection tour has been shown to the user.
 */
export function useTour() {
  const [shouldShowTour, setShouldShowTour] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Check localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasCompleted = localStorage.getItem(TOUR_STORAGE_KEY);
    setShouldShowTour(!hasCompleted);
    setIsReady(true);
  }, []);

  // Mark tour as completed in localStorage
  const completeTour = useCallback(() => {
    if (typeof window === "undefined") return;

    localStorage.setItem(TOUR_STORAGE_KEY, "true");
    setShouldShowTour(false);
  }, []);

  // Reset tour state (for testing purposes)
  const resetTour = useCallback(() => {
    if (typeof window === "undefined") return;

    localStorage.removeItem(TOUR_STORAGE_KEY);
    setShouldShowTour(true);
  }, []);

  return {
    shouldShowTour,
    isReady,
    completeTour,
    resetTour,
  };
}
