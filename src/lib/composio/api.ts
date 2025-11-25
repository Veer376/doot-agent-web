/**
 * Composio SDK client for Orbit Agent
 * Uses Composio SDK directly for all operations
 * 
 * Docs: https://docs.composio.dev/type-script/models/
 */
import { Composio } from "@composio/core";

export interface CreateConnectionRequest {
  user_id: string;
  app_slug: string;
}

export interface ConnectionResponse {
  connected_account_id: string;
  redirect_url?: string;
}

export interface ConnectedAccount {
  id: string;
  app_name: string;
  status: string;
  created_at: string;
  label?: string; // Optional email or account identifier to distinguish multiple accounts
}

export interface ToolkitInfo {
  key: string;
  name: string;
  description: string;
  logo: string;
  categories: string[];
}

// Get API key from environment
const COMPOSIO_API_KEY = process.env.NEXT_PUBLIC_COMPOSIO_API_KEY;

if (!COMPOSIO_API_KEY) {
  console.warn('[Composio] NEXT_PUBLIC_COMPOSIO_API_KEY not set - Composio features will not work');
}

export class ComposioAPI {
  public client: Composio; // Make public so hooks can access it

  constructor() {
    if (!COMPOSIO_API_KEY) {
      throw new Error('COMPOSIO_API_KEY is required. Set NEXT_PUBLIC_COMPOSIO_API_KEY environment variable.');
    }
    // Initialize Composio SDK with API key
    this.client = new Composio({ apiKey: COMPOSIO_API_KEY });
  }

  async createConnection(request: CreateConnectionRequest): Promise<ConnectionResponse> {
    try {
      // Use toolkits.authorize() which handles auth config creation and connection initiation
      // Docs: https://docs.composio.dev/type-script/models/toolkits
      const connectionRequest = await this.client.toolkits.authorize(
        request.user_id,
        request.app_slug
      );

      const result = {
        connected_account_id: (connectionRequest as any).connectedAccountId || connectionRequest.id || '',
        redirect_url: connectionRequest.redirectUrl || undefined
      };

      return result;
    } catch (error: any) {
      console.error('[Composio SDK] Error creating connection:', error);
      throw new Error(error.message || 'Failed to create connection');
    }
  }

  async getConnectedAccounts(userId: string): Promise<ConnectedAccount[]> {
    try {
      // List all connected accounts for this user
      // Docs: https://docs.composio.dev/type-script/models/connected-accounts
      const response = await this.client.connectedAccounts.list({
        userIds: [userId]
      });

      const connections = response.items || [];
      
      const result: ConnectedAccount[] = connections.map((conn: any) => {
        // Try to extract email or account identifier from connection data
        let label: string | undefined;
        
        // Check various possible locations for account info
        label = conn.integrationMetadata?.email ||
                conn.integrationMetadata?.user_email ||
                conn.integrationMetadata?.account_email ||
                conn.connectionParams?.email ||
                conn.connectionParams?.user_email ||
                conn.connectionParams?.account_email ||
                conn.data?.email || 
                conn.data?.user_email || 
                conn.data?.account_email ||
                conn.data?.username ||
                conn.data?.account_name ||
                conn.data?.name;
        
        // If no email found and we have an id_token (OAuth JWT), try to decode it
        if (!label && conn.data?.id_token) {
          try {
            // JWT is base64 encoded in 3 parts: header.payload.signature
            // We need the payload (middle part)
            const payload = conn.data.id_token.split('.')[1];
            const decoded = JSON.parse(atob(payload));
            label = decoded.email || decoded.preferred_username || decoded.sub;
          } catch (e) {
            console.warn('[Composio SDK] Failed to decode id_token:', e);
          }
        }
        
        return {
          id: conn.id || '',
          app_name: conn.toolkit?.slug || conn.appName || "Unknown",
          status: (conn.status || 'ACTIVE').toUpperCase(),
          created_at: conn.createdAt || new Date().toISOString(),
          label: label
        };
      });

      return result;
    } catch (error: any) {
      console.error('[Composio SDK] Error fetching connected accounts:', error);
      throw new Error(error.message || 'Failed to fetch connected accounts');
    }
  }

  async getConnectionInfo(connectionId: string): Promise<ConnectedAccount> {
    try {
      // Get connection details by nanoid (the connection ID)
      // Docs: https://docs.composio.dev/type-script/models/connected-accounts
      const conn = await this.client.connectedAccounts.get(connectionId);

      // Try to extract email or account identifier from connection data
      let label: string | undefined;
      if ((conn as any).data) {
        const data = (conn as any).data;
        label = data.email || 
                data.user_email || 
                data.account_email ||
                data.username ||
                data.account_name ||
                data.name;
      }
      
      return {
        id: conn.id || '',
        app_name: conn.toolkit?.slug || "Unknown",
        status: (conn.status || 'ACTIVE').toUpperCase(),
        created_at: conn.createdAt || new Date().toISOString(),
        label: label
      };
    } catch (error: any) {
      console.error('[Composio SDK] Error fetching connection info:', error);
      throw new Error(error.message || 'Failed to fetch connection info');
    }
  }

  async disconnectAccount(userId: string, connectionId: string): Promise<void> {
    try {
      // Delete the connected account by nanoid
      // Docs: https://docs.composio.dev/type-script/models/connected-accounts
      await this.client.connectedAccounts.delete(connectionId);
      
    } catch (error: any) {
      console.error('[Composio SDK] Error disconnecting account:', error);
      throw new Error(error.message || 'Failed to disconnect account');
    }
  }

  async getApps(): Promise<ToolkitInfo[]> {
    try {
      // Get all toolkits - pass empty object to get all
      // Docs: https://docs.composio.dev/type-script/models/toolkits
      const toolkits = await this.client.toolkits.get({});

      // Filter to only OAuth2 apps
      const result: ToolkitInfo[] = toolkits
        .filter((toolkit: any) => {
          const authSchemes = toolkit.authSchemes || toolkit.auth_schemes || [];
          return authSchemes.includes('OAUTH2');
        })
        .map((toolkit: any) => {
          // Try to get logo from multiple possible locations
          const logo = toolkit.meta?.logo || 
                      toolkit.logo || 
                      `https://img.composio.dev/app/${toolkit.slug}/logo`;
          
          return {
            key: toolkit.slug || '',
            name: toolkit.name || '',
            description: toolkit.description || '',
            logo: logo,
            categories: toolkit.categories || []
          };
        });

      return result;
    } catch (error: any) {
      console.error('[Composio SDK] Error fetching apps:', error);
      throw new Error(error.message || 'Failed to fetch apps');
    }
  }

  async getToolkitIcon(toolkitSlug: string): Promise<{ success: boolean; icon_url?: string }> {
    try {
      // Fetch toolkit details which includes the logo - pass slug directly as string
      const toolkit = await this.client.toolkits.get(toolkitSlug);
      
      // Extract logo - check both meta.logo and direct logo property
      const logo = toolkit.meta?.logo || (toolkit as any).logo;
      
      // If we have a logo, return it, otherwise use fallback
      if (logo) {
        return {
          success: true,
          icon_url: logo
        };
      }
      
      // Fallback: construct CDN URL
      return {
        success: true,
        icon_url: `https://img.composio.dev/app/${toolkitSlug}/logo`
      };
    } catch (error: any) {
      console.error('[Composio SDK] Error fetching toolkit icon:', error);
      // Return fallback CDN URL on error
      return {
        success: false,
        icon_url: `https://img.composio.dev/app/${toolkitSlug}/logo`
      };
    }
  }
}

export const composioAPI = new ComposioAPI();
