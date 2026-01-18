import { createClient } from "@supabase/supabase-js";
import { config } from "@/config";

let supabaseInstance: ReturnType<typeof createClient> | null = null;

/**
 * Get a Supabase client instance (creates a singleton)
 *
 * @returns A Supabase client instance
 */
export function getSupabaseClient() {
  if (supabaseInstance) return supabaseInstance;

  const { url: supabaseUrl, anonKey: supabaseKey } = config.supabase;

  // For Electron/SPA, we use localStorage for persistence
  // This is the default behavior of createClient in the browser
  supabaseInstance = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage, // Explicitly use localStorage
    },
  });

  return supabaseInstance;
}

