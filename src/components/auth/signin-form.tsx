"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  FloatingLabelInput,
  FloatingLabelPasswordInput,
} from "@/components/ui/floating-label-input";
import { useAuthActions } from "@/providers/Auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { googleAuthDisabled, githubAuthDisabled } from "@/lib/utils";
import { LoaderIcon, XIcon, QueueIcon, LoginIcon } from "@/components/icons";

interface SignInFormProps {
  onSuccess?: () => void;
  onSwitchToSignUp?: () => void;
  onSwitchToForgotPassword?: () => void;
  pendingMessage?: string;
  onClearPendingMessage?: () => void;
}

export function SignInForm({
  onSuccess,
  onSwitchToSignUp,
  onSwitchToForgotPassword,
  pendingMessage,
  onClearPendingMessage,
}: SignInFormProps) {
  const { signIn, signInWithGoogle, signInWithGithub } = useAuthActions();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);
  const [isGithubLoading, setIsGithubLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn({
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message);
        setIsLoading(false);
        return;
      }

      // Success - call the onSuccess callback
      onSuccess?.();
    } catch (err) {
      console.error("Sign in error:", err);
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError(null);

    const { error } = await signInWithGoogle();
    if (error) {
      setIsGoogleLoading(false);
      setError(error.message);
      return;
    }

    // Keep isGoogleLoading: true, as we're doing a redirect
  };

  const handleGithubSignIn = async () => {
    setIsGithubLoading(true);
    setError(null);

    const { error } = await signInWithGithub();
    if (error) {
      setIsGithubLoading(false);
      setError(error.message);
      return;
    }

    // Keep isGithubLoading: true, as we're doing a redirect
  };

  const showOAuthProviders = !googleAuthDisabled() || !githubAuthDisabled();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="content-mask w-full flex-1 overflow-y-auto p-4">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20">
              <LoginIcon className="size-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-center text-xl font-semibold leading-tight text-foreground">
              Log in
            </h2>
          </div>
          {pendingMessage && (
            <div
              data-radius="radius"
              className="relative mt-2 w-full min-w-0 overflow-hidden bg-blue-50 p-3 text-left text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-200"
            >
              <div className="flex items-center gap-2 pr-6 font-medium leading-none">
                <span>Prompt queued</span>
                <QueueIcon className="size-4" />
              </div>
              <p className="mt-1 block w-full max-w-[17rem] truncate text-xs opacity-90">
                {"> " + pendingMessage}
              </p>
              {onClearPendingMessage && (
                <button
                  type="button"
                  onClick={onClearPendingMessage}
                  data-radius="radius"
                  className="group absolute right-2 top-2 flex items-center p-1 opacity-70 transition-all hover:bg-red-50 hover:opacity-100 dark:hover:bg-red-900/20"
                >
                  <XIcon className="size-3.5 transition-colors group-hover:text-red-600 dark:group-hover:text-red-400" />
                  <span className="max-w-0 overflow-hidden whitespace-nowrap text-[10px] font-medium opacity-0 transition-all duration-300 group-hover:max-w-[50px] group-hover:pl-1 group-hover:text-red-600 group-hover:opacity-100 dark:group-hover:text-red-400">
                    Remove
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-3"
        >
          <div>
            <FloatingLabelInput
              id="email"
              type="email"
              label="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-radius="radius"
              required
            />
          </div>

          <div className="space-y-2">
            <FloatingLabelPasswordInput
              id="password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onSwitchToForgotPassword}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Forgot password?
              </button>
            </div>
          </div>

          {error && (
            <Alert
              variant="destructive"
              data-radius="radius"
            >
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              data-radius="radius"
              className="h-10 w-full bg-black text-white hover:bg-black/90"
              disabled={isLoading || isGoogleLoading || isGithubLoading}
            >
              {isLoading ? (
                <>
                  <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </div>
        </form>

        {showOAuthProviders && (
          <>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-background px-2 text-muted-foreground">
                  OR
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {!googleAuthDisabled() && (
                <Button
                  variant="outline"
                  type="button"
                  data-radius="radius"
                  className="h-10 w-full"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading || isGoogleLoading || isGithubLoading}
                >
                  {isGoogleLoading ? (
                    <LoaderIcon className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <svg
                        className="mr-2 size-4"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      Google
                    </>
                  )}
                </Button>
              )}

              {!githubAuthDisabled() && (
                <Button
                  variant="outline"
                  type="button"
                  data-radius="radius"
                  className="h-10 w-full"
                  onClick={handleGithubSignIn}
                  disabled={isLoading || isGoogleLoading || isGithubLoading}
                >
                  {isGithubLoading ? (
                    <LoaderIcon className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <svg
                        className="mr-2 size-4"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="currentColor"
                      >
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                      </svg>
                      GitHub
                    </>
                  )}
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      {onSwitchToSignUp && (
        <div className="bg-background/80 relative z-10 shrink-0 p-3 pt-0 text-center text-xs backdrop-blur-md">
          <div className="pointer-events-none absolute -top-10 left-0 right-0 h-10 bg-gradient-to-t from-background to-transparent" />
          <button
            type="button"
            onClick={onSwitchToSignUp}
            className="group text-muted-foreground transition-colors hover:text-foreground"
          >
            Don&apos;t have an account?{" "}
            <span className="transition-colors group-hover:text-blue-600">
              Sign up
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
