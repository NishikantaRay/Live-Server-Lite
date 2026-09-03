import * as vscode from 'vscode';
import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import * as WebSocket from 'ws';
import * as path from 'path';
import express from 'express';
import {
  LiveServerManager,
  ServerConfig,
  ServerInfo,
  ServerState,
  ServerResponse,
  ServerStats,
  ServerOptions,
  EnhancedServerOptions,
  HTTPSOptions,
  CertificateInfo,
  IPerformanceMonitor,
  RequestLogEntry,
  ProxyConfig
} from './types';
import { FileWatcher } from './fileWatcher';
import { NotificationManager } from './notificationManager';
import { BrowserManager } from './browserManager';
import { CertificateManager } from './certificateManager';
import {
  generateUrls,
  getRelativePath,
  fileExists,
  readFileContent,
  injectWebSocketScript,
  getDefaultIgnorePatterns,
  isHttpsEnabled,
  escapeHtml
} from './utils';

/**
 * Creates an express middleware that proxies requests to an upstream target.
 */
function createProxyHandler(proxyConfig: ProxyConfig) {
  return (req: express.Request, res: express.Response, next: express.NextFunction): void => {
    let targetUrl: URL;
    try {
      targetUrl = new URL(proxyConfig.target);
    } catch {
      console.error(`Invalid proxy target: ${proxyConfig.target}`);
      next();
      return;
    }

    const isSecure = targetUrl.protocol === 'https:';
    const transport = isSecure ? https : http;
    const port = targetUrl.port ? parseInt(targetUrl.port) : (isSecure ? 443 : 80);

    // Rebuild the path: strip the context prefix if changeOrigin is not desired
    const upstreamPath = req.url || '/';

    const options: http.RequestOptions & { rejectUnauthorized?: boolean } = {
      hostname: targetUrl.hostname,
      port,
      path: upstreamPath,
      method: req.method,
      headers: { ...req.headers, host: targetUrl.host },
      rejectUnauthorized: proxyConfig.secure !== false
    };

    const proxyReq = transport.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers as http.OutgoingHttpHeaders);
      proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
      console.error(`Proxy error [${proxyConfig.context} -> ${proxyConfig.target}]: ${err.message}`);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Bad Gateway', message: err.message });
      }
    });

    if (req.readable) {
      req.pipe(proxyReq, { end: true });
    } else {
      proxyReq.end();
    }
  };
}

export class ServerManager implements LiveServerManager {
  private state: ServerState = {};
  private fileWatcher: FileWatcher;
  private notificationManager: NotificationManager;
  private browserManager: BrowserManager;
  private certificateManager: CertificateManager;
  private performanceMonitor?: IPerformanceMonitor;
  private lastHtmlUri?: vscode.Uri;
  private lastOptions?: EnhancedServerOptions;
  private isStarting = false;
  private requestLogger?: (entry: RequestLogEntry) => void;

  constructor() {
    this.fileWatcher = new FileWatcher();
    this.notificationManager = new NotificationManager();
    this.browserManager = new BrowserManager();
    this.certificateManager = new CertificateManager();

    // Initialize notifications with default options
    this.notificationManager.initialize({
      enabled: true,
      showInStatusBar: true
    });
  }

  /**
   * Set performance monitor reference for server state notifications
   */
  setPerformanceMonitor(monitor: IPerformanceMonitor): void {
    this.performanceMonitor = monitor;
  }

  setRequestLogger(logger: (entry: RequestLogEntry) => void): void {
    this.requestLogger = logger;
  }

