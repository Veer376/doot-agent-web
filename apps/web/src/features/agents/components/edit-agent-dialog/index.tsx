import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAgents } from "@/hooks/use-agents";
import { configSchemaToConfigurableFields } from "@/lib/ui-config";
import { ConfigurableFieldUIMetadata } from "@/types/configurable";
import { Bot, LoaderCircle, Pencil, Trash, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAgentsContext } from "@/providers/Agents";
import { AgentFieldsForm, AgentFieldsFormLoading } from "../agent-form";
import { Agent } from "@/types/agent";

interface EditAgentDialogProps {
  agent: Agent;
}

export function EditAgentDialog({ agent }: EditAgentDialogProps) {
  const { getAgentConfigSchema, updateAgent, deleteAgent } = useAgents();
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
    getAgentConfigSchema(agent.assistant_id, agent.deploymentId)
      .then((schemas) => {
        if (!schemas) return;
        const configFields = configSchemaToConfigurableFields(schemas);
        const configFieldsWithDefaults = configFields.map((f) => {
          const defaultConfig =
            agent.config?.configurable?.[f.label] ?? f.default;
          return {
            ...f,
            default: defaultConfig,
          };
        });
        setConfigurations(configFieldsWithDefaults);
        setName(agent.name);
        setDescription((agent.metadata?.description ?? "") as string);
        setConfig(agent.config?.configurable ?? {});
      })
      .finally(() => setLoading(false));
  }, [agent, open]);

  const handleSubmit = async (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    e.preventDefault();
    if (!name || !description) {
      toast.warning("Name and description are required");
      return;
    }

    setSubmitting(true);
    const updatedAgent = await updateAgent(
      agent.assistant_id,
      agent.deploymentId,
      {
        name,
        description,
        config,
      },
    );
    setSubmitting(false);

    if (!updatedAgent) {
      toast.error("Failed to update agent", {
        description: "Please try again",
      });
      return;
    }

    toast.success("Agent updated successfully!");

    setOpen(false);
    clearState();
    // Do not await so that the refresh is non-blocking
    refreshAgents();
  };

  const handleDelete = async () => {
    setSubmitting(true);
    const deleted = await deleteAgent(agent.deploymentId, agent.assistant_id);
    setSubmitting(false);

    if (!deleted) {
      toast.error("Failed to delete agent", {
        description: "Please try again",
      });
      return;
    }

    toast.success("Agent deleted successfully!");

    setOpen(false);
    clearState();
    // Do not await so that the refresh is non-blocking
    refreshAgents();
  };

  const clearState = () => {
    setConfig({});
    setName("");
    setDescription("");
    setConfigurations([]);
    setLoading(false);
    setSubmitting(false);
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
        <Button
          variant="secondary"
          className="flex items-center justify-center gap-1"
        >
          <Pencil className="size-4" />
          <span>Edit</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="h-auto max-h-[90vh] overflow-auto sm:max-w-lg md:max-w-2xl lg:max-w-3xl">
        <AlertDialogHeader>
          <div className="flex items-center justify-between">
            <AlertDialogTitle>Edit Agent</AlertDialogTitle>
            <AlertDialogCancel>
              <X className="size-4" />
            </AlertDialogCancel>
          </div>
          <AlertDialogDescription>
            Edit the agent for &apos;
            <span className="font-medium">{agent.graph_id}</span>&apos; graph.
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
            agentId={agent.assistant_id}
          />
        )}
        <AlertDialogFooter>
          <Button
            onClick={handleDelete}
            className="flex w-full items-center justify-center gap-1"
            disabled={loading || submitting}
            variant="destructive"
          >
            {submitting ? <LoaderCircle className="animate-spin" /> : <Trash />}
            <span>{submitting ? "Deleting..." : "Delete Agent"}</span>
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex w-full items-center justify-center gap-1"
            disabled={loading || submitting}
          >
            {submitting ? <LoaderCircle className="animate-spin" /> : <Bot />}
            <span>{submitting ? "Saving..." : "Save Changes"}</span>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
