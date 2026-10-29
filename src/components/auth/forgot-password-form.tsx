"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuthActions } from "@/providers/Auth";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { LoaderIcon as Loader2 } from "@/components/icons";

import { ForgotPassIcon } from "@/components/icons";

interface ForgotPasswordFormProps {
  onSuccess?: () => void;
  onSwitchToSignIn?: () => void;
}

export function ForgotPasswordForm({
  onSuccess,
  onSwitchToSignIn,
}: ForgotPasswordFormProps) {
  const { resetPassword } = useAuthActions();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await resetPassword(email);

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess(true);
      setEmail("");
      onSuccess?.();
    } catch (err) {
      console.error("Password reset error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="content-mask w-full flex-1 overflow-y-auto p-4">
        <div className="mb-4 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-semantic-info-light">
              <ForgotPassIcon className="size-4 text-semantic-info" />
            </div>
            <h1 className="text-center text-xl font-semibold leading-tight text-foreground">
              Reset your password
            </h1>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        {success ? (
          <div className="space-y-4">
            <Alert variant="tip">
              <AlertDescription>
                Check your email for a link to reset your password. If it
                doesn&apos;t appear within a few minutes, check your spam
                folder.
              </AlertDescription>
            </Alert>
            <Button
              type="button"
              variant="outline"
              data-radius="control"
              className="h-11 w-full"
              onClick={onSwitchToSignIn}
            >
              Back to Sign In
            </Button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-3"
          >
            <FloatingLabelInput
              id="email"
              type="email"
              label="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {error && (
              <Alert
                variant="destructive"
              >
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              data-radius="control"
              className="h-11 w-full bg-foreground text-background hover:bg-foreground/90"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send reset link"
              )}
            </Button>
          </form>
        )}
      </div>

      {!success && (
        <div className="bg-background/80 relative z-10 shrink-0 p-3 pt-0 text-center text-xs backdrop-blur-md">
          <div className="pointer-events-none absolute -top-10 left-0 right-0 h-10 bg-gradient-to-t from-background to-transparent" />
          <button
            type="button"
            onClick={onSwitchToSignIn}
            className="group text-muted-foreground transition-colors hover:text-foreground"
          >
            Remember your password?{" "}
            <span className="transition-colors group-hover:text-semantic-info">
              Sign in
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
