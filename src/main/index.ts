import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { is, electronApp, optimizer } from '@electron-toolkit/utils';
import { registerLocalAgentHandlers } from './ipc-handlers';
import { registerMCPHandlers } from './mcp-handlers';
import { config as loadDotenv } from 'dotenv';

// Load environment variables from .env file
// This allows API keys to be set in .env instead of system env vars
loadDotenv();

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Global references
let mainWindow: BrowserWindow | null = null;

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

        // Register MCP server IPC handlers
        registerMCPHandlers(ipcMain);

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

// IPC Handlers
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('is-electron', () => true);
ipcMain.handle('open-external', (_event, url: string) => shell.openExternal(url));
