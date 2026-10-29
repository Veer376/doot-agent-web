"use client";

import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  FloatingLabelInput,
  FloatingLabelPasswordInput,
} from "@/components/ui/floating-label-input";
import { useAuthActions } from "@/providers/Auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { googleAuthDisabled, githubAuthDisabled } from "@/lib/utils";
import { LoaderIcon, XIcon, QueueIcon, SignUpIcon } from "@/components/icons";

// Form validation schema (full name + email + password)
const signupSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

type SignupFormValues = z.infer<typeof signupSchema>;

interface SignUpFormProps {
  onSuccess?: () => void;
  onSwitchToSignIn?: () => void;
  pendingMessage?: string;
  onClearPendingMessage?: () => void;
}

export function SignUpForm({
  onSuccess,
  onSwitchToSignIn,
  pendingMessage,
  onClearPendingMessage,
}: SignUpFormProps) {
  const { signUp, signInWithGoogle, signInWithGithub } = useAuthActions();

  const [formValues, setFormValues] = useState<Partial<SignupFormValues>>({
    fullName: "",
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof SignupFormValues, string>>
  >({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);
  const [isGithubLoading, setIsGithubLoading] = useState<boolean>(false);

  const validateForm = () => {
    try {
      signupSchema.parse(formValues);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Partial<Record<keyof SignupFormValues, string>> = {};
        error.issues.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as keyof SignupFormValues] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const { error } = await signUp({
        email: formValues.email!,
        password: formValues.password!,
        metadata: {
          name: formValues.fullName,
        },
      });

      if (error) {
        setAuthError(error.message);
        setIsLoading(false);
        return;
      }

      // Success - call the onSuccess callback
      onSuccess?.();
    } catch (error) {
      console.error("Signup error:", error);
      setAuthError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsGoogleLoading(true);
    setAuthError(null);

    try {
      const { error } = await signInWithGoogle();

      if (error) {
        setAuthError(error.message);
        setIsGoogleLoading(false);
      }
      // The redirect will be handled by the OAuth provider
    } catch (error) {
      console.error("Google signup error:", error);
      setAuthError("An error occurred while signing up with Google.");
      setIsGoogleLoading(false);
    }
  };

  const handleGithubSignup = async () => {
    setIsGithubLoading(true);
    setAuthError(null);

    try {
      const { error } = await signInWithGithub();

      if (error) {
        setAuthError(error.message);
        setIsGithubLoading(false);
      }
      // The redirect will be handled by the OAuth provider
    } catch (error) {
      console.error("GitHub signup error:", error);
      setAuthError("An error occurred while signing up with GitHub.");
      setIsGithubLoading(false);
    }
  };

  const showOAuthProviders = !googleAuthDisabled() || !githubAuthDisabled();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="content-mask w-full flex-1 overflow-y-auto p-4">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-semantic-info-light">
              <SignUpIcon className="size-4 text-semantic-info" />
            </div>
            <h2 className="text-center text-xl font-semibold leading-tight text-foreground">
              Create account
            </h2>
          </div>
          {pendingMessage && (
            <div
              data-radius="surface"
              className="relative mt-2 w-full min-w-0 overflow-hidden bg-semantic-info-light p-3 text-left text-sm text-semantic-info"
            >
              <div className="flex items-center gap-2 pr-6 font-medium leading-none">
                <span>Prompt queued</span>
                <QueueIcon className="size-4" />
              </div>
              <p className="mt-1 block w-full max-w-68 truncate text-xs opacity-90">
                {"> " + pendingMessage}
              </p>
              {onClearPendingMessage && (
                <button
                  type="button"
                  onClick={onClearPendingMessage}
                  data-radius="control"
                  className="group absolute right-2 top-2 flex items-center p-1 opacity-70 transition-all hover:bg-destructive/10 hover:opacity-100 dark:hover:bg-destructive/10"
                >
                  <XIcon className="size-3.5 transition-colors group-hover:text-destructive dark:group-hover:text-destructive" />
                  <span className="max-w-0 overflow-hidden whitespace-nowrap text-doot-fine font-medium opacity-0 transition-all duration-300 group-hover:max-w-doot-auth-action-label group-hover:pl-1 group-hover:text-destructive group-hover:opacity-100 dark:group-hover:text-destructive">
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
          <div className="space-y-1">
            <FloatingLabelInput
              id="fullName"
              name="fullName"
              type="text"
              label="Full name"
              value={formValues.fullName || ""}
              onChange={handleInputChange}
              aria-invalid={!!errors.fullName}
            />
            {errors.fullName && (
              <p className="px-2 text-xs text-destructive">{errors.fullName}</p>
            )}
          </div>

          <div className="space-y-1">
            <FloatingLabelInput
              id="email"
              name="email"
              type="email"
              label="Email address"
              value={formValues.email || ""}
              onChange={handleInputChange}
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className="px-2 text-xs text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="space-y-1">
            <FloatingLabelPasswordInput
              id="password"
              name="password"
              label="Password"
              value={formValues.password || ""}
              onChange={handleInputChange}
              aria-invalid={!!errors.password}
            />
            {errors.password && (
              <p className="px-2 text-xs text-destructive">{errors.password}</p>
            )}
          </div>

          {authError && (
            <Alert
              variant="destructive"
            >
              <AlertDescription>{authError}</AlertDescription>
            </Alert>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              data-radius="control"
              className="h-10 w-full bg-foreground text-background hover:bg-foreground/90"
              disabled={isLoading || isGoogleLoading || isGithubLoading}
            >
              {isLoading ? (
                <>
                  <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create account"
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
                  data-radius="control"
                  className="h-10 w-full"
                  onClick={handleGoogleSignup}
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
                  data-radius="control"
                  className="h-10 w-full"
                  onClick={handleGithubSignup}
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

      {onSwitchToSignIn && (
        <div className="bg-background/80 relative z-10 shrink-0 p-3 pt-0 text-center text-xs backdrop-blur-md">
          <div className="pointer-events-none absolute -top-10 left-0 right-0 h-10 bg-gradient-to-t from-background to-transparent" />
          <button
            type="button"
            onClick={onSwitchToSignIn}
            className="group text-muted-foreground transition-colors hover:text-foreground"
          >
            Already have an account?{" "}
            <span className="transition-colors group-hover:text-semantic-info">
              Sign in
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
