"use client";

import { useEffect, useState } from "react";
import { Save, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfigField } from "@/features/chat/components/configuration-sidebar/config-field";
import { ConfigSection } from "@/features/chat/components/configuration-sidebar/config-section";
import { useConfigStore } from "@/features/chat/hooks/use-config-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useQueryState } from "nuqs";
import { ConfigurableFieldUIMetadata } from "@/types/configurable";
import { configSchemaToConfigurableFields } from "@/lib/ui-config";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgents } from "@/hooks/use-agents";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

export interface AIConfigPanelProps {
  className?: string;
  open: boolean;
}

export function ConfigurationSidebar({ className, open }: AIConfigPanelProps) {
  const { configsByAgentId, resetConfig } = useConfigStore();
  const [agentId] = useQueryState("agentId");
  const [deploymentId] = useQueryState("deploymentId");
  const [configurations, setConfigurations] = useState<
    ConfigurableFieldUIMetadata[]
  >([]);
  const [loading, setLoading] = useState(false);
  const { getAgentConfigSchema, getAgent, updateAgent } = useAgents();

  useEffect(() => {
    if (!agentId || !deploymentId) return;

    setLoading(true);
    getAgent(agentId, deploymentId)
      .then(async (a) => {
        if (!a) {
          toast.error("Failed to get agent");
          return;
        }

        const schema = await getAgentConfigSchema(agentId, deploymentId);
        if (!schema) return;
        const configFields = configSchemaToConfigurableFields(schema);

        const configFieldsWithDefaults = configFields.map((f) => {
          const defaultConfig = a.config?.configurable?.[f.label] ?? f.default;
          return {
            ...f,
            default: defaultConfig,
          };
        });

        setConfigurations(configFieldsWithDefaults);
        // Set default config values based on configuration fields
        const { setDefaultConfig } = useConfigStore.getState();
        setDefaultConfig(agentId, configFieldsWithDefaults);
      })
      .catch((e) => {
        console.error("Failed to get agent", e);
        toast.error("Failed to get agent");
      })
      .finally(() => setLoading(false));
  }, [agentId, deploymentId]);

  const handleSave = async () => {
    if (!agentId || !deploymentId) return;

    const updatedAgent = await updateAgent(agentId, deploymentId, {
      config: configsByAgentId[agentId],
    });
    if (!updatedAgent) {
      toast.error("Failed to update agent configuration");
      return;
    }

    toast.success("Agent configuration saved successfully");
  };

  return (
    <div
      className={cn(
        "fixed top-0 right-0 z-10 h-screen border-l border-gray-200 bg-white shadow-lg transition-all duration-300",
        open ? "w-80 md:w-xl" : "w-0 overflow-hidden border-l-0",
        className,
      )}
    >
      {open && (
        <div className="flex h-full flex-col">
          <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 p-4">
            <h2 className="text-lg font-semibold">Agent Configuration</h2>
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (!agentId) return;
                        resetConfig(agentId);
                      }}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Reset
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Reset the configuration to the last saved state</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      onClick={handleSave}
                    >
                      <Save className="mr-1 h-4 w-4" />
                      Save
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Save your changes to the agent</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <Tabs
            defaultValue="general"
            className="flex flex-1 flex-col overflow-hidden"
          >
            <TabsList className="flex-shrink-0 justify-start bg-transparent px-4 pt-2">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="tools">Tools</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1">
              <TabsContent
                value="general"
                className="m-0 p-4"
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
                        type={
                          c.type === "boolean" ? "switch" : (c.type ?? "text")
                        }
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

              {/* TODO: Replace with actual tools */}
              <TabsContent
                value="tools"
                className="m-0 p-4"
              >
                <ConfigSection
                  title="Available Tools"
                  action={
                    <Button
                      variant="ghost"
                      size="sm"
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Add Tool
                    </Button>
                  }
                >
                  <ConfigField
                    id="enableWebSearch"
                    label="Web Search"
                    type="switch"
                    description="Allow the AI to search the web for information"
                    agentId=""
                  />
                  <ConfigField
                    id="enableCalculator"
                    label="Calculator"
                    type="switch"
                    description="Enable mathematical calculations"
                    agentId=""
                  />
                  <ConfigField
                    id="enableCodeInterpreter"
                    label="Code Interpreter"
                    type="switch"
                    description="Run code snippets and return results"
                    agentId=""
                  />
                  <ConfigField
                    id="enableImageGeneration"
                    label="Image Generation"
                    type="switch"
                    description="Generate images from text descriptions"
                    agentId=""
                  />
                  <Separator className="my-2" />
                  <ConfigField
                    id="customTools"
                    label="Custom Tools"
                    type="json"
                    description="Define custom tools in JSON format"
                    agentId=""
                  />
                </ConfigSection>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>
      )}
    </div>
  );
}
