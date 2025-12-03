"use client";

import { createContext, useContext, ReactNode } from "react";
import { AuthCredentials, AuthError, Session, User } from "@/lib/auth/types";

/**
 * AuthActionsContext: Authentication action methods
 * 
 * This context provides access to authentication methods.
 * Function references are stable and never change.
 * 
 * Use this when you need:
 * - Sign in/up/out functionality
 * - Password reset/update methods
 * 
 * Update frequency: Never (stable function references)
 */

export interface AuthActionsContextType {
  signIn: (credentials: AuthCredentials) => Promise<{
    user: User | null;
    session: Session | null;
    error: AuthError | null;
  }>;
  signUp: (credentials: AuthCredentials) => Promise<{
    user: User | null;
    session: Session | null;
    error: AuthError | null;
  }>;
  signInWithGoogle: () => Promise<{
    user: User | null;
    session: Session | null;
    error: AuthError | null;
  }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
}

const AuthActionsContext = createContext<AuthActionsContextType | undefined>(undefined);

export function AuthActionsProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: AuthActionsContextType;
}) {
  return (
    <AuthActionsContext.Provider value={value}>
      {children}
    </AuthActionsContext.Provider>
  );
}

export function useAuthActions(): AuthActionsContextType {
  const context = useContext(AuthActionsContext);
  if (context === undefined) {
    throw new Error("useAuthActions must be used within an AuthActionsProvider");
  }
  return context;
}
