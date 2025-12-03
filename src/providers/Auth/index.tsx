"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { SupabaseAuthProvider } from "@/lib/auth/supabase";
import {
  AuthProvider as CustomAuthProvider,
  Session,
  User,
} from "@/lib/auth/types";
import { config } from "@/config";
import { AuthUserProvider, useAuthUser, type AuthUserContextType } from "./AuthUser";
import { AuthSessionProvider, useAuthSession, type AuthSessionContextType } from "./AuthSession";
import { AuthActionsProvider, useAuthActions, type AuthActionsContextType } from "./AuthActions";

// Create default authentication provider (Supabase in this case)
// Use NEXT_PUBLIC_SITE_URL if set, otherwise fallback to window.location.origin
const getRedirectUrl = () => {
  const siteUrl = config.siteUrl;
  
  if (siteUrl) {
    return siteUrl;
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/auth/callback`;
  }
  return undefined;
};

const authProvider = new SupabaseAuthProvider({
  redirectUrl: getRedirectUrl(),
});

/**
 * AuthProvider: Composed authentication provider
 * 
 * This provider composes three focused sub-providers for optimal re-rendering:
 * - AuthUserProvider: user profile data (rarely changes)
 * - AuthSessionProvider: session state (moderately changes)  
 * - AuthActionsProvider: auth methods (never changes)
 * 
 * Components should use the granular hooks for best performance:
 * - useAuthUser() - for user data
 * - useAuthSession() - for session/loading/isAuthenticated
 * - useAuthActions() - for sign in/out methods
 */
export function AuthProvider({
  children,
  customAuthProvider,
}: {
  children: React.ReactNode;
  customAuthProvider?: CustomAuthProvider;
}) {
  // Use the provided auth provider or default to Supabase
  const provider = customAuthProvider || authProvider;

  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial session on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get the current session
        const currentSession = await provider.getSession();
        setSession(currentSession);

        // If we have a session, get the user
        if (currentSession?.user) {
          setUser(currentSession.user);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [provider]);

  // Set up auth state change listener
  useEffect(() => {
    const { unsubscribe } = provider.onAuthStateChange((newSession) => {
      setSession(newSession);
      setUser(newSession?.user || null);
    });

    return () => {
      unsubscribe();
    };
  }, [provider]);

  // Memoize user context value (rarely changes)
  const userValue: AuthUserContextType = useMemo(
    () => ({
      user,
      updateUser: provider.updateUser.bind(provider),
    }),
    [user, provider]
  );

  // Memoize session context value (changes moderately)
  const sessionValue: AuthSessionContextType = useMemo(
    () => ({
      session,
      isLoading,
      isAuthenticated: !!session?.user,
    }),
    [session, isLoading]
  );

  // Memoize actions context value (stable, never changes)
  const actionsValue: AuthActionsContextType = useMemo(
    () => ({
      signIn: provider.signIn.bind(provider),
      signUp: provider.signUp.bind(provider),
      signInWithGoogle: provider.signInWithGoogle.bind(provider),
      signOut: provider.signOut.bind(provider),
      resetPassword: provider.resetPassword.bind(provider),
      updatePassword: provider.updatePassword.bind(provider),
    }),
    [provider]
  );

  return (
    <AuthUserProvider value={userValue}>
      <AuthSessionProvider value={sessionValue}>
        <AuthActionsProvider value={actionsValue}>
          {children}
        </AuthActionsProvider>
      </AuthSessionProvider>
    </AuthUserProvider>
  );
}

/**
 * @deprecated Use useAuthUser(), useAuthSession(), or useAuthActions() instead
 * 
 * This convenience hook combines all three auth contexts.
 * It should only be used during migration or when you truly need all three.
 * Using granular hooks prevents unnecessary re-renders.
 */
export function useAuthContext() {
  const user = useAuthUser();
  const session = useAuthSession();
  const actions = useAuthActions();

  return {
    ...user,
    ...session,
    ...actions,
  };
}

// Re-export the granular hooks for convenience
export { useAuthUser, useAuthSession, useAuthActions };

// Re-export types
export type { AuthUserContextType, AuthSessionContextType, AuthActionsContextType };
