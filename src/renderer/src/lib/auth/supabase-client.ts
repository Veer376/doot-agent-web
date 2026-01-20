import { createClient } from "@supabase/supabase-js";
import { config } from "@/config";

let supabaseInstance: ReturnType<typeof createClient> | null = null;

/**
 * Custom storage adapter for Electron that ensures persistence
 */
class ElectronStorage {
  async getItem(key: string): Promise<string | null> {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      console.error('Error getting item from storage:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      console.error('Error setting item in storage:', error);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing item from storage:', error);
    }
  }
}

/**
 * Get a Supabase client instance (creates a singleton)
 *
 * @returns A Supabase client instance
 */
export function getSupabaseClient() {
  if (supabaseInstance) return supabaseInstance;

  const { url: supabaseUrl, anonKey: supabaseKey } = config.supabase;

  // For Electron/SPA, we use localStorage for persistence
  supabaseInstance = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: new ElectronStorage(),
      flowType: 'pkce', // More secure flow for native apps
    },
  });

  return supabaseInstance;
}

