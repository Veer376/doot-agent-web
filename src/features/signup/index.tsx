"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { useAuthContext } from "@/providers/Auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { googleAuthDisabled } from "@/lib/utils";
import { LoaderIcon } from "@/components/icons";

// Form validation schema
const signupSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupInterface() {
  const { signUp, signInWithGoogle } = useAuthContext();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formValues, setFormValues] = useState<Partial<SignupFormValues>>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof SignupFormValues, string>>
  >({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isOAuthCallback, setIsOAuthCallback] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);

  // Detect OAuth callback - show loading state immediately
  useEffect(() => {
    const code = searchParams.get("code");
    const fromOAuth = searchParams.get("from_oauth");
    const urlError = searchParams.get("error");

    // If we have a code parameter or from_oauth flag, we're in OAuth callback flow
    if (code || fromOAuth === "true") {
      setIsOAuthCallback(true);
      setIsLoading(true);
      setLoadingMessage("Completing sign up with Google...");
    }

    // Check for error parameter
    if (urlError) {
      setAuthError(urlError);
      setIsOAuthCallback(false);
      setIsLoading(false);
    }
  }, [searchParams]);

  const validateForm = () => {
    try {
      signupSchema.parse(formValues);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Partial<Record<keyof SignupFormValues, string>> = {};
        (error as any).errors.forEach((err: any) => {
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
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }));
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
          first_name: formValues.firstName,
          last_name: formValues.lastName,
          name: `${formValues.firstName} ${formValues.lastName}`.trim(),
        },
      });

      if (error) {
        setAuthError(error.message);
        return;
      }

      // On success, redirect to a confirmation page or dashboard
      router.push(
        "/signin?message=Please check your email to confirm your account",
      );
    } catch (error) {
      console.error("Signup error:", error);
      setAuthError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    setAuthError(null);
    setLoadingMessage("Redirecting to Google...");

    // Store a flag in sessionStorage to detect OAuth flow
    if (typeof window !== "undefined") {
      sessionStorage.setItem("oauth_flow_started", "true");
    }

    try {
      const { error } = await signInWithGoogle();

      if (error) {
        setAuthError(error.message);
        setLoadingMessage(null);
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("oauth_flow_started");
        }
      }
      // The redirect will be handled by the OAuth provider
    } catch (error) {
      console.error("Google signup error:", error);
      setAuthError("An error occurred while signing up with Google.");
      setLoadingMessage(null);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("oauth_flow_started");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Show OAuth callback loading state
  if (isOAuthCallback) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex flex-col items-center justify-center gap-3 sm:gap-4">
            <div className="relative">
              <LoaderIcon className="text-primary h-12 w-12" />
            </div>
            <h2 className="text-foreground text-center text-xl font-semibold">
              Completing sign up...
            </h2>
            <p className="text-muted-foreground text-center text-sm">
              Please wait while we verify your Google account
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center justify-center gap-3 sm:gap-4">
          <h1 className="text-foreground text-center text-xl leading-tight font-semibold sm:text-2xl">
            Create your account
          </h1>
        </div>

        {isLoading && loadingMessage && !isOAuthCallback && (
          <Alert
            className="mb-4 bg-blue-50 text-blue-800"
            data-radius="radius2"
          >
            <AlertDescription className="flex items-center gap-2">
              <LoaderIcon className="h-4 w-4" />
              {loadingMessage}
            </AlertDescription>
          </Alert>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Input
                id="firstName"
                name="firstName"
                type="text"
                placeholder="First name"
                data-radius="radius2"
                className="h-11"
                value={formValues.firstName || ""}
                onChange={handleInputChange}
                aria-invalid={!!errors.firstName}
              />
              {errors.firstName && (
                <p className="text-destructive text-sm">{errors.firstName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Input
                id="lastName"
                name="lastName"
                type="text"
                placeholder="Last name"
                data-radius="radius2"
                className="h-11"
                value={formValues.lastName || ""}
                onChange={handleInputChange}
                aria-invalid={!!errors.lastName}
              />
              {errors.lastName && (
                <p className="text-destructive text-sm">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Email address"
              data-radius="radius2"
              className="h-11"
              value={formValues.email || ""}
              onChange={handleInputChange}
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className="text-destructive text-sm">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <PasswordInput
              id="password"
              name="password"
              placeholder="Password"
              data-radius="radius2"
              className="h-11"
              value={formValues.password || ""}
              onChange={handleInputChange}
              aria-invalid={!!errors.password}
            />
            {errors.password && (
              <p className="text-destructive text-sm">{errors.password}</p>
            )}
          </div>

          <div className="space-y-2">
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              placeholder="Confirm password"
              data-radius="radius2"
              className="h-11"
              value={formValues.confirmPassword || ""}
              onChange={handleInputChange}
              aria-invalid={!!errors.confirmPassword}
            />
            {errors.confirmPassword && (
              <p className="text-destructive text-sm">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {authError && (
            <Alert
              variant="destructive"
              data-radius="radius2"
            >
              <AlertDescription>{authError}</AlertDescription>
            </Alert>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              data-radius="radius2"
              className="h-10 w-full bg-black text-white hover:bg-black/90"
              disabled={isLoading}
            >
              {isLoading ? "Creating account..." : "Create account"}
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
                  or
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              type="button"
              size="lg"
              data-radius="radius2"
              className="h-12 w-full"
              onClick={handleGoogleSignup}
              disabled={isLoading}
            >
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
              Continue with Google
            </Button>
          </>
        )}

        <div className="mt-4 text-center text-sm">
          <Link
            href="/signin"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
