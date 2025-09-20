import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as net from 'net';
import * as vscode from 'vscode';
import { TestContext, TestFile, MockServerConfig, ServerConfig } from '../types';

/**
 * Test utilities for Live Server Lite extension testing
 */
export class TestHelper {
  private static tempDirs: string[] = [];
  private static usedPorts: Set<number> = new Set();

  /**
   * Create a test server config with dynamic port
   */
  static async createTestServerConfig(overrides: Partial<ServerConfig> = {}): Promise<ServerConfig> {
    const tempDir = await this.createTempDir();
    const port = await this.getAvailablePort();
    
    return {
      port,
      root: tempDir,
      host: 'localhost',
      defaultFile: 'index.html',
      ignored: ['node_modules/**', '.git/**'],
      ...overrides
    };
  }

  /**
   * Create temporary directory with proper cleanup tracking
   */
  static async createTempDir(): Promise<string> {
    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'live-server-test-'));
    this.tempDirs.push(tempDir);
    return tempDir;
  }

  /**
   * Create a temporary test workspace
   */
  static async createTestWorkspace(files: TestFile[] = []): Promise<TestContext> {
    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'live-server-test-'));
    this.tempDirs.push(tempDir);

    const testFiles: string[] = [];

    // Create test files
    for (const file of files) {
      const filePath = path.join(tempDir, file.path);
      const dirPath = path.dirname(filePath);

      // Ensure directory exists
      await fs.promises.mkdir(dirPath, { recursive: true });
      
      // Write file content
      await fs.promises.writeFile(filePath, file.content, file.encoding || 'utf8');
      testFiles.push(filePath);
    }

    return {
      workspaceRoot: tempDir,
      tempDir,
      testFiles
    };
  }

  /**
   * Create default HTML test files
   */
  static getDefaultTestFiles(): TestFile[] {
    return [
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html>
<head>
    <title>Test Page</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <h1>Live Server Test</h1>
    <p>This is a test page.</p>
    <script src="script.js"></script>
</body>
</html>`
      },
      {
        path: 'style.css',
        content: `body {
    font-family: Arial, sans-serif;
    background-color: #f0f0f0;
    margin: 0;
    padding: 20px;
}

h1 {
    color: #333;
    text-align: center;
}`
      },
      {
        path: 'script.js',
        content: `console.log('Live Server Test Script Loaded');

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded');
});`
      },
      {
        path: 'about.html',
        content: `<!DOCTYPE html>
<html>
<head>
    <title>About - Test Page</title>
</head>
<body>
    <h1>About</h1>
    <p>This is the about page.</p>
    <a href="index.html">Back to Home</a>
</body>
</html>`
      },
      {
        path: 'assets/image.svg',
        content: `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
    <circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="red" />
