"use client";

import { AgentInbox } from "@/components/agent-inbox";
import React from "react";

export default function DemoPage(): React.ReactNode {
  return (
    <div className="flex h-full w-full flex-col">
      <AgentInbox />
    </div>
  );
}
