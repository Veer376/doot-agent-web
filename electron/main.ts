import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { join } from 'path';
import { spawn } from 'child_process';
import type { ChildProcess } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';

// Playwright browser server types
import type { BrowserServer } from 'playwright';

// ============================================
// Playwright Browser Server (Inlined)
// ============================================

// Browser server instance (singleton)
let playwrightBrowserServer: BrowserServer | null = null;

// User data directory for persistent sessions
const PLAYWRIGHT_USER_DATA_DIR = join(tmpdir(), 'orbit-agent-playwright-profile');

/**
 * Configuration options for the Playwright browser server
 */
interface PlaywrightServerOptions {
    headless?: boolean;
    port?: number;
    windowSize?: { width: number; height: number };
}

/**
 * Default configuration
 */
const DEFAULT_PLAYWRIGHT_OPTIONS: PlaywrightServerOptions = {
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
async function launchPlaywrightServer(
    options: PlaywrightServerOptions = {}
): Promise<string> {
    // Return existing server if already running
    if (playwrightBrowserServer) {
        const wsEndpoint = playwrightBrowserServer.wsEndpoint();
        console.log('[Playwright] Server already running:', wsEndpoint);
        return wsEndpoint;
    }

    const config = { ...DEFAULT_PLAYWRIGHT_OPTIONS, ...options };
    console.log('[Playwright] Launching browser server with config:', config);

    // Ensure user data directory exists
    if (!existsSync(PLAYWRIGHT_USER_DATA_DIR)) {
        mkdirSync(PLAYWRIGHT_USER_DATA_DIR, { recursive: true });
        console.log('[Playwright] Created user data directory:', PLAYWRIGHT_USER_DATA_DIR);
    }

    try {
        // Dynamic import of Playwright (ESM module)
        const { chromium } = await import('playwright');
        
        // Launch Playwright browser server using the system Chrome
        // This avoids requiring users to run 'playwright install'
        playwrightBrowserServer = await chromium.launchServer({
            channel: 'chrome', // Use system-installed Chrome instead of Playwright's bundled Chromium
            headless: config.headless,
            port: config.port,
            args: [
                `--window-size=${config.windowSize?.width},${config.windowSize?.height}`,
                '--disable-blink-features=AutomationControlled',
                '--no-first-run',
                '--no-default-browser-check',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
            ],
            chromiumSandbox: false,
        });

        const wsEndpoint = playwrightBrowserServer.wsEndpoint();
        console.log('[Playwright] Browser server started successfully');
        console.log('[Playwright] WebSocket endpoint:', wsEndpoint);
        
        playwrightBrowserServer.on('close', () => {
            console.log('[Playwright] Browser server closed');
            playwrightBrowserServer = null;
        });

        return wsEndpoint;
    } catch (error) {
        console.error('[Playwright] Failed to launch browser server:', error);
        throw error;
    }
}

/**
 * Check if Playwright browser server is running
 */
function isPlaywrightServerRunning(): boolean {
    return playwrightBrowserServer !== null;
}

/**
 * Get Playwright server status
 */
function getPlaywrightServerStatus(): {
    running: boolean;
    wsEndpoint: string | null;
    port: number | null;
} {
    if (!playwrightBrowserServer) {
        return { running: false, wsEndpoint: null, port: null };
    }
    
    const wsEndpoint = playwrightBrowserServer.wsEndpoint();
    const port = parseInt(new URL(wsEndpoint).port, 10);
    
    return { running: true, wsEndpoint, port };
}

/**
 * Close Playwright browser server
 */
async function closePlaywrightServer(): Promise<void> {
    if (playwrightBrowserServer) {
        console.log('[Playwright] Closing browser server...');
        try {
            await playwrightBrowserServer.close();
            console.log('[Playwright] Browser server closed');
        } catch (error) {
            console.error('[Playwright] Error closing browser server:', error);
        } finally {
            playwrightBrowserServer = null;
        }
    }
}

// ============================================
// End Playwright Browser Server
// ============================================

// Keep a global reference to prevent garbage collection
let mainWindow: BrowserWindow | null = null;
let nextProcess: ChildProcess | null = null;
let automationBrowserProcess: ChildProcess | null = null;

// Enable CDP for browser automation
const CDP_PORT = 9222;
const AUTOMATION_CDP_PORT = 9223; // Separate port for automation browser
app.commandLine.appendSwitch('remote-debugging-port', String(CDP_PORT));

// Disable hardware acceleration if needed for compatibility
// app.disableHardwareAcceleration();

const isDev = process.env.NODE_ENV === 'development';
const NEXT_DEV_PORT = 3000;
const NEXT_PROD_PORT = 3000;

/**
 * Start Next.js server in production mode
 */
function startNextServer(): Promise<void> {
    return new Promise((resolve, reject) => {
        console.log('[Electron] Starting Next.js server...');

        // In production, use the standalone server
        const nextServerPath = join(process.resourcesPath, 'app', 'server.js');

        nextProcess = spawn('node', [nextServerPath], {
            env: {
                ...process.env,
                PORT: String(NEXT_PROD_PORT),
                NODE_ENV: 'production',
            },
            stdio: 'inherit',
        });

        nextProcess.on('error', (error) => {
            console.error('[Electron] Failed to start Next.js server:', error);
            reject(error);
        });

        // Wait a bit for server to start
        setTimeout(() => {
            console.log('[Electron] Next.js server started');
            resolve();
        }, 2000);
    });
}

/**
 * Launch automation browser (separate Chrome instance)
 */
function launchAutomationBrowser(): Promise<string> {
    return new Promise((resolve, reject) => {
        console.log('[Electron] Launching automation browser...');

        // Find Chrome executable
        const chromePaths = [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            process.env.USERPROFILE + '\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'
        ];

        let chromePath = null;
        for (const path of chromePaths) {
            if (require('fs').existsSync(path)) {
                chromePath = path;
                break;
            }
        }

        if (!chromePath) {
            reject(new Error('Chrome not found'));
            return;
        }

        // Launch Chrome with CDP enabled
        automationBrowserProcess = spawn(chromePath, [
            `--remote-debugging-port=${AUTOMATION_CDP_PORT}`,
            '--no-first-run',
            '--no-default-browser-check',
            '--user-data-dir=' + require('os').tmpdir() + '\\doot-automation-profile',
            // '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
        ], {
            detached: true,
            stdio: 'ignore'
        });

        automationBrowserProcess.on('error', (error) => {
            console.error('[Electron] Failed to launch automation browser:', error);
            reject(error);
        });

        // Wait for Chrome to start and CDP to be available
        let attempts = 0;
        const checkCdp = () => {
            attempts++;
            fetch(`http://localhost:${AUTOMATION_CDP_PORT}/json`)
                .then(response => response.json())
                .then((targets: any) => {
                    const targetArray = targets as any[];
                    if (targetArray && targetArray.length > 0) {
                        const wsUrl = targetArray[0].webSocketDebuggerUrl;
                        console.log('[Electron] Automation browser ready, WebSocket:', wsUrl);
                        resolve(wsUrl);
                    } else {
                        throw new Error('No targets found');
                    }
                })
                .catch(() => {
                    if (attempts < 30) { // Try for 30 seconds
                        setTimeout(checkCdp, 1000);
                    } else {
                        reject(new Error('Timeout waiting for automation browser CDP'));
                    }
                });
        };

        setTimeout(checkCdp, 2000); // Initial delay
    });
}

/**
 * Create the main application window
 */
async function createWindow() {
    console.log('[Electron] Creating main window...');
    console.log(`[Electron] CDP enabled on port ${CDP_PORT}`);
    console.log(`[Electron] CDP URL: http://localhost:${CDP_PORT}`);

    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 600,
        show: false, // Don't show until ready
        backgroundColor: '#000000',
        webPreferences: {
            preload: join(__dirname, 'preload.js'),
            nodeIntegration: false, // Security: disable node integration
            contextIsolation: true, // Security: enable context isolation
            sandbox: true, // Security: enable sandbox
            webSecurity: true,
            allowRunningInsecureContent: false,
        },
        titleBarStyle: 'default',
        icon: join(__dirname, '../public/icon.png'), // Add your icon
    });

    // Determine the URL to load
    const appUrl = isDev
        ? `http://localhost:${NEXT_DEV_PORT}`
        : `http://localhost:${NEXT_PROD_PORT}`;

    console.log(`[Electron] Loading app from: ${appUrl}`);

    // Load the Next.js app
    try {
        await mainWindow.loadURL(appUrl);
        console.log('[Electron] URL loaded successfully');
    } catch (error) {
        console.error('[Electron] Failed to load URL:', error);
    }

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        console.log('[Electron] Window ready to show');
        mainWindow?.show();

        if (isDev) {
            mainWindow?.webContents.openDevTools();
        }
    });

    // Fallback: show window after 5 seconds if ready-to-show doesn't fire
    setTimeout(() => {
        if (mainWindow && !mainWindow.isVisible()) {
            console.log('[Electron] Showing window (fallback timeout)');
            mainWindow.show();
            if (isDev) {
                mainWindow.webContents.openDevTools();
            }
        }
    }, 5000);

    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Handle new window requests (OAuth popups)
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        console.log('[Electron] Window open request:', url);

        // Allow OAuth provider URLs to open in the same window
        if (url.includes('supabase.co/auth') ||
            url.includes('accounts.google.com') ||
            url.includes('github.com/login') ||
            url.includes('oauth')) {
            console.log('[Electron] OAuth navigation - loading in main window');
            mainWindow?.loadURL(url);
            return { action: 'deny' };
        }

        // Allow OAuth callbacks to navigate in current window
        if (url.includes('?code=') || url.includes('&code=')) {
            console.log('[Electron] OAuth callback - loading in current window');
            mainWindow?.loadURL(url);
            return { action: 'deny' };
        }

        // Allow same-app URLs
        if (url.startsWith(appUrl)) {
            return { action: 'allow' };
        }

        // Open other external links in default browser
        if (url.startsWith('http://') || url.startsWith('https://')) {
            console.log('[Electron] Opening external URL in browser:', url);
            shell.openExternal(url);
            return { action: 'deny' };
        }

        return { action: 'allow' };
    });

    // Handle navigation in the main window
    mainWindow.webContents.on('will-navigate', (event, url) => {
        console.log('[Electron] Navigation request:', url);

        const appHost = new URL(appUrl).host;

        try {
            const urlObj = new URL(url);
            const urlHost = urlObj.host;

            // Allow OAuth callbacks (contains code parameter)
            const hasAuthCode = urlObj.searchParams.has('code');

            // Allow Supabase OAuth URLs
            const isSupabaseAuth = url.includes('supabase.co/auth');

            // Allow Google OAuth URLs
            const isGoogleAuth = url.includes('accounts.google.com');

            // Allow same-host navigation, OAuth callbacks, and OAuth providers
            if (urlHost === appHost || hasAuthCode || isSupabaseAuth || isGoogleAuth) {
                console.log('[Electron] Allowing navigation to:', url);
                return; // Allow navigation
            }

            // Only prevent navigation to truly external sites
            console.log('[Electron] Preventing external navigation');
            event.preventDefault();
        } catch (error) {
            console.error('[Electron] Error parsing URL:', error);
        }
    });

    // Listen for new windows created (OAuth popup) - remove this since we handle it above
    mainWindow.webContents.on('did-create-window', (childWindow) => {
        console.log('[Electron] Child window created');
        childWindow.close(); // Close any popups since we handle OAuth in main window
    });
}

