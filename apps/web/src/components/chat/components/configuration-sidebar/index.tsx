"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Save, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfigField } from "@/components/chat/components/configuration-sidebar/config-field";
import { ConfigSection } from "@/components/chat/components/configuration-sidebar/config-section";
import { useConfigStore } from "@/components/chat/hooks/use-config-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface AIConfigPanelProps {
  className?: string;
  defaultOpen?: boolean;
  onSave?: (config: any) => void;
}

export function ConfigurationSidebar({
  className,
  defaultOpen = false,
  onSave,
}: AIConfigPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { config, resetConfig } = useConfigStore();

  const handleSave = () => {
    if (onSave) {
      onSave(config);
    }
  };

  return (
    <div className={cn("relative h-full", className)}>
      <div
        className={cn(
          "absolute top-0 right-0 z-10 h-full border-l border-gray-200 bg-white shadow-lg transition-all duration-300",
          isOpen ? "w-80 md:w-96" : "w-0 border-none",
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 -left-10 rounded-full border border-gray-200 bg-white shadow-sm"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>

        {isOpen && (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 p-4">
              <h2 className="text-lg font-semibold">AI Configuration</h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetConfig}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Reset
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                >
                  <Save className="mr-1 h-4 w-4" />
                  Save
                </Button>
              </div>
            </div>

            <Tabs
              defaultValue="general"
              className="flex flex-1 flex-col"
            >
              <TabsList className="justify-start bg-transparent px-4 pt-2">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
                <TabsTrigger value="tools">Tools</TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1">
                <TabsContent
                  value="general"
                  className="m-0 p-4"
                >
                  <ConfigSection title="Basic Settings">
                    <ConfigField
                      id="systemPrompt"
                      label="System Prompt"
                      type="textarea"
                      description="Instructions for how the AI should behave"
                    />
                    <ConfigField
                      id="temperature"
                      label="Temperature"
                      type="slider"
                      min={0}
                      max={2}
                      step={0.1}
                      description="Controls randomness (0 = deterministic, 2 = creative)"
                    />
                    <ConfigField
                      id="maxTokens"
                      label="Max Tokens"
                      type="number"
                      min={1}
                      max={4096}
                      description="Maximum length of the generated response"
                    />
                  </ConfigSection>

                  <ConfigSection title="Behavior">
                    <ConfigField
                      id="useMarkdown"
                      label="Use Markdown"
                      type="switch"
                      description="Enable markdown formatting in responses"
                    />
                    <ConfigField
                      id="streamResponse"
                      label="Stream Response"
                      type="switch"
                      description="Show response as it's being generated"
                    />
                    <ConfigField
                      id="memoryEnabled"
                      label="Enable Memory"
                      type="switch"
                      description="Remember previous conversations"
                    />
                  </ConfigSection>
                </TabsContent>

                <TabsContent
                  value="advanced"
                  className="m-0 p-4"
                >
                  <ConfigSection title="Advanced Settings">
                    <ConfigField
                      id="model"
                      label="AI Model"
                      type="select"
                      options={[
                        { label: "GPT-4o", value: "gpt-4o" },
                        { label: "GPT-4 Turbo", value: "gpt-4-turbo" },
                        { label: "Claude 3 Opus", value: "claude-3-opus" },
                        { label: "Claude 3 Sonnet", value: "claude-3-sonnet" },
                        { label: "Llama 3 70B", value: "llama-3-70b" },
                      ]}
                      description="Select the AI model to use"
                    />
                    <ConfigField
                      id="presencePenalty"
                      label="Presence Penalty"
                      type="slider"
                      min={-2}
                      max={2}
                      step={0.1}
                      description="Penalize new tokens based on presence in text"
                    />
                    <ConfigField
                      id="frequencyPenalty"
                      label="Frequency Penalty"
                      type="slider"
                      min={-2}
                      max={2}
                      step={0.1}
                      description="Penalize new tokens based on frequency in text"
                    />
                    <ConfigField
                      id="customInstructions"
                      label="Custom Instructions"
                      type="json"
                      description="Advanced configuration in JSON format"
                    />
                  </ConfigSection>
                </TabsContent>

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
                    />
                    <ConfigField
                      id="enableCalculator"
                      label="Calculator"
                      type="switch"
                      description="Enable mathematical calculations"
                    />
                    <ConfigField
                      id="enableCodeInterpreter"
                      label="Code Interpreter"
                      type="switch"
                      description="Run code snippets and return results"
                    />
                    <ConfigField
                      id="enableImageGeneration"
                      label="Image Generation"
                      type="switch"
                      description="Generate images from text descriptions"
                    />
                    <Separator className="my-2" />
                    <ConfigField
                      id="customTools"
                      label="Custom Tools"
                      type="json"
                      description="Define custom tools in JSON format"
                    />
                  </ConfigSection>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
