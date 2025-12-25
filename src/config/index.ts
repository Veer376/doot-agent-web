/**
 * Centralized Application Configuration
 * 
 * This module provides a single source of truth for all environment variables.
 * It validates required variables on module load and provides type-safe access.
 * 
 * Compatible with:
 * - Normal development: npm run dev
 * - Production-like dev: npm run dev:prod (loads .env.production.local)
 * - Production build: npm run build
 */

interface AppConfig {
    // API URLs
    apiUrl: string;
    mcpUrl: string;
    mcpServerUrl: string | null;
    ragApiUrl: string | null;
    composioApiKey: string | null;

    // Authentication
    supabase: {
        url: string;
        anonKey: string;
    };
    siteUrl: string | null;

    // Feature Flags
    features: {
        googleAuthDisabled: boolean;
        githubAuthDisabled: boolean;
        requireApiKeys: boolean;
        mcpAuthRequired: boolean;
        isDemoApp: boolean;
    };

    // Environment
    environment: 'development' | 'production';
    isDev: boolean;
    isProd: boolean;
}

function getConfig(): AppConfig {
    // Required environment variables with validation
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Validate required variables
    if (!apiUrl) {
        throw new Error(
            'NEXT_PUBLIC_API_URL is required. Please set it in your .env file.'
        );
    }
    if (!supabaseUrl) {
        throw new Error(
            'NEXT_PUBLIC_SUPABASE_URL is required. Please set it in your .env file.'
        );
    }
    if (!supabaseAnonKey) {
        throw new Error(
            'NEXT_PUBLIC_SUPABASE_ANON_KEY is required. Please set it in your .env file.'
        );
    }

    // Derive MCP URL from API URL
    const url = new URL(apiUrl);
    const mcpUrl = `${url.origin}${url.pathname}${url.pathname.endsWith("/") ? "" : "/"}oap_mcp`;

    // Determine environment
    const environment = process.env.NODE_ENV === 'production' ? 'production' : 'development';

    return {
        // API URLs
        apiUrl,
        mcpUrl,
        mcpServerUrl: process.env.NEXT_PUBLIC_MCP_SERVER_URL || null,
        ragApiUrl: process.env.NEXT_PUBLIC_RAG_API_URL || null,
        composioApiKey: process.env.NEXT_PUBLIC_COMPOSIO_API_KEY || null,

        // Authentication
        supabase: {
            url: supabaseUrl,
            anonKey: supabaseAnonKey,
        },
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL || null,

        // Feature Flags
        features: {
            googleAuthDisabled: process.env.NEXT_PUBLIC_GOOGLE_AUTH_DISABLED === 'true',
            githubAuthDisabled: process.env.NEXT_PUBLIC_GITHUB_AUTH_DISABLED === 'true',
            requireApiKeys: process.env.NEXT_PUBLIC_REQUIRE_API_KEYS === 'true',
            mcpAuthRequired: process.env.NEXT_PUBLIC_MCP_AUTH_REQUIRED === 'true',
            isDemoApp: process.env.NEXT_PUBLIC_DEMO_APP === 'true',
        },

        // Environment
        environment,
        isDev: environment === 'development',
        isProd: environment === 'production',
    };
}

// Initialize config once on module load
// This will fail fast if required environment variables are missing
export const config = getConfig();

// Log config in development (server-side only)
// This helps with debugging environment variable issues
if (typeof window === 'undefined' && config.isDev) {
    console.log('🔧 Configuration loaded:', {
        apiUrl: config.apiUrl,
        mcpUrl: config.mcpUrl,
        mcpServerUrl: config.mcpServerUrl,
        environment: config.environment,
        features: config.features,
    });
}