/**
 * App lifecycle: when ready
 */
app.whenReady().then(async () => {
    console.log('[Electron] App is ready');
    console.log(`[Electron] Version: ${app.getVersion()}`);
    console.log(`[Electron] Mode: ${isDev ? 'development' : 'production'}`);

    // Start Next.js server in production
    if (!isDev) {
        try {
            await startNextServer();
        } catch (error) {
            console.error('[Electron] Failed to start Next.js:', error);
            app.quit();
            return;
        }
    }

    // Create window
    await createWindow();

    // macOS: Re-create window when dock icon is clicked
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

/**
 * App lifecycle: all windows closed
 */
app.on('window-all-closed', () => {
    // On macOS, keep app running until explicit quit
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

/**
 * App lifecycle: before quit
 */
app.on('before-quit', async () => {
    console.log('[Electron] App quitting...');

    // Close Playwright browser server
    await closePlaywrightServer();

    // Kill Next.js server
    if (nextProcess) {
        console.log('[Electron] Stopping Next.js server...');
        nextProcess.kill();
        nextProcess = null;
    }
});

/**
 * IPC Handlers
 */

// Get CDP URL
ipcMain.handle('get-cdp-url', () => {
    return `http://localhost:${CDP_PORT}`;
});

// Get automation browser WebSocket URL
ipcMain.handle('get-automation-browser-ws-url', async () => {
    try {
        if (!automationBrowserProcess) {
            await launchAutomationBrowser();
        }
        // Return the WebSocket URL for the automation browser
        const response = await fetch(`http://localhost:${AUTOMATION_CDP_PORT}/json`);
        const targets: any = await response.json();
        const targetArray = targets as any[];
        if (targetArray && targetArray.length > 0) {
            return targetArray[0].webSocketDebuggerUrl;
        }
        throw new Error('No automation browser targets found');
    } catch (error) {
        console.error('[Electron] Error getting automation browser WebSocket URL:', error);
        throw error;
    }
});

// Get app version
ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

// Check if running in Electron
ipcMain.handle('is-electron', () => {
    return true;
});

// Open external URL
ipcMain.handle('open-external', (_event, url: string) => {
    shell.openExternal(url);
});

/**
 * Playwright Browser Server IPC Handlers
 * These provide secure browser automation via Playwright WSS protocol
 */

// Launch Playwright browser server and get WSS URL (with auth token)
ipcMain.handle('get-playwright-browser-ws-url', async () => {
    try {
        console.log('[Electron] Launching Playwright browser server...');
        const wsUrl = await launchPlaywrightServer({
            headless: false,
            windowSize: { width: 1920, height: 1080 },
        });
        console.log('[Electron] Playwright browser server ready:', wsUrl);
        return wsUrl; // URL includes auth token: ws://127.0.0.1:PORT/GUID
    } catch (error) {
        console.error('[Electron] Failed to launch Playwright browser server:', error);
        throw error;
    }
});

// Get Playwright server status
ipcMain.handle('get-playwright-server-status', () => {
    return getPlaywrightServerStatus();
});

// Check if Playwright server is running
ipcMain.handle('is-playwright-server-running', () => {
    return isPlaywrightServerRunning();
});

// Close Playwright browser server
ipcMain.handle('close-playwright-browser', async () => {
    try {
        await closePlaywrightServer();
        console.log('[Electron] Playwright browser server closed');
        return { success: true };
    } catch (error) {
        console.error('[Electron] Failed to close Playwright browser server:', error);
        throw error;
    }
});

console.log('[Electron] Main process loaded');
