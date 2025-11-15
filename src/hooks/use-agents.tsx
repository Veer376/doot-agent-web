"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/client";
import { Agent } from "@/types/agent";
import { toast } from "sonner";
import { useAuthContext } from "@/providers/Auth";
import {
  groupAgentsByGraphs,
  isSystemCreatedDefaultAssistant,
  isUserCreatedDefaultAssistant,
} from "@/lib/agent-utils";
import { extractConfigurationsFromAgent } from "@/lib/ui-config";

// ============================================================================
// Query Key Factory (for type-safe cache management)
// ============================================================================
export const agentKeys = {
  all: ["agents"] as const,
  lists: () => [...agentKeys.all, "list"] as const,
  detail: (id: string) => [...agentKeys.all, "detail", id] as const,
  schema: (id: string) => [...agentKeys.all, "schema", id] as const,
};

// ============================================================================
// Helper Functions (Pure data fetching logic)
// ============================================================================

async function fetchAgents(
  accessToken: string,
  getSchemaFn: (agentId: string) => Promise<Record<string, any> | undefined>,
): Promise<Agent[]> {
  const client = createClient(accessToken);

  // Fetch all assistants (system, default, and user created)
  const assistants = await client.assistants.search({
    limit: 100,
  });

  // Group agents by their graph_id
  const assistantsGroupedByGraphs = groupAgentsByGraphs(assistants);

  // OPTIMIZATION: Fetch all schemas in parallel instead of sequential
  // This reduces fetch time from ~1.8s to much faster
  const schemaPromises = assistantsGroupedByGraphs.map(async (group) => {
    const defaultAssistant =
      group.find((a) => isUserCreatedDefaultAssistant(a)) ?? group[0];
    return {
      group,
      defaultAssistant,
      schema: await getSchemaFn(defaultAssistant.assistant_id),
    };
  });

  const groupsWithSchemas = await Promise.all(schemaPromises);

  // Process each group with its fetched schema
  const processedAgents = groupsWithSchemas.flatMap(({ group, schema }) => {
    // Determine supported configurations based on schema
    const supportedConfigs: string[] = [];
    if (schema) {
      const { toolConfig, ragConfig, agentsConfig } =
        extractConfigurationsFromAgent({
          agent: group[0],
          schema,
        });
      if (toolConfig.length) {
        supportedConfigs.push("tools");
      }
      if (ragConfig.length) {
        supportedConfigs.push("rag");
      }
      if (agentsConfig.length) {
        supportedConfigs.push("supervisor");
      }
    }

    // Return all agents in the group with the same supportedConfigs
    return group.map((assistant) => ({
      ...assistant,
      supportedConfigs: supportedConfigs as ["tools" | "rag" | "supervisor"],
    }));
  });

  // Filter out system created default assistants
  return processedAgents.filter((a) => !isSystemCreatedDefaultAssistant(a));
}

// ============================================================================
// React Query Hooks
// ============================================================================

/**
 * Hook to fetch all agents with React Query
 * This replaces the manual state management in Agents.tsx
 */
export function useFetchAgents() {
  const { session } = useAuthContext();
  const accessToken = session?.accessToken;

  // Helper function for fetching schema (used by fetchAgents)
  const getSchemaFn = async (agentId: string) => {
    if (!accessToken) return undefined;
    try {
      const client = createClient(accessToken);
      const schemas = await client.assistants.getSchemas(agentId);
      return schemas.config_schema ?? undefined;
    } catch (e) {
      console.error("Failed to get agent config schema", e);
      return undefined;
    }
  };

  return useQuery({
    queryKey: agentKeys.lists(),
    queryFn: async () => {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      
      return fetchAgents(accessToken, getSchemaFn);
    },
    enabled: !!accessToken,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}

/**
 * Hook to fetch a single agent by ID
 */
export function useFetchAgent(agentId: string) {
  const { session } = useAuthContext();
  const accessToken = session?.accessToken;

  return useQuery({
    queryKey: agentKeys.detail(agentId),
    queryFn: async () => {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      const client = createClient(accessToken);
      const agent = await client.assistants.get(agentId);

      // Never expose the system created default assistants to the user
      if (isSystemCreatedDefaultAssistant(agent)) {
        return undefined;
      }

      return { ...agent };
    },
    enabled: !!accessToken && !!agentId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to create a new agent
 */
export function useCreateAgent() {
  const { session } = useAuthContext();
  const queryClient = useQueryClient();
  const accessToken = session?.accessToken;

  return useMutation({
    mutationFn: async ({
      graphId,
      args,
    }: {
      graphId: string;
      args: {
        name: string;
        description: string;
        config: Record<string, any>;
      };
    }) => {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      const client = createClient(accessToken);
      const agent = await client.assistants.create({
        graphId,
        metadata: {
          description: args.description,
        },
        name: args.name,
        config: {
          configurable: {
            ...args.config,
          },
        },
      });
      return agent;
    },
    onSuccess: () => {
      // Invalidate agents list to trigger refetch
      queryClient.invalidateQueries({ queryKey: agentKeys.lists() });
      toast.success("Agent created successfully");
    },
    onError: (error) => {
      console.error("Failed to create agent", error);
      toast.error("Failed to create agent");
    },
  });
}

/**
 * Hook to update an existing agent
 */
export function useUpdateAgent() {
  const { session } = useAuthContext();
  const queryClient = useQueryClient();
  const accessToken = session?.accessToken;

  return useMutation({
    mutationFn: async ({
      agentId,
      args,
    }: {
      agentId: string;
      args: {
        name?: string;
        description?: string;
        config?: Record<string, any>;
      };
    }) => {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      const client = createClient(accessToken);
      const agent = await client.assistants.update(agentId, {
        metadata: {
          ...(args.description && { description: args.description }),
        },
        ...(args.name && { name: args.name }),
        ...(args.config && { config: { configurable: args.config } }),
      });
      return agent;
    },
    onSuccess: (data, variables) => {
      // Invalidate both list and specific agent detail
      queryClient.invalidateQueries({ queryKey: agentKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: agentKeys.detail(variables.agentId),
      });
      toast.success("Agent updated successfully");
    },
    onError: (error) => {
      console.error("Failed to update agent", error);
      toast.error("Failed to update agent");
    },
  });
}

/**
 * Hook to delete an agent
 */
export function useDeleteAgent() {
  const { session } = useAuthContext();
  const queryClient = useQueryClient();
  const accessToken = session?.accessToken;

  return useMutation({
    mutationFn: async (agentId: string) => {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      const client = createClient(accessToken);
      await client.assistants.delete(agentId);
    },
    onSuccess: (_, agentId) => {
      // Invalidate agents list
      queryClient.invalidateQueries({ queryKey: agentKeys.lists() });
      // Remove the specific agent from cache
      queryClient.removeQueries({ queryKey: agentKeys.detail(agentId) });
      toast.success("Agent deleted successfully");
    },
    onError: (error) => {
      console.error("Failed to delete agent", error);
      toast.error("Failed to delete agent");
    },
  });
}


