"use client";

import { useCallback } from "react";
import { ThreadStatusWithAll } from "../types";
import { useInboxQueryState } from "./useInboxQueryState";
import { useThreadsContext } from "../contexts/ThreadContext";

/**
 * Custom hook to manage inbox changes with proper clearing and reloading of threads
 *
 * This hook ensures that when changing inboxes:
 * 1. Thread data is properly cleared before the change
 * 2. URL state is updated correctly
 * 3. The proper loading states are set
 *
 * @returns Object with changeInbox function
 */
export function useInboxChange() {
  const [inboxState, updateInboxState] = useInboxQueryState();
  const { clearThreadData } = useThreadsContext();

  /**
   * Change the current inbox status filter
   *
   * @param inbox The new inbox status to filter by
   */
  const changeInbox = useCallback(
    (inbox: ThreadStatusWithAll) => {
      // First clear thread data to prevent showing stale data
      clearThreadData();

      // Then update the URL state parameters
      // Only change status and reset offset, leave other params unchanged
      updateInboxState({
        status: inbox,
        offset: 0,
      });
    },
    [clearThreadData, updateInboxState],
  );

  return { changeInbox };
}
