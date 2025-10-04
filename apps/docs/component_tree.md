## Complete Component Tree Structure

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    ROOT LAYOUT                                          │
│                              app/layout.tsx (HTML wrapper)                              │
│                                                                                         │
│  <html>                                                                                 │
│    <body>                                                                               │
│      <main>{children}</main>  ← Routes to (app)/layout.tsx or (auth)/layout.tsx         │
│    </body>                                                                              │
│  </html>                                                                                │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                            │
                    ┌───────────────────────┴────────────────────────┐
                    │                                                │
           ┌────────▼──────────┐                            ┌────────▼──────────┐
           │   AUTH ROUTES     │                            │    APP ROUTES     │
           │  (auth)/layout    │                            │  (app)/layout     │
           └───────────────────┘                            └───────────────────┘
                                                                     │
                                                                     │
                                                        <RootLayout> - (app)/layout.tsx                               
                                                                                                                     
                            <html>                                                                                    
                              <body>                                                                                  
                                [DEMO_APP Banner] ← Conditional top banner                                            
                                <NuqsAdapter>  ← URL state management                                                 
                                  <AuthProvider>  ← Authentication & session management                               
                                  │  State: { session, user, isLoading, isAuthenticated }                             
                                  │  Methods: { signIn, signUp, signOut, resetPassword, etc. }                        
                                  └──> <SidebarLayout>  ← Main layout wrapper (components/sidebar/index.tsx)          
                                           <SidebarProvider>  ← Shadcn/ui sidebar state management                    
                                             <MCPProvider>  ← Model Context Protocol tools provider                   
                                              State: { tools, loading, servers }                                    
                                              Methods: { getTools, setTools, connectServer, etc. }                  
                                                   │  State: { blueprints, loading, error }                           
                                                   │  Methods: { refreshTemplates }                                   
                                                   └──> <AgentsProvider>  ← Agent management (CRITICAL PROVIDER)      
                                                         │  State: {                                                  
                                                         │    agents, loading, selectedAgent, deployments,            
                                                         │    defaultAgents, currentDeployment                        
                                                         │  }                                                         
                                                         │  Methods: {                                                
                                                         │    createAgent, updateAgent, deleteAgent,                  
                                                         │    refreshAgents, setSelectedAgent                         
                                                         │  }                                                         
                                                         └──> <RagProvider>  ← RAG/Knowledge base provider            
                                                               │  State: { collections, documents, loading }          
                                                               │  Methods: { fetchCollections, uploadDocuments, etc. }
                                                               ├──> <AppSidebar />  ← Left sidebar (PERSISTENT)       
                                                               │     ├──> <SiteHeader />                              
                                                               │     │     └──> LangGraph Logo + "Open Agent Platform"
                                                               │     ├──> <SidebarContent>                            
                                                               │     │     └──> <NavMain />  ← Navigation menu        
                                                               │     │           ├── Chat (/)                         
                                                               │     │           ├── Agents (/agents)                 
                                                               │     │           ├── Tools (/tools)                   
                                                               │     │           └── RAG (/rag)                       
                                                               │     ├──> <SidebarFooter>                             
                                                               │     │     └──> <NavUser />  ← User profile dropdown  
                                                               │     │           ├── Avatar & Email                   
                                                               │     │           ├── Settings                         
                                                               │     │           └── Sign Out                         
                                                               │     └──> <SidebarRail />  ← Resize handle            
                                                               └──> <SidebarInset>  ← Main content area               
                                                                     └──> {children}  ← PAGE CONTENT RENDERS HERE     
                                </AuthProvider>                                                                       
                              </NuqsAdapter>                                                                          
                              </body>                                                                                 
                            </html>                                                                                   
                                                                                           

═════════════════════════════════════════════════════════════════════════════════════════
                          DETAILED BREAKDOWN: CHAT PAGE (/)
═════════════════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              CHAT PAGE - app/(app)/page.tsx                             │
│                                                                                         │
│  <React.Suspense>                                                                       │
│    <Toaster />  ← Toast notifications (sonner)                                         │
│                                                                                         │
│    <header>  ← Page header bar                                                         │
│      <SidebarTrigger />  ← Toggle left sidebar                                         │
│      <ChatBreadcrumb />  ← "Chat" breadcrumb                                           │
│    </header>                                                                            │
│                                                                                         │
│    <ChatInterface />  ← Main chat component - features/chat/index.tsx                 │
│  </React.Suspense>                                                                      │
                                            ││                                                                                         │
