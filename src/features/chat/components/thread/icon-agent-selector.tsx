"use client";

import React, { useState, useCallback, useEffect } from "react";
import { AgentIcon } from "@/components/icons";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { AgentsCombobox } from "@/components/ui/agents-combobox";
import { useAgentsContext } from "@/providers/Agents";
import { useAgentContext } from "@/features/chat/providers/Stream";
import { useQueryState } from "nuqs";
import { useThreadAgent } from "@/hooks/use-thread-agent";
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
  const { agents, loading } = useAgentsContext();
  const [open, setOpen] = useState(false);

  // PHASE 3: Get agentId from context instead of URL
  // PHASE 4: Also get isChatMode and setChatMode
  const { agentId, setAgentId, isChatMode, setChatMode } = useAgentContext();
  const [threadId] = useQueryState("threadId");

  // Phase 2: Thread-Agent Persistence
  const { saveThreadAgent } = useThreadAgent();

  const onAgentChange = useCallback(
    (v: string | string[] | undefined) => {
      const nextValue = Array.isArray(v) ? v[0] : v;
      if (!nextValue) return;

      // PHASE 4: Update agent selection and exit chat mode
      setAgentId(nextValue);
      setChatMode(false); // Selecting an agent always exits chat mode

      // NOTE: Agent change does NOT create new thread - agent is a property of the thread
      // Phase 2: Save thread-agent mapping when agent changes
      // Only save if we have an active thread (not on initial selection)
      if (threadId) {
        saveThreadAgent(threadId, nextValue);
      }
    },
    [setAgentId, setChatMode, threadId, saveThreadAgent],
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
    if (isOpen && isChatMode) {
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
      if (isChatMode) {
        // First click when in chat mode: just switch to agent mode
        // Prevent the popover from opening
        e.preventDefault();
        e.stopPropagation();
        setChatMode(false);
      }
      // When already in agent mode, let the normal popover behavior handle it
      // (it will open via the Popover's internal click handler)
    },
    [isChatMode, setChatMode],
  );

  // Get selected agent for display
  const selectedAgent = agents.find(
    (agent) => agent.assistant_id === agentValue,
  );

  // PHASE 4: Use isChatMode from context instead of checking agentId
  // isAgentMode is true when Agent segment should appear selected
  const isAgentMode = !isChatMode;

  const trigger =
    variant === "segment" ? (
      <button
        ref={buttonRef}
        type="button"
        onClick={handleSegmentClick}
        className={cn(
          "h-8 cursor-pointer rounded-2xl px-3 text-sm font-semibold transition-colors",
          "flex items-center gap-2",
          // PHASE 5: Remove background, only manage text color
          // The animated indicator in parent handles the background
          "bg-transparent",
          isAgentMode
            ? "text-background"
            : "text-foreground/80 hover:text-foreground",
          className,
        )}
      >
        <AgentIcon className={isAgentMode ? "text-background" : ""} />
        <span className="max-w-[160px] truncate">
          {selectedAgent?.name ?? "Agent"}
        </span>
      </button>
    ) : (
      <TooltipIconButton
        tooltip={
          selectedAgent ? `Agent: ${selectedAgent.name}` : "Select Agent"
        }
        variant="ghost"
        className={cn(
          "flex-shrink-0 cursor-pointer rounded-3xl bg-blue-100 transition-colors ease-in-out hover:bg-blue-100",
          className,
        )}
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
