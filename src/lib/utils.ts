import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { config } from "@/config";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * @returns true if google auth is disabled
 */
export function googleAuthDisabled(): boolean {
  return config.features.googleAuthDisabled;
}

/**
 * @returns true if github auth is disabled
 */
export function githubAuthDisabled(): boolean {
  return config.features.githubAuthDisabled;
}
