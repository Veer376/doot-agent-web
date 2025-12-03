"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuthActions } from "@/providers/Auth";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { Loader2 } from "lucide-react";

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
    <div className="w-full">
      <div className="mb-6 flex flex-col items-center gap-2">
        <h1 className="text-foreground text-center text-xl leading-tight font-semibold">
          Reset your password
        </h1>
        <p className="text-muted-foreground text-center text-sm">
          Enter your email and we'll send you a reset link
        </p>
      </div>

      {success ? (
        <div className="space-y-4">
          <Alert
            data-radius="radius2"
            className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
          >
            <AlertDescription className="text-green-800 dark:text-green-200">
              Check your email for a link to reset your password. If it doesn't
              appear within a few minutes, check your spam folder.
            </AlertDescription>
          </Alert>
          <Button
            type="button"
            variant="outline"
            data-radius="full"
            className="h-11 w-full"
            onClick={onSwitchToSignIn}
          >
            Back to Sign In
          </Button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
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
              data-radius="radius2"
            >
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            data-radius="full"
            className="h-11 w-full bg-black text-white hover:bg-black/90"
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

          <div className="text-center text-sm">
            <span className="text-muted-foreground">
              Remember your password?{" "}
            </span>
            <button
              type="button"
              onClick={onSwitchToSignIn}
              className="text-primary font-medium hover:underline"
            >
              Sign in
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
