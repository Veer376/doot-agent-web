import { Deployment } from "@/types/deployment";

/**
 * Loads the provided deployments from the environment variable.
 * @returns {Deployment[]} The list of deployments.
 */
export function getDeployments(): Deployment[] {
  return JSON.parse(process.env.NEXT_PUBLIC_DEPLOYMENTS || "[]");
}
