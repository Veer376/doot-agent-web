import type {
  AuthCredentials,
  AuthProvider,
  AuthStateChangeCallback,
  Session,
  User,
} from "./types";

const LOCAL_USER: User = {
  id: "local-user",
  email: "local@doot.local",
  displayName: "Local",
};

const LOCAL_SESSION: Session = {
  user: LOCAL_USER,
  accessToken: "local",
};

const authResult = {
  user: LOCAL_USER,
  session: LOCAL_SESSION,
  error: null,
};

/**
 * Authentication shim for localhost-only development.
 *
 * It intentionally provides a stable authenticated session so the existing UI
 * can exercise all LangGraph thread/assistant code paths without requiring
 * Supabase. It must only be selected when NEXT_PUBLIC_LOCAL_MODE=true.
 */
export class LocalAuthProvider implements AuthProvider {
  async signUp(_credentials: AuthCredentials) {
    return authResult;
  }

  async signIn(_credentials: AuthCredentials) {
    return authResult;
  }

  async signInWithGoogle() {
    return authResult;
  }

  async signInWithGithub() {
    return authResult;
  }

  async signOut() {
    return { error: null };
  }

  async getSession() {
    return LOCAL_SESSION;
  }

  async refreshSession() {
    return LOCAL_SESSION;
  }

  async getCurrentUser() {
    return LOCAL_USER;
  }

  async updateUser(attributes: Partial<User>) {
    return {
      user: { ...LOCAL_USER, ...attributes },
      error: null,
    };
  }

  async resetPassword(_email: string) {
    return { error: null };
  }

  async updatePassword(_newPassword: string) {
    return { error: null };
  }

  onAuthStateChange(_callback: AuthStateChangeCallback) {
    return { unsubscribe: () => undefined };
  }
}
