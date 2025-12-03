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
import { googleAuthDisabled } from "@/lib/utils";
import { LoaderIcon } from "@/components/icons";

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
}

export function SignUpForm({ onSuccess, onSwitchToSignIn }: SignUpFormProps) {
  const { signUp, signInWithGoogle } = useAuthActions();

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

  return (
    <div className="w-full">
      <div className="my-6 flex flex-col items-center justify-center gap-3">
        <h2 className="text-foreground text-center text-xl leading-tight font-semibold">
          Create your account
        </h2>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
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
            <p className="text-destructive px-2 text-xs">{errors.fullName}</p>
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
            <p className="text-destructive px-2 text-xs">{errors.email}</p>
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
            <p className="text-destructive px-2 text-xs">{errors.password}</p>
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
            disabled={isLoading || isGoogleLoading}
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
            onClick={handleGoogleSignup}
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
                Continue with Google
              </>
            )}
          </Button>
        </>
      )}

      {onSwitchToSignIn && (
        <div className="mt-4 text-center text-sm">
          <button
            type="button"
            onClick={onSwitchToSignIn}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Already have an account? Sign in
          </button>
        </div>
      )}
    </div>
  );
}
