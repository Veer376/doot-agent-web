import { AgentsCombobox } from "@/components/ui/agents-combobox";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { isDefaultAssistant } from "@/lib/agent-utils";
import { useAgentsContext } from "@/providers/Agents";
import { Agent } from "@/types/agent";
import { ArrowRight, ChevronsUpDown, X } from "lucide-react";
import { useQueryState } from "nuqs";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const getNewAgentLabel = (
  value: string,
  agents: Agent[],
): { graph: string; name: string } => {
  const [agentId, deploymentId] = value.split(":");
  const agent = agents.find(
    (a) => a.assistant_id === agentId && a.deploymentId === deploymentId,
  );
  if (!agent) {
    return { graph: "", name: "" };
  }
  if (isDefaultAssistant(agent)) {
    return { graph: agent.graph_id, name: "Default agent" };
  }
  return { graph: agent.graph_id, name: agent.name };
};

function SelectedAgentSelect() {
  const { agents, loading } = useAgentsContext();

  const [agentId, setAgentId] = useQueryState("agentId");
  const [deploymentId, setDeploymentId] = useQueryState("deploymentId");
  const [_threadId, setThreadId] = useQueryState("threadId");
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (value || !agentId || !deploymentId) return;
    setValue(`${agentId}:${deploymentId}`);
  }, [agentId, deploymentId]);

  const selectedAgent = agents.find((a) => a.assistant_id === agentId);
  const newAgentSelected = value && value !== `${agentId}:${deploymentId}`;
  const dropdownLabel = getNewAgentLabel(value, agents);

  const handleValueChange = (v: string) => {
    if (!v) {
      return;
    }
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

  const handleReset = () => {
    setValue(`${agentId}:${deploymentId}`);
  };

  if (!selectedAgent) return null;

  return (
    <>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        <BreadcrumbPage className="flex items-center justify-center gap-2">
          <AgentsCombobox
            agents={agents}
            agentsLoading={loading}
            value={value}
            setValue={(v) =>
              Array.isArray(v) ? handleValueChange(v[0]) : handleValueChange(v)
            }
            open={open}
            setOpen={setOpen}
            trigger={
              <div className="-ml-2 flex items-center justify-center gap-1 rounded-lg p-2 hover:bg-gray-50">
                <p className="flex items-center justify-center gap-1">
                  <span className="text-muted-foreground text-xs">
                    [{dropdownLabel.graph}]
                  </span>{" "}
                  {dropdownLabel.name}
                </p>
                <ChevronsUpDown className="size-4" />
              </div>
            }
            triggerAsChild={false}
          />
          {newAgentSelected && (
            <div className="flex items-center justify-center gap-2">
              <TooltipIconButton
                className="size-6 rounded-full"
                tooltip="Reset"
                onClick={handleReset}
              >
                <X className="size-4" />
              </TooltipIconButton>
              <TooltipIconButton
                variant="default"
                className="size-6 rounded-full"
                tooltip="Switch agent"
                onClick={handleStartChat}
              >
                <ArrowRight className="size-4" />
              </TooltipIconButton>
            </div>
          )}
        </BreadcrumbPage>
      </BreadcrumbItem>
    </>
  );
}

export function ChatBreadcrumb() {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Chat</BreadcrumbLink>
        </BreadcrumbItem>
        <SelectedAgentSelect />
      </BreadcrumbList>
    </Breadcrumb>
  );
}
