import React, {
  createContext,
  useContext,
  PropsWithChildren,
  useEffect,
  useRef,
  useState,
} from "react";
import useMCP from "../hooks/use-mcp";
import { config } from "@/config";

type MCPContextType = ReturnType<typeof useMCP> & { loading: boolean };

const MCPContext = createContext<MCPContextType | null>(null);

export const MCPProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const mcpState = useMCP({
    name: "Tools Interface",
    version: "1.0.0",
  });
  const firstRequestMade = useRef(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (config.features.localMode) return;
    if (mcpState.tools.length || firstRequestMade.current) return;

    firstRequestMade.current = true;
    setLoading(true);
    mcpState
      .getTools()
      .then((tools) => mcpState.setTools(tools))
      .finally(() => setLoading(false));
  }, []);

  return (
    <MCPContext.Provider value={{ ...mcpState, loading }}>
      {children}
    </MCPContext.Provider>
  );
};

export const useMCPContext = () => {
  const context = useContext(MCPContext);
  if (context === null) {
    throw new Error("useMCPContext must be used within a MCPProvider");
  }
  return context;
};
