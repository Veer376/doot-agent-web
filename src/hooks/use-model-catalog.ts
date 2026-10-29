import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { config } from "@/config";
import { useAgentContext } from "@/providers/Agent";
import { useFetchAgents } from "@/hooks/use-agents";
import { AVAILABLE_MODELS, type Model } from "@/types/model";

type BackendModel = {
  id: string;
  runtime_model?: string;
  name: string;
  provider: Model["provider"] | string;
  description?: string | null;
  source?: string;
};

type ModelCatalogResponse = {
  models?: BackendModel[];
};

type AgentPolicyResponse = {
  assistant_id: string;
  graph_id: string;
  context?: Record<string, unknown> | null;
};

function normalizeProvider(provider: string): Model["provider"] {
  if (provider === "openai" || provider === "anthropic" || provider === "google") {
    return provider;
  }
  return "custom";
}

function normalizeBackendModel(model: BackendModel): Model {
  return {
    id: model.id,
    name: model.name,
    provider: normalizeProvider(model.provider),
    description: model.description || undefined,
    source: model.source || "local",
    runtimeModel: model.runtime_model,
  };
}

export function useModelCatalog() {
  const { agentId } = useAgentContext();
  const { data: agents = [] } = useFetchAgents();

  // The catalog is capability discovery only. Agent policy comes from the
  // selected LangGraph assistant's persisted context below. Adding a future
  // cloud backend means fetching its /models endpoint too and merging results;
  // model IDs remain globally disambiguated by their backend prefix.
  const catalogQuery = useQuery({
    queryKey: ["model-catalog", config.apiUrl],
    queryFn: async () => {
      const response = await fetch(`${config.apiUrl}/models`);
      if (!response.ok) {
        throw new Error(`Could not load model catalog (${response.status})`);
      }
      const payload = (await response.json()) as ModelCatalogResponse;
      return (payload.models || []).map(normalizeBackendModel);
    },
    staleTime: 30_000,
    retry: 1,
  });

  const agentPolicyQuery = useQuery({
    queryKey: ["model-agent-policy", config.apiUrl, agentId],
    queryFn: async () => {
      const response = await fetch(`${config.apiUrl}/assistants/${agentId}`);
      if (!response.ok) {
        throw new Error(`Could not load agent model policy (${response.status})`);
      }
      return (await response.json()) as AgentPolicyResponse;
    },
    enabled: Boolean(agentId),
    staleTime: 30_000,
    retry: 1,
  });

  const selectedAgent = useMemo(
    () =>
      agentPolicyQuery.data ??
      agents.find((agent) => agent.assistant_id === agentId) ??
      null,
    [agentPolicyQuery.data, agents, agentId],
  );

  const allModels = useMemo(() => {
    const byId = new Map<string, Model>();
    for (const model of AVAILABLE_MODELS) {
      byId.set(model.id, { ...model, source: model.source || "cloud" });
    }
    for (const model of catalogQuery.data || []) byId.set(model.id, model);
    return [...byId.values()];
  }, [catalogQuery.data]);

  const policy = useMemo(() => {
    const context = selectedAgent?.context;
    const record =
      context && typeof context === "object"
        ? (context as Record<string, unknown>)
        : {};
    const availableModels = Array.isArray(record.available_models)
      ? record.available_models.filter(
          (model): model is string => typeof model === "string" && Boolean(model),
        )
      : [];
    const defaultModel =
      typeof record.default_model === "string" ? record.default_model : null;
    return { availableModels, defaultModel };
  }, [selectedAgent]);

  const availableModels = useMemo(() => {
    if (policy.availableModels.length > 0) {
      const allowed = new Set(policy.availableModels);
      return allModels.filter((model) => allowed.has(model.id));
    }

    // Backwards compatibility for assistants created before model policy was
    // persisted. Local Doot assistants default to the local catalog; existing
    // cloud assistants retain the previous cloud catalog behavior.
    if (config.features.localMode && selectedAgent?.graph_id === "doot") {
      return allModels.filter((model) => model.source === "local");
    }
    return allModels.filter((model) => model.source !== "local");
  }, [allModels, policy.availableModels, selectedAgent]);

  const defaultModel = useMemo(() => {
    if (policy.defaultModel) {
      const configured = availableModels.find(
        (model) => model.id === policy.defaultModel,
      );
      if (configured) return configured;
    }
    return availableModels[0] || null;
  }, [availableModels, policy.defaultModel]);

  return {
    allModels,
    availableModels,
    defaultModel,
    selectedAgent,
    isLoading:
      catalogQuery.isLoading || (Boolean(agentId) && agentPolicyQuery.isLoading),
    isReady:
      !catalogQuery.isLoading &&
      (!agentId || !agentPolicyQuery.isLoading),
    error: catalogQuery.error ?? agentPolicyQuery.error,
  };
}
