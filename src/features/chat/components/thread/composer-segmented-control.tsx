"use client";

import React, { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { AttachIcon, ChatIcon } from "@/components/icons";
import { IconAgentSelector } from "./icon-agent-selector";
import { useAgentContext } from "@/features/chat/providers/Stream";
import { toast } from "sonner";

interface ComposerSegmentedControlProps {
  onFileUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}

export function ComposerSegmentedControl({
  onFileUpload,
  className,
}: ComposerSegmentedControlProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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

  const handleFileClick = () => fileInputRef.current?.click();

  // PHASE 4: Use isChatMode and setChatMode from context
  // Also read agentId so we can re-measure when agent label/text changes
  const { isChatMode, setChatMode, agentId } = useAgentContext();

  const handleChatClick = () => {
    setChatMode(true);
    // Show informative toast when switching to chat mode
    toast.info("Chat mode - Agent selection required to send messages");
  };

  // Update indicator position on mode change, agent changes, size changes, and font load
  useEffect(() => {
    const compute = () => {
      const activeButton = isChatMode
        ? chatButtonRef.current
        : agentButtonRef.current;
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
  }, [isChatMode, agentId, hasMeasured]);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Attach button (outlined circle) */}
      <div className="bg-background flex h-8 w-10 items-center justify-center rounded-full border">
        <TooltipIconButton
          tooltip="Attach file"
          onClick={handleFileClick}
        >
          <AttachIcon />
        </TooltipIconButton>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={onFileUpload}
        accept="image/*,.pdf,.txt,.doc,.docx,.csv,.json"
      />

      {/* Segmented control pill with animated indicator */}
      <div
        ref={containerRef}
        className="border-border bg-background relative flex items-center gap-1 overflow-hidden rounded-3xl border"
      >
        {/* Animated selection indicator */}
        <motion.div
          className="bg-foreground absolute h-8 rounded-2xl shadow-inner"
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
        <IconAgentSelector
          variant="segment"
          className="relative z-10 h-8"
          buttonRef={agentButtonRef}
        />

        {/* Right segment: Chat (no background, indicator handles it) */}
        <button
          ref={chatButtonRef}
          type="button"
          onClick={handleChatClick}
          className={cn(
            "relative z-10 h-8 cursor-pointer rounded-2xl px-3 text-sm font-medium transition-colors",
            "flex items-center gap-2",
            // Text color changes based on selection
            isChatMode
              ? "text-background"
              : "text-foreground/80 hover:text-foreground",
          )}
        >
          <ChatIcon className={cn("size-5", isChatMode && "text-background")} />
        </button>
      </div>
    </div>
  );
}
