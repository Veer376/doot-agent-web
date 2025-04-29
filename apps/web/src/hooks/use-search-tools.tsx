import { Tool } from "@/types/tool";
import _, { debounce } from "lodash";
import { useState, useMemo } from "react";

export function useSearchTools(tools: Tool[]) {
    const [toolSearchTerm, setToolSearchTerm] = useState("");
  
    // Debounced search handler
    const debouncedSetSearchTerm = useMemo(
      () => debounce((value: string) => setToolSearchTerm(value), 200),
      []
    );
  
    // Filter tools based on the search term
    const filteredTools = useMemo(() => {
      return tools.filter((tool) => {
        return (
          _.startCase(tool.name)
            .toLowerCase()
            .includes(toolSearchTerm.toLowerCase()) ||
          tool.name.toLowerCase().includes(toolSearchTerm.toLowerCase())
        );
      });
    }, [tools, toolSearchTerm]);

    return {
      toolSearchTerm,
      debouncedSetSearchTerm,
      filteredTools,
    };
}