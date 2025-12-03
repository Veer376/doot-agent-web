"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  FloatingLabelInput,
  FloatingLabelPasswordInput,
} from "@/components/ui/floating-label-input";
import { useAuthActions } from "@/providers/Auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { googleAuthDisabled } from "@/lib/utils";
import { LoaderIcon } from "@/components/icons";

interface SignInFormProps {
  onSuccess?: () => void;
  onSwitchToSignUp?: () => void;
  onSwitchToForgotPassword?: () => void;
}

export function SignInForm({
  onSuccess,
  onSwitchToSignUp,
  onSwitchToForgotPassword,
}: SignInFormProps) {
  const { signIn, signInWithGoogle } = useAuthActions();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);

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

  return (
    <div className="w-full">
      <div className="my-6 flex flex-col items-center justify-center gap-3">
        <h2 className="text-foreground text-center text-xl leading-tight font-semibold">
          Log into your account
        </h2>
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
              className="text-muted-foreground hover:text-foreground text-xs transition-colors"
            >
              Forgot password?
            </button>
          </div>
        </div>

        {error && (
          <Alert
            variant="destructive"
            data-radius="radius2"
          >
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="pt-2">
          <Button
            type="submit"
            data-radius="radius2"
            className="h-10 w-full bg-black text-white hover:bg-black/90"
            disabled={isLoading || isGoogleLoading}
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

      {!googleAuthDisabled() && (
        <>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="border-border w-full border-t"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-background text-muted-foreground px-2">
                OR
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            type="button"
            size="lg"
            data-radius="radius2"
            className="h-12 w-full"
            onClick={handleGoogleSignIn}
            disabled={isLoading || isGoogleLoading}
          >
            {isGoogleLoading ? (
              <>
                <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                Redirecting...
              </>
            ) : (
              <>
                <svg
                  className="size-4"
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
                Sign in with Google
              </>
            )}
          </Button>
        </>
      )}

      {onSwitchToSignUp && (
        <div className="mt-4 text-center text-sm">
          <button
            type="button"
            onClick={onSwitchToSignUp}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Don&apos;t have an account? Sign up
          </button>
        </div>
      )}
    </div>
  );
}
