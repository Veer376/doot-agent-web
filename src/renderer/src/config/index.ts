/**
 * Centralized Application Configuration
 * 
 * This module provides a single source of truth for all environment variables.
 * It validates required variables on module load and provides type-safe access.
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
    const apiUrl = import.meta.env.VITE_API_URL;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    // Validate required variables
    if (!apiUrl) {
        console.warn('VITE_API_URL is missing. Please set it in your .env file.');
        // Don't throw for now to allow app to load even if config is partial during migration
    }
    if (!supabaseUrl) {
        console.warn('VITE_SUPABASE_URL is missing.');
    }
    if (!supabaseAnonKey) {
        console.warn('VITE_SUPABASE_ANON_KEY is missing.');
    }

    // Determine environment
    const environment = import.meta.env.PROD ? 'production' : 'development';

    return {
        // API URLs
        apiUrl: apiUrl || "",
        mcpUrl: "",
        mcpServerUrl: import.meta.env.VITE_MCP_SERVER_URL || null,
        ragApiUrl: import.meta.env.VITE_RAG_API_URL || null,
        composioApiKey: import.meta.env.VITE_COMPOSIO_API_KEY || null,

        // Authentication
        supabase: {
            url: supabaseUrl || "",
            anonKey: supabaseAnonKey || "",
        },
        siteUrl: import.meta.env.VITE_SITE_URL || null,

        // Feature Flags
        features: {
            googleAuthDisabled: import.meta.env.VITE_GOOGLE_AUTH_DISABLED === 'true',
            githubAuthDisabled: import.meta.env.VITE_GITHUB_AUTH_DISABLED === 'true',
            requireApiKeys: import.meta.env.VITE_REQUIRE_API_KEYS === 'true',
            mcpAuthRequired: import.meta.env.VITE_MCP_AUTH_REQUIRED === 'true',
            isDemoApp: import.meta.env.VITE_DEMO_APP === 'true',
        },

        // Environment
        environment,
        isDev: environment === 'development',
        isProd: environment === 'production',
    };
}

// Initialize config once on module load
export const config = getConfig();

// Log config in development
if (config.isDev) {
    console.log('🔧 Configuration loaded:', {
        apiUrl: config.apiUrl,
        mcpUrl: config.mcpUrl,
        environment: config.environment,
        features: config.features,
    });
}
