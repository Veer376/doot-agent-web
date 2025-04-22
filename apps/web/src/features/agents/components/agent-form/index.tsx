import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ConfigField } from "@/features/chat/components/configuration-sidebar/config-field";
import { ConfigurableFieldUIMetadata } from "@/types/configurable";

export function AgentFieldsFormLoading() {
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

interface AgentFieldsFormProps {
  name: string;
  setName: (name: string) => void;
  description: string;
  setDescription: (description: string) => void;
  configurations: ConfigurableFieldUIMetadata[];
  config: Record<string, any>;
  setConfig: (config: Record<string, any>) => void;
}

export function AgentFieldsForm({
  name,
  setName,
  description,
  setDescription,
  configurations,
  config,
  setConfig,
}: AgentFieldsFormProps) {
  return (
    <div className="flex flex-col gap-8 overflow-y-auto py-4">
      <div className="flex w-full flex-col items-start justify-start gap-2 space-y-2">
        <p className="text-lg font-semibold tracking-tight">Agent Details</p>
        <div className="flex w-full flex-col items-start justify-start gap-2">
          <Label htmlFor="oap_name">
            Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="oap_name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Emails Agent"
          />
        </div>
        <div className="flex w-full flex-col items-start justify-start gap-2">
          <Label htmlFor="oap_description">
            Description <span className="text-red-500">*</span>
          </Label>
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
