import React, {
  createContext,
  useContext,
  PropsWithChildren,
} from "react";
import { useRag } from "../hooks/use-rag";

interface RagContextType extends ReturnType<typeof useRag> {}

const RagContext = createContext<RagContextType | null>(null);

interface RagProviderProps extends PropsWithChildren {}

export const RagProvider: React.FC<RagProviderProps> = ({
  children,
}) => {
  // TODO: Fetch initial collections here and pass to the useRag hook.
  const ragState = useRag();

  return (
    <RagContext.Provider value={ragState}>
      {children}
    </RagContext.Provider>
  );
};

export const useRagContext = () => {
  const context = useContext(RagContext);
  if (context === null) {
    throw new Error("useRagContext must be used within a RagProvider");
  }
  return context;
};