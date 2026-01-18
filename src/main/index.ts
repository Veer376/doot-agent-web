import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { join } from 'path';
import { spawn } from 'child_process';
import type { ChildProcess } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { is, electronApp, optimizer } from '@electron-toolkit/utils';

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
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 600,
        show: false,
        backgroundColor: '#000000',
        icon: join(__dirname, '../../src/renderer/public/icon.png'),
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webSecurity: true,
            allowRunningInsecureContent: false,
        },
        titleBarStyle: 'default',
    });

    mainWindow.on('ready-to-show', () => {
        mainWindow?.show();
        if (is.dev) mainWindow?.webContents.openDevTools();
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        // Handle OAuth and external links
        if (url.includes('supabase.co/auth') ||
            url.includes('accounts.google.com') ||
            url.includes('github.com/login') ||
            url.includes('oauth') ||
            url.includes('?code=') || url.includes('&code=')) {
            mainWindow?.loadURL(url);
            return { action: 'deny' };
        }

        shell.openExternal(url);
        return { action: 'deny' };
    });

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
    }
}

app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.orbitagent');

    app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window);
    });

    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

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
