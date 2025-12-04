/**
 * Composio API Type Definitions
 * 
 * Type-safe interfaces for Composio integrations, apps, and connected accounts.
 */

export interface ComposioApp {
    key: string;
    name: string;
    description: string;
    logo: string;
    categories?: string[];
}

export interface ComposioAccount {
    id: string;
    app_name: string;
    status: string; // API returns string like 'ACTIVE', 'INACTIVE', etc
    created_at: string;
    label?: string;
}

export interface ComposioConnectionRequest {
    user_id: string;
    app_slug: string;
}

export interface ComposioConnectionResponse {
    connected_account_id: string;
    redirect_url?: string;
}

export interface ComposioToolkitIcon {
    icon_url?: string;
}

// Re-export from api.ts for backward compatibility
export type {
    CreateConnectionRequest,
    ConnectionResponse,
    ConnectedAccount,
    ToolkitInfo
} from '@/lib/composio/api';
