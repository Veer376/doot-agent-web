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
import {
  useUpdateCloudAgent,
  useDeleteCloudAgent,
  cloudAgentKeys,
} from "@/hooks/use-cloud-agents";
import { useAgentConfig } from "@/hooks/use-agent-config";
import { Bot, LoaderCircle, Trash, X } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AgentFieldsForm, AgentFieldsFormLoading } from "./agent-form";
import { Agent } from "@/types/agent";
import { FormProvider, useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";

interface EditAgentDialogProps {
  agent: Agent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function EditAgentDialogContent({
  agent,
  onClose,
}: {
  agent: Agent;
  onClose: () => void;
}) {
  const { mutateAsync: updateAgent } = useUpdateCloudAgent();
  const { mutateAsync: deleteAgent } = useDeleteCloudAgent();
  const queryClient = useQueryClient();
  const {
    getSchemaAndUpdateConfig,

    loading,
    configurations,
    toolConfigurations,
    ragConfigurations,
    agentsConfigurations,
  } = useAgentConfig();
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const form = useForm<{
    name: string;
    description: string;
    config: Record<string, any>;
  }>({ defaultValues: async () => getSchemaAndUpdateConfig(agent) });

  const handleSubmit = async (data: {
    name: string;
    description: string;
    config: Record<string, any>;
  }) => {
    if (!data.name || !data.description) {
      toast.warning("Name and description are required");
      return;
    }

    const updatedAgent = await updateAgent({
      agentId: agent.assistant_id,
      args: data,
    });

    if (!updatedAgent) {
      toast.error("Failed to update agent", {
        description: "Please try again",
      });
      return;
    }

    toast.success("Agent updated successfully!");

    onClose();
  };

  const handleDelete = async () => {
    setDeleteSubmitting(true);
    let undoClicked = false;
    let deleteTimeout: NodeJS.Timeout | null = null;

    try {
      // Optimistically remove from UI (without actually deleting from DB)
      await deleteAgent({ agentId: agent.assistant_id, skipToast: false });

      onClose();

      // Show toast with undo button
      toast("Agent deleted", {
        description: "You can undo this action within 5 seconds",
        duration: 5000,
        action: {
          label: "Undo",
          onClick: () => {
            undoClicked = true;
            if (deleteTimeout) {
              clearTimeout(deleteTimeout);
            }
            // Restore the agent in the UI by invalidating queries
            queryClient.invalidateQueries({ queryKey: cloudAgentKeys.lists() });
            toast.success("Agent restored");
          },
        },
      });

      // Set timeout to permanently delete after 5 seconds
      deleteTimeout = setTimeout(async () => {
        if (!undoClicked) {
          try {
            // Actually delete from database
            await deleteAgent({ agentId: agent.assistant_id, skipToast: true });
          } catch (error) {
            console.error("Failed to permanently delete agent:", error);
            toast.error("Failed to delete agent", {
              description:
                error instanceof Error ? error.message : "Unknown error",
            });
            // Restore agent in UI on error
            queryClient.invalidateQueries({ queryKey: cloudAgentKeys.lists() });
          }
        }
        setDeleteSubmitting(false);
      }, 5000);
    } catch (error) {
      console.error("Failed to delete agent:", error);
      toast.error("Failed to delete agent", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
      setDeleteSubmitting(false);
    }
  };

  return (
    <AlertDialogContent className="h-auto max-h-[90vh] overflow-auto sm:max-w-lg md:max-w-2xl lg:max-w-3xl">
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <AlertDialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <AlertDialogTitle>Edit Agent</AlertDialogTitle>
              <AlertDialogDescription>
                Edit the agent for &apos;
                <span className="font-medium">{agent.graph_id}</span>&apos;
                graph.
              </AlertDialogDescription>
            </div>
            <AlertDialogCancel
              size="icon"
              data-radius="radius"
            >
              <X className="size-4" />
            </AlertDialogCancel>
          </div>
        </AlertDialogHeader>
        {loading ? (
          <AgentFieldsFormLoading />
        ) : (
          <FormProvider {...form}>
            <AgentFieldsForm
              configurations={configurations}
              toolConfigurations={toolConfigurations}
              agentId={agent.assistant_id}
              ragConfigurations={ragConfigurations}
              agentsConfigurations={agentsConfigurations}
            />
          </FormProvider>
        )}
        <AlertDialogFooter>
          <Button
            onClick={handleDelete}
            className="flex w-full items-center justify-center gap-1"
            disabled={loading || deleteSubmitting}
            variant="destructive"
            data-radius="radius"
          >
            {deleteSubmitting ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Trash />
            )}
            <span>{deleteSubmitting ? "Deleting..." : "Delete Agent"}</span>
          </Button>
          <Button
            type="submit"
            className="flex w-full items-center justify-center gap-1"
            disabled={loading || form.formState.isSubmitting}
            data-radius="radius"
          >
            {form.formState.isSubmitting ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Bot />
            )}
            <span>
              {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
            </span>
          </Button>
        </AlertDialogFooter>
      </form>
    </AlertDialogContent>
  );
}

export function EditAgentDialog({
  agent,
  open,
  onOpenChange,
}: EditAgentDialogProps) {
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
      <EditAgentDialogContent
        key={openCounter}
        agent={agent}
        onClose={() => onOpenChange(false)}
      />
    </AlertDialog>
  );
}