│  <StreamProvider>  ← Manages LangGraph streaming & agent selection                     │
│    AGENT SELECTION SCREEN (when no agentId)                                    │  │
│     <div className="agent-selection-form">                                     │  │
│       <LangGraphLogoSVG />                                                     │  │
│       <h1>Open Agent Platform</h1>                                            │  │
│       <p>Select an agent to chat with</p>                                     │  │
│                                                                                 │  │
│       <AgentsCombobox />  ← Dropdown to select agent                          │  │
│       <Button>Start Chat</Button>                                             │  │
│     </div>                                                                      │  │
│     <StreamSession>  ← Manages thread & LangGraph SDK stream                  │  │
│     │  State: { values, next, interrupt, etc. }                               │  │
│     │  Hooks into: useStream from @langchain/langgraph-sdk/react             │  │
│     └──> <div className="chat-container">                                     │  │
              <Thread> - features/chat/components/thread                │
              │  <StickToBottom>  ← Auto-scroll management                                             │
              │    │                                                                                    │
              │    ├──> <StickyToBottomContent>                                                        │
              │    │     │                                                                              │
              │    │     ├──> Header Section:                                                          │
              │    │     │     ├── <AgentsCombobox />  ← Switch agent mid-conversation                │
              │    │     │     ├── <NewThreadButton />  ← Start new conversation                      │
              │    │     │     ├── Streaming Indicator (when active)                                  │
              │    │     │     └── API Key Warning Alert (if needed)                                  │
              │    │     │                                                                              │
              │    │     ├──> Messages Section:                                                        │
              │    │     │     │                                                                        │
              │    │     │     ├── For each message in thread:                                        │
              │    │     │     │   │                                                                    │
              │    │     │     │   ├── <HumanMessage />  ← User messages                              │
              │    │     │     │   │    ├── Message content (text/multimodal)                         │
              │    │     │     │   │    ├── <MultimodalPreview /> (images, files)                    │
              │    │     │     │   │    ├── <BranchSwitcher /> (if multiple branches)                │
              │    │     │     │   │    ├── <CommandBar /> (edit, delete, retry)                     │
              │    │     │     │   │    └── Edit mode with <Textarea /> when editing                 │
              │    │     │     │   │                                                                    │
              │    │     │     │   └── <AssistantMessage />  ← AI responses                           │
              │    │     │     │        ├── <MarkdownText /> (formatted response)                    │
              │    │     │     │        ├── <ToolCalls /> (tool invocations)                         │
              │    │     │     │        │    └── <ToolResult /> (tool outputs)                       │
              │    │     │     │        ├── <CustomComponent /> (UI components via SDK)              │
              │    │     │     │        ├── <BranchSwitcher /> (navigate conversation branches)      │
              │    │     │     │        └── <CommandBar /> (copy, retry actions)                     │
              │    │     │     │                                                                        │
              │    │     │     └── <AssistantMessageLoading />  ← Streaming indicator                 │
              │    │     │                                                                              │
              │    │     ├──> <ScrollToBottom />  ← Button (appears when scrolled up)                 │
              │    │     │                                                                              │
              │    │     └──> Input Section (footer):                                                  │
              │    │           ├── <ContentBlocksPreview />  ← Preview uploaded files/images          │
              │    │           ├── File upload button                                                  │
              │    │           ├── <Textarea /> (message input)                                       │
              │    │           ├── Submit button                                                       │
              │    │           └── "Add Checkpoint" Switch (for debugging)                            │
              │    └──> Auto-scroll & stick-to-bottom logic                                            │
              ├──> <SidebarButtons />  ← Floating action buttons (top-right)     │  │
│  │  │       │     ├── History Button (toggles ThreadHistorySidebar)            │  │
│  │  │       │     ├── Config Button (toggles ConfigurationSidebar)             │  │
│  │  │       │     └── Close Button (closes active sidebar)                     │  │
│  │  │       ├──> <ThreadHistorySidebar />  ← Thread history (right sidebar)    │  │
│  │  │       │     │  Shows: List of previous conversation threads               │  │
│  │  │       │     │  State: { threads, loading, selectedThread }               │  │
│  │  │       │     │  Features: Click to load thread, timestamps, previews      │  │
│  │  │       │     │                                                              │  │
│  │  │       │     └──> Thread list items with first human message preview      │  │
│  │  │       └──> <ConfigurationSidebar />  ← Agent config (right sidebar)      │  │
│  │  │              │  <Tabs>                                                     │  │
│  │  │              │    ├─ Configuration Tab                                    │  │
│  │  │              │    │   ├──> <ConfigSection title="Model Settings">        │  │
│  │  │              │    │   │     ├── <ConfigField /> (temperature slider)     │  │
│  │  │              │    │   │     ├── <ConfigField /> (model select)           │  │
│  │  │              │    │   │     └── <ConfigField /> (max_tokens input)       │  │
│  │  │              │    │   ├──> <ConfigSection title="Tools">                 │  │
│  │  │              │    │   │     ├── <Search /> (tool search bar)             │  │
│  │  │              │    │   │     └── <ConfigFieldTool /> (each tool)          │  │
│  │  │              │    │   ├──> <ConfigSection title="Agents">                │  │
│  │  │              │    │   │     └── <ConfigFieldAgents />                    │  │
│  │  │              │    │   └──> <ConfigSection title="RAG Collections">       │  │
│  │  │              │    │         └── <ConfigFieldRAG />                        │  │
│  │  │              │    └─ Advanced Tab                                         │  │
│  │  │              │        └── Additional config fields                        │  │
│  │  │              └──> Footer: Save/Reset/Delete Agent buttons                 │  │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                            │


