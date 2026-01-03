"use client";

import { createContext, useContext, ReactNode } from "react";
import { User, AuthError } from "@/lib/auth/types";

/**
 * AuthUserContext: User profile data
 * 
 * This context provides access to user profile information.
 * It updates rarely (only when user attributes change).
 * 
 * Use this when you need:
 * - User profile data (email, name, etc.)
 * - User update functionality
 * 
 * Update frequency: Rare (profile updates only)
 */

export interface AuthUserContextType {
  user: User | null;
  updateUser: (attributes: Partial<User>) => Promise<{
    user: User | null;
    error: AuthError | null;
  }>;
}

const AuthUserContext = createContext<AuthUserContextType | undefined>(undefined);

export function AuthUserProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: AuthUserContextType;
}) {
  return (
    <AuthUserContext.Provider value={value}>
      {children}
    </AuthUserContext.Provider>
  );
}

export function useAuthUser(): AuthUserContextType {
  const context = useContext(AuthUserContext);
  if (context === undefined) {
    throw new Error("useAuthUser must be used within an AuthUserProvider");
  }
  return context;
}
