'use client';

import { useElectron } from '@/hooks/use-electron';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/auth/supabase-client';

export default function ElectronDebugPage() {
  const electronInfo = useElectron();
  const [authStatus, setAuthStatus] = useState<{
    isAuthenticated: boolean;
    user: any;
    isLoading: boolean;
  }>({
    isAuthenticated: false,
    user: null,
    isLoading: true,
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[Auth] Error getting session:', error);
        }

        setAuthStatus({
          isAuthenticated: !!session,
          user: session?.user || null,
          isLoading: false,
        });
      } catch (error) {
        console.error('[Auth] Failed to check auth status:', error);
        setAuthStatus({
          isAuthenticated: false,
          user: null,
          isLoading: false,
        });
      }
    };

    checkAuth();

    // Listen for auth changes
    const supabase = getSupabaseClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthStatus({
        isAuthenticated: !!session,
        user: session?.user || null,
        isLoading: false,
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (electronInfo.isLoading || authStatus.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
        <div className="text-center">
          <div className="mb-4 text-2xl">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-8 text-white">
      <div className="mx-auto max-w-4xl space-y-8">
        <h1 className="text-3xl font-bold">🚀 Electron Environment Debug</h1>

        {/* Electron Info */}
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
          <h2 className="mb-4 text-xl font-semibold">Environment</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Running in Electron:</span>
              <span className={electronInfo.isElectron ? 'text-green-400' : 'text-red-400'}>
                {electronInfo.isElectron ? '✅ Yes' : '❌ No (Web)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Platform:</span>
              <span className="font-mono">{electronInfo.platform}</span>
            </div>
            {electronInfo.appVersion && (
              <div className="flex justify-between">
                <span className="text-gray-400">App Version:</span>
                <span className="font-mono">{electronInfo.appVersion}</span>
              </div>
            )}
            {electronInfo.cdpUrl && (
              <div className="flex flex-col gap-2">
                <span className="text-gray-400">CDP URL (Browser Automation):</span>
                <div className="rounded bg-gray-950 p-3">
                  <code className="text-sm text-green-400">{electronInfo.cdpUrl}</code>
                </div>
                <p className="text-xs text-gray-500">
                  ✨ This URL can be used by Playwright to control the browser
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Authentication Status */}
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
          <h2 className="mb-4 text-xl font-semibold">Authentication</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Status:</span>
              <span className={authStatus.isAuthenticated ? 'text-green-400' : 'text-yellow-400'}>
                {authStatus.isAuthenticated ? '✅ Authenticated' : '⚠️ Not Authenticated'}
              </span>
            </div>
            {authStatus.user && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-400">Email:</span>
                  <span className="font-mono">{authStatus.user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">User ID:</span>
                  <span className="font-mono text-xs">{authStatus.user.id}</span>
                </div>
              </>
            )}
          </div>
          
          {!authStatus.isAuthenticated && (
            <div className="mt-4">
              <a
                href="/login"
                className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Go to Login
              </a>
            </div>
          )}
        </div>

        {/* Environment Variables */}
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
          <h2 className="mb-4 text-xl font-semibold">Configuration</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Supabase URL:</span>
              <span className="font-mono text-xs">
                {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Supabase Anon Key:</span>
              <span className="font-mono text-xs">
                {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}
              </span>
            </div>
          </div>
        </div>

        {/* Success Indicator */}
        {electronInfo.isElectron && electronInfo.cdpUrl && authStatus.isAuthenticated && (
          <div className="rounded-lg border border-green-800 bg-green-950 p-6">
            <h2 className="mb-2 text-xl font-semibold text-green-400">
              🎉 Everything is working!
            </h2>
            <p className="text-gray-300">
              Your Electron app is running correctly with:
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-400">
              <li>Browser automation enabled (CDP on port 9222)</li>
              <li>User authentication working</li>
              <li>Supabase connection established</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
