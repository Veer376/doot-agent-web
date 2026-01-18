import { useCallback, useEffect, useRef } from "react";

const DRAFT_STORAGE_PREFIX = "composer-draft-";
const DRAFT_DEBOUNCE_MS = 500;

/**
 * Custom hook for auto-saving composer drafts to localStorage.
 * Drafts are saved per thread and automatically restored when switching threads.
 *
 * @param threadId The current thread ID
 * @param value The current composer value
 * @param onChange Callback to update the composer value
 */
export function useComposerDraft(
  threadId: string | null | undefined,
  value: string,
  onChange: (value: string) => void,
) {
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastThreadIdRef = useRef<string | null>(null);

  // Get storage key for the current thread
  const getStorageKey = useCallback((id: string | null | undefined) => {
    if (!id) return null;
    return `${DRAFT_STORAGE_PREFIX}${id}`;
  }, []);

  // Save draft to localStorage (debounced)
  const saveDraft = useCallback(
    (draft: string) => {
      const key = getStorageKey(threadId);
      if (!key) return;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        try {
          if (draft.trim()) {
            // Only save non-empty drafts
            localStorage.setItem(key, draft);
          } else {
            // Remove draft if empty
            localStorage.removeItem(key);
          }
        } catch (error) {
          console.warn("Failed to save composer draft:", error);
        }
      }, DRAFT_DEBOUNCE_MS);
    },
    [threadId, getStorageKey],
  );

  // Load draft from localStorage
  const loadDraft = useCallback(
    (id: string | null | undefined) => {
      const key = getStorageKey(id);
      if (!key) return "";

      try {
        return localStorage.getItem(key) || "";
      } catch (error) {
        console.warn("Failed to load composer draft:", error);
        return "";
      }
    },
    [getStorageKey],
  );

  // Clear draft from localStorage
  const clearDraft = useCallback(
    (id: string | null | undefined) => {
      const key = getStorageKey(id);
      if (!key) return;

      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn("Failed to clear composer draft:", error);
      }
    },
    [getStorageKey],
  );

  // Load draft when thread changes
  useEffect(() => {
    if (threadId === lastThreadIdRef.current) return;

    // Thread has changed
    const draft = loadDraft(threadId);
    if (draft !== value) {
      onChange(draft);
      
      // Move cursor to end after draft is loaded
      // Use a small timeout to ensure the DOM is updated
      setTimeout(() => {
        const editor = document.querySelector('[role="textbox"]') as HTMLElement;
        if (editor && draft) {
          // Set cursor to end of content
          const range = document.createRange();
          const selection = window.getSelection();
          if (editor.childNodes.length > 0) {
            const lastNode = editor.childNodes[editor.childNodes.length - 1];
            const textNode = lastNode.nodeType === Node.TEXT_NODE ? lastNode : lastNode.childNodes[0];
            if (textNode) {
              range.setStart(textNode, textNode.textContent?.length || 0);
              range.collapse(true);
              selection?.removeAllRanges();
              selection?.addRange(range);
            }
          }
        }
      }, 50);
    }

    lastThreadIdRef.current = threadId || null;
  }, [threadId, loadDraft, onChange, value]);

  // Save draft when value changes
  useEffect(() => {
    if (!threadId) return;
    saveDraft(value);
  }, [value, threadId, saveDraft]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return { clearDraft };
}
