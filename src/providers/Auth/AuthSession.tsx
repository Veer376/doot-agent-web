"use client";

import { createContext, useContext, ReactNode } from "react";
import { Session } from "@/lib/auth/types";

/**
 * AuthSessionContext: Session state and authentication status
 * 
 * This context provides access to session information and auth state.
 * It updates moderately (on token refresh, auth state changes).
 * 
 * Use this when you need:
 * - Access tokens for API calls
 * - Authentication status checks
 * - Loading state during auth initialization
 * 
 * Update frequency: Moderate (session refreshes, auth changes)
 */

export interface AuthSessionContextType {
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthSessionContext = createContext<AuthSessionContextType | undefined>(undefined);

export function AuthSessionProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: AuthSessionContextType;
}) {
  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthSession(): AuthSessionContextType {
  const context = useContext(AuthSessionContext);
  if (context === undefined) {
    throw new Error("useAuthSession must be used within an AuthSessionProvider");
  }
  return context;
}
