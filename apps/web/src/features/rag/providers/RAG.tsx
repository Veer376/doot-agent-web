import React, {
  createContext,
  useContext,
  PropsWithChildren,
  useEffect,
} from "react";
import { useRag } from "../hooks/use-rag";
import { toast } from "sonner";
import { useAuthContext } from "@/providers/Auth";

type RagContextType = ReturnType<typeof useRag>;

const RagContext = createContext<RagContextType | null>(null);

export const RagProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const ragState = useRag();
  const { session } = useAuthContext();

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      ragState.collectionsLoading ||
      ragState.collections.length > 0 ||
      !session?.accessToken
    )
      return;

    ragState
      .initialFetch(session?.accessToken)
      .catch((e) => {
        toast.error("Failed to execute initial fetch", {
          richColors: true,
          description: "Failed to execute initial fetch. Please try again.",
        });
        console.error("Failed to execute initial fetch", e);
      })
      .finally(() => ragState.setCollectionsLoading(false));
  }, [session?.accessToken]);

  return <RagContext.Provider value={ragState}>{children}</RagContext.Provider>;
};

export const useRagContext = () => {
  const context = useContext(RagContext);
  if (context === null) {
    throw new Error("useRagContext must be used within a RagProvider");
  }
  return context;
};
