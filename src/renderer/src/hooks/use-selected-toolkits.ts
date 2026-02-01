import { useState, useCallback } from "react";
import type { SelectedToolkit } from "@/types/mcp-toolkit";

/**
 * Hook for managing selected toolkits in the composer
 * Session-only storage - not persisted to thread
 */
export function useSelectedToolkits() {
    const [selectedToolkits, setSelectedToolkits] = useState<SelectedToolkit[]>([]);

    /**
     * Add a toolkit to selection
     */
    const addToolkit = useCallback((toolkit: SelectedToolkit) => {
        setSelectedToolkits((prev) => {
            // Check if already selected
            if (prev.some((t) => t.id === toolkit.id)) {
                return prev;
            }
            return [...prev, toolkit];
        });
    }, []);

    /**
     * Remove a toolkit from selection by ID
     */
    const removeToolkit = useCallback((toolkitId: string) => {
        setSelectedToolkits((prev) => prev.filter((t) => t.id !== toolkitId));
    }, []);

    /**
     * Toggle a toolkit's selection status
     * If selected, remove it. If not selected, add it.
     */
    const toggleToolkit = useCallback((toolkit: SelectedToolkit) => {
        setSelectedToolkits((prev) => {
            const isSelected = prev.some((t) => t.id === toolkit.id);
            if (isSelected) {
                return prev.filter((t) => t.id !== toolkit.id);
            }
            return [...prev, toolkit];
        });
    }, []);

    /**
     * Clear all selected toolkits
     */
    const clearToolkits = useCallback(() => {
        setSelectedToolkits([]);
    }, []);

    /**
     * Check if a toolkit is selected
     */
    const isToolkitSelected = useCallback(
        (toolkitId: string) => {
            return selectedToolkits.some((t) => t.id === toolkitId);
        },
        [selectedToolkits]
    );

    /**
     * Update a toolkit's properties (e.g., toolCount after connection)
     */
    const updateToolkit = useCallback(
        (toolkitId: string, updates: Partial<SelectedToolkit>) => {
            setSelectedToolkits((prev) =>
                prev.map((t) => (t.id === toolkitId ? { ...t, ...updates } : t))
            );
        },
        []
    );

    return {
        selectedToolkits,
        addToolkit,
        removeToolkit,
        toggleToolkit,
        clearToolkits,
        isToolkitSelected,
        updateToolkit,
        /** Number of selected toolkits */
        count: selectedToolkits.length,
        /** Whether any toolkits are selected */
        hasToolkits: selectedToolkits.length > 0,
    };
}

export type UseSelectedToolkitsReturn = ReturnType<typeof useSelectedToolkits>;
