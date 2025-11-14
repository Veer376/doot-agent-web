import { Suspense } from "react";
import { PageHeader } from "./components/page-header";
import { AgentDashboard } from "./components/agent-dashboard";

export default function AgentsInterfaceV2() {
  return (
    <div className="container mx-auto px-4 py-6">
      <PageHeader
        title="Agents"
        description="Manage and chat with your agents"
      />

      <div className="mt-6">
        <Suspense fallback={<p>Loading...</p>}>
          <AgentDashboard />
        </Suspense>
      </div>
    </div>
  );
}