  /**
   * Start the live server with optional HTTPS support
   */
  async start(htmlUri?: vscode.Uri, options?: EnhancedServerOptions): Promise<ServerResponse> {
    if (this.state.server) {
      throw new Error('Server is already running');
    }

    if (this.isStarting) {
      return {
        success: false,
        message: 'Server is already starting',
        error: { code: 'STARTING', message: 'Server is already starting', timestamp: new Date() }
      };
    }

    this.isStarting = true;
    this.lastHtmlUri = htmlUri;
    this.lastOptions = options;

    try {
      const config = await this.createServerConfig(htmlUri, options);
      await this.startServer(config, options?.https);

      const serverInfo = this.getServerInfo();
      if (!serverInfo) {
        throw new Error('Server info not available after starting');
      }

      // Auto-open browser if configured (non-blocking)
      if (config.open) {
        this.browserManager.openBrowser(
          serverInfo.localUrl,
          options?.browserPath,
          options?.browserArgs
        ).catch(console.error);
      }

      // Show notification without blocking the server start response
      this.notificationManager.showServerStarted(serverInfo.port, serverInfo.localUrl)
        .then(action => {
          if (action) {
            this.handleNotificationAction(action, serverInfo, options).catch(console.error);
          }
        })
        .catch(console.error);

      // Notify performance monitor that server started
      if (this.performanceMonitor) {
        this.performanceMonitor.onServerStart();
      }

      return {
        success: true,
        message: `Server started successfully on ${options?.https?.enabled ? 'HTTPS' : 'HTTP'}`,
        data: serverInfo
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      // Show error notification (non-blocking)
      if (error instanceof Error) {
        if (errorMessage.includes('Port') && errorMessage.includes('is already in use')) {
          const portMatch = errorMessage.match(/Port (\d+)/);
          const port = portMatch ? parseInt(portMatch[1]) : 3000;
          const suggestedPort = await this.findAvailablePort(port + 1);

          this.notificationManager.showPortInUse(port, suggestedPort)
            .then(action => {
              if (action === 'tryDifferentPort' && suggestedPort) {
                const newOptions = { ...options, port: suggestedPort };
                this.start(htmlUri, newOptions).catch(console.error);
              }
            })
            .catch(console.error);
        } else {
          this.notificationManager.showServerError(error).catch(console.error);
        }
      }

      return {
        success: false,
        message: `Failed to start server: ${errorMessage}`,
        error: { code: 'START_ERROR', message: errorMessage, timestamp: new Date() }
      };
    } finally {
      this.isStarting = false;
    }
  }

  /**
   * Stop the live server
   */
  async stop(): Promise<ServerResponse> {
    if (!this.state.server) {
      return {
        success: true,
        message: 'Server is not running'
      };
    }

    try {
      // Stop file watcher first
      this.fileWatcher.stop();

      // Close WebSocket server
      if (this.state.webSocketServer) {
        this.state.webSocketServer.close();
        this.state.webSocketServer = undefined;
      }

      // Close HTTP/HTTPS server
      return new Promise<ServerResponse>((resolve) => {
        const currentPort = this.state.config?.port || 0;
        this.state.server!.close(() => {
          this.state = {};

          // Notify performance monitor that server stopped
          if (this.performanceMonitor) {
            this.performanceMonitor.onServerStop();
          }

          // Show stop notification
          this.notificationManager.showServerStopped(currentPort);

          resolve({
            success: true,
            message: 'Server stopped successfully'
          });
        });
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        message: `Failed to stop server: ${errorMessage}`
      };
    }
  }

  /**
   * Restart the live server
   */
  async restart(): Promise<ServerResponse> {
    const htmlUri = this.lastHtmlUri;
    const options = this.lastOptions;

    const stopResponse = await this.stop();
    if (!stopResponse.success) {
      return stopResponse;
    }

    // Wait a bit before restarting
    await new Promise(resolve => setTimeout(resolve, 100));

    return this.start(htmlUri, options);
  }

  /**
   * Check if the server is currently running
   */
  isRunning(): boolean {
    return this.state.server !== undefined;
  }

  /**
   * Get current server information
   */
  getServerInfo(): ServerInfo | null {
    if (!this.state.config || !this.isRunning()) {
      return null;
    }

    const { localUrl, networkUrl } = generateUrls(
      this.state.config.port,
      this.state.config.defaultFile || '',
      this.state.isHttps || false
    );

    return {
      port: this.state.config.port,
      localUrl,
      networkUrl,
      isRunning: true,
      startTime: this.state.startTime,
      root: this.state.config.root
    };
  }

  /**
   * Get server statistics
   */
  getServerStats(): ServerStats | null {
    if (!this.isRunning() || !this.state.startTime) {
      return null;
    }

    return {
      uptime: Date.now() - this.state.startTime.getTime(),
      requests: this.state.requestCount ?? 0,
      connections: this.state.connections?.size || 0,
      errors: 0,
      lastActivity: new Date()
    };
  }

  /**
   * Update server configuration
   */
  updateConfig(config: Partial<ServerConfig>): void {
    if (this.state.config) {
      this.state.config = { ...this.state.config, ...config };
    }
  }

  /**
   * Create server configuration
   */
  private async createServerConfig(htmlUri?: vscode.Uri, options?: EnhancedServerOptions): Promise<ServerConfig> {
    const config = vscode.workspace.getConfiguration('liveServerLite');

    // Get current workspace folder
    const workspaceFolder = htmlUri
      ? vscode.workspace.getWorkspaceFolder(htmlUri)
      : vscode.workspace.workspaceFolders?.[0];

    if (!workspaceFolder && !htmlUri) {
      throw new Error('No workspace folder found. Please open a folder or file first.');
    }

    // Determine root directory
    let rootDir: string;
    if (htmlUri) {
      // When a specific HTML file is provided, use its directory as root
      // (even if the file isn't inside an open workspace)
      try {
        const stat = await vscode.workspace.fs.stat(htmlUri);
        rootDir = (stat.type & vscode.FileType.Directory)
          ? htmlUri.fsPath
          : path.dirname(htmlUri.fsPath);
      } catch {
        rootDir = path.dirname(htmlUri.fsPath);
      }
    } else {
      rootDir = workspaceFolder!.uri.fsPath;
    }

    // Validate the root directory exists
    const rootExists = await fs.promises.access(rootDir).then(() => true).catch(() => false);
    if (!rootExists) {
      throw new Error(`Workspace root directory does not exist: ${rootDir}`);
    }

    // When a specific HTML file is provided, include it as the default file in the URL
    let defaultFile: string | undefined;
    if (htmlUri) {
      try {
        const stat = await vscode.workspace.fs.stat(htmlUri);
        if (!(stat.type & vscode.FileType.Directory)) {
          defaultFile = path.basename(htmlUri.fsPath);
        }
      } catch {
        // If we can't stat, assume it's a file
        defaultFile = path.basename(htmlUri.fsPath);
      }
    }

    // Find available port
    const requestedPort = options?.port || config.get<number>('port', 3000);
    const port = await this.findAvailablePort(requestedPort);

    if (!port) {
      throw new Error('Unable to find available port');
    }

    return {
      port,
      root: rootDir,
      defaultFile,
      host: options?.host || config.get<string>('host', 'localhost'),
      open: options?.open ?? config.get<boolean>('openBrowser', true),
      https: options?.https || isHttpsEnabled(config),
      cors: options?.cors ?? config.get<boolean>('cors', true),
      verbose: options?.verbose ?? config.get<boolean>('verbose', false),
      spa: options?.spa ?? config.get<boolean>('spa', false),
      proxy: options?.proxy || config.get<ProxyConfig[]>('proxy', [])
    };
  }  /**
   * Start the Express server with WebSocket support
   */
  private async startServer(config: ServerConfig, httpsOptions?: HTTPSOptions): Promise<void> {
    const app = express();

    // Request counter + request logger middleware
    app.use((req, res, next) => {
      if (this.state.requestCount !== undefined) {
        this.state.requestCount++;
      }
      if (this.requestLogger) {
        const start = Date.now();
        const timestamp = new Date();
        res.on('finish', () => {
          this.requestLogger!({
            method: req.method,
            path: req.url,
            status: res.statusCode,
            duration: Date.now() - start,
            timestamp
          });
        });
      }
      next();
    });

    // Proxy middleware — forward matching paths to upstream targets
    if (config.proxy && config.proxy.length > 0) {
      for (const proxyEntry of config.proxy) {
        app.use(proxyEntry.context, createProxyHandler(proxyEntry));
      }
    }

    const resolvedRoot = path.resolve(config.root);

    // Resolve a request path to a file on disk, refusing anything that escapes
    // the served root (e.g. "/../../etc/passwd" or an encoded equivalent).
    const resolveWithinRoot = (urlPath: string): string | null => {
      let decoded: string;
      try {
        decoded = decodeURIComponent(urlPath);
      } catch {
        return null;
      }
      const candidate = path.resolve(resolvedRoot, '.' + path.posix.normalize(decoded));
      if (candidate !== resolvedRoot && !candidate.startsWith(resolvedRoot + path.sep)) {
        return null;
      }
      return candidate;
    };

    // Index files tried when a directory is requested. `index.htm` and the
    // capitalised spellings matter on case-sensitive filesystems.
    const indexCandidates = [
      'index.html',
      'index.htm',
      'Index.html',
      'default.html'
    ];

    /**
     * Find the first existing index file inside `dir`, if any.
     *
     * `defaultFile` (set when the user launches a specific page) applies only
     * to the served root: it names the page to open, not a per-directory index,
     * so `/docs/` must still resolve `docs/index.html` rather than the launched
     * page's basename.
     */
    const findIndexFile = async (dir: string): Promise<string | null> => {
      const candidates = dir === resolvedRoot && config.defaultFile
        ? [config.defaultFile, ...indexCandidates]
        : indexCandidates;
      for (const candidate of candidates) {
        const full = path.join(dir, candidate);
        if (await fileExists(full)) {
          return full;
        }
      }
      return null;
    };

    const isDirectory = async (target: string): Promise<boolean> => {
      try {
        return (await fs.promises.stat(target)).isDirectory();
      } catch {
        return false;
      }
    };

    // Serve HTML with the live-reload script injected. Directories resolve to
    // their index file here so that a project whose entry point is not a
    // root-level index.html still loads instead of falling through to a
    // "Cannot GET /" from express.
    app.use(async (req, res, next) => {
      const target = resolveWithinRoot(req.path);
      if (!target) {
        res.status(403).send('Forbidden');
        return;
      }

      let filePath: string | null = null;
      if (await isDirectory(target)) {
        filePath = await findIndexFile(target);
      } else if (/\.html?$/i.test(target) && await fileExists(target)) {
        filePath = target;
      }

      if (filePath) {
        try {
          const html = await readFileContent(filePath);
          const injectedHtml = injectWebSocketScript(html, this.state.isHttps === true);
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.send(injectedHtml);
          return;
        } catch (error) {
          console.error('Error reading HTML file:', error);
        }
      }
      next();
    });

    // Serve static files
    app.use(express.static(config.root));

    // SPA fallback: serve index.html for any unmatched path.
    //
    // Only GET/HEAD navigations qualify. Without these guards a missing bundle
    // returns 200 + HTML, which surfaces in the browser as "Unexpected token
    // '<'" rather than a 404, and non-GET requests that no proxy claimed would
    // answer with the app shell.
    if (config.spa) {
      app.use(async (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          next();
          return;
        }
        if (!req.accepts('html') || path.posix.extname(req.path)) {
          next();
          return;
        }
        const fallbackFile = await findIndexFile(resolvedRoot);
        if (!fallbackFile) {
          next();
          return;
        }
        try {
          const html = await readFileContent(fallbackFile);
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.send(injectWebSocketScript(html, this.state.isHttps === true));
        } catch {
          next();
        }
      });
    }

    // Directory listing fallback: when no index file is found, show a helpful
    // file listing for the requested directory instead of express's default
    // "Cannot GET /" page.
    app.use(async (req, res) => {
      const target = resolveWithinRoot(req.path);

      if (target && await isDirectory(target)) {
        try {
          const entries = await fs.promises.readdir(target, { withFileTypes: true });
          const base = req.path.endsWith('/') ? req.path : req.path + '/';
          const items = entries
            .filter(e => !e.name.startsWith('.'))
            .sort((a, b) => {
              if (a.isDirectory() !== b.isDirectory()) { return a.isDirectory() ? -1 : 1; }
              return a.name.localeCompare(b.name);
            })
            .map(e => {
              const icon = e.isDirectory() ? '📁' : '📄';
              const suffix = e.isDirectory() ? '/' : '';
              const href = escapeHtml(base + encodeURIComponent(e.name) + suffix);
              return `<li>${icon} <a href="${href}">${escapeHtml(e.name)}${suffix}</a></li>`;
            })
            .join('\n');
          const parentLink = req.path === '/'
            ? ''
            : `<p><a href="${escapeHtml(path.posix.dirname(base.replace(/\/$/, '')) || '/')}">⬆️ Parent directory</a></p>`;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.send(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Live Server – ${escapeHtml(path.basename(target) || '/')}</title>
<style>body{font-family:sans-serif;max-width:800px;margin:2em auto;padding:0 1em}ul{list-style:none;padding:0}li{padding:.4em 0;font-size:1.1em}a{text-decoration:none;color:#0066cc}a:hover{text-decoration:underline}h2{color:#333}code{background:#f4f4f4;padding:.1em .3em;border-radius:3px}</style>
</head><body>
<h2>📂 ${escapeHtml(base)}</h2>
<p>No index file found in this folder. Here is what it contains:</p>
${parentLink}
<ul>${items}</ul>
</body></html>`);
          return;
        } catch {
          res.status(500).send('Internal Server Error');
          return;
        }
      }

      res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(`<html><body style="font-family:sans-serif;padding:2em"><h2>404 Not Found</h2><p>The file <code>${escapeHtml(req.path)}</code> was not found.</p><p><a href="/">Back to root</a></p></body></html>`);
    });

    // Create server (HTTP or HTTPS based on options)
    let server;
    let isHttps = false;
    let certInfo: CertificateInfo | null = null;

    if (httpsOptions?.enabled && this.certificateManager) {
      // HTTPS server
      try {
        certInfo = await this.certificateManager.getCertificates({
          domain: httpsOptions.domain || 'localhost',
          certPath: httpsOptions.certPath,
          keyPath: httpsOptions.keyPath,
          generateIfMissing: httpsOptions.autoGenerateCert ?? true
        });

        if (!certInfo) {
          throw new Error('Failed to obtain HTTPS certificates');
        }

        // Show warning for self-signed certificates (non-blocking)
        if (certInfo.isSelfSigned && httpsOptions.warnOnSelfSigned !== false) {
          this.notificationManager.showCertificateWarning(
            httpsOptions.domain || 'localhost',
            certInfo.certPath ?? ''
          ).catch(console.error);
        }

        const httpsModule = await import('https');

        server = httpsModule.createServer({
          key: certInfo.key,
          cert: certInfo.cert
        }, app);

        isHttps = true;
        console.log(`HTTPS server configured with certificate for domain: ${certInfo.domain}`);
      } catch (error) {
        console.error('Failed to setup HTTPS server, falling back to HTTP:', error);
        server = http.createServer(app);
        isHttps = false;
      }
    } else {
      // HTTP server
      server = http.createServer(app);
      isHttps = false;
    }

    this.state.server = server;
    this.state.webSocketServer = new WebSocket.Server({ server: this.state.server });
    this.state.config = config;
    this.state.startTime = new Date();
    this.state.connections = new Set();
    this.state.isHttps = isHttps;
    this.state.certInfo = certInfo ?? undefined;
    this.state.requestCount = 0;

    // Track WebSocket connections
    this.state.webSocketServer.on('connection', (ws: WebSocket) => {
      this.state.connections?.add(ws as any);
      ws.on('close', () => {
        this.state.connections?.delete(ws as any);
      });
    });

    // Start file watcher with optimized settings for large projects
    const watcherOptions = {
      batchEvents: true,
      batchDelay: 250,
      useNativeWatcher: true,
      largeProjectOptimization: true
    };
    this.fileWatcher.start(config.root, config.ignored || [], watcherOptions);
    this.fileWatcher.onChange((event) => {
      console.log(`File changed: ${event.path}`);
      this.broadcastReload();
    });

    // Start listening
    return new Promise((resolve, reject) => {
      if (!this.state.server) {
        reject(new Error('Server not initialized'));
        return;
      }

      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.cleanup();
          reject(new Error('Server startup timeout - failed to start within 5 seconds'));
        }
      }, 5000);

      this.state.server.listen(config.port, config.host, () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          const protocol = isHttps ? 'https' : 'http';
          console.log(`${protocol.toUpperCase()} server running at ${protocol}://${config.host}:${config.port}`);
          resolve();
        }
      });

      this.state.server.on('error', (error: NodeJS.ErrnoException) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          this.cleanup();

          if (error.code === 'EADDRINUSE') {
            reject(new Error(`Port ${config.port} is already in use`));
          } else {
            reject(new Error(`Failed to start server: ${error.message}`));
          }
        }
      });
    });
  }

