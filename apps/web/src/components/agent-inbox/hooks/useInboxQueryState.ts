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

export interface InboxQueryState {
  inboxId: string | null;
  status: ThreadStatusWithAll;
  offset: number;
  limit: number;
  noInboxesFound: boolean;
  isTransitioning: boolean;
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
