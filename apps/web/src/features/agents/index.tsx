import { Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "./components/page-header";
import { GraphList } from "./components/graph-list";
import { AgentDashboard } from "./components/agent-dashboard";

export default function AgentsInterfaceV2() {
  return (
    <div className="container mx-auto px-4 py-6">
      <PageHeader
        title="Agents"
        description="Manage your agents across different graphs"
      />

      <Tabs
        defaultValue="graphs"
        className="mt-6"
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="graphs">Graphs</TabsTrigger>
          <TabsTrigger value="all-agents">All Agents</TabsTrigger>
        </TabsList>

        <TabsContent
          value="graphs"
          className="mt-6"
        >
          <Suspense fallback={<p>Loading...</p>}>
            <GraphList />
          </Suspense>
        </TabsContent>

        <TabsContent
          value="all-agents"
          className="mt-6"
        >
          <Suspense fallback={<p>Loading...</p>}>
            <AgentDashboard />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
