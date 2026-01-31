import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import type { ChildProcess } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { is, electronApp, optimizer } from '@electron-toolkit/utils';
import { registerLocalAgentHandlers } from './ipc-handlers';
import { config as loadDotenv } from 'dotenv';

// Load environment variables from .env file
// This allows API keys to be set in .env instead of system env vars
loadDotenv();

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Playwright browser server types
import type { BrowserServer } from 'playwright';

// ============================================
// Playwright Browser Server (Inlined)
// ============================================

// Browser server instance (singleton)
let playwrightBrowserServer: BrowserServer | null = null;

// User data directory for persistent sessions
const PLAYWRIGHT_USER_DATA_DIR = join(tmpdir(), 'orbit-agent-playwright-profile');

interface PlaywrightServerOptions {
    headless?: boolean;
    port?: number;
    windowSize?: { width: number; height: number };
}

const DEFAULT_PLAYWRIGHT_OPTIONS: PlaywrightServerOptions = {
    headless: false,
    port: 0,
    windowSize: { width: 1920, height: 1080 },
};

async function launchPlaywrightServer(
    options: PlaywrightServerOptions = {}
): Promise<string> {
    if (playwrightBrowserServer) {
        return playwrightBrowserServer.wsEndpoint();
    }

    const config = { ...DEFAULT_PLAYWRIGHT_OPTIONS, ...options };

    if (!existsSync(PLAYWRIGHT_USER_DATA_DIR)) {
        mkdirSync(PLAYWRIGHT_USER_DATA_DIR, { recursive: true });
    }

    try {
        const { chromium } = await import('playwright');

        playwrightBrowserServer = await chromium.launchServer({
            channel: 'chrome',
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

        playwrightBrowserServer.on('close', () => {
            playwrightBrowserServer = null;
        });

        return wsEndpoint;
    } catch (error) {
        console.error('[Playwright] Failed to launch browser server:', error);
        throw error;
    }
}

function getPlaywrightServerStatus() {
    if (!playwrightBrowserServer) {
        return { running: false, wsEndpoint: null, port: null };
    }
    const wsEndpoint = playwrightBrowserServer.wsEndpoint();
    const port = parseInt(new URL(wsEndpoint).port, 10);
    return { running: true, wsEndpoint, port };
}

async function closePlaywrightServer(): Promise<void> {
    if (playwrightBrowserServer) {
        try {
            await playwrightBrowserServer.close();
        } catch (error) {
            console.error('[Playwright] Error closing browser server:', error);
        } finally {
            playwrightBrowserServer = null;
        }
    }
}

// Global references
let mainWindow: BrowserWindow | null = null;
let automationBrowserProcess: ChildProcess | null = null;
const CDP_PORT = 9222;
const AUTOMATION_CDP_PORT = 9223;
app.commandLine.appendSwitch('remote-debugging-port', String(CDP_PORT));

function launchAutomationBrowser(): Promise<string> {
    return new Promise((resolve, reject) => {
        const chromePaths = [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            // Fallback for user install
            ...(process.env.USERPROFILE ? [join(process.env.USERPROFILE, 'AppData', 'Local', 'Google', 'Chrome', 'Application', 'chrome.exe')] : [])
        ];

        let chromePath = null;
        for (const path of chromePaths) {
            if (existsSync(path)) {
                chromePath = path;
                break;
            }
        }

        if (!chromePath) {
            reject(new Error('Chrome not found'));
            return;
        }

        automationBrowserProcess = spawn(chromePath, [
            `--remote-debugging-port=${AUTOMATION_CDP_PORT}`,
            '--no-first-run',
            '--no-default-browser-check',
            '--user-data-dir=' + join(tmpdir(), 'doot-automation-profile'),
            '--disable-features=VizDisplayCompositor'
        ], {
            detached: true,
            stdio: 'ignore'
        });

        automationBrowserProcess.on('error', reject);

        let attempts = 0;
        const checkCdp = () => {
            attempts++;
            fetch(`http://localhost:${AUTOMATION_CDP_PORT}/json`)
                .then(response => response.json())
                .then((targets: any) => {
                    const targetArray = targets as any[];
                    if (targetArray && targetArray.length > 0) {
                        resolve(targetArray[0].webSocketDebuggerUrl);
                    } else {
                        throw new Error('No targets found');
                    }
                })
                .catch(() => {
                    if (attempts < 30) {
                        setTimeout(checkCdp, 1000);
                    } else {
                        reject(new Error('Timeout waiting for automation browser CDP'));
                    }
                });
        };

        setTimeout(checkCdp, 2000);
    });
}

function createWindow(): void {
    const preloadPath = join(__dirname, '../preload/index.mjs');

    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 600,
        show: false,
        backgroundColor: '#000000',
        webPreferences: {
            preload: preloadPath,
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
            webSecurity: true,
            allowRunningInsecureContent: false,
        },
        titleBarStyle: 'default',
    });

    mainWindow.on('ready-to-show', () => {
        mainWindow?.show();
        if (is.dev) mainWindow?.webContents.openDevTools();
    });

    // Handle navigation - allow OAuth callbacks but open external links in browser
    mainWindow.webContents.on('will-navigate', (event, url) => {
        const parsedUrl = new URL(url);
        const currentUrl = mainWindow?.webContents.getURL();
        const currentParsed = currentUrl ? new URL(currentUrl) : null;

        // Allow navigation within the same origin (includes OAuth callbacks)
        if (currentParsed && parsedUrl.origin === currentParsed.origin) {
            console.log('[Electron] Allowing same-origin navigation:', url);
            return;
        }

        // Allow Supabase auth domain for OAuth
        if (parsedUrl.hostname.includes('supabase.co')) {
            console.log('[Electron] Allowing Supabase auth:', url);
            return;
        }

        // Block external navigation and open in default browser instead
        event.preventDefault();
        console.log('[Electron] Opening external URL in browser:', url);
        shell.openExternal(url);
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        // Handle OAuth and external links
        if (url.includes('supabase.co/auth') ||
            url.includes('accounts.google.com') ||
            url.includes('github.com/login') ||
            url.includes('oauth')) {
            console.log('[Electron] OAuth popup detected, loading in main window:', url);
            return { action: 'deny' };
        }

        console.log('[Electron] Opening external link:', url);
        shell.openExternal(url);
        return { action: 'deny' };
    });

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
    }
}

