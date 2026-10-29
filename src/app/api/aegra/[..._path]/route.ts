import { initApiPassthrough } from "langgraph-nextjs-api-passthrough";

const apiUrl = process.env.AEGRA_API_URL || "http://127.0.0.1:2026";
const gatewayToken = process.env.DOOT_GATEWAY_TOKEN;

if (!apiUrl) {
  throw new Error("AEGRA_API_URL is required");
}

const localUpstream =
  apiUrl.startsWith("http://127.0.0.1:") ||
  apiUrl.startsWith("http://localhost:");

if (!gatewayToken && !localUpstream) {
  throw new Error("DOOT_GATEWAY_TOKEN is required");
}

// Keep Aegra separate from the existing /api/langgraph server. This lets Doot
// evaluate or migrate backends independently without changing the current
// local LangGraph runtime on :2024.
export const { GET, POST, PUT, PATCH, DELETE, OPTIONS, runtime } =
  initApiPassthrough({
    apiUrl,
    baseRoute: "aegra",
    disableWarningLog: true,
    headers: async () => ({
      ...(gatewayToken ? { "x-doot-token": gatewayToken } : {}),
      "accept-encoding": "identity",
    }),
  });
