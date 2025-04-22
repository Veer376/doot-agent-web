import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { useAgents } from "@/hooks/use-agents";
import { configSchemaToConfigurableFields } from "@/lib/ui-config";
import { ConfigurableFieldUIMetadata } from "@/types/configurable";
import { Bot, CirclePlus, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAgentsContext } from "@/providers/Agents";
import { AgentFieldsForm, AgentFieldsFormLoading } from "../agent-form";

interface CreateAgentDialogProps {
  agentId: string;
  deploymentId: string;
  graphId: string;
}

export function CreateAgentDialog({
  agentId,
  deploymentId,
  graphId,
}: CreateAgentDialogProps) {
  const { getAgentConfigSchema, createAgent } = useAgents();
  const { refreshAgents } = useAgentsContext();
  const [configurations, setConfigurations] = useState<
    ConfigurableFieldUIMetadata[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [config, setConfig] = useState<Record<string, any>>({});
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      loading ||
      configurations.length > 0 ||
      !open
    )
      return;

    setLoading(true);
    getAgentConfigSchema(agentId, deploymentId)
      .then((schemas) => {
        if (!schemas) return;
        const configFields = configSchemaToConfigurableFields(schemas);
        setConfigurations(configFields);
      })
      .finally(() => setLoading(false));
  }, [agentId, deploymentId, open]);

  const handleSubmit = async (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    e.preventDefault();
    if (!name || !description) {
      toast.warning("Name and description are required");
      return;
    }

    setSubmitting(true);
    const newAgent = await createAgent(deploymentId, graphId, {
      name,
      description,
      config,
    });
    setSubmitting(false);

    if (!newAgent) {
      toast.error("Failed to create agent", {
        description: "Please try again",
      });
      return;
    }

    toast.success("Agent created successfully!");

    setOpen(false);
    clearState();
    // Do not await so that the refresh is non-blocking
    refreshAgents();
  };

  const clearState = () => {
    setConfig({});
    setName("");
    setDescription("");
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(c) => {
        setOpen(c);
        if (!c) {
          clearState();
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <TooltipIconButton
          className="size-8"
          tooltip="New Agent"
          delayDuration={200}
        >
          <CirclePlus className="size-5" />
        </TooltipIconButton>
      </AlertDialogTrigger>
      <AlertDialogContent className="h-auto max-h-[90vh] overflow-auto sm:max-w-lg md:max-w-2xl lg:max-w-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Create Agent</AlertDialogTitle>
          <AlertDialogDescription>
            Create a new agent for &apos;
            <span className="font-medium">{graphId}</span>&apos; graph.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {loading ? (
          <AgentFieldsFormLoading />
        ) : (
          <AgentFieldsForm
            name={name}
            setName={setName}
            description={description}
            setDescription={setDescription}
            configurations={configurations}
            config={config}
            setConfig={setConfig}
            agentId={agentId}
          />
        )}
        <AlertDialogFooter>
          <Button
            onClick={(e) => {
              e.preventDefault();
              clearState();
              setOpen(false);
            }}
            variant="outline"
            disabled={loading || submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={(e) => handleSubmit(e)}
            className="flex w-full items-center justify-center gap-1"
            disabled={loading || submitting}
          >
            {submitting ? <LoaderCircle className="animate-spin" /> : <Bot />}
            <span>{submitting ? "Creating..." : "Create Agent"}</span>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
