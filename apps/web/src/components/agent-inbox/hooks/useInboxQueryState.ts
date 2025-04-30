"use client";

import { parseAsString, parseAsInteger, useQueryStates } from "nuqs";
import { useState, useTransition, useEffect } from "react";
import {
  AGENT_INBOX_PARAM,
  OFFSET_PARAM,
  LIMIT_PARAM,
  INBOX_PARAM,
  NO_INBOXES_FOUND_PARAM,
} from "../constants";
import { ThreadStatusWithAll } from "../types";
import { AgentInbox } from "../types";

export interface InboxQueryState {
  inboxId: string | null;
  status: ThreadStatusWithAll;
  offset: number;
  limit: number;
  noInboxesFound: boolean;
  isTransitioning: boolean;
}

/**
 * Ensures that an inbox is selected if inboxes are available
 * If no inbox is currently selected, selects the first available inbox
 *
 * @param inboxes - Array of available AgentInbox objects
 * @param currentInboxId - Currently selected inbox ID from URL state
 * @param updateState - Function to update the inbox state
 * @returns The selected inbox or null if no inboxes are available
 */
export function ensureInboxSelected(
  inboxes: AgentInbox[],
  currentInboxId: string | null,
  updateState: (updates: Partial<InboxQueryState>) => void,
): AgentInbox | null {
  // If there are no inboxes, nothing to select
  if (!inboxes.length) {
    return null;
  }

  // If there's already a selected inbox that exists in the inbox list, use it
  if (currentInboxId && inboxes.some((inbox) => inbox.id === currentInboxId)) {
    return inboxes.find((inbox) => inbox.id === currentInboxId) || null;
  }

  // Otherwise, select the first available inbox
  const firstInbox = inboxes[0];

  // Update the URL state to reflect the selected inbox
  updateState({
    inboxId: firstInbox.id,
    offset: 0,
    limit: 10,
    status: "interrupted",
  });

  return firstInbox;
}

export function useInboxQueryState() {
  const [isPending, startTransition] = useTransition();

  // Use the enhanced nuqs options with transitions for better loading states
  const [queryParams, setQueryParams] = useQueryStates({
    [AGENT_INBOX_PARAM]: parseAsString.withOptions({ startTransition }),
    [OFFSET_PARAM]: parseAsInteger
      .withDefault(0)
      .withOptions({ startTransition }),
    [LIMIT_PARAM]: parseAsInteger
      .withDefault(10)
      .withOptions({ startTransition }),
    [INBOX_PARAM]: parseAsString
      .withDefault("interrupted")
      .withOptions({ startTransition }),
    [NO_INBOXES_FOUND_PARAM]: parseAsString.withOptions({ startTransition }),
  });

  // Create a structured object for easier consumption
  const inboxState: InboxQueryState = {
    inboxId: queryParams[AGENT_INBOX_PARAM] || null,
    status: (queryParams[INBOX_PARAM] || "interrupted") as ThreadStatusWithAll,
    offset: queryParams[OFFSET_PARAM] || 0,
    limit: queryParams[LIMIT_PARAM] || 10,
    noInboxesFound: queryParams[NO_INBOXES_FOUND_PARAM] === "true",
    isTransitioning: isPending,
  };

  // Update query params with a more structured API
  const updateInboxState = (updates: Partial<InboxQueryState>) => {
    const paramsToUpdate: Record<string, any> = {};

    if (updates.inboxId !== undefined) {
      paramsToUpdate[AGENT_INBOX_PARAM] = updates.inboxId;
    }

    if (updates.status !== undefined) {
      paramsToUpdate[INBOX_PARAM] = updates.status;
    }

    if (updates.offset !== undefined) {
      paramsToUpdate[OFFSET_PARAM] = updates.offset;
    }

    if (updates.limit !== undefined) {
      paramsToUpdate[LIMIT_PARAM] = updates.limit;
    }

    if (updates.noInboxesFound !== undefined) {
      paramsToUpdate[NO_INBOXES_FOUND_PARAM] = updates.noInboxesFound
        ? "true"
        : null;
    }

    setQueryParams(paramsToUpdate);
  };

  return [inboxState, updateInboxState] as const;
}
