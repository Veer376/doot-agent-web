/**
 * @deprecated This file has been refactored into Auth/index.tsx
 * 
 * The Auth provider has been split into three focused contexts for better performance:
 * - AuthUserProvider: user profile data (rarely changes)
 * - AuthSessionProvider: session state (moderately changes)
 * - AuthActionsProvider: auth methods (never changes)
 * 
 * Import from "@/providers/Auth" will now use the new structure automatically.
 */

export * from "./Auth/index";
