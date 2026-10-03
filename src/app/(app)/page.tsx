"use client";

import ChatInterface from "@/features/chat";
import { Toaster } from "@/components/ui/sonner";
import { useAuthSession } from "@/providers/Auth";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { AuthDialog, type AuthMode } from "@/components/auth/auth-dialog";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";
import { AgentTour } from "@/features/tour/components/AgentTour";
import { WelcomeModal } from "@/components/onboarding/welcome-modal";
import { config } from "@/config";

/**
 * The default page (/).
 * Contains the generic chat interface.
 */
export default function ChatPage(): React.ReactNode {
  const { isAuthenticated, isLoading } = useAuthSession();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [welcomeDone, setWelcomeDone] = useState(() => {
    if (config.features.localMode) return true;
    // Check if welcome was already seen on initial render
    if (typeof window !== "undefined") {
      return localStorage.getItem("dootagent-demo-seen") === "true";
    }
    return false;
  });
  const router = useRouter();
  const searchParams = useSearchParams();

  // Handle auth query param to open dialog (e.g., /?auth=signin)
  // Uses useSearchParams to react to client-side URL changes
  useEffect(() => {
    const authParam = searchParams.get("auth");

    if (!isAuthenticated && authParam) {
      const validModes: AuthMode[] = ["signin", "signup", "forgot-password"];
      if (validModes.includes(authParam as AuthMode)) {
        setAuthMode(authParam as AuthMode);
        setAuthDialogOpen(true);
      }

      // Remove ONLY the auth param, preserve all other params (threadId, etc.)
      const params = new URLSearchParams(searchParams.toString());
      params.delete("auth");
      const newUrl = params.toString() ? `/?${params.toString()}` : "/";
      router.replace(newUrl, { scroll: false });
    }
  }, [isAuthenticated, searchParams, router]);

  const handleOpenSignUp = () => {
    setAuthMode("signup");
    setAuthDialogOpen(true);
  };

  const handleWelcomeClose = () => {
    setWelcomeDone(true);
  };

  return (
    <>
      <Toaster />
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 pr-4 pl-14 md:px-5">
        <span className="text-foreground/80 truncate text-base font-medium">
          DootAgent
        </span>
        {!isAuthenticated && !isLoading && (
          <Button
            size="sm"
            onClick={handleOpenSignUp}
          >
            Try Now!
          </Button>
        )}
      </header>

      <ChatInterface />

      {/* Auth Dialog */}
      <AuthDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        mode={authMode}
      />

      {/* Welcome video modal - shows first */}
      {!config.features.localMode && (
        <WelcomeModal onClose={handleWelcomeClose} />
      )}

      {/* Tour for unauthenticated users - only after welcome is done */}
      {welcomeDone && <AgentTour />}
    </>
  );
}
