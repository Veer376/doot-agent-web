"use client";

import React, { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChatIcon } from "@/components/icons";
import { IconAgentSelector } from "./icon-agent-selector";
import { useStreamContext } from "@/features/chat/providers/Stream";
import { useAgentContext } from "@/providers/Agent";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

interface ComposerSegmentedControlProps {
  className?: string;
}

export function ComposerSegmentedControl({
  className,
}: ComposerSegmentedControlProps) {
  // Refs for measuring button positions and sizes
  const agentButtonRef = useRef<HTMLButtonElement>(null);
  const chatButtonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // State for animated indicator position and size
  const [indicatorStyle, setIndicatorStyle] = useState({
    left: 0,
    width: 0,
  });
  // Optional polish: fade-in indicator after first valid compute
  const [hasMeasured, setHasMeasured] = useState(false);

  // PHASE 4: Use mode and setMode from context
  // Also read agentId so we can re-measure when agent label/text changes
  const { mode, setMode, agentId } = useAgentContext();
  const stream = useStreamContext();
  const isStreaming = stream.isLoading;
  const hasMessages = stream.messages.length > 0;

  const handleChatClick = () => {
    // Prevent mode switching during streaming
    if (isStreaming) {
      toast.info("Please wait for the current response to complete");
      return;
    }

    // Show warning if there are existing messages in the conversation
    if (hasMessages && mode === "agent") {
      toast.info("Switching modes mid-conversation", {
        description:
          "Current agent will have previous agent context, so be sure to do this intelligently.",
        duration: 4000,
      });
    }

    setMode("chat");
  };

  // Update indicator position on mode change, agent changes, size changes, and font load
  useEffect(() => {
    const compute = () => {
      const activeButton =
        mode === "chat" ? chatButtonRef.current : agentButtonRef.current;
      const containerEl = containerRef.current;
      if (!activeButton || !containerEl) return;

      const buttonRect = activeButton.getBoundingClientRect();
      const containerRect = containerEl.getBoundingClientRect();

      // Fallback widths if rects are not stable yet
      const baseWidth =
        buttonRect.width ||
        activeButton.offsetWidth ||
        activeButton.scrollWidth ||
        0;
      // Optional polish: clamp min-width before first stable measurement
      const minWidth = hasMeasured ? 1 : 24;
      const width = Math.max(baseWidth, minWidth);
      const left = (buttonRect.left || 0) - (containerRect.left || 0);

      setIndicatorStyle((prev) => {
        if (prev.left === left && prev.width === width) return prev;
        return { left, width };
      });
      // Mark as measured once we have a non-zero base width
      if (!hasMeasured && baseWidth > 0) setHasMeasured(true);
    };

    // Run on next frame to ensure DOM/layout is settled
    const rafId = requestAnimationFrame(compute);

    // Recompute on window resize
    window.addEventListener("resize", compute);

    // Observe element size changes (text reflow, font load, async agent name)
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => compute());
      if (agentButtonRef.current) ro.observe(agentButtonRef.current);
      if (chatButtonRef.current) ro.observe(chatButtonRef.current);
      if (containerRef.current) ro.observe(containerRef.current);
    }

    // Also wait for fonts to be ready to avoid initial narrow width
    // Not all browsers support document.fonts, guard accordingly
    const fontsApi: any = (document as any).fonts;
    if (fontsApi?.ready && typeof fontsApi.ready.then === "function") {
      fontsApi.ready.then(() => compute());
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", compute);
      ro?.disconnect();
    };
  }, [mode, agentId, hasMeasured]);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Segmented control pill with animated indicator */}
      <div
        ref={containerRef}
        data-radius="radius2"
        className="bg-card ring-border relative flex items-center gap-1 overflow-hidden p-0.5 shadow-inner ring-1"
      >
        {/* Animated selection indicator */}
        <motion.div
          data-radius="radius2"
          className="bg-foreground absolute h-8 shadow-sm"
          initial={false}
          animate={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
            opacity: hasMeasured ? 1 : 0,
          }}
          transition={{
            left: { type: "spring", stiffness: 400, damping: 30, mass: 0.8 },
            width: { type: "spring", stiffness: 400, damping: 30, mass: 0.8 },
            opacity: { duration: 0.18 },
          }}
        />

        {/* Left segment: Agent (no background, indicator handles it) */}
        <div id="agent-selector-segment">
          <IconAgentSelector
            variant="segment"
            className="relative z-10 h-8"
            buttonRef={agentButtonRef}
          />
        </div>

        {/* Right segment: Chat (tooltip + hover background on inactive only) */}
        <TooltipProvider>
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <button
                ref={chatButtonRef}
                type="button"
                onClick={handleChatClick}
                aria-label="Chat mode"
                className={cn(
                  "relative z-10 h-8 cursor-pointer rounded-full px-2 text-sm font-medium transition-colors",
                  "flex items-center gap-2",
                  // Keep background managed by indicator when active
                  // and add a soft hover surface only when inactive
                  mode === "chat"
                    ? "text-background"
                    : "text-foreground hover:bg-accent/60 dark:hover:bg-accent/40",
                  "focus-visible:ring-ring/50 focus-visible:ring-2 focus-visible:outline-none",
                )}
              >
                <ChatIcon
                  className={cn("size-5", mode === "chat" && "text-background")}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Chat mode</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
