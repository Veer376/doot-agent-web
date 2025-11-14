"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuthContext } from "@/providers/Auth";

export default function ForgotPasswordInterface() {
  const { resetPassword } = useAuthContext();

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
    } catch (err) {
      console.error("Password reset error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-4 flex items-center flex-col gap-3 sm:gap-4 justify-center">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground text-center leading-tight">
            Reset your password
          </h1>
          <p className="text-muted-foreground text-sm text-center">
            Enter your email address and we'll send you a link to reset your
            password
          </p>
        </div>

        {success ? (
          <Alert className="mb-4">
            <AlertDescription>
              If your email address is associated with an account, you will
              receive an email with instructions to reset your password
              shortly.
            </AlertDescription>
          </Alert>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-3"
          >
            <div className="space-y-2">
              <Input
                id="email"
                type="email"
                placeholder="Email address"
                className="h-11 rounded-2xl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full h-10 rounded-2xl bg-black text-white hover:bg-black/90"
                disabled={isLoading}
              >
                {isLoading ? "Sending..." : "Send reset link"}
              </Button>
            </div>
          </form>
        )}

        <div className="mt-4 text-center text-sm">
          <Link
            href="/signin"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Remember your password? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
