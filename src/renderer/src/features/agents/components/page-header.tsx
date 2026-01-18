import type React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircleIcon } from "@/components/icons";
import { CreateAgentDialog } from "./create-edit-agent-dialogs/create-agent-dialog";
import { useState } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  const [showCreateAgentDialog, setShowCreateAgentDialog] = useState(false);
  return (
    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {action || (
        <Button
          onClick={() => setShowCreateAgentDialog(true)}
          data-radius="radius2"
          className="h-10 bg-black text-white hover:bg-black/90"
        >
          <PlusCircleIcon className="mr-2 h-4 w-4" />
          Create Agent
        </Button>
      )}

      <CreateAgentDialog
        open={showCreateAgentDialog}
        onOpenChange={setShowCreateAgentDialog}
      />
    </div>
  );
}
