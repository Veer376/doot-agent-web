/**
 * Thread Model Hook
 *
 * Manages model selection state per thread
 * Persists model selection in localStorage
 */

import { useState, useCallback, useEffect } from "react";
import { useQueryState } from "nuqs";
import type { Model } from "@/types/model";
import { getModelById } from "@/types/model";

/**
 * Hook for managing model selection in a thread
 *
 * @returns Model state and actions
 */
export function useThreadModel() {
  const [threadId] = useQueryState("threadId");

  // Get model from localStorage on mount
  const [selectedModel, setSelectedModel] = useState<Model | null>(() => {
    if (!threadId) return null;

    try {
      const cached = localStorage.getItem(`thread-model-${threadId}`);
      if (cached) {
        const modelId = JSON.parse(cached);
        return getModelById(modelId) || null;
      }
    } catch (error) {
      console.error("Failed to load cached model:", error);
    }

    return null;
  });

  // Update localStorage when model changes
  useEffect(() => {
    if (!threadId) return;

    if (selectedModel) {
      try {
        localStorage.setItem(
          `thread-model-${threadId}`,
          JSON.stringify(selectedModel.id),
        );
      } catch (error) {
        console.error("Failed to cache model:", error);
      }
    } else {
      try {
        localStorage.removeItem(`thread-model-${threadId}`);
      } catch (error) {
        console.error("Failed to remove cached model:", error);
      }
    }
  }, [threadId, selectedModel]);

  // Clear model when thread changes
  useEffect(() => {
    if (!threadId) {
      setSelectedModel(null);
      return;
    }

    // Load model for new thread
    try {
      const cached = localStorage.getItem(`thread-model-${threadId}`);
      if (cached) {
        const modelId = JSON.parse(cached);
        setSelectedModel(getModelById(modelId) || null);
      } else {
        setSelectedModel(null);
      }
    } catch (error) {
      console.error("Failed to load thread model:", error);
      setSelectedModel(null);
    }
  }, [threadId]);

  // Update model selection
  const selectModel = useCallback((model: Model | null) => {
    setSelectedModel(model);
  }, []);

  // Clear model selection
  const clearModel = useCallback(() => {
    setSelectedModel(null);
  }, []);

  return {
    selectedModel,
    selectModel,
    clearModel,
    hasModel: selectedModel !== null,
  };
}
