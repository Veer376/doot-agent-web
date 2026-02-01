"use client";

import React, { useState } from "react";
import { ElectricPlugsIcon, Folder01Icon, Download02Icon } from "hugeicons-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MCPServerCard } from "./mcp-server-card";
import {
  useMCPRegistry,
  useManagedMCPServers,
  useInstallMCPServer,
} from "@/hooks/use-local-mcp";
import type { MCPServerConfig, MCPServerInstance } from "@/types/mcp";

interface MCPServersDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function MCPServersDialog({ trigger, open: controlledOpen, onOpenChange }: MCPServersDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"installed" | "all">("installed");

  // Support both controlled and uncontrolled modes
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const { data: registry, isLoading: loadingRegistry } = useMCPRegistry();
  const { data: managedServers = [], isLoading: loadingManaged } = useManagedMCPServers();
  const installMutation = useInstallMCPServer();

  const installedServers = registry?.servers || [];
  const installedIds = new Set(installedServers.map((s) => s.id));

  // Available servers = managed servers not yet installed
  const availableServers = managedServers.filter((s) => !installedIds.has(s.id));

  const handleInstall = async (config: MCPServerConfig) => {
    try {
      await installMutation.mutateAsync(config);
      // Switch to installed tab after installing
      setActiveTab("installed");
    } catch (error) {
      console.error("[MCP] Failed to install server:", error);
    }
  };

  const isLoading = loadingRegistry || loadingManaged;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-[500px] min-h-[400px] flex flex-col" data-radius="radius2">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ElectricPlugsIcon className="size-5" />
            MCP Servers
          </DialogTitle>
          <DialogDescription>
            Manage your Model Context Protocol servers for AI agent tools.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "installed" | "all")}>
          <TabsList className="grid w-full grid-cols-2" data-radius="radius2">
            <TabsTrigger value="installed" className="gap-2" data-radius="radius2">
              <Folder01Icon className="size-4" />
              Installed ({installedServers.length})
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2" data-radius="radius2">
              <Download02Icon className="size-4" />
              Available ({availableServers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="installed" className="mt-4 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                Loading...
              </div>
            ) : installedServers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ElectricPlugsIcon className="size-10 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No MCP servers installed yet.
                </p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setActiveTab("all")}
                  className="mt-2"
                >
                  Browse available servers
                </Button>
              </div>
            ) : (
              installedServers.map((server) => (
                <MCPServerCard
                  key={server.id}
                  server={server}
                  variant="installed"
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="all" className="mt-4 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                Loading...
              </div>
            ) : availableServers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Folder01Icon className="size-10 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  All available servers are already installed!
                </p>
              </div>
            ) : (
              availableServers.map((config) => (
                <MCPServerCard
                  key={config.id}
                  server={config as MCPServerInstance}
                  variant="available"
                  onInstall={() => handleInstall(config)}
                  isInstalling={installMutation.isPending}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
