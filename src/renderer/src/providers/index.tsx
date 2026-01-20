"use client";

import { ReactNode } from "react";
import { ThemeProvider } from "./Theme";
import { AuthProvider } from "./Auth";
import { ReactQueryProvider } from "./QueryClient";
import { MCPProvider } from "./MCP";
import { AgentProvider } from "./Agent";

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * AppProviders: Centralized provider composition
 *
 * All global providers are composed here in the correct order.
 * This provides a single source of truth for provider hierarchy and
 * makes it easy to understand dependencies at a glance.
 *
 * Provider Order (dependencies bottom to top):
 * 1. ThemeProvider - No dependencies, provides theme context
 * 2. AuthProvider - No dependencies, provides authentication state
 * 3. ReactQueryProvider - Needs Auth for access tokens
 * 4. AgentProvider - Needs ReactQuery for agent fetching
 * 5. MCPProvider - Needs Auth context, can use ReactQuery for caching
 *
 * Note: NuqsAdapter is feature-specific and remains in app layout
 * Note: StreamProvider is feature-specific and remains in chat feature
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ReactQueryProvider>
          <AgentProvider>
            <MCPProvider>{children}</MCPProvider>
          </AgentProvider>
        </ReactQueryProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
