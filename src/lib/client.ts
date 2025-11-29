import { Client } from "@langchain/langgraph-sdk";

export function createClient(accessToken?: string) {

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error(
      "Failed to create client: API URL not configured. Please set NEXT_PUBLIC_API_URL",
    );
  }

  const client = new Client({
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
    defaultHeaders: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });

  return client;
}
