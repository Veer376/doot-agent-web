"use client";

import { useEffect, useState } from "react";
import { SchemaForm } from "./components/schema-form";
import { ResponseViewer } from "./components/response-viewer";
import { Button } from "@/components/ui/button";
import { CirclePlay, Loader2 } from "lucide-react";
import { useMCPContext } from "@/providers/MCP";
import { Tool } from "@/types/tool";
import { ToolListCommand } from "../components/tool-list-command";
import _ from "lodash";
import { useQueryState } from "nuqs";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function ToolsPlaygroundInterface() {
  const { tools, loading } = useMCPContext();
  const router = useRouter();

  const [selectedToolName, setSelectedToolName] = useQueryState("tool");
  const [selectedTool, setSelectedTool] = useState<Tool>();
  const [inputValues, setInputValues] = useState({});
  const [response, setResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (loading || selectedTool || !tools.length) return;

    if (!selectedToolName) {
      router.replace("/tools");
      return;
    }

    const tool = tools.find((tool) => tool.name === selectedToolName);

    if (!tool) {
      toast.error("Tool not found", { richColors: true });
      setSelectedToolName(null);
      router.replace("/tools");
      return;
    }
    setSelectedTool(tool);
  }, [tools, loading, selectedToolName]);

  const handleInputChange = (newValues: any) => {
    setInputValues(newValues);
  };

  const handleSubmit = async () => {
    if (!selectedTool) return;
    setIsLoading(true);
    setResponse(null);
    /* Remove setActiveTab("response") from the handleSubmit function */

    // Simulate running the tool
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setResponse({
      status: "success",
      data: `Response from ${selectedTool.name} with input: ${JSON.stringify(inputValues)}`,
    });
    setIsLoading(false);
  };

  if (!selectedTool) {
    return <div>Loading tools...</div>;
  }

  return (
    <div className="container mx-auto mb-8 h-full p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tools Playground</h1>
        <ToolListCommand
          value={selectedTool}
          setValue={(t) => {
            setSelectedTool(t);
            setSelectedToolName(t.name);
          }}
        />
      </div>
      <div className="border-b py-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium">
              {_.startCase(selectedTool.name)}
            </h2>
            <p className="text-sm text-gray-500">{selectedTool.description}</p>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <CirclePlay className="size-4" />
                <p>Run Tool</p>
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid h-[85%] grid-cols-1 gap-4 py-6 md:grid-cols-[1fr_auto_1fr] md:gap-6">
        <div className="space-y-4">
          <h3 className="text-md font-medium">Input</h3>
          <SchemaForm
            schema={selectedTool.inputSchema}
            onChange={handleInputChange}
            values={inputValues}
          />
        </div>

        <div className="hidden border-l border-gray-200 md:block dark:border-gray-700" />

        <div className="space-y-4">
          <h3 className="text-md font-medium">Response</h3>
          <ResponseViewer
            response={response}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
