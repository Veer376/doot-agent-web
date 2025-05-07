"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  ConfigurableFieldUIMetadata,
  ConfigurableFieldMCPMetadata,
  ConfigurableFieldRAGMetadata,
  ConfigurableFieldAgentsMetadata,
} from "@/types/configurable";

interface ConfigState {
  configsByAgentId: Record<string, Record<string, any>>;
  getAgentConfig: (agentId: string) => Record<string, any>;
  updateConfig: (agentId: string, key: string, value: any) => void;
  resetConfig: (agentId: string) => void;
  setDefaultConfig: (
    agentId: string,
    configurations:
      | ConfigurableFieldMCPMetadata[]
      | ConfigurableFieldUIMetadata[]
      | ConfigurableFieldRAGMetadata[]
      | ConfigurableFieldAgentsMetadata[],
  ) => void;
  resetStore: () => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set, get) => ({
      configsByAgentId: {},

      getAgentConfig: (agentId: string) => {
        const state = get();
        const baseConfig = state.configsByAgentId[agentId];
        const toolsConfig = state.configsByAgentId[`${agentId}:selected-tools`];
        const ragConfig = state.configsByAgentId[`${agentId}:rag`];
        const agentsConfig = state.configsByAgentId[`${agentId}:agents`];
        return {
          ...baseConfig,
          ...toolsConfig,
          ...ragConfig,
          ...agentsConfig,
        };
      },

      updateConfig: (agentId, key, value) =>
        set((state) => ({
          configsByAgentId: {
            ...state.configsByAgentId,
            [agentId]: {
              ...(state.configsByAgentId[agentId] || {}),
              [key]: value,
            },
          },
        })),

      resetConfig: (agentId) => {
        set((state) => {
          const agentConfig = state.configsByAgentId[agentId];
          if (!agentConfig || !agentConfig.__defaultValues) {
            // If no config or default values exist for this agent, do nothing or set to empty
            return state;
          }
          const defaultsToUse = { ...agentConfig.__defaultValues };
          return {
            configsByAgentId: {
              ...state.configsByAgentId,
              [agentId]: defaultsToUse,
            },
          };
        });
      },

      setDefaultConfig: (agentId, configurations) => {
        const state = get();
        // Only set default config if it hasn't been set for this agentId yet
        if (state.configsByAgentId[agentId]?.__defaultValues) {
          return; // Defaults already set, potentially overwritten by user, don't reset
        }

        // Create default config object from configurations
        const defaultConfig: Record<string, any> = {};
        configurations.forEach((config) => {
          if (config.default !== undefined) {
            defaultConfig[config.label] = config.default;
          }
        });

        // Store the default values for reset
        defaultConfig.__defaultValues = { ...defaultConfig };

        set((currentState) => ({
          configsByAgentId: {
            ...currentState.configsByAgentId,
            // Initialize with defaults if no config exists yet for this agent
            [agentId]: currentState.configsByAgentId[agentId]
              ? currentState.configsByAgentId[agentId] // Keep existing if user already interacted
              : defaultConfig,
          },
        }));
      },

      // Clear everything from the store
      resetStore: () => set({ configsByAgentId: {} }),
    }),
    {
      name: "ai-config-storage", // Keep the same storage key, but manage agents inside
    },
  ),
);
