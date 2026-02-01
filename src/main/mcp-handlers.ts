/**
 * MCP Server IPC Handlers
 *
 * Handles MCP server lifecycle management in the main process.
 * - Registry persistence
 * - Process spawning/management (HTTP mode)
 * - MCP client connections via SSE transport
 */

import { IpcMain, app } from 'electron';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ChildProcess, spawn } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import * as net from 'net';

// ============================================================================
// Types (mirrored from renderer types for main process)
// ============================================================================

type MCPServerStatus =
    | 'NOT_INSTALLED'
    | 'INSTALLED'
    | 'NOT_ACTIVATED'
    | 'ACTIVATED'
    | 'CONNECTED'
    | 'DISCONNECTED';

interface MCPServerConfig {
    id: string;
    name: string;
    description: string;
    package: string;
    command: string;
    args?: string[];
    icon?: string;
    category?: string;
    port?: number;
}

interface MCPServerInstance extends MCPServerConfig {
    status: MCPServerStatus;
    url?: string;
    toolCount?: number;
    lastError?: string;
    activatedAt?: string;
    connectedAt?: string;
    pid?: number;
}

interface MCPRegistry {
    servers: MCPServerInstance[];
    version: number;
}

interface MCPTool {
    name: string;
    description?: string;
    inputSchema?: Record<string, unknown>;
}

// ============================================================================
// Managed Server Configs
// ============================================================================

const MANAGED_MCP_SERVERS: MCPServerConfig[] = [
    {
        id: 'playwright',
        name: 'Playwright',
        description: 'Browser automation and web scraping tools',
        package: '@playwright/mcp',
        command: 'npx',
        args: ['@playwright/mcp@latest', '--shared-browser-context', '--isolated', '--port'],  // Port will be appended
        icon: 'browser',
        category: 'browser',
    },
];

// ============================================================================
// Helpers
// ============================================================================

function findFreePort(startPort: number): Promise<number> {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.listen(startPort, () => {
            const port = (server.address() as net.AddressInfo).port;
            server.close(() => resolve(port));
        });
        server.on('error', (err: any) => {
            if (err.code === 'EADDRINUSE') {
                resolve(findFreePort(startPort + 1));
            } else {
                reject(err);
            }
        });
    });
}

// ============================================================================
// Storage
// ============================================================================

function getDataDir(): string {
    const dataDir = join(app.getPath('userData'), 'orbit-agent-data');
    if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true });
    }
    return dataDir;
}

function getMCPRegistryPath(): string {
    return join(getDataDir(), 'mcp-registry.json');
}

function loadRegistry(): MCPRegistry {
    const path = getMCPRegistryPath();
    if (!existsSync(path)) {
        return { servers: [], version: 1 };
    }
    try {
        const content = readFileSync(path, 'utf-8');
        return JSON.parse(content) as MCPRegistry;
    } catch (error) {
        console.error('[MCP] Failed to load registry:', error);
        return { servers: [], version: 1 };
    }
}

function saveRegistry(registry: MCPRegistry): void {
    const path = getMCPRegistryPath();
    writeFileSync(path, JSON.stringify(registry, null, 2));
}

// ============================================================================
// Process Management
// ============================================================================

// Track running MCP server processes
const runningProcesses = new Map<string, ChildProcess>();
// Track MCP clients for each server
const mcpClients = new Map<string, Client>();
// Track server ports
const serverPorts = new Map<string, number>();

/**
 * Wait for server to be ready by checking if it responds to any request
 */
async function waitForServerReady(port: number, maxAttempts = 60): Promise<void> {
    const url = `http://localhost:${port}/mcp`;
    console.log(`[MCP] Waiting for server on port ${port}...`);

    for (let i = 0; i < maxAttempts; i++) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2000);

            // Just try GET - server will respond even if it rejects the method
            const response = await fetch(url, {
                method: 'GET',
                signal: controller.signal,
            });

            clearTimeout(timeout);

            // Any response means server is up (even 404/405)
            console.log(`[MCP] Server ready on port ${port} after ${i + 1} attempts (status: ${response.status})`);
            return;
        } catch (err: unknown) {
            // Connection refused or timeout - server not ready yet
            console.log(`[MCP] Waiting for server... attempt ${i + 1}/${maxAttempts}`);
        }

        await new Promise(resolve => setTimeout(resolve, 500));
    }

    throw new Error(`Server did not become ready on port ${port} after ${maxAttempts} attempts`);
}

/**
 * Start an MCP server process with HTTP transport
 */
