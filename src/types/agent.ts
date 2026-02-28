import { Assistant } from "@langchain/langgraph-sdk";

export interface AgentMetadata {
  icon?: string;
  [key: string]: unknown;
}

export interface Agent extends Omit<Assistant, "metadata"> {
  supportedConfigs?: ["tools" | "rag" | "supervisor"];
  metadata?: AgentMetadata;
}
