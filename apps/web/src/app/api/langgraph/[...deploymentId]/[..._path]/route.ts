import { initApiPassthrough } from "langgraph-nextjs-api-passthrough";
import { NextRequest } from "next/server";
import { getDeployments } from "@/lib/environment/deployments";

/**
 * The 'langgraph-nextjs-api-passthrough' package is used to implement a proxy
 * between your client, and LangGraph deployment to not expose your LangGraph
 * API key to the client. It's implemented in a way which assumes you only will
 * need to connect to a single LangGraph deployment per app. Since this app
 * allows connecting to multiple different deployments, we need to setup a custom
 * solution which can use this passthrough with dynamic deployment URLs.
 *
 * The solution to this is to wrap the dynamic API route (`/[..._path]/route.ts`)
 * with another dynamic path field (`/[...deploymentId]/[..._path]/route.ts`). The
 * deployment ID will then be used to find the corresponding deployment URL, and
 * pass that to the `initApiPassthrough` function. We must also pass the updated
 * base route to `initApiPassthrough`, which consists of `langgraph/${deploymentId}`.
 */

export const runtime = "edge";

type DynamicRouteParams = {
  deploymentId: string;
  _path: string[];
};

type RequestParams = {
  params: Promise<DynamicRouteParams>;
};

/**
 * Returns the deployment URL for the given request URL.
 * @param requestUrl The request URL.
 * @returns The deployment URL, or null if the deployment is not found.
 */
async function getDeploymentUrl({
  params,
}: RequestParams): Promise<{ baseRoute: string; url: string } | null> {
  const { deploymentId } = await params;
  const deployment = getDeployments().find((d) => d.id === deploymentId);

  if (deployment) {
    return {
      baseRoute: `langgraph/${deploymentId}`,
      url: deployment.deploymentUrl,
    };
  }
  return null;
}

export async function GET(req: NextRequest, { params }: RequestParams) {
  const urlAndRoute = await getDeploymentUrl({ params });
  if (!urlAndRoute) {
    return new Response("Deployment not found", { status: 404 });
  }

  const { GET } = initApiPassthrough({
    apiKey: process.env.LANGSMITH_API_KEY,
    apiUrl: urlAndRoute.url,
    baseRoute: urlAndRoute.baseRoute,
    disableWarningLog: true,
  });

  return GET(req);
}

export async function POST(req: NextRequest, { params }: RequestParams) {
  const urlAndRoute = await getDeploymentUrl({ params });
  if (!urlAndRoute) {
    return new Response("Deployment not found", { status: 404 });
  }

  const { POST } = initApiPassthrough({
    apiKey: process.env.LANGSMITH_API_KEY,
    apiUrl: urlAndRoute.url,
    baseRoute: urlAndRoute.baseRoute,
    disableWarningLog: true,
  });

  return POST(req);
}

export async function PUT(req: NextRequest, { params }: RequestParams) {
  const urlAndRoute = await getDeploymentUrl({ params });
  if (!urlAndRoute) {
    return new Response("Deployment not found", { status: 404 });
  }

  const { PUT } = initApiPassthrough({
    apiKey: process.env.LANGSMITH_API_KEY,
    apiUrl: urlAndRoute.url,
    baseRoute: urlAndRoute.baseRoute,
    disableWarningLog: true,
  });

  return PUT(req);
}

export async function PATCH(req: NextRequest, { params }: RequestParams) {
  const urlAndRoute = await getDeploymentUrl({ params });
  if (!urlAndRoute) {
    return new Response("Deployment not found", { status: 404 });
  }

  const { PATCH } = initApiPassthrough({
    apiKey: process.env.LANGSMITH_API_KEY,
    apiUrl: urlAndRoute.url,
    baseRoute: urlAndRoute.baseRoute,
    disableWarningLog: true,
  });

  return PATCH(req);
}

export async function DELETE(req: NextRequest, { params }: RequestParams) {
  const urlAndRoute = await getDeploymentUrl({ params });
  if (!urlAndRoute) {
    return new Response("Deployment not found", { status: 404 });
  }

  const { DELETE } = initApiPassthrough({
    apiKey: process.env.LANGSMITH_API_KEY,
    apiUrl: urlAndRoute.url,
    baseRoute: urlAndRoute.baseRoute,
    disableWarningLog: true,
  });

  return DELETE(req);
}
