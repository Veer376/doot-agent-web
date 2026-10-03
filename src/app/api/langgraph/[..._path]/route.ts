import { initApiPassthrough } from "langgraph-nextjs-api-passthrough";

const apiUrl = process.env.LANGGRAPH_API_URL;
const gatewayToken = process.env.DOOT_GATEWAY_TOKEN;

if (!apiUrl) {
  throw new Error("LANGGRAPH_API_URL is required");
}

if (!gatewayToken) {
  throw new Error("DOOT_GATEWAY_TOKEN is required");
}

export const { GET, POST, PUT, PATCH, DELETE, OPTIONS, runtime } =
  initApiPassthrough({
    apiUrl,
    baseRoute: "langgraph",
    disableWarningLog: true,
    headers: async () => ({
      "x-doot-token": gatewayToken,
      // Prevent an upstream CDN from compressing SSE and leaving a stale
      // content-encoding header after fetch has already decompressed the body.
      "accept-encoding": "identity",
    }),
  });