  /**
   * Broadcast reload message to all connected WebSocket clients
   */
  private broadcastReload(): void {
    if (!this.state.webSocketServer) {
      return;
    }

    this.state.webSocketServer.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send('reload');
      }
    });
  }

  /**
   * Clean up server resources
   */
  private cleanup(): void {
    const port = this.state.config?.port || 0;

    this.fileWatcher.stop();

    if (this.state.webSocketServer) {
      this.state.webSocketServer.close();
      this.state.webSocketServer = undefined;
    }

    this.state.server = undefined;
    this.state.config = undefined;
    this.state.startTime = undefined;
    this.state.connections?.clear();
    this.state.connections = undefined;
    this.state.requestCount = undefined;
  }

  /**
   * Handle notification actions from user interaction
   */
  private async handleNotificationAction(
    action: string,
    serverInfo: ServerInfo,
    options?: ServerOptions
  ): Promise<void> {
    try {
      switch (action) {
        case 'openBrowser':
          await this.browserManager.openBrowser(
            serverInfo.localUrl,
            options?.browserPath,
            options?.browserArgs
          );
          break;
        case 'copyUrl':
          await vscode.env.clipboard.writeText(serverInfo.localUrl);
          vscode.window.showInformationMessage('📋 URL copied to clipboard!');
          break;
        case 'showStatusBar':
          // This would be handled by the status bar manager
          break;
        case 'restart':
          await this.restart();
          break;
        case 'tryDifferentPort':
          // This is handled in the start method
          break;
        default:
          console.log(`Unhandled notification action: ${action}`);
      }
    } catch (error) {
      console.error('Error handling notification action:', error);
      if (error instanceof Error) {
        this.notificationManager.showServerError(error).catch(console.error);
      }
    }
  }

  /**
   * Find an available port starting from the given port number
   */
  private async findAvailablePort(startPort: number, maxAttempts = 10): Promise<number | undefined> {
    for (let port = startPort; port < startPort + maxAttempts; port++) {
      if (await this.isPortAvailable(port)) {
        return port;
      }
    }
    return undefined;
  }

  /**
   * Check if a port is available
   */
  private async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = http.createServer();

      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          server.close(() => { });
          resolve(false);
        }
      }, 1000);

      server.on('error', () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve(false);
        }
      });

      server.listen(port, '127.0.0.1', () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          server.close(() => {
            resolve(true);
          });
        }
      });
    });
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    if (this.isRunning()) {
      this.stop();
    }
  }
}