"use client";

import React, { useState, useCallback, useEffect } from "react";
import { AgentIcon } from "@/components/icons";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { AgentsCombobox } from "@/components/ui/agents-combobox";
import { useFetchAgents } from "@/hooks/use-agents";
import { useAgentContext, useStreamContext } from "@/features/chat/providers/Stream";
import { isUserSpecifiedDefaultAgent } from "@/lib/agent-utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface IconAgentSelectorProps {
  className?: string;
  onOpenChange?: (isOpen: boolean) => void;
  /**
   * Variant controls how the trigger is rendered:
   * - 'icon' (default): circular icon button
   * - 'segment': pill-like segment with Agent icon + name
   */
  variant?: "icon" | "segment";
  /**
   * Ref to forward to the button element (for measuring position/size)
   */
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
}

export function IconAgentSelector({
  className,
  onOpenChange,
  variant = "icon",
  buttonRef,
}: IconAgentSelectorProps) {
  const { data: agents = [], isLoading: loading } = useFetchAgents();
  const [open, setOpen] = useState(false);

  const { agentId, setSelectedAgent, mode, setMode } = useAgentContext();
  const stream = useStreamContext();
  const isStreaming = stream.isLoading;

  const onAgentChange = useCallback(
    (v: string | string[] | undefined) => {
      const nextValue = Array.isArray(v) ? v[0] : v;
      if (!nextValue) return;

      // Prevent agent switching during streaming (covers both mode switch and agent-to-agent change)
      if (isStreaming) {
        toast.info("Please wait for the current response to complete");
        return;
      }

      // Update agent selection and switch to agent mode
      setSelectedAgent(nextValue);
      setMode("agent");
    },
    [setSelectedAgent, setMode, isStreaming],
  );

  const agentValue = agentId || undefined;

  useEffect(() => {
    if (agentValue || !agents.length) {
      return;
    }
    const defaultAgent = agents.find(isUserSpecifiedDefaultAgent);
    if (defaultAgent) {
      onAgentChange(defaultAgent.assistant_id);
    }
  }, [agents, agentValue, onAgentChange]);

  const handleOpenChange = (isOpen: boolean) => {
    // PHASE 4: Only allow opening if we're already in agent mode
    // This prevents the popup from opening when just switching from chat to agent mode
    if (isOpen && mode === "chat") {
      // Block popup from opening when in chat mode
      return;
    }
    setOpen(isOpen);
    onOpenChange?.(isOpen);
  };

  // PHASE 4: Two-step interaction for segment variant
  // First click: Exit chat mode (if in chat mode)
  // Second click: Open agent selector popup
  const handleSegmentClick = useCallback(
    (e: React.MouseEvent) => {
      if (mode === "chat") {
        // Prevent switching to agent mode during streaming
        if (isStreaming) {
          e.preventDefault();
          e.stopPropagation();
          toast.info("Please wait for the current response to complete");
          return;
        }
        
        // First click when in chat mode: just switch to agent mode
        // Prevent the popover from opening
        e.preventDefault();
        e.stopPropagation();
        setMode("agent");
      }
      // When already in agent mode, let the normal popover behavior handle it
      // (it will open via the Popover's internal click handler)
    },
    [mode, setMode, isStreaming],
  );

  // Get selected agent for display
  const selectedAgent = agents.find(
    (agent) => agent.assistant_id === agentValue,
  );

  // PHASE 4: Use mode from context instead of checking agentId
  // isAgentMode is true when Agent segment should appear selected
  const isAgentMode = mode === "agent";

  const trigger =
    variant === "segment" ? (
      <button
        ref={buttonRef}
        type="button"
        onClick={handleSegmentClick}
        aria-label={
          selectedAgent ? `Agent: ${selectedAgent.name}` : "Select Agent"
        }
        className={cn(
          "h-8 cursor-pointer rounded-2xl px-3 text-sm transition-colors",
          "flex items-center gap-2",
          "bg-transparent",
          // Keep background by indicator when active; hover tint on inactive only
          isAgentMode
            ? "text-background"
            : "text-foreground hover:bg-accent/60 dark:hover:bg-accent/40",
          "focus-visible:ring-ring/50 focus-visible:ring-2 focus-visible:outline-none",
          className,
        )}
      >
        <AgentIcon className={isAgentMode ? "text-background" : ""} />
        <span className="hidden max-w-[160px] truncate md:inline-block">
          {selectedAgent?.name ?? "Agent"}
        </span>
      </button>
    ) : (
      <TooltipIconButton
        tooltip={
          selectedAgent ? `Agent: ${selectedAgent.name}` : "Select Agent"
        }
        variant="ghost"
        className={className}
      >
        <AgentIcon />
        <span className="sr-only">Select Agent</span>
      </TooltipIconButton>
    );

  return (
    <AgentsCombobox
      agents={agents}
      agentsLoading={loading}
      value={agentValue}
      setValue={onAgentChange}
      open={open}
      setOpen={handleOpenChange}
      triggerAsChild
      className="min-w-auto"
      trigger={trigger}
    />
  );
}
