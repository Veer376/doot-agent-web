"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ConfigurableFieldUIMetadata } from "@/types/configurable";

interface ConfigState {
  config: Record<string, any>;
  updateConfig: (key: string, value: any) => void;
  resetConfig: () => void;
  setDefaultConfig: (configurations: ConfigurableFieldUIMetadata[]) => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set, get) => ({
      config: {},
      updateConfig: (key, value) =>
        set((state) => ({
          config: {
            ...state.config,
            [key]: value,
          },
        })),
      resetConfig: () => {
        // Get current defaultConfig based on provided configurations
        const currentState = get();
        // If setDefaultConfig was never called, fallback to the original defaults
        const configToUse = currentState.config.__defaultValues;

        set({ config: { ...configToUse } });
      },
      setDefaultConfig: (configurations: ConfigurableFieldUIMetadata[]) => {
        // Create default config object from configurations
        const defaultConfig: Record<string, any> = {};

        // Add default values from configurations
        configurations.forEach((config) => {
          if (config.default !== undefined) {
            defaultConfig[config.label] = config.default;
          }
        });

        // Store the default values for reset
        defaultConfig.__defaultValues = { ...defaultConfig };

        // Only set config if it hasn't been set before (to avoid overriding user changes)
        set((state) => ({
          config: state.config.__defaultValues
            ? state.config
            : { ...defaultConfig },
        }));
      },
    }),
    {
      name: "ai-config-storage",
    },
  ),
);
