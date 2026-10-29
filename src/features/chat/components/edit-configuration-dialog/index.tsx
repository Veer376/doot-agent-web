"use client";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ConfigField,
  ConfigFieldAgents,
  ConfigFieldTool,
} from "@/features/chat/components/configuration-sidebar/config-field";
import { ConfigSection } from "@/features/chat/components/configuration-sidebar/config-section";
import { useConfigStore } from "@/features/chat/hooks/use-config-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAgentContext } from "@/providers/Agent";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useMCPContext } from "@/providers/MCP";
import { Search } from "@/components/ui/tool-search";
import { useSearchTools } from "@/hooks/use-search-tools";
import { useFetchPreselectedTools } from "@/hooks/use-fetch-preselected-tools";
import { useAgentConfig } from "@/hooks/use-agent-config";
import {
  useFetchAgents,
  useUpdateAgent,
  useCreateAgent,
} from "@/hooks/use-agents";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isPrimaryAgent } from "@/lib/agent-utils";
import {
  LoaderIcon as LoaderCircle,
  SaveIcon as Save,
  XIcon as X,
  RefreshIcon as RotateCcw,
  PlusIcon as Plus,
  DeleteIcon,
} from "@/components/icons";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useQueryState } from "nuqs";

interface EditConfigurationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function NameAndDescriptionContent({
  name,
  setName,
  description,
  setDescription,
  onCancel,
  onSubmit,
  submitting,
}: {
  name: string;
  setName: (name: string) => void;
  description: string;
  setDescription: (description: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  return (
    <>
      <AlertDialogHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <AlertDialogTitle>Save as New Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Please give your new agent a name and optional description.
            </AlertDialogDescription>
          </div>
          <AlertDialogCancel
            size="icon"
            onClick={onCancel}
          >
            <X className="size-4" />
          </AlertDialogCancel>
        </div>
      </AlertDialogHeader>
      <div className="flex flex-col gap-4 py-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            placeholder="Agent Name"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="description">Description</Label>
          <Input
            placeholder="Agent Description"
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>
      <AlertDialogFooter>
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          onClick={onSubmit}
          disabled={submitting || !name.trim()}
        >
          {submitting ? (
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          {submitting ? "Creating..." : "Create Agent"}
        </Button>
      </AlertDialogFooter>
    </>
  );
}

function EditConfigurationDialogContent({ onClose }: { onClose: () => void }) {
  const { configsByAgentId, resetConfig } = useConfigStore();
  const { tools, setTools, getTools, cursor } = useMCPContext();
  const { agentId } = useAgentContext();
  const [threadId] = useQueryState("threadId");
  const { data: agents = [], isFetching: refreshAgentsLoading } =
    useFetchAgents();
  const {
    getSchemaAndUpdateConfig,
    configurations,
    toolConfigurations,
    agentsConfigurations,
    loading,
    supportedConfigs,
  } = useAgentConfig();
  const { mutate: updateAgent, isPending: isUpdating } = useUpdateAgent();
  const { mutate: createAgent, isPending: isCreating } = useCreateAgent();

  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [showNameDialog, setShowNameDialog] = useState(false);

  const { toolSearchTerm, debouncedSetSearchTerm, displayTools } =
    useSearchTools(tools, {
      preSelectedTools: toolConfigurations[0]?.default?.tools,
    });
  const { loadingMore, setLoadingMore } = useFetchPreselectedTools({
    tools,
    setTools,
    getTools,
    cursor,
    toolConfigurations,
    searchTerm: toolSearchTerm,
  });

  useEffect(() => {
    if (!agentId || loading || !agents?.length || refreshAgentsLoading) return;

    const selectedAgent = agents.find((a) => a.assistant_id === agentId);
    if (!selectedAgent) {
      toast.error("Failed to get agent config.", { richColors: true });
      return;
    }

    getSchemaAndUpdateConfig(selectedAgent);
  }, [agentId, agents, refreshAgentsLoading]);

  const selectedAgent = agents.find((a) => a.assistant_id === agentId);
  const isPrimary = selectedAgent ? isPrimaryAgent(selectedAgent) : false;

  const handleSave = async () => {
    if (!agentId || !agents?.length) return;

    if (!selectedAgent) {
      toast.error("Failed to save config.", {
        richColors: true,
        description: "Unable to find selected agent.",
      });
      return;
    }

    // If this is a primary agent, show the name dialog to create a new agent
    if (isPrimary) {
      setShowNameDialog(true);
      return;
    }

    // Update existing agent with React Query mutation
    updateAgent(
      {
        agentId: agentId,
        args: {
          config: configsByAgentId[agentId],
        },
      },
      {
        onSuccess: () => {
          toast.success("Agent configuration saved successfully");
          onClose();
        },
        onError: () => {
          toast.error("Failed to update agent configuration");
        },
      },
    );
  };

  const handleCreateNewAgent = () => {
    if (!agentId || !selectedAgent || !newName.trim()) return;

    createAgent(
      {
        graphId: selectedAgent.graph_id,
        args: {
          name: newName,
          description: newDescription,
          config: configsByAgentId[agentId],
        },
      },
      {
        onSuccess: (newAgent) => {
          // Reload the page, using the new assistant ID
          const newQueryParams = new URLSearchParams({
            agentId: newAgent.assistant_id,
            ...(threadId ? { threadId } : {}),
          });
          window.location.href = `/?${newQueryParams.toString()}`;
        },
        onError: () => {
          toast.error("Failed to create agent", { richColors: true });
        },
      },
    );
  };

  const handleReset = () => {
    if (!agentId) return;
    resetConfig(agentId);
    toast.success("Configuration reset to last saved state");
  };

  // Show name dialog for creating new agent from primary
  if (showNameDialog) {
    return (
      <AlertDialogContent className="sm:max-w-md">
        <NameAndDescriptionContent
          name={newName}
          setName={setNewName}
          description={newDescription}
          setDescription={setNewDescription}
          onCancel={() => setShowNameDialog(false)}
          onSubmit={handleCreateNewAgent}
          submitting={isCreating}
        />
      </AlertDialogContent>
    );
  }

  return (
    <AlertDialogContent className="flex h-[85vh] max-h-[85vh] flex-col sm:max-w-lg md:max-w-2xl lg:max-w-3xl">
      <AlertDialogHeader className="flex-shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <AlertDialogTitle>Agent Configuration</AlertDialogTitle>
            <AlertDialogDescription>
              {isPrimary ? (
                <>
                  Configure the primary agent. Save will create a new agent with
                  your changes.
                </>
              ) : (
                <>
                  Edit configuration for &apos;
                  <span className="font-medium">{selectedAgent?.name}</span>
                  &apos;
                </>
              )}
            </AlertDialogDescription>
          </div>
          <AlertDialogCancel size="icon">
            <X className="size-4" />
          </AlertDialogCancel>
        </div>
      </AlertDialogHeader>

      <Tabs
        defaultValue="general"
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList className="flex-shrink-0 justify-start bg-transparent">
          <TabsTrigger value="general">General</TabsTrigger>
          {supportedConfigs.includes("tools") && (
            <TabsTrigger value="tools">Tools</TabsTrigger>
          )}
          {supportedConfigs.includes("supervisor") && (
            <TabsTrigger value="supervisor">Supervisor</TabsTrigger>
          )}
        </TabsList>

        <ScrollArea className="min-h-0 flex-1 pr-4">
          <TabsContent
            value="general"
            className="m-0 mt-4"
          >
            <ConfigSection title="Configuration">
              {loading || !agentId ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : (
                configurations.map((c, index) => (
                  <ConfigField
                    key={`${c.label}-${index}`}
                    id={c.label}
                    label={c.label}
                    type={c.type === "boolean" ? "switch" : (c.type ?? "text")}
                    description={c.description}
                    placeholder={c.placeholder}
                    options={c.options}
                    min={c.min}
                    max={c.max}
                    step={c.step}
                    agentId={agentId}
                  />
                ))
              )}
            </ConfigSection>
          </TabsContent>

          {supportedConfigs.includes("tools") && (
            <TabsContent
              value="tools"
              className="m-0 mt-4"
            >
              <ConfigSection title="Available Tools">
                <Search
                  onSearchChange={debouncedSetSearchTerm}
                  placeholder="Search tools..."
                />
                <div
                  data-radius="surface"
                  className="flex-1 space-y-4 overflow-y-auto"
                >
                  {agentId &&
                    displayTools.length > 0 &&
                    displayTools.map((c, index) => (
                      <ConfigFieldTool
                        key={`${c.name}-${index}`}
                        id={c.name}
                        label={c.name}
                        description={c.description}
                        agentId={agentId}
                        toolId={toolConfigurations[0]?.label}
                      />
                    ))}
                  {agentId && displayTools.length === 0 && toolSearchTerm && (
                    <p className="mt-4 text-center text-sm text-muted-foreground">
                      No tools found matching "{toolSearchTerm}".
                    </p>
                  )}
                  {!agentId && (
                    <p className="mt-4 text-center text-sm text-muted-foreground">
                      Select an agent to see tools.
                    </p>
                  )}
                  {agentId && tools.length === 0 && !toolSearchTerm && (
                    <p className="mt-4 text-center text-sm text-muted-foreground">
                      No tools available for this agent.
                    </p>
                  )}
                  {cursor && !toolSearchTerm && (
                    <div className="flex justify-center py-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            setLoadingMore(true);
                            const moreTool = await getTools(cursor);
                            setTools((prevTools) => [
                              ...prevTools,
                              ...moreTool,
                            ]);
                          } catch (error) {
                            console.error("Failed to load more tools:", error);
                          } finally {
                            setLoadingMore(false);
                          }
                        }}
                        disabled={loadingMore || loading}
                      >
                        {loadingMore ? "Loading..." : "Load More Tools"}
                      </Button>
                    </div>
                  )}
                </div>
              </ConfigSection>
            </TabsContent>
          )}

          {supportedConfigs.includes("supervisor") && (
            <TabsContent
              value="supervisor"
              className="m-0 mt-4"
            >
              <ConfigSection title="Supervisor Agents">
                {agentId && (
                  <ConfigFieldAgents
                    id={agentsConfigurations[0].label}
                    label={agentsConfigurations[0].label}
                    agentId={agentId}
                  />
                )}
              </ConfigSection>
            </TabsContent>
          )}
        </ScrollArea>
      </Tabs>

      <AlertDialogFooter className="flex-shrink-0 border-t pt-4">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={loading || isUpdating || isCreating}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset
        </Button>
        <Button
          onClick={handleSave}
          disabled={loading || isUpdating || isCreating}
        >
          {isUpdating || isCreating ? (
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {isPrimary ? "Save as New Agent" : "Save Changes"}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}

export function EditConfigurationDialog({
  open,
  onOpenChange,
}: EditConfigurationDialogProps) {
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
      <EditConfigurationDialogContent
        key={openCounter}
        onClose={() => onOpenChange(false)}
      />
    </AlertDialog>
  );
}