async function startServerProcess(server: MCPServerInstance): Promise<{ pid: number; port: number }> {
    console.log('[MCP] Starting server process:', server.id);

    // Get a free port
    const port = await findFreePort(9500);
    serverPorts.set(server.id, port);

    // Build command args with port
    const args = [...(server.args || []), port.toString()];

    console.log('[MCP] Spawning:', server.command, args.join(' '));

    // Spawn the process
    const childProcess = spawn(server.command, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
        env: { ...globalThis.process.env },
        detached: false,
    });

    if (!childProcess.pid) {
        throw new Error('Failed to spawn MCP server process');
    }

    // Track the process
    runningProcesses.set(server.id, childProcess);

    // Handle process output for debugging
    childProcess.stdout?.on('data', (data) => {
        console.log(`[MCP] ${server.id} stdout:`, data.toString().trim());
    });

    childProcess.stderr?.on('data', (data) => {
        console.error(`[MCP] ${server.id} stderr:`, data.toString().trim());
    });

    // Handle process exit
    childProcess.on('exit', (code) => {
        console.log(`[MCP] Server ${server.id} exited with code ${code}`);
        runningProcesses.delete(server.id);
        mcpClients.delete(server.id);
        serverPorts.delete(server.id);
    });

    childProcess.on('error', (error) => {
        console.error(`[MCP] Server ${server.id} error:`, error);
    });

    console.log('[MCP] Server process spawned, PID:', childProcess.pid, 'Port:', port);

    // Wait for server to be ready
    await waitForServerReady(port);

    return { pid: childProcess.pid, port };
}

/**
 * Connect to a running MCP server via HTTP transport
 */
async function connectToServer(serverId: string, port: number): Promise<Client> {
    const url = `http://localhost:${port}/mcp`;
    console.log('[MCP] Connecting to server at:', url);

    const transport = new StreamableHTTPClientTransport(new URL(url));

    const client = new Client({
        name: 'orbit-agent',
        version: '1.0.0',
    });

    await client.connect(transport);
    mcpClients.set(serverId, client);

    console.log('[MCP] Connected to server:', serverId);
    return client;
}

/**
 * Stop an MCP server process
 */
function stopServerProcess(serverId: string): void {
    const process = runningProcesses.get(serverId);
    if (process) {
        console.log('[MCP] Stopping server process:', serverId);
        process.kill();
        runningProcesses.delete(serverId);
    }

    const client = mcpClients.get(serverId);
    if (client) {
        client.close();
        mcpClients.delete(serverId);
    }

    serverPorts.delete(serverId);
}

/**
 * Get tools from an MCP server
 */
async function getServerTools(serverId: string): Promise<MCPTool[]> {
    const client = mcpClients.get(serverId);
    if (!client) {
        throw new Error(`Server ${serverId} is not connected`);
    }

    const result = await client.listTools();
    return result.tools as MCPTool[];
}

// ============================================================================
// Internal Exports (for runtime)
// ============================================================================

export function getMCPClient(serverId: string): Client | undefined {
    return mcpClients.get(serverId);
}

export function getServerUrl(serverId: string): string | undefined {
    const registry = loadRegistry();
    const server = registry.servers.find(s => s.id === serverId);
    return server?.url;
}

// ============================================================================
// IPC Handler Registration
// ============================================================================

