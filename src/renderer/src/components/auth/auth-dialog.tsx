"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SignInForm } from "./signin-form";
import { SignUpForm } from "./signup-form";
import { ForgotPasswordForm } from "./forgot-password-form";
import { useState, useEffect } from "react";

export type AuthMode = "signin" | "signup" | "forgot-password";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: AuthMode;
  pendingMessage?: string;
  onClearPendingMessage?: () => void;
}

export function AuthDialog({
  open,
  onOpenChange,
  mode: initialMode = "signin",
  pendingMessage,
  onClearPendingMessage,
}: AuthDialogProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);

  // Sync internal mode when prop changes
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const handleSuccess = () => {
    // Close dialog after successful auth with delay to allow session to update
    setTimeout(() => {
      onOpenChange(false);
    }, 300);
  };

  const getDialogTitle = () => {
    switch (mode) {
      case "signin":
        return "Sign In";
      case "signup":
        return "Sign Up";
      case "forgot-password":
        return "Reset Password";
      default:
        return "Authentication";
    }
  };

  const renderForm = () => {
    switch (mode) {
      case "signin":
        return (
          <SignInForm
            onSuccess={handleSuccess}
            onSwitchToSignUp={() => setMode("signup")}
            onSwitchToForgotPassword={() => setMode("forgot-password")}
            pendingMessage={pendingMessage}
            onClearPendingMessage={onClearPendingMessage}
          />
        );
      case "signup":
        return (
          <SignUpForm
            onSuccess={handleSuccess}
            onSwitchToSignIn={() => setMode("signin")}
            pendingMessage={pendingMessage}
            onClearPendingMessage={onClearPendingMessage}
          />
        );
      case "forgot-password":
        return (
          <ForgotPasswordForm onSwitchToSignIn={() => setMode("signin")} />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        style={{ maxWidth: "23rem" }}
        data-radius="radius2"
        className="flex flex-col gap-0 overflow-hidden p-0"
      >
        <DialogTitle className="sr-only">{getDialogTitle()}</DialogTitle>

        {renderForm()}
      </DialogContent>
    </Dialog>
  );
}
