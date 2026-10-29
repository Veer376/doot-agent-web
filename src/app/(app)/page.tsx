"use client";

import ChatInterface from "@/features/chat";
import { Toaster } from "@/components/ui/sonner";
import { useAuthSession } from "@/providers/Auth";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import type { AuthMode } from "@/components/auth/auth-dialog";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";
import { config } from "@/config";

const AuthDialog = dynamic(() =>
  import("@/components/auth/auth-dialog").then((module) => module.AuthDialog),
);
const AgentTour = dynamic(() =>
  import("@/features/tour/components/AgentTour").then(
    (module) => module.AgentTour,
  ),
);
const WelcomeModal = dynamic(() =>
  import("@/components/onboarding/welcome-modal").then(
    (module) => module.WelcomeModal,
  ),
);

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
      <header className="doot-header flex shrink-0 items-center justify-between gap-3 pr-4 pl-14 md:px-5">
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
      {authDialogOpen && (
        <AuthDialog
          open={authDialogOpen}
          onOpenChange={setAuthDialogOpen}
          mode={authMode}
        />
      )}

      {/* Welcome video modal - shows first */}
      {!config.features.localMode && (
        <WelcomeModal onClose={handleWelcomeClose} />
      )}

      {/* Tour for unauthenticated users - only after welcome is done */}
      {!config.features.localMode && welcomeDone && <AgentTour />}
    </>
  );
}
