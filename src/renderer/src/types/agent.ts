import { Assistant } from "@langchain/langgraph-sdk";

export interface AgentMetadata {
  icon?: string;
  source?: 'local' | 'cloud';
  is_primary?: boolean;
  [key: string]: unknown;
}

export interface Agent extends Assistant {
  supportedConfigs?: ["tools" | "rag" | "supervisor"];
  metadata: AgentMetadata;
}
