import { NextRequest } from "next/server";

const MCP_SERVER_URL = process.env.MCP_SERVER_URL;
// This will contain the object which contains the access token
const MCP_TOKENS = process.env.MCP_TOKENS;

/**
 * Proxies requests from the client to the MCP server.
 * Extracts the path after '/api/oap_mcp', constructs the target URL,
 * forwards the request with necessary headers and body, and injects
 * the MCP authorization token.
 *
 * @param req The incoming NextRequest.
 * @returns The response from the MCP server.
 */
export async function proxyRequest(req: NextRequest): Promise<Response> {
  if (!MCP_SERVER_URL) {
    return new Response(
      JSON.stringify({
        message: "MCP_SERVER_URL environment variable is not set.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
  if (!MCP_TOKENS) {
    return new Response(
      JSON.stringify({
        message: "MCP_TOKENS environment variable is not set.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  // Extract the path after '/api/oap_mcp/'
  // Example: /api/oap_mcp/foo/bar -> /foo/bar
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/oap_mcp/, "");

  // Construct the target URL
  const targetUrl = `${MCP_SERVER_URL}${path}${url.search}`;

  // Prepare headers, forwarding original headers except Host
  // and adding Authorization
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    // Some headers like 'host' should not be forwarded
    if (key.toLowerCase() !== "host") {
      headers.append(key, value);
    }
  });

  try {
    const { access_token } = JSON.parse(MCP_TOKENS);
    if (!access_token) {
      throw new Error("MCP_TOKENS env variable is not set.");
    }
    headers.set("Authorization", `Bearer ${access_token}`);
  } catch (e) {
    console.error("Failed to parse MCP_TOKENS env variable", e);
    return new Response(
      JSON.stringify({
        message: "Failed to parse MCP_TOKENS env variable.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  // Determine body based on method
  let body: BodyInit | null | undefined = undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    // For POST, PUT, PATCH, DELETE etc., forward the body
    body = req.body;
  }

  try {
    // Make the proxied request
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: body,
      // Important for streaming bodies
      // @ts-expect-error - duplex is required for streaming
      duplex: "half",
    });

    // Return the response from the MCP server directly
    return response;
  } catch (error) {
    console.error("MCP Proxy Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ message: "Proxy request failed", error: errorMessage }),
      {
        status: 502, // Bad Gateway
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
