"use client";

/**
 * Unified Interrupt Hook
 *
 * Provides a unified interface for handling HITL (Human-in-the-Loop) interrupts
 * for both local and cloud agents. This hook abstracts the differences between
 * Electron IPC-based interrupts and HTTP-based stream commands.
 */

import { useCallback } from "react";
import { useStreamContext } from "@/features/chat/providers/Stream";
import { useAgentContext } from "@/providers/Agent";
import { send } from "@/lib/electron";

type AgentSource = "local" | "cloud";

/**
 * HITL Decision types
 */
export type HITLDecisionType = "approve" | "reject" | "edit";

/**
 * HITL Decision for interrupt response
 */
export interface HITLDecision {
  type: HITLDecisionType;
  tool_call_id: string;
  edited_args?: Record<string, unknown>;
  feedback?: string;
}

/**
 * Options for the useInterrupt hook
 */
export interface UseInterruptOptions {
  /** Thread ID */
  threadId: string;
  /** Override agent source (defaults to context) */
  agentSource?: AgentSource;
}

/**
 * Return type of useInterrupt
 */
export interface UseInterruptReturn {
  /** Approve the pending tool call */
  approve: (toolCallId: string) => void;
  /** Reject the pending tool call */
  reject: (toolCallId: string, feedback?: string) => void;
  /** Submit with edited arguments */
  edit: (toolCallId: string, editedArgs: Record<string, unknown>) => void;
  /** Generic decision handler */
  handleDecision: (decision: HITLDecision) => void;
}

/**
 * Hook for handling HITL interrupts in a unified way
 *
 * This hook provides approve/reject/edit methods that work for both
 * local (Electron IPC) and cloud (HTTP stream) agents.
 */
export function useInterrupt(options: UseInterruptOptions): UseInterruptReturn {
  const { threadId, agentSource: optionSource } = options;
  const stream = useStreamContext();
  const { agentSource: contextSource } = useAgentContext();

  // Use provided source or fall back to context
  const agentSource = optionSource ?? contextSource;

  /**
   * Handle a HITL decision for both local and cloud agents
   */
  const handleDecision = useCallback(
    (decision: HITLDecision) => {
      if (agentSource === "local") {
        // Local agent: Send via Electron IPC
        send("agent:interrupt", {
          threadId,
          decision,
        });
      } else {
        // Cloud agent: Use stream submit with Command
        stream.submit(null, {
          command: {
            resume: {
              type: decision.type,
              tool_call_id: decision.tool_call_id,
              ...(decision.edited_args && {
                edited_args: decision.edited_args,
              }),
              ...(decision.feedback && { feedback: decision.feedback }),
            },
          },
        });
      }
    },
    [agentSource, threadId, stream],
  );

  /**
   * Approve a pending tool call
   */
  const approve = useCallback(
    (toolCallId: string) => {
      handleDecision({
        type: "approve",
        tool_call_id: toolCallId,
      });
    },
    [handleDecision],
  );

  /**
   * Reject a pending tool call
   */
  const reject = useCallback(
    (toolCallId: string, feedback?: string) => {
      handleDecision({
        type: "reject",
        tool_call_id: toolCallId,
        feedback,
      });
    },
    [handleDecision],
  );

  /**
   * Edit a pending tool call with new arguments
   */
  const edit = useCallback(
    (toolCallId: string, editedArgs: Record<string, unknown>) => {
      handleDecision({
        type: "edit",
        tool_call_id: toolCallId,
        edited_args: editedArgs,
      });
    },
    [handleDecision],
  );

  return {
    approve,
    reject,
    edit,
    handleDecision,
  };
}

export default useInterrupt;
