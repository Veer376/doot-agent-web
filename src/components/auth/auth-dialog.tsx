"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SignInForm } from "./signin-form";
import { SignUpForm } from "./signup-form";
import { useState } from "react";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "signin" | "signup";
  pendingMessage?: string;
}

export function AuthDialog({
  open,
  onOpenChange,
  mode: initialMode = "signin",
  pendingMessage,
}: AuthDialogProps) {
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);

  const handleSuccess = () => {
    // Close dialog after successful auth with delay to allow session to update
    setTimeout(() => {
      onOpenChange(false);
    }, 300);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-md">
        {mode === "signin" ? (
          <SignInForm
            onSuccess={handleSuccess}
            onSwitchToSignUp={() => setMode("signup")}
          />
        ) : (
          <SignUpForm
            onSuccess={handleSuccess}
            onSwitchToSignIn={() => setMode("signin")}
          />
        )}

        {/* Show pending message hint if provided */}
        {pendingMessage && (
          <div className="mt-2 rounded-md bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
            <p className="font-medium">Message queued:</p>
            <p className="mt-1 truncate text-xs">{pendingMessage}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
