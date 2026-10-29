import { initApiPassthrough } from "langgraph-nextjs-api-passthrough";

const apiUrl = process.env.LANGGRAPH_API_URL;
const gatewayToken = process.env.DOOT_GATEWAY_TOKEN;

if (!apiUrl) {
  throw new Error("LANGGRAPH_API_URL is required");
}

const localUpstream =
  apiUrl.startsWith("http://127.0.0.1:") ||
  apiUrl.startsWith("http://localhost:");

if (!gatewayToken && !localUpstream) {
  throw new Error("DOOT_GATEWAY_TOKEN is required");
}

export const { GET, POST, PUT, PATCH, DELETE, OPTIONS, runtime } =
  initApiPassthrough({
    apiUrl,
    baseRoute: "langgraph",
    disableWarningLog: true,
    headers: async () => ({
      "content-type": "application/json",
      ...(gatewayToken ? { "x-doot-token": gatewayToken } : {}),
      // Prevent an upstream CDN from compressing SSE and leaving a stale
      // content-encoding header after fetch has already decompressed the body.
      "accept-encoding": "identity",
    }),
  });
