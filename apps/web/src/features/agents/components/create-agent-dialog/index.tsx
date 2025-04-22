import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { ConfigField } from "@/features/chat/components/configuration-sidebar/config-field";
import { useAgents } from "@/hooks/use-agents";
import { configSchemaToConfigurableFields } from "@/lib/ui-config";
import { ConfigurableFieldUIMetadata } from "@/types/configurable";
import { Bot, CirclePlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

interface CreateAgentDialogProps {
  agentId: string;
  deploymentId: string;
  graphId: string;
}

function CreateAgentFormLoading() {
  return (
    <div className="flex w-full flex-col items-start justify-start gap-2 space-y-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={`loading-${index}`}
          className="flex w-full flex-col items-start justify-start gap-2"
        >
          <Skeleton className="h-10 w-[85%]" />
          <Skeleton className="h-16 w-full" />
        </div>
      ))}
    </div>
  );
}

interface CreateAgentFormProps {
  name: string;
  setName: (name: string) => void;
  description: string;
  setDescription: (description: string) => void;
  configurations: ConfigurableFieldUIMetadata[];
  config: Record<string, any>;
  setConfig: (config: Record<string, any>) => void;
}

function CreateAgentForm({
  name,
  setName,
  description,
  setDescription,
  configurations,
  config,
  setConfig,
}: CreateAgentFormProps) {
  return (
    <div className="flex flex-col gap-8 overflow-y-auto py-4">
      <div className="flex w-full flex-col items-start justify-start gap-2 space-y-2">
        <p className="text-lg font-semibold tracking-tight">Agent Details</p>
        <div className="flex w-full flex-col items-start justify-start gap-2">
          <Label htmlFor="oap_name">Name</Label>
          <Input
            id="oap_name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Emails Agent"
          />
        </div>
        <div className="flex w-full flex-col items-start justify-start gap-2">
          <Label htmlFor="oap_description">Description</Label>
          <Textarea
            id="oap_description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Agent that handles emails"
          />
        </div>
      </div>
      {configurations.length > 0 && (
        <>
          <Separator />
          <div className="flex w-full flex-col items-start justify-start gap-2 space-y-2">
            <p className="text-lg font-semibold tracking-tight">
              Agent Configuration
            </p>
            {configurations.map((c, index) => (
              <ConfigField
                key={`${c.label}-${index}`}
                className="w-full"
                id={c.label}
                label={c.label}
                type={c.type === "boolean" ? "switch" : (c.type ?? "text")}
                description={c.description}
                placeholder={c.placeholder}
                options={c.options}
                min={c.min}
                max={c.max}
                step={c.step}
                value={config[c.label]}
                setValue={(v) => setConfig({ ...config, [c.label]: v })}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function CreateAgentDialog({
  agentId,
  deploymentId,
  graphId,
}: CreateAgentDialogProps) {
  const { getAgentConfigSchema } = useAgents();
  const [configurations, setConfigurations] = useState<
    ConfigurableFieldUIMetadata[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [config, setConfig] = useState<Record<string, any>>({});
  const [open, setOpen] = useState(false);

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

  const handleSubmit = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();
    console.log(config);
    setOpen(false);
    clearState();
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
          <CreateAgentFormLoading />
        ) : (
          <CreateAgentForm
            name={name}
            setName={setName}
            description={description}
            setDescription={setDescription}
            configurations={configurations}
            config={config}
            setConfig={setConfig}
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
          >
            Cancel
          </Button>
          <Button
            onClick={(e) => handleSubmit(e)}
            className="flex w-full items-center justify-center gap-1"
            disabled={loading}
          >
            <Bot />
            <span>Create Agent</span>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
