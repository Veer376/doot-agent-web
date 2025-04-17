import { Tool } from "@/types/tool";

/**
 * Loads the provided tools from the environment variable.
 * @returns {Tool[]} The list of tools.
 */
export function getTools(): Tool[] {
  return JSON.parse(process.env.NEXT_PUBLIC_TOOLS || "[]");
}
