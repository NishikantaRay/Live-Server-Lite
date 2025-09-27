import * as vscode from 'vscode';
import * as http from 'http';
import * as https from 'https';
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
  CertificateInfo
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
  getDefaultIgnorePatterns
} from './utils';

export class ServerManager implements LiveServerManager {
  private state: ServerState = {};
  private fileWatcher: FileWatcher;
  private notificationManager: NotificationManager;
  private browserManager: BrowserManager;
  private certificateManager: CertificateManager;
  private performanceMonitor?: any; // Will be injected

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
  setPerformanceMonitor(monitor: any): void {
    this.performanceMonitor = monitor;
  }

  /**
   * Start the live server with optional HTTPS support
   */
  async start(htmlUri?: vscode.Uri, options?: EnhancedServerOptions): Promise<ServerResponse> {
    if (this.state.server) {
      throw new Error('Server is already running');
    }

    try {
      const config = await this.createServerConfig(htmlUri, options);
      await this.startServer(config, options?.https);
      
      const serverInfo = this.getServerInfo();
      if (!serverInfo) {
        throw new Error('Server info not available after starting');
      }

      // Show success notification but don't handle actions automatically
      // Show success notification and handle user action
      const action = await this.notificationManager.showServerStarted(
        serverInfo.port, 
        serverInfo.localUrl
      );

      // Handle user's choice from notification
      if (action) {
        await this.handleNotificationAction(action, serverInfo, options);
      }

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
      
      // Show error notification
      if (error instanceof Error) {
        if (errorMessage.includes('Port') && errorMessage.includes('is already in use')) {
          const portMatch = errorMessage.match(/Port (\d+)/);
          const port = portMatch ? parseInt(portMatch[1]) : 3000;
          const suggestedPort = await this.findAvailablePort(port + 1);
          
          const action = await this.notificationManager.showPortInUse(port, suggestedPort);
          if (action === 'tryDifferentPort' && suggestedPort) {
            // Try starting with the suggested port
            const newOptions = { ...options, port: suggestedPort };
            return this.start(htmlUri, newOptions);
          }
        } else {
          await this.notificationManager.showServerError(error);
        }
      }
      
      throw new Error(`Failed to start server: ${errorMessage}`);
    }
  }

  /**
   * Stop the live server
   */
  async stop(): Promise<ServerResponse> {
    if (!this.state.server) {
      return {
        success: false,
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
    const stopResponse = await this.stop();
    if (!stopResponse.success) {
      return stopResponse;
    }
    
    // Wait a bit before restarting
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return this.start();
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
      requests: 0, // TODO: Implement request counting
      connections: this.state.connections?.size || 0,
      errors: 0, // TODO: Implement error counting
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

    if (!workspaceFolder) {
      throw new Error('No workspace folder found. Please open a folder or file first.');
    }

    // Determine root directory
    let rootDir: string;
    if (htmlUri) {
      const stat = await vscode.workspace.fs.stat(htmlUri);
      rootDir = (stat.type & vscode.FileType.Directory) 
        ? htmlUri.fsPath 
        : path.dirname(htmlUri.fsPath);
    } else {
      rootDir = workspaceFolder.uri.fsPath;
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
      host: options?.host || config.get<string>('host', 'localhost'),
      open: options?.open ?? config.get<boolean>('openBrowser', true),
      https: options?.https || config.get<boolean>('https', false),
      cors: options?.cors ?? config.get<boolean>('cors', true),
      verbose: options?.verbose ?? config.get<boolean>('verbose', false)
    };
  }  /**
   * Start the Express server with WebSocket support
   */
  private async startServer(config: ServerConfig, httpsOptions?: HTTPSOptions): Promise<void> {
    const app = express();
    
    // Middleware to inject WebSocket script into HTML responses
    app.use(async (req, res, next) => {
      const filePath = path.join(config.root, req.path === '/' ? config.defaultFile || 'index.html' : req.path);
      
      if (filePath.endsWith('.html') && await fileExists(filePath)) {
        try {
          const html = await readFileContent(filePath);
          const injectedHtml = injectWebSocketScript(html);
          res.setHeader('Content-Type', 'text/html');
          return res.send(injectedHtml);
        } catch (error) {
          console.error('Error reading HTML file:', error);
        }
      }
      next();
    });

    // Serve static files
    app.use(express.static(config.root));

    // Create server (HTTP or HTTPS based on options)
    let server;
    let isHttps = false;
    let certInfo: any = null;

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

        // Show warning for self-signed certificates
        if (certInfo.selfSigned && httpsOptions.warnOnSelfSigned !== false) {
          await this.notificationManager.showCertificateWarning(
            httpsOptions.domain || 'localhost',
            certInfo.certPath
          );
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
    this.state.certInfo = certInfo;

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

    // Show stopped notification
    if (port > 0) {
      this.notificationManager.showServerStopped(port);
    }
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
        await this.notificationManager.showServerError(error);
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
          server.close(() => {});
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