</svg>`
      }
    ];
  }

  /**
   * Clean up temporary test directories
   */
  static async cleanupTestWorkspaces(): Promise<void> {
    for (const tempDir of this.tempDirs) {
      try {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
      } catch (error) {
        console.warn(`Failed to cleanup temp directory ${tempDir}:`, error);
      }
    }
    this.tempDirs = [];
    this.usedPorts.clear();
  }

  /**
   * Wait for a specified amount of time
   */
  static wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Wait for a condition to become true
   */
  static async waitForCondition(
    condition: () => boolean | Promise<boolean>,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<boolean> {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      const result = await condition();
      if (result) {
        return true;
      }
      await this.wait(interval);
    }
    
    return false;
  }

  /**
   * Create a mock server config
   */
  static createMockServerConfig(overrides: Partial<MockServerConfig> = {}): MockServerConfig {
    return {
      port: overrides.mockPort || 0, // Use 0 for random available port
      host: '127.0.0.1',
      root: overrides.root || '/tmp',
      defaultFile: '/index.html',
      ignored: ['**/node_modules/**', '**/.git/**'],
      cors: false,
      https: false,
      mockError: overrides.mockError || false,
      ...overrides
    };
  }

  /**
   * Check if a port is available
   */
  static async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = require('net').createServer();
      
      server.listen(port, () => {
        server.once('close', () => resolve(true));
        server.close();
      });
      
      server.on('error', () => resolve(false));
    });
  }

  /**
   * Get an available port
   */
  static async getAvailablePort(startPort: number = 3000): Promise<number> {
    let port = startPort;
    while (!(await this.isPortAvailable(port)) || this.usedPorts.has(port)) {
      port++;
      if (port > startPort + 1000) {
        throw new Error('Could not find available port');
      }
    }
    this.usedPorts.add(port);
    return port;
  }

  /**
   * Make HTTP request for testing
   */
  static async makeRequest(url: string, options: any = {}): Promise<{ status: number; body: string; headers: any }> {
    const http = require('http');
    const urlParsed = new URL(url);
    
    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: urlParsed.hostname,
        port: urlParsed.port,
        path: urlParsed.pathname + urlParsed.search,
        method: options.method || 'GET',
        headers: options.headers || {}
      }, (res: any) => {
        let body = '';
        res.on('data', (chunk: any) => body += chunk);
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            body,
            headers: res.headers
          });
        });
      });
      
      req.on('error', reject);
      
      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  }

  /**
   * Create WebSocket connection for testing
   */
  static async createWebSocketConnection(url: string): Promise<any> {
    const WebSocket = require('ws');
    const ws = new WebSocket(url);
    
    return new Promise((resolve, reject) => {
      ws.on('open', () => resolve(ws));
      ws.on('error', reject);
    });
  }

  /**
   * Mock VS Code workspace folders
   */
  static mockWorkspaceFolders(folders: string[]): void {
    const mockFolders = folders.map(folder => ({
      uri: { fsPath: folder },
      name: path.basename(folder),
      index: 0
    }));

    // Mock vscode.workspace.workspaceFolders
    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      value: mockFolders,
      writable: true,
      configurable: true
    });
  }

  /**
   * Create file change events for testing
   */
  static createFileChangeEvent(type: string, filePath: string): any {
    return {
      type,
      path: filePath,
      timestamp: new Date(),
      stats: type !== 'unlink' ? {
        isFile: () => true,
        isDirectory: () => false,
        size: 1024,
        mtime: new Date()
      } : undefined
    };
  }

  /**
   * Assert that a condition becomes true within timeout
   */
  static async assertEventually(
    assertion: () => boolean | Promise<boolean>,
    message: string = 'Condition was not met',
    timeout: number = 5000
  ): Promise<void> {
    const success = await this.waitForCondition(assertion, timeout);
    if (!success) {
      throw new Error(`${message} (timeout after ${timeout}ms)`);
    }
  }

  /**
   * Create a spy function for testing
   */
  static createSpy(): any {
    const calls: any[] = [];
    const spy = (...args: any[]) => {
      calls.push(args);
      return spy.returnValue;
    };
    
    spy.calls = calls;
    spy.callCount = () => calls.length;
    spy.calledWith = (...args: any[]) => calls.some(call => 
      call.length === args.length && call.every((arg: any, i: number) => arg === args[i])
    );
    spy.returnValue = undefined;
    spy.reset = () => {
      calls.length = 0;
      spy.returnValue = undefined;
    };
    
    return spy;
  }
}

/**
 * Test suite helper for organizing tests
 */
export class TestSuite {
  private beforeEachHooks: (() => Promise<void> | void)[] = [];
  private afterEachHooks: (() => Promise<void> | void)[] = [];
  private beforeAllHooks: (() => Promise<void> | void)[] = [];
  private afterAllHooks: (() => Promise<void> | void)[] = [];

  beforeEach(hook: () => Promise<void> | void): void {
    this.beforeEachHooks.push(hook);
  }

  afterEach(hook: () => Promise<void> | void): void {
    this.afterEachHooks.push(hook);
  }

  beforeAll(hook: () => Promise<void> | void): void {
    this.beforeAllHooks.push(hook);
  }

  afterAll(hook: () => Promise<void> | void): void {
    this.afterAllHooks.push(hook);
  }

  async runBeforeAll(): Promise<void> {
    for (const hook of this.beforeAllHooks) {
      await hook();
    }
  }

  async runAfterAll(): Promise<void> {
    for (const hook of this.afterAllHooks) {
      await hook();
    }
  }

  async runBeforeEach(): Promise<void> {
    for (const hook of this.beforeEachHooks) {
      await hook();
    }
  }

  async runAfterEach(): Promise<void> {
    for (const hook of this.afterEachHooks) {
      await hook();
    }
  }
}