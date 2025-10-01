"use client";
/*
This provider fetches and caches graph blueprints from the API. Which is used to build the agent and configuration UIs.
*/
import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useRef,
} from "react";
import { useAuthContext } from "./Auth";

// Blueprint are nothing but graph with a standard config schema used to build agents and configuration UIs.
export interface Blueprint {
  id: string;
  name: string;
  description?: string;
  config_schema: Record<string, any>;
}

type BlueprintsContextType = {
  blueprints: Blueprint[];
  loading: boolean;
  error: Error | null;
  refreshTemplates: () => Promise<void>;
};

const BlueprintsContext = createContext<BlueprintsContextType | undefined>(undefined);

async function fetchBlueprints(
  accessToken?: string
): Promise<Blueprint[]> {
  const baseApiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseApiUrl) {
    throw new Error(
      "Base API URL not configured. Please set NEXT_PUBLIC_BASE_API_URL"
    );
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${baseApiUrl}/blueprints`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Failed to fetch blueprints: ${response.status} ${errorData.error || ""}`
    );
  }

  return await response.json();
}

export const BlueprintsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { session } = useAuthContext();
  const [blueprints, setTemplates] = useState<Blueprint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const firstRequestMade = useRef(false);

  useEffect(() => {
    if (
      blueprints.length > 0 ||
      firstRequestMade.current ||
      !session?.accessToken
    )
      return;

    firstRequestMade.current = true;
    setLoading(true);
    setError(null);

    fetchBlueprints(session.accessToken)
      .then(setTemplates)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [session?.accessToken]);

  const refreshTemplates = async () => {
    if (!session?.accessToken) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchBlueprints(session.accessToken);
      setTemplates(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BlueprintsContext.Provider
      value={{
        blueprints,
        loading,
        error,
        refreshTemplates,
      }}
    >
      {children}
    </BlueprintsContext.Provider>
  );
};

export const useBlueprints = (): BlueprintsContextType => {
  const context = useContext(BlueprintsContext);
  if (context === undefined) {
    throw new Error(
      "useBlueprints must be used within a BlueprintsProvider"
    );
  }
  return context;
};

export default BlueprintsContext;