// ============================================
// Deep Link Handling
// ============================================

if (process.defaultApp) {
    if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient('orbit-agent', process.execPath, [resolve(process.argv[1])]);
    }
} else {
    app.setAsDefaultProtocolClient('orbit-agent');
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Someone tried to run a second instance, we should focus our window.
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }

        // Protocol handler for Windows
        // commandLine will look like: ["path/to/exe", "orbit-agent://..."]
        const url = commandLine.find(arg => arg.startsWith('orbit-agent://'));
        if (url) {
            handleDeepLink(url);
        }
    });

    // Create window
    app.whenReady().then(() => {
        electronApp.setAppUserModelId('com.orbitagent');

        // Register local agent IPC handlers
        registerLocalAgentHandlers(ipcMain);

        app.on('browser-window-created', (_, window) => {
            optimizer.watchWindowShortcuts(window);
        });

        createWindow();

        app.on('activate', function () {
            if (BrowserWindow.getAllWindows().length === 0) createWindow();
        });
    });
}

// Handle open-url event for macOS
app.on('open-url', (event, url) => {
    event.preventDefault();
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    }
    handleDeepLink(url);
});

function handleDeepLink(url: string) {
    console.log('[Main] Received deep link:', url);

    try {
        const urlObj = new URL(url);

        if (urlObj.hostname === 'auth' && urlObj.pathname === '/callback') {
            // Check for PKCE flow (query parameter with code)
            // format: orbit-agent://auth/callback?code=...
            const code = urlObj.searchParams.get('code');

            if (code) {
                console.log('[Main] Extracted auth code (PKCE flow), sending to renderer');
                mainWindow?.webContents.send('auth:session-update', {
                    code: code
                });
                return;
            }

            // Check for Implicit flow (hash fragment with tokens)
            // format: orbit-agent://auth/callback#access_token=...&refresh_token=...
            const hash = urlObj.hash.substring(1); // remove #
            const params = new URLSearchParams(hash);

            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');

            if (accessToken && refreshToken) {
                console.log('[Main] Extracted auth tokens (Implicit flow), sending to renderer');
                mainWindow?.webContents.send('auth:session-update', {
                    access_token: accessToken,
                    refresh_token: refreshToken
                });
                return;
            }

            console.warn('[Main] Deep link missing tokens or code');
        }
    } catch (error) {
        console.error('[Main] Failed to handle deep link:', error);
    }
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', async () => {
    await closePlaywrightServer();
});

// IPC Handlers
ipcMain.handle('get-cdp-url', () => `http://localhost:${CDP_PORT}`);

ipcMain.handle('get-automation-browser-ws-url', async () => {
    if (!automationBrowserProcess) await launchAutomationBrowser();
    const response = await fetch(`http://localhost:${AUTOMATION_CDP_PORT}/json`);
    const targets: any = await response.json();
    return targets[0].webSocketDebuggerUrl;
});

ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('is-electron', () => true);
ipcMain.handle('open-external', (_event, url: string) => shell.openExternal(url));

ipcMain.handle('get-playwright-browser-ws-url', async () => {
    return launchPlaywrightServer({ headless: false, windowSize: { width: 1920, height: 1080 } });
});

ipcMain.handle('get-playwright-server-status', () => getPlaywrightServerStatus());
ipcMain.handle('is-playwright-server-running', () => getPlaywrightServerStatus().running);
ipcMain.handle('close-playwright-browser', async () => {
    await closePlaywrightServer();
    return { success: true };
});
