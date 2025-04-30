import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { useQueryStates, parseAsString, parseAsInteger } from "nuqs";
import {
  AGENT_INBOX_PARAM,
  AGENT_INBOXES_LOCAL_STORAGE_KEY,
  NO_INBOXES_FOUND_PARAM,
  OFFSET_PARAM,
  LIMIT_PARAM,
  INBOX_PARAM,
} from "../constants";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useState, useCallback, useEffect, useRef, useTransition } from "react";
import { AgentInbox } from "../types";
import { useRouter } from "next/navigation";
import { logger } from "../utils/logger";
import { runInboxBackfill } from "../utils/backfill";
import { useInboxQueryState, InboxQueryState, ensureInboxSelected } from "./useInboxQueryState";

/**
 * Hook for managing agent inboxes
 *
 * Provides functionality to:
 * - Load agent inboxes from local storage
 * - Add new agent inboxes
 * - Delete agent inboxes
 * - Change the selected agent inbox
 * - Update an existing agent inbox
 *
 * @returns {Object} Object containing agent inboxes and methods to manage them
 */
export function useInboxes() {
  const [inboxState, updateInboxState] = useInboxQueryState();
  const router = useRouter();
  const { getItem, setItem } = useLocalStorage();
  const [agentInboxes, setAgentInboxes] = useState<AgentInbox[]>([]);
  const initialLoadComplete = useRef(false);

  /**
   * Run backfill and load initial inboxes on mount
   */
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const initializeInboxes = async () => {
      try {
        // Run the backfill process first
        const backfillResult = await runInboxBackfill();
        if (backfillResult.success) {
          // Set the state with potentially updated inboxes from backfill
          setAgentInboxes(backfillResult.updatedInboxes);
          logger.log(
            "Initialized inboxes state after backfill:",
            backfillResult.updatedInboxes,
          );
          // Now trigger the selection logic based on current URL param
          // This reuses the logic to select based on param or default
          getAgentInboxes(backfillResult.updatedInboxes);
        } else {
          // If backfill failed, try a normal load
          logger.error("Backfill failed, attempting normal inbox load");
          getAgentInboxes();
        }
      } catch (e) {
        logger.error("Error during initial inbox loading and backfill", e);
        // Attempt normal load as fallback
        getAgentInboxes();
      }
    };
    initializeInboxes();
    // Run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper function to enhance inboxes with selected status based on URL
  const enhanceInboxesWithSelectedStatus = useCallback(
    (inboxes: Omit<AgentInbox, "selected">[]): AgentInbox[] => {
      return inboxes.map((inbox) => ({
        ...inbox,
        selected: inbox.id === inboxState.inboxId,
      }));
    },
    [inboxState.inboxId],
  );

  /**
   * Load agent inboxes from local storage and set up proper selection state
   * Accepts optional preloaded inboxes to avoid re-reading localStorage immediately after backfill.
   */
  const getAgentInboxes = useCallback(
    async (preloadedInboxes?: AgentInbox[]) => {
      if (typeof window === "undefined") {
        return;
      }

      let currentInboxes: Omit<AgentInbox, "selected">[] = [];
      if (preloadedInboxes) {
        // Extract everything except selected property for clean storage
        currentInboxes = preloadedInboxes.map(({ selected, ...rest }) => rest);
        logger.log("Using preloaded inboxes for selection logic");
      } else {
        const agentInboxesStr = getItem(AGENT_INBOXES_LOCAL_STORAGE_KEY);
        logger.log(
          "Reading inboxes from localStorage for selection logic:",
          agentInboxesStr,
        );
        if (agentInboxesStr && agentInboxesStr !== "[]") {
          try {
            currentInboxes = JSON.parse(agentInboxesStr);
          } catch (error) {
            logger.error(
              "Error parsing agent inboxes for selection logic",
              error,
            );
            // Handle error state appropriately
            setAgentInboxes([]);
            updateInboxState({ noInboxesFound: true });
            return;
          }
        } else {
          logger.log("No inboxes in localStorage for selection logic");
          setAgentInboxes([]);
          updateInboxState({ noInboxesFound: true });
          return;
        }
      }

      if (!currentInboxes.length) {
        logger.log("No current inboxes to process selection logic");
        setAgentInboxes([]);
        updateInboxState({ noInboxesFound: true });
        return;
      }

      // Ensure each agent inbox has an ID, and if not, add one
      currentInboxes = currentInboxes.map((inbox) => {
        return {
          ...inbox,
          id: inbox.id || uuidv4(),
        };
      });

      // Update React state with the inboxes and apply selected status based on URL
      const inboxesWithSelectedStatus =
        enhanceInboxesWithSelectedStatus(currentInboxes);
      setAgentInboxes(inboxesWithSelectedStatus);

      // Save to localStorage without any selected flags
      const cleanInboxes = currentInboxes.map((inbox) => {
        // Create a new object without the selected property for storage
        return { ...inbox };
      });

      setItem(AGENT_INBOXES_LOCAL_STORAGE_KEY, JSON.stringify(cleanInboxes));

      // Use the utility function to ensure an inbox is selected
      // but only if no inbox is currently selected
      if (!inboxState.inboxId && inboxesWithSelectedStatus.length > 0) {
        // Use direct access rather than ensureInboxSelected to avoid potential loops
        const firstInbox = inboxesWithSelectedStatus[0];
        updateInboxState({
          inboxId: firstInbox.id,
          offset: 0,
          limit: 10,
          status: "interrupted",
        });
      }

      // Mark initial load as complete
      if (!initialLoadComplete.current) {
        initialLoadComplete.current = true;
      }
    },
    [
      getItem,
      setItem,
      updateInboxState,
      inboxState.inboxId,
      enhanceInboxesWithSelectedStatus,
    ],
  );

  // Helper to get the currently selected inbox based on URL state
  const getSelectedInbox = useCallback(() => {
    if (!inboxState.inboxId || !agentInboxes.length) return null;
    return (
      agentInboxes.find((inbox) => inbox.id === inboxState.inboxId) || null
    );
  }, [agentInboxes, inboxState.inboxId]);

  /**
   * Add a new agent inbox
   * @param {AgentInbox} agentInbox - The agent inbox to add
   */
  const addAgentInbox = useCallback(
    (agentInbox: AgentInbox) => {
      const newInbox = {
        ...agentInbox,
        id: agentInbox.id || uuidv4(),
      };

      const agentInboxesStr = getItem(AGENT_INBOXES_LOCAL_STORAGE_KEY);

      // Handle empty inboxes
      if (!agentInboxesStr || agentInboxesStr === "[]") {
        // Set with selected status derived from URL
        setAgentInboxes([{ ...newInbox, selected: true }]);

        // Don't store selected flag in localStorage
        const { selected, ...cleanInbox } = newInbox;
        setItem(AGENT_INBOXES_LOCAL_STORAGE_KEY, JSON.stringify([cleanInbox]));

        // Update URL state - this is the source of truth for selection
        updateInboxState({
          inboxId: newInbox.id,
          offset: 0,
          limit: 10,
          status: "interrupted",
        });
        return;
      }

      try {
        const parsedAgentInboxes: Omit<AgentInbox, "selected">[] =
          JSON.parse(agentInboxesStr);

        // Remove selected property from new inbox for storage
        const { selected, ...cleanNewInbox } = newInbox;

        // Add the new inbox to storage without selected flag
        const cleanInboxes = [...parsedAgentInboxes, cleanNewInbox];

        // For React state, use our helper to set selected based on URL
        // but after URL update, this new inbox will be selected
        setAgentInboxes(
          enhanceInboxesWithSelectedStatus([
            ...parsedAgentInboxes,
            cleanNewInbox,
          ]),
        );

        setItem(AGENT_INBOXES_LOCAL_STORAGE_KEY, JSON.stringify(cleanInboxes));

        // Update URL to show the new inbox - this is our source of truth
        updateInboxState({
          inboxId: newInbox.id,
          offset: 0,
          limit: 10,
          status: "interrupted",
        });

        // Use router refresh to update the UI without full page reload
        router.refresh();
      } catch (error) {
        logger.error("Error adding agent inbox", error);
        toast.error("Failed to add agent inbox. Please try again.");
      }
    },
    [
      getItem,
      setItem,
      updateInboxState,
      router,
      enhanceInboxesWithSelectedStatus,
    ],
  );

  /**
   * Delete an agent inbox by ID
   * @param {string} id - The ID of the agent inbox to delete
   */
  const deleteAgentInbox = useCallback(
    (id: string) => {
      const agentInboxesStr = getItem(AGENT_INBOXES_LOCAL_STORAGE_KEY);

      if (!agentInboxesStr || agentInboxesStr === "[]") {
        return;
      }

      try {
        const parsedAgentInboxes: Omit<AgentInbox, "selected">[] =
          JSON.parse(agentInboxesStr);
        const isCurrentlySelected = inboxState.inboxId === id;
        const updatedInboxes = parsedAgentInboxes.filter(
          (inbox) => inbox.id !== id,
        );

        // Handle empty result
        if (!updatedInboxes.length) {
          updateInboxState({ noInboxesFound: true, inboxId: null });
          setAgentInboxes([]);
          setItem(AGENT_INBOXES_LOCAL_STORAGE_KEY, JSON.stringify([]));

          // Use router.push with just the current path
          router.push("/");
          return;
        }

        // Update state with selected status based on URL
        setAgentInboxes(enhanceInboxesWithSelectedStatus(updatedInboxes));

        // Store without selected flags
        setItem(
          AGENT_INBOXES_LOCAL_STORAGE_KEY,
          JSON.stringify(updatedInboxes),
        );

        // If we deleted the selected inbox, select the first one
        if (isCurrentlySelected && updatedInboxes.length > 0) {
          updateInboxState({
            inboxId: updatedInboxes[0].id,
            offset: 0,
            limit: 10,
            status: "interrupted",
          });
        }

        // Refresh data without full page reload
        router.refresh();
      } catch (error) {
        logger.error("Error deleting agent inbox", error);
        toast.error("Failed to delete agent inbox. Please try again.");
      }
    },
    [
      getItem,
      setItem,
      updateInboxState,
      router,
      inboxState.inboxId,
      enhanceInboxesWithSelectedStatus,
    ],
  );

  /**
   * Change the selected agent inbox
   * @param {string} id - The ID of the agent inbox to select
   * @param {boolean} replaceAll - Whether to replace all query parameters
   */
  const changeAgentInbox = useCallback(
    (id: string, replaceAll?: boolean) => {
      // Validate the inbox exists
      if (!agentInboxes.some((inbox) => inbox.id === id)) {
        logger.error(`Attempted to select non-existent inbox: ${id}`);
        toast.error("Cannot find the requested inbox.");
        return;
      }

      // Force update of URL state, which will trigger data loading
      // This is our source of truth for selection
      if (!replaceAll) {
        updateInboxState({
          inboxId: id,
          offset: 0,
          limit: 10,
          status: "interrupted",
        });
      } else {
        // For hard navigation cases (back/forward, etc.), we'll still use URL directly
        const url = new URL(window.location.href);
        const newParams = new URLSearchParams({
          [AGENT_INBOX_PARAM]: id,
          [OFFSET_PARAM]: "0",
          [LIMIT_PARAM]: "10",
          [INBOX_PARAM]: "interrupted",
        });
        const newUrl = url.pathname + "?" + newParams.toString();
        window.location.href = newUrl;
      }
    },
    [agentInboxes, updateInboxState],
  );

  /**
   * Update an existing agent inbox
   * @param {AgentInbox} updatedInbox - The updated agent inbox
   */
  const updateAgentInbox = useCallback(
    (updatedInbox: AgentInbox) => {
      const agentInboxesStr = getItem(AGENT_INBOXES_LOCAL_STORAGE_KEY);

      if (!agentInboxesStr || agentInboxesStr === "[]") {
        return;
      }

      try {
        const parsedInboxes: Omit<AgentInbox, "selected">[] =
          JSON.parse(agentInboxesStr);
        const currentInbox = parsedInboxes.find(
          (inbox) => inbox.id === updatedInbox.id,
        );

        if (!currentInbox) {
          logger.error("Inbox not found for update:", updatedInbox.id);
          return;
        }

        // Store without the selected flag
        const { selected, ...cleanUpdatedInbox } = updatedInbox;
        const updatedInboxes = parsedInboxes.map((inbox) =>
          inbox.id === updatedInbox.id ? cleanUpdatedInbox : inbox,
        );

        // Add selected status based on URL for React state
        setAgentInboxes(enhanceInboxesWithSelectedStatus(updatedInboxes));

        // Store without selected flags
        setItem(
          AGENT_INBOXES_LOCAL_STORAGE_KEY,
          JSON.stringify(updatedInboxes),
        );

        // Refresh data without full page reload
        router.refresh();
      } catch (error) {
        logger.error("Error updating agent inbox", error);
        toast.error("Failed to update agent inbox. Please try again.");
      }
    },
    [getItem, setItem, router, enhanceInboxesWithSelectedStatus],
  );

  // Calculate the currently selected inbox based on the URL state
  const selectedInbox = getSelectedInbox();

  return {
    // Provide both the raw inboxes array and a derived currently selected inbox
    agentInboxes,
    selectedInbox,
    getAgentInboxes,
    addAgentInbox,
    deleteAgentInbox,
    changeAgentInbox,
    updateAgentInbox,
    isChangingInbox: inboxState.isTransitioning,
  };
}
