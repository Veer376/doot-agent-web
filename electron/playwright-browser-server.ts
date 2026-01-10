/**
 * Playwright Browser Server for Electron
 * 
 * This module launches a Playwright browser server that can be controlled
 * remotely via WebSocket. It provides secure authentication via tokens
 * embedded in the WebSocket URL.
 * 
 * Usage Flow:
 * 1. Electron calls launchServer() when browser_agent is invoked
 * 2. Playwright launches Chrome/Chromium with secure WSS endpoint
 * 3. WSS URL (with auth token) is sent to backend
 * 4. Backend connects using playwright.chromium.connect(wsUrl)
 * 5. Backend controls browser, takes screenshots, etc.
 */

import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Type imports for Playwright
import type { BrowserServer } from 'playwright';

// Browser server instance (singleton)
let browserServer: BrowserServer | null = null;

// User data directory for persistent sessions
const USER_DATA_DIR = join(tmpdir(), 'orbit-agent-playwright-profile');

/**
 * Configuration options for the Playwright browser server
 */
export interface PlaywrightServerOptions {
    headless?: boolean;
    port?: number;
    windowSize?: { width: number; height: number };
}

/**
 * Default configuration
 */
const DEFAULT_OPTIONS: PlaywrightServerOptions = {
    headless: false,
    port: 0, // Let Playwright choose an available port
    windowSize: { width: 1920, height: 1080 },
};

/**
 * Launch Playwright browser server
 * 
 * @param options - Configuration options
 * @returns WebSocket endpoint URL with authentication token
 */
export async function launchPlaywrightServer(
    options: PlaywrightServerOptions = {}
): Promise<string> {
    // Return existing server if already running
    if (browserServer) {
        const wsEndpoint = browserServer.wsEndpoint();
        console.log('[Playwright] Server already running:', wsEndpoint);
        return wsEndpoint;
    }

    const config = { ...DEFAULT_OPTIONS, ...options };
    console.log('[Playwright] Launching browser server with config:', config);

    // Ensure user data directory exists
    if (!existsSync(USER_DATA_DIR)) {
        mkdirSync(USER_DATA_DIR, { recursive: true });
        console.log('[Playwright] Created user data directory:', USER_DATA_DIR);
    }

    try {
        // Dynamic import of Playwright (ESM module)
        const { chromium } = await import('playwright');
        
        // Launch Playwright browser server
        // This creates a WebSocket server that accepts Playwright connections
        // The wsEndpoint() includes an authentication token automatically
        browserServer = await chromium.launchServer({
            headless: config.headless,
            port: config.port,
            args: [
                // Window size
                `--window-size=${config.windowSize?.width},${config.windowSize?.height}`,
                // Disable automation detection
                '--disable-blink-features=AutomationControlled',
                // Disable first run experience
                '--no-first-run',
                '--no-default-browser-check',
                // Performance optimizations
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                // Security: keep web security enabled
                // '--disable-web-security', // DO NOT USE - security risk
            ],
            // Chromium sandbox (more secure)
            chromiumSandbox: false, // Disable for Electron compatibility
        });

        const wsEndpoint = browserServer.wsEndpoint();
        console.log('[Playwright] Browser server started successfully');
        console.log('[Playwright] WebSocket endpoint:', wsEndpoint);
        
        // Log the port for debugging
        const port = new URL(wsEndpoint).port;
        console.log('[Playwright] Server port:', port);

        // Handle server close
        browserServer.on('close', () => {
            console.log('[Playwright] Browser server closed');
            browserServer = null;
        });

        return wsEndpoint;
    } catch (error) {
        console.error('[Playwright] Failed to launch browser server:', error);
        throw error;
    }
}

/**
 * Check if browser server is running
 */
export function isServerRunning(): boolean {
    return browserServer !== null;
}

/**
 * Get the WebSocket endpoint of the running server
 * 
 * @returns WebSocket endpoint URL or null if not running
 */
export function getWsEndpoint(): string | null {
    if (!browserServer) {
        return null;
    }
    return browserServer.wsEndpoint();
}

/**
 * Close the browser server
 */
export async function closePlaywrightServer(): Promise<void> {
    if (browserServer) {
        console.log('[Playwright] Closing browser server...');
        try {
            await browserServer.close();
            console.log('[Playwright] Browser server closed');
        } catch (error) {
            console.error('[Playwright] Error closing browser server:', error);
        } finally {
            browserServer = null;
        }
    }
}

/**
 * Get server status
 */
export function getServerStatus(): {
    running: boolean;
    wsEndpoint: string | null;
    port: number | null;
} {
    if (!browserServer) {
        return { running: false, wsEndpoint: null, port: null };
    }
    
    const wsEndpoint = browserServer.wsEndpoint();
    const port = parseInt(new URL(wsEndpoint).port, 10);
    
    return {
        running: true,
        wsEndpoint,
        port,
    };
}
