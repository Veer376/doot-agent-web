export type PermissionMode = "ask" | "auto" | "full";
export type ApprovalScope = "once" | "conversation" | "always";
export type ApprovalDecision =
  | { type: "approve"; scope: ApprovalScope }
  | { type: "reject"; message?: string }
  | { type: "respond"; message: string };
export type ApprovalRequest = {
  name: string;
  args: Record<string, unknown>;
  description?: string;
};
export type ApprovalInterrupt = {
  id: string;
  value: {
    action_requests: ApprovalRequest[];
    review_configs: { action_name: string; allowed_decisions: string[] }[];
  };
};
export type PermissionSettings = {
  default_mode: PermissionMode;
  path: string;
  grants: {
    workspace: string;
    scope: string;
    operation: string;
    tool: string;
    description: string;
  }[];
};

export function approvalInterrupts(interrupts: unknown[]): ApprovalInterrupt[] {
  return interrupts.filter((item): item is ApprovalInterrupt => {
    if (!item || typeof item !== "object") return false;
    const value = (item as ApprovalInterrupt).value;
    return (
      typeof (item as ApprovalInterrupt).id === "string" &&
      Array.isArray(value?.action_requests) &&
      Array.isArray(value?.review_configs)
    );
  });
}
