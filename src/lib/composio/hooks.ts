/**
 * React Query hooks for Composio integration
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { composioAPI, type ConnectedAccount } from './api';
import { useAuthContext } from '@/providers/Auth';

export function useConnectedAccounts() {
  const { user } = useAuthContext();
  const userId = user?.id || 'anonymous';
  
  return useQuery({
    queryKey: ['composio', 'accounts', userId],
    queryFn: async () => {
      const result = await composioAPI.getConnectedAccounts(userId);
      return result;
    },
    enabled: !!userId && userId !== 'anonymous',
    retry: false,
  });
}

export function useComposioApps() {
  return useQuery({
    queryKey: ['composio', 'apps'],
    queryFn: async () => {
      try {
        const result = await composioAPI.getApps();
        return result;
      } catch (error) {
        console.error('[Composio Hooks] getApps error:', error);
        throw error;
      }
    },
    retry: false, // Disable retry to see errors immediately
  });
}

export function useCreateConnection() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const userId = user?.id || 'anonymous';

  return useMutation({
    mutationFn: (app_slug: string) =>
      composioAPI.createConnection({ user_id: userId, app_slug }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['composio', 'accounts'] });
    },
  });
}

export function useDisconnectAccount() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const userId = user?.id || 'anonymous';

  return useMutation({
    mutationFn: (connectionId: string) => composioAPI.disconnectAccount(userId, connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['composio', 'accounts'] });
    },
  });
}

export function useConnectedApps(): { apps: ConnectedAccount[]; isLoading: boolean; error: Error | null } {
  const { data: accounts, isLoading, error } = useConnectedAccounts();

  // Return all connections, filtering happens in components if needed
  const apps = accounts || [];

  return { apps, isLoading, error: error as Error | null };
}

export function useComposioToolkitIcon(
  toolkitSlug: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ["composio", "toolkit-icon", toolkitSlug],
    queryFn: async (): Promise<{ icon_url?: string }> => {
      try {
        const result = await composioAPI.getToolkitIcon(toolkitSlug);
        return {
          icon_url: result.icon_url,
        };
      } catch (error) {
        console.error(`Failed to fetch icon for ${toolkitSlug}:`, error);
        return {
          icon_url: `https://img.composio.dev/app/${toolkitSlug}/logo`
        };
      }
    },
    enabled:
      options?.enabled !== undefined ? options.enabled : !!toolkitSlug,
    staleTime: 60 * 60 * 1000, // 1 hour
    retry: 2,
  });
}
