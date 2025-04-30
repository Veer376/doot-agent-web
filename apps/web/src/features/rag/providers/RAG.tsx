import React, {
  createContext,
  useContext,
  PropsWithChildren,
  useEffect,
} from "react";
import { useRag } from "../hooks/use-rag";
import { toast } from "sonner";

type RagContextType = ReturnType<typeof useRag>;

const RagContext = createContext<RagContextType | null>(null);

export const RagProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const ragState = useRag();

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      ragState.collectionsLoading ||
      ragState.collections.length > 0
    )
      return;
    ragState
      .initialFetch()
      .catch((e) => {
        toast.error("Failed to fetch collections");
        console.error("Failed to fetch collections", e);
      })
      .finally(() => ragState.setCollectionsLoading(false));
  }, []);

  return <RagContext.Provider value={ragState}>{children}</RagContext.Provider>;
};

export const useRagContext = () => {
  const context = useContext(RagContext);
  if (context === null) {
    throw new Error("useRagContext must be used within a RagProvider");
  }
  return context;
};
