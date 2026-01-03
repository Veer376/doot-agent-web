import { Client } from "@langchain/langgraph-sdk";
import { config } from "@/config";

export function createClient(accessToken?: string) {
  const client = new Client({
    apiUrl: config.apiUrl,
    defaultHeaders: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });

  return client;
}
