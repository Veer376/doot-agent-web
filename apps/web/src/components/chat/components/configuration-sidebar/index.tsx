import * as React from "react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useAgentsContext } from "@/providers/Agents"
import { useQueryState } from "nuqs";
import { AgentsCombobox } from "@/components/ui/agents-combobox";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ConfigurationSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { agents } = useAgentsContext();
  const [agentId, setAgentId] = useQueryState("agentId");
  const [deploymentId, setDeploymentId] = useQueryState("deploymentId");
  const [_threadId, setThreadId] = useQueryState("threadId")
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);

  const selectedAgent = agents.find((a) => a.assistant_id === agentId && a.deploymentId === deploymentId)

  useEffect(() => {
    if (agentId && deploymentId) {
      setValue(`${agentId}:${deploymentId}`);
    }
  }, [agentId, deploymentId])

  const handleValueChange = (v: string) => {
    setValue(v);
    setOpen(false);
  };

  const handleStartChat = () => {
    if (!value) {
      toast.info("Please select an agent");
      return;
    }
    const [agentId_, deploymentId_] = value.split(":");
    setAgentId(agentId_);
    setDeploymentId(deploymentId_);
    setThreadId(null);
  };

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarContent>
        <SidebarHeader>
          <p className="text-lg font-medium mx-auto">Agent Configuration</p>
        </SidebarHeader>
        <SidebarGroup>
          <SidebarGroupLabel>Agent</SidebarGroupLabel>
          <SidebarGroupContent className="flex flex-col gap-2 items-center">
            <AgentsCombobox
              agents={agents}
              value={value}
              setValue={(v) => handleValueChange(v)}
              open={open}
              setOpen={setOpen}
            />
            <Button variant="outline" onClick={handleStartChat}>Start Chat</Button>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
