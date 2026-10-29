/**
 * Thread Model Hook
 *
 * Resolves model selection against the selected agent's model policy and the
 * merged backend model catalog. Thread selection remains cached in localStorage.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryState } from "nuqs";

import type { Model } from "@/types/model";
import { useModelCatalog } from "@/hooks/use-model-catalog";

const MODEL_CHANGE_EVENT = "doot:thread-model-change";

function storageKey(threadId: string) {
  return `thread-model-${threadId}`;
}

function readCachedModelId(threadId: string | null) {
  if (!threadId || typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem(storageKey(threadId));
    return cached ? (JSON.parse(cached) as string) : null;
  } catch (error) {
    console.error("Failed to load cached model:", error);
    return null;
  }
}

export function useThreadModel() {
  const [threadId] = useQueryState("threadId");
  const {
    allModels,
    availableModels,
    defaultModel,
    isReady: modelCatalogReady,
  } = useModelCatalog();
  const previousThreadId = useRef<string | null>(threadId);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(() =>
    readCachedModelId(threadId),
  );

  const publishSelection = useCallback(
    (modelId: string | null) => {
      setSelectedModelId(modelId);
      if (typeof window === "undefined") return;
      window.dispatchEvent(
        new CustomEvent(MODEL_CHANGE_EVENT, {
          detail: { threadId, modelId },
        }),
      );
    },
    [threadId],
  );

  // Keep independent hook consumers (composer, edit/regenerate actions, etc.)
  // synchronized without making the model choice a component-local concern.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onModelChange = (event: Event) => {
      const detail = (event as CustomEvent).detail as
        | { threadId?: string | null; modelId?: string | null }
        | undefined;
      if ((detail?.threadId ?? null) !== threadId) return;
      setSelectedModelId(detail?.modelId ?? null);
    };
    window.addEventListener(MODEL_CHANGE_EVENT, onModelChange);
    return () => window.removeEventListener(MODEL_CHANGE_EVENT, onModelChange);
  }, [threadId]);

  // Restore a persisted thread choice. When a new chat receives its first
  // thread ID, preserve the model that was used to create that run.
  useEffect(() => {
    const previous = previousThreadId.current;
    previousThreadId.current = threadId;
    if (!threadId) return;

    const cached = readCachedModelId(threadId);
    if (cached) {
      setSelectedModelId(cached);
    } else if (previous !== null) {
      setSelectedModelId(null);
    }
  }, [threadId]);

  const selectedModel = useMemo(() => {
    if (selectedModelId) {
      const selected = availableModels.find(
        (model) => model.id === selectedModelId,
      );
      if (selected) return selected;
    }
    return defaultModel;
  }, [selectedModelId, availableModels, defaultModel]);

  // Agent switches change the allowed model set. Keep the current model when it
  // is valid for both agents; otherwise move deterministically to the new
  // agent's default model.
  useEffect(() => {
    if (!modelCatalogReady) return;
    const nextModelId = selectedModel?.id ?? null;
    if (nextModelId !== selectedModelId) publishSelection(nextModelId);
  }, [modelCatalogReady, selectedModel, selectedModelId, publishSelection]);

  useEffect(() => {
    if (!threadId || typeof window === "undefined") return;
    try {
      if (selectedModel?.id) {
        localStorage.setItem(
          storageKey(threadId),
          JSON.stringify(selectedModel.id),
        );
      } else {
        localStorage.removeItem(storageKey(threadId));
      }
    } catch (error) {
      console.error("Failed to cache model:", error);
    }
  }, [threadId, selectedModel?.id]);

  const selectModel = useCallback(
    (model: Model | null) => publishSelection(model?.id ?? null),
    [publishSelection],
  );

  const clearModel = useCallback(() => publishSelection(null), [publishSelection]);

  const resolveModel = useCallback(
    (modelId: string) => allModels.find((model) => model.id === modelId),
    [allModels],
  );

  return {
    selectedModel,
    selectModel,
    clearModel,
    resolveModel,
    availableModels,
    allModels,
    defaultModel,
    modelCatalogReady,
    hasModel: selectedModel !== null,
  };
}
