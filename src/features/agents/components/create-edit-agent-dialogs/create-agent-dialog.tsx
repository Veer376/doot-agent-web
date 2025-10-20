import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Bot, LoaderCircle, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useCreateAgent, useFetchAgents } from "@/hooks/use-agents";
import { AgentFieldsForm, AgentFieldsFormLoading } from "./agent-form";
import { Agent } from "@/types/agent";
import { GraphSelect } from "./graph-select";
import { useAgentConfig } from "@/hooks/use-agent-config";
import { FormProvider, useForm } from "react-hook-form";

interface CreateAgentDialogProps {
  agentId?: string;
  deploymentId?: string;
  graphId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreateAgentFormContent(props: {
  selectedGraph: Agent;
  onClose: () => void;
}) {
  const form = useForm<{
    name: string;
    description: string;
    config: Record<string, any>;
  }>({
    defaultValues: async () => {
      const values = await getSchemaAndUpdateConfig(props.selectedGraph);
      return { name: "", description: "", config: values.config };
    },
  });

  const { mutateAsync: createAgent } = useCreateAgent();
  const {
    getSchemaAndUpdateConfig,
    loading,
    configurations,
    toolConfigurations,
    ragConfigurations,
    agentsConfigurations,
  } = useAgentConfig();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (data: {
    name: string;
    description: string;
    config: Record<string, any>;
  }) => {
    const { name, description, config } = data;
    if (!name || !description) {
      toast.warning("Name and description are required", {
        richColors: true,
      });
      return;
    }

    setSubmitting(true);
    const newAgent = await createAgent(
      props.selectedGraph.graph_id,
      {
        name,
        description,
        config,
      },
    );
    setSubmitting(false);

    if (!newAgent) {
      toast.error("Failed to create agent", {
        description: "Please try again",
        richColors: true,
      });
      return;
    }

    toast.success("Agent created successfully!", {
      richColors: true,
    });

    props.onClose();
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)}>
      {loading ? (
        <AgentFieldsFormLoading />
      ) : (
        <FormProvider {...form}>
          <AgentFieldsForm
            agentId={props.selectedGraph.assistant_id}
            configurations={configurations}
            toolConfigurations={toolConfigurations}
            ragConfigurations={ragConfigurations}
            agentsConfigurations={agentsConfigurations}
          />
        </FormProvider>
      )}
      <AlertDialogFooter>
        <Button
          onClick={(e) => {
            e.preventDefault();
            props.onClose();
          }}
          variant="outline"
          disabled={loading || submitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex w-full items-center justify-center gap-1"
          disabled={loading || submitting}
        >
          {submitting ? <LoaderCircle className="animate-spin" /> : <Bot />}
          <span>{submitting ? "Creating..." : "Create Agent"}</span>
        </Button>
      </AlertDialogFooter>
    </form>
  );
}

export function CreateAgentDialog({
  agentId,
  graphId,
  open,
  onOpenChange,
}: CreateAgentDialogProps) {
  const { data: agents = [] } = useFetchAgents();
  const [selectedGraph, setSelectedGraph] = useState<Agent | undefined>();

  useEffect(() => {
    if (selectedGraph) return;
    if (agentId && graphId) {
      // Find the deployment & default agent, then set them
      const defaultAgent = agents.find(
        (a: any) => a.assistant_id === agentId
      );
      if (!defaultAgent) {
        toast.error("Something went wrong. Please try again.", {
          richColors: true,
        });
        return;
      }

      setSelectedGraph(defaultAgent);
    }
  }, [
    agentId,
    graphId,
    agents,
    selectedGraph,
  ]);

  const [openCounter, setOpenCounter] = useState(0);

  const lastOpen = useRef(open);
  useLayoutEffect(() => {
    if (lastOpen.current !== open && open) {
      setOpenCounter((c) => c + 1);
    }
    lastOpen.current = open;
  }, [open, setOpenCounter]);

  return (
    <AlertDialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <AlertDialogContent className="h-auto max-h-[90vh] overflow-auto sm:max-w-lg md:max-w-2xl lg:max-w-3xl">
        <AlertDialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <AlertDialogTitle>Create Agent</AlertDialogTitle>
              <AlertDialogDescription>
                Create a new agent for &apos;
                <span className="font-medium">{selectedGraph?.graph_id}</span>
                &apos; graph.
              </AlertDialogDescription>
            </div>
            <AlertDialogCancel size="icon">
              <X className="size-4" />
            </AlertDialogCancel>
          </div>
        </AlertDialogHeader>

        {!agentId && !graphId && (
          <div className="flex flex-col items-start justify-start gap-2">
            <p>Please select a graph to create an agent for.</p>
            <GraphSelect
              className="w-full"
              agents={agents}
              selectedGraph={selectedGraph}
              setSelectedGraph={setSelectedGraph}
            />
          </div>
        )}

        {selectedGraph  ? (
          <CreateAgentFormContent
            key={`${openCounter}-${selectedGraph.assistant_id}`}
            selectedGraph={selectedGraph}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </AlertDialogContent>
    </AlertDialog>
  );
}