export function registerMCPHandlers(ipcMain: IpcMain): void {
    console.log('[MCP] Registering IPC handlers...');

    // ========================================
    // Registry Operations
    // ========================================

    /**
     * Get the full registry with all servers and their statuses
     */
    ipcMain.handle('mcp:registry:get', async () => {
        console.log('[MCP] mcp:registry:get called');
        return loadRegistry();
    });

    /**
     * Get list of all managed server configs (available to install)
     */
    ipcMain.handle('mcp:managed:list', async () => {
        console.log('[MCP] mcp:managed:list called');
        return MANAGED_MCP_SERVERS;
    });

    /**
     * Add a server to the registry (install)
     */
    ipcMain.handle('mcp:server:install', async (_event, config: MCPServerConfig) => {
        console.log('[MCP] mcp:server:install called:', config.id);

        const registry = loadRegistry();

        // Check if already installed
        const existing = registry.servers.find(s => s.id === config.id);
        if (existing) {
            console.log('[MCP] Server already installed:', config.id);
            return existing;
        }

        // Create new instance with NOT_ACTIVATED status
        const instance: MCPServerInstance = {
            ...config,
            status: 'NOT_ACTIVATED',
        };

        registry.servers.push(instance);
        saveRegistry(registry);

        console.log('[MCP] Server installed:', config.id);
        return instance;
    });

    /**
     * Remove a server from the registry (uninstall)
     */
    ipcMain.handle('mcp:server:uninstall', async (_event, serverId: string) => {
        console.log('[MCP] mcp:server:uninstall called:', serverId);

        // Stop process if running
        stopServerProcess(serverId);

        const registry = loadRegistry();
        registry.servers = registry.servers.filter(s => s.id !== serverId);
        saveRegistry(registry);

        console.log('[MCP] Server uninstalled:', serverId);
        return { success: true };
    });

    // ========================================
    // Server Lifecycle
    // ========================================

    /**
     * Activate a server (start the process)
     */
    ipcMain.handle('mcp:server:activate', async (_event, serverId: string) => {
        console.log('[MCP] mcp:server:activate called:', serverId);

        const registry = loadRegistry();
        const server = registry.servers.find(s => s.id === serverId);

        if (!server) {
            throw new Error(`Server ${serverId} not found in registry`);
        }

        // Merge in latest managed config to get updated args/command/package
        const managedConfig = MANAGED_MCP_SERVERS.find(m => m.id === serverId);
        if (managedConfig) {
            server.command = managedConfig.command;
            server.args = managedConfig.args;
            server.package = managedConfig.package;
        }

        // Just mark as activated - don't start process or connect
        // Connection happens when user clicks to view tools
        server.status = 'ACTIVATED';
        server.activatedAt = new Date().toISOString();
        server.lastError = undefined;
        saveRegistry(registry);

        console.log('[MCP] Server activated (not connected yet):', serverId);
        return server;
    });

    /**
     * Deactivate a server (stop the process)
     */
    ipcMain.handle('mcp:server:deactivate', async (_event, serverId: string) => {
        console.log('[MCP] mcp:server:deactivate called:', serverId);

        stopServerProcess(serverId);

        const registry = loadRegistry();
        const server = registry.servers.find(s => s.id === serverId);

        if (server) {
            server.status = 'NOT_ACTIVATED';
            server.pid = undefined;
            server.url = undefined;
            saveRegistry(registry);
        }

        console.log('[MCP] Server deactivated:', serverId);
        return server;
    });

    /**
     * Connect to an activated server and fetch tools
     */
    ipcMain.handle('mcp:server:connect', async (_event, serverId: string) => {
        console.log('[MCP] mcp:server:connect called:', serverId);

        const registry = loadRegistry();
        const server = registry.servers.find(s => s.id === serverId);

        if (!server) {
            throw new Error(`Server ${serverId} not found in registry`);
        }

        // If already connected, just get tools
        if (mcpClients.has(serverId)) {
            const tools = await getServerTools(serverId);
            return { server, tools };
        }

        // Merge in latest managed config
        const managedConfig = MANAGED_MCP_SERVERS.find(m => m.id === serverId);
        if (managedConfig) {
            server.command = managedConfig.command;
            server.args = managedConfig.args;
            server.package = managedConfig.package;
        }

        // Start server process and connect
        // This handles ACTIVATED, NOT_ACTIVATED, or any state where we're not connected
        try {
            console.log('[MCP] Starting server process for connection...');
            const { pid, port } = await startServerProcess(server);
            await connectToServer(serverId, port);

            server.status = 'CONNECTED';
            server.pid = pid;
            server.url = `http://localhost:${port}/mcp`;
            server.connectedAt = new Date().toISOString();
            server.lastError = undefined;
        } catch (error) {
            server.status = 'DISCONNECTED';
            server.lastError = error instanceof Error ? error.message : 'Unknown error';
            saveRegistry(registry);
            throw error;
        }

        try {
            const tools = await getServerTools(serverId);
            server.toolCount = tools.length;
            saveRegistry(registry);

            console.log('[MCP] Server connected with', tools.length, 'tools');
            return { server, tools };
        } catch (error) {
            server.status = 'DISCONNECTED';
            server.lastError = error instanceof Error ? error.message : 'Unknown error';
            saveRegistry(registry);
            throw error;
        }
    });

    /**
     * Get tools from a connected server
     */
    ipcMain.handle('mcp:server:tools', async (_event, serverId: string) => {
        console.log('[MCP] mcp:server:tools called:', serverId);

        if (!mcpClients.has(serverId)) {
            throw new Error(`Server ${serverId} is not connected`);
        }

        return getServerTools(serverId);
    });

    /**
     * Get status of a specific server
     */
    ipcMain.handle('mcp:server:status', async (_event, serverId: string) => {
        console.log('[MCP] mcp:server:status called:', serverId);

        const registry = loadRegistry();
        const server = registry.servers.find(s => s.id === serverId);

        return server || null;
    });

    // ========================================
    // Cleanup on app quit
    // ========================================

    app.on('before-quit', () => {
        console.log('[MCP] Cleaning up server processes...');
        for (const [serverId] of runningProcesses) {
            stopServerProcess(serverId);
        }
    });
}
