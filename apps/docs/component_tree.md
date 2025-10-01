## Components Tree

<AuthProvider>                    ← Already loaded (from layout.tsx)
  <SidebarLayout>                 ← Already rendered (doesn't re-render)
    <SidebarProvider>
      <MCPProvider>
        <GraphsProvider>
          <AgentsProvider>        ← ✨ ALREADY HAS agents data loaded!
            <RagProvider>
              ┌─────────────────────────────────────┐
              │  <AppSidebar />                     │  ← Stays visible
              │    "Agents" button now highlighted  │
              └─────────────────────────────────────┘
              ┌─────────────────────────────────────┐
              │  <SidebarInset>                     │  ← Content area
              │    {children} ← THIS PART CHANGES!  │
              │                                     │
              │    OLD: <ChatInterface />           │
              │    NEW: <AgentsPage />  ← refresh   │
              │         ↓                           │
              │         <AgentsInterface />         │
              │           ↓                         │
              │           Uses useAgentsContext()   │
              └─────────────────────────────────────┘
            </RagProvider>
          </AgentsProvider>
        </GraphsProvider>
      </MCPProvider>
    </SidebarProvider>
  </SidebarLayout>
</AuthProvider>