═════════════════════════════════════════════════════════════════════════════════════════
                         DETAILED BREAKDOWN: AGENTS PAGE (/agents)
═════════════════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                         AGENTS PAGE - app/(app)/agents/page.tsx                         │
│                                                                                         │
│  <React.Suspense>                                                                       │
│    <Toaster />                                                                          │
│    <header>                                                                             │
│      <SidebarTrigger />                                                                 │
│      <Breadcrumb>Agents</Breadcrumb>                                                   │
│    </header>                                                                            │
│    <AgentsInterface />                                                                  │
│  </React.Suspense>                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                            │
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                   AGENTS INTERFACE - features/agents/index.tsx                          │
│                                                                                         │
│  <div className="container">                                                            │
│    <PageHeader title="Agents" description="..." />                                     │
│    │  └──> <CreateAgentDialog /> (triggered from header button)                       │
│    │                                                                                     │
│    <Tabs defaultValue="templates">                                                      │
│      │                                                                                   │
│      ├──> <TabsList>                                                                    │
│      │     ├── Templates Tab                                                           │
│      │     └── All Agents Tab                                                          │
│      │                                                                                   │
│      ├──> <TabsContent value="templates">                                              │
│      │     │                                                                             │
│      │     └──> <TemplatesList />                                                       │
│      │           │                                                                       │
│      │           ├── <Search /> (filter templates)                                     │
│      │           │                                                                       │
│      │           └── For each graph group:                                             │
│      │                 │                                                                 │
│      │                 └──> <TemplateCard />                                           │
│      │                       ├── Graph/Blueprint info                                  │
│      │                       ├── <AgentList /> (agents using this template)           │
│      │                       │    │                                                     │
│      │                       │    └──> For each agent:                                 │
│      │                       │          <AgentCard />                                  │
│      │                       │            ├── Agent name, description                  │
│      │                       │            ├── Edit button → <EditAgentDialog />       │
│      │                       │            ├── Delete button                            │
│      │                       │            └── Chat button (navigate to /)             │
│      │                       │                                                          │
│      │                       └── <CreateAgentDialog /> (+ Create Agent button)        │
│      │                                                                                   │
│      └──> <TabsContent value="all-agents">                                             │
│            │                                                                             │
│            └──> <AgentDashboard />                                                      │
│                  ├── <Search /> (filter agents)                                        │
│                  ├── <Select /> (filter by graph)                                      │
│                  │                                                                       │
│                  └── Grid of <AgentCard /> components                                  │
│                       (All agents across all templates)                                │
│                                                                                         │
│  </div>                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────────────┘

═════════════════════════════════════════════════════════════════════════════════════════
                          DETAILED BREAKDOWN: TOOLS PAGE (/tools)
═════════════════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                          TOOLS PAGE - app/(app)/tools/page.tsx                          │
│                                                                                         │
│  <React.Suspense>                                                                       │
│    <Toaster />                                                                          │
│    <header>                                                                             │
│      <SidebarTrigger />                                                                 │
│      <Breadcrumb>Tools</Breadcrumb>                                                    │
│    </header>                                                                            │
│    <ToolsInterface />                                                                   │
│  </React.Suspense>                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                            │
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                     TOOLS INTERFACE - features/tools/index.tsx                          │
│                                                                                         │
│  <div className="container">                                                            │
│    <header>                                                                             │
│      <Wrench Icon />                                                                    │
│      <h1>Tools</h1>                                                                     │
│      <TotalToolsBadge /> (count + loading state)                                       │
│    </header>                                                                            │
│                                                                                         │
│    <Search /> (filter tools by name/description)                                       │
│                                                                                         │
│    <Separator />                                                                        │
│                                                                                         │
│    Grid of tools:                                                                       │
│      ├── <ToolCard /> for each tool                                                    │
│      │    ├── Tool icon                                                                │
│      │    ├── Tool name                                                                │
│      │    ├── Tool description                                                         │
│      │    ├── Parameters info                                                          │
│      │    └── Source badge (MCP/built-in)                                             │
│      │                                                                                   │
│      └── <ToolCardLoading /> (skeleton states)                                         │
│                                                                                         │
│    <Button>Load More</Button> (pagination)                                             │
│  </div>                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────────────┘

═════════════════════════════════════════════════════════════════════════════════════════
                           DETAILED BREAKDOWN: RAG PAGE (/rag)
═════════════════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           RAG PAGE - app/(app)/rag/page.tsx                             │
│                                                                                         │
│  <React.Suspense>                                                                       │
│    <Toaster />                                                                          │
│    <header>                                                                             │
│      <SidebarTrigger />                                                                 │
│      <Breadcrumb>RAG</Breadcrumb>                                                      │
│    </header>                                                                            │
│    <RAGInterface />                                                                     │
│  </React.Suspense>                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                            │
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                       RAG INTERFACE - features/rag/index.tsx                            │
│                                                                                         │
│  IF no collections:                                                                     │
│    └──> <EmptyCollectionsState />                                                      │
│          (Guide user to create first collection)                                       │
│                                                                                         │
│  ELSE:                                                                                  │
│    <div className="container">                                                          │
│      <div className="grid grid-cols-2">                                                │
│        │                                                                                 │
│        ├──> Left Column:                                                               │
│        │     <CollectionsCard />                                                       │
│        │       ├── List of knowledge collections                                      │
│        │       ├── Create collection button                                           │
│        │       ├── Collection selection                                               │
│        │       └── Delete collection button                                           │
│        │                                                                                 │
│        │       OR                                                                       │
│        │                                                                                 │
│        │     <CollectionsCardLoading /> (skeleton)                                    │
│        │                                                                                 │
│        └──> Right Column:                                                              │
│              <DocumentsCard />                                                          │
│                ├── Document upload area                                                │
│                ├── List of documents in selected collection                           │
│                ├── Document metadata                                                    │
│                ├── Delete document button                                              │
│                └── Pagination controls                                                 │
│                                                                                         │
│              OR                                                                         │
│                                                                                         │
│              <DocumentsCardLoading /> (skeleton)                                       │
│      </div>                                                                             │
│    </div>                                                                               │
└─────────────────────────────────────────────────────────────────────────────────────────┘

═════════════════════════════════════════════════════════════════════════════════════════
                              CONTEXT PROVIDERS HIERARCHY
═════════════════════════════════════════════════════════════════════════════════════════

Providers are nested from outermost to innermost:

1. <AuthProvider> (providers/Auth.tsx)
   └─ Provides: session, user, auth methods
   └─ Used by: All components needing authentication

2. <SidebarProvider> (@/components/ui/sidebar - shadcn)
   └─ Provides: sidebar open/close state, mobile detection
   └─ Used by: AppSidebar, SidebarTrigger, SidebarInset

3. <MCPProvider> (providers/MCP.tsx)
   └─ Provides: MCP tools, servers, tool fetching methods
   └─ Used by: ToolsInterface, ConfigurationSidebar

4. <BlueprintsProvider> (providers/Blueprints.tsx)
   └─ Provides: Graph blueprints/templates, loading state
   └─ Used by: AgentsInterface, CreateAgentDialog

5. <AgentsProvider> (providers/Agents.tsx) ⭐ MOST IMPORTANT
   └─ Provides: agents list, CRUD operations, deployments
   └─ Used by: ChatInterface, AgentsInterface, Thread

6. <RagProvider> (features/rag/providers/RAG.tsx)
   └─ Provides: Collections, documents, RAG operations
   └─ Used by: RAGInterface, ConfigurationSidebar

7. <StreamProvider> (features/chat/providers/Stream.tsx)
   └─ Provides: LangGraph stream, thread state, message handling
   └─ Used by: Thread, messages components
   └─ Contains: <StreamSession> (when agent selected)

═════════════════════════════════════════════════════════════════════════════════════════
                                  KEY INSIGHTS
═════════════════════════════════════════════════════════════════════════════════════════

✓ ALL PAGES share the same provider hierarchy - no re-mounting on navigation
✓ AgentsProvider is available to ALL routes (including chat)
✓ Left sidebar (AppSidebar) persists across all routes
✓ Right sidebars (ThreadHistory, Configuration) are specific to chat page
✓ StreamProvider wraps ONLY the chat interface, not other pages
✓ Each page has its own header with SidebarTrigger + Breadcrumb
✓ Click detection prevents closing sidebars when interacting with dialogs/popovers

NAVIGATION FLOW:
  / (Chat) → /agents → /tools → /rag → /settings
     ↓           ↓         ↓        ↓         ↓
   Same provider context, only <SidebarInset> content changes