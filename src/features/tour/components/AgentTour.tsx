"use client";

import React, { useEffect, useRef } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import "@/features/tour/styles/driver-custom.css";

import { useTour } from "@/features/tour/hooks/use-tour";
import { agentTourConfig } from "@/features/tour/tours/agent-selection-tour";
import { useAuthSession } from "@/providers/Auth";

/**
 * AgentTour component - Shows a guided tour for agent selection
 * Only displayed to unauthenticated users who haven't seen the tour before.
 */
export function AgentTour() {
  const { isAuthenticated, isLoading } = useAuthSession();
  const { shouldShowTour, isReady, completeTour } = useTour();
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    // Wait for auth and tour state to be ready
    if (isLoading || !isReady) return;

    // Don't show tour for authenticated users
    if (isAuthenticated) return;

    // Don't show if tour was already completed
    if (!shouldShowTour) return;

    // Prevent double-starting
    if (hasStartedRef.current) return;

    // Small delay to ensure DOM is fully rendered
    const timeoutId = setTimeout(() => {
      // Check if the target element exists
      const targetElement = document.querySelector("#agent-selector-segment");
      if (!targetElement) {
        console.warn("AgentTour: Target element #agent-selector-segment not found");
        return;
      }

      hasStartedRef.current = true;

      // Initialize driver.js
      driverRef.current = driver({
        ...agentTourConfig,
        onDestroyStarted: () => {
          // Mark tour as completed when user closes it
          completeTour();
          driverRef.current?.destroy();
        },
        onDestroyed: () => {
          completeTour();
        },
      });

      // Start the tour
      driverRef.current.drive();
    }, 1000); // 1 second delay for DOM to settle

    return () => {
      clearTimeout(timeoutId);
      if (driverRef.current) {
        driverRef.current.destroy();
      }
    };
  }, [isAuthenticated, isLoading, shouldShowTour, isReady, completeTour]);

  // This component doesn't render any visible UI
  return null;
}
