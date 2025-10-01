import { Deployment } from "@/types/deployment";

/**
 * Loads the provided deployments from the environment variable.
 * @returns {Deployment[]} The list of deployments.
 */
export function getDeployments(): Deployment[] {
  let defaultExists = false;
  // Ensure the env var contains valid JSON. Provide a helpful error otherwise.
  const raw = process.env.NEXT_PUBLIC_DEPLOYMENTS || "[]";
  let deployments: Deployment[] = [];
  try {
    deployments = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      "Invalid NEXT_PUBLIC_DEPLOYMENTS. Ensure it is valid JSON with double quotes and no trailing commas. Example: '[{\"id\":\"...\",\"deploymentUrl\":\"http://localhost:5000\",\"tenantId\":\"...\",\"name\":\"Local\",\"isDefault\":true,\"defaultGraphId\":\"agent\"}]'"
    );
  }
  for (const deployment of deployments) {
    if (deployment.isDefault && !defaultExists) {
      if (!deployment.defaultGraphId) {
        throw new Error("Default deployment must have a default graph ID");
      }
      defaultExists = true;
    } else if (deployment.isDefault && defaultExists) {
      throw new Error("Multiple default deployments found");
    }
  }
  if (!defaultExists) {
    throw new Error("No default deployment found");
  }
  return deployments;
}
