import * as vscode from 'vscode';
import * as http from 'http';
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
  ServerOptions
} from './types';
import { FileWatcher } from './fileWatcher';
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

  constructor() {
    this.fileWatcher = new FileWatcher();
  }

  /**
   * Start the live server
   */
  async start(htmlUri?: vscode.Uri, options?: ServerOptions): Promise<ServerResponse> {
    if (this.state.server) {
      throw new Error('Server is already running');
    }

    try {
      const config = await this.createServerConfig(htmlUri);
      await this.startServer(config);
      
      const serverInfo = this.getServerInfo();
      
      return {
        success: true,
        message: 'Server started successfully',
        data: serverInfo || undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to start server: ${errorMessage}`);
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

    return new Promise((resolve) => {
      if (!this.state.server) {
        resolve({
          success: true,
          message: 'Server is not running'
        });
        return;
      }

      this.state.server.close(() => {
        this.cleanup();
        resolve({
          success: true,
          message: 'Server stopped successfully'
        });
      });
    });
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

    const { localUrl, networkUrl } = generateUrls(this.state.config.port, this.state.config.defaultFile);
    
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
  private async createServerConfig(htmlUri?: vscode.Uri): Promise<ServerConfig> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    
    if (!workspaceFolders) {
      throw new Error('No workspace folder is open');
    }

    const root = workspaceFolders[0].uri.fsPath;
    let defaultFile = '/index.html';

    if (htmlUri) {
      defaultFile = getRelativePath(root, htmlUri.fsPath);
    }

    return {
      port: 5500, // TODO: Make this configurable
      host: '0.0.0.0',
      root,
      defaultFile,
      ignored: getDefaultIgnorePatterns()
    };
  }

  /**
   * Start the Express server with WebSocket support
   */
  private async startServer(config: ServerConfig): Promise<void> {
    const app = express();
    
    // Middleware to inject WebSocket script into HTML responses
    app.use(async (req, res, next) => {
      const filePath = path.join(config.root, req.path === '/' ? config.defaultFile : req.path);
      
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

    // Create HTTP server and WebSocket server
    this.state.server = http.createServer(app);
    this.state.webSocketServer = new WebSocket.Server({ server: this.state.server });
    this.state.config = config;
    this.state.startTime = new Date();
    this.state.connections = new Set();

    // Track WebSocket connections
    this.state.webSocketServer.on('connection', (ws: WebSocket) => {
      this.state.connections?.add(ws as any);
      ws.on('close', () => {
        this.state.connections?.delete(ws as any);
      });
    });

    // Start file watcher
    this.fileWatcher.start(config.root, config.ignored);
    this.fileWatcher.onFileChange((event) => {
      console.log(`File changed: ${event.path}`);
      this.broadcastReload();
    });

    // Start listening
    return new Promise((resolve, reject) => {
      if (!this.state.server) {
        reject(new Error('Server not initialized'));
        return;
      }

      this.state.server.listen(config.port, config.host, () => {
        resolve();
      });

      this.state.server.on('error', (error: NodeJS.ErrnoException) => {
        this.cleanup();
        
        if (error.code === 'EADDRINUSE') {
          reject(new Error(`Port ${config.port} is already in use`));
        } else {
          reject(new Error(`Failed to start server: ${error.message}`));
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
    this.fileWatcher.stop();
    
    if (this.state.webSocketServer) {
      this.state.webSocketServer.close();
      this.state.webSocketServer = undefined;
    }
    
    this.state.server = undefined;
    this.state.config = undefined;
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