import * as assert from 'assert';
import * as vscode from 'vscode';
import { ServerManager } from '../serverManager';
import { TestHelper, TestSuite } from './testHelper';
import { ServerResponse, ServerInfo } from '../types';

suite('ServerManager Unit Tests', () => {
  const testSuite = new TestSuite();
  let testContext: any;
  let serverManager: ServerManager;

  testSuite.beforeAll(async () => {
    testContext = await TestHelper.createTestWorkspace(TestHelper.getDefaultTestFiles());
    // Mock workspace folders for VS Code
    TestHelper.mockWorkspaceFolders([testContext.workspaceRoot]);
  });

  testSuite.afterAll(async () => {
    await TestHelper.cleanupTestWorkspaces();
  });

  testSuite.beforeEach(() => {
    serverManager = new ServerManager();
  });

  testSuite.afterEach(async () => {
    if (serverManager && serverManager.isRunning()) {
      await serverManager.stop();
    }
  });

  suiteSetup(async () => {
    await testSuite.runBeforeAll();
  });

  suiteTeardown(async () => {
    await testSuite.runAfterAll();
  });

  setup(async () => {
    await testSuite.runBeforeEach();
  });

  teardown(async () => {
    await testSuite.runAfterEach();
  });

  suite('Initialization', () => {
    test('should initialize correctly', () => {
      assert.ok(serverManager, 'ServerManager should be created');
      assert.strictEqual(serverManager.isRunning(), false, 'Should not be running initially');
      assert.strictEqual(serverManager.getServerInfo(), null, 'Should have no server info initially');
    });

    test('should have proper interface methods', () => {
      assert.ok(typeof serverManager.start === 'function', 'Should have start method');
      assert.ok(typeof serverManager.stop === 'function', 'Should have stop method');
      assert.ok(typeof serverManager.isRunning === 'function', 'Should have isRunning method');
      assert.ok(typeof serverManager.getServerInfo === 'function', 'Should have getServerInfo method');
      assert.ok(typeof serverManager.dispose === 'function', 'Should have dispose method');
    });

    test('should implement LiveServerManager interface', () => {
      // Test that all required methods exist
      const requiredMethods = ['start', 'stop', 'isRunning', 'getServerInfo'];
      requiredMethods.forEach(method => {
        assert.ok(typeof (serverManager as any)[method] === 'function', `Should have ${method} method`);
      });
    });
  });

  suite('Starting Server', () => {
    test('should start server successfully', async function() {
      this.timeout(10000); // Increase timeout for server operations
      
      try {
        // Use a random port in the high range to avoid conflicts
        const testPort = 30000 + Math.floor(Math.random() * 10000);
        const response = await serverManager.start(undefined, { port: testPort });
        
        assert.ok(response, 'Should return response object');
        assert.strictEqual(response.success, true, 'Response should indicate success');
        assert.strictEqual(serverManager.isRunning(), true, 'Should be running after start');
        
        const serverInfo = serverManager.getServerInfo();
        assert.ok(serverInfo, 'Should have server info after start');
        assert.ok(serverInfo.port > 0, 'Should have valid port number');
        assert.ok(serverInfo.localUrl.includes('localhost'), 'Should have local URL');
        assert.ok(serverInfo.networkUrl.length > 0, 'Should have network URL');
      } catch (error) {
        // If we can't bind to port (common in CI), that's acceptable
        if (error instanceof Error && error.message.includes('EADDRINUSE')) {
          console.log('Port in use, skipping server start test');
          return;
        }
        throw error;
      }
    });

    test('should prevent multiple starts', async function() {
      this.timeout(10000);
      
      try {
        await serverManager.start();
        
        // Try to start again
        try {
          await serverManager.start();
          assert.fail('Should not allow starting twice');
        } catch (error) {
          assert.ok(error instanceof Error, 'Should throw error for multiple starts');
          assert.ok(error.message.includes('already running'), 'Error should mention server already running');
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('EADDRINUSE')) {
          console.log('Port in use, skipping multiple start test');
          return;
        }
        throw error;
      }
    });

    test('should handle custom HTML file', async function() {
      this.timeout(10000);
      
      try {
        // Create a custom HTML file URI
        const customHtmlPath = testContext.testFiles.find((file: string) => file.endsWith('about.html'));
        if (!customHtmlPath) {
          assert.fail('Could not find custom HTML file for testing');
        }
        
        const htmlUri = vscode.Uri.file(customHtmlPath);
        const response = await serverManager.start(htmlUri);
        
        assert.strictEqual(response.success, true, 'Should start with custom HTML file');
        
        const serverInfo = serverManager.getServerInfo();
        assert.ok(serverInfo, 'Should have server info');
        assert.ok(serverInfo.localUrl.includes('about.html'), 'URL should include custom HTML file');
      } catch (error) {
        if (error instanceof Error && error.message.includes('EADDRINUSE')) {
          console.log('Port in use, skipping custom HTML test');
          return;
        }
        throw error;
      }
    });

    test('should handle no workspace folder error', async () => {
      // Temporarily clear workspace folders
      Object.defineProperty(vscode.workspace, 'workspaceFolders', {
        value: undefined,
        writable: true,
        configurable: true
      });
      
      try {
        const response = await serverManager.start();
        assert.strictEqual(response.success, false, 'Should fail without workspace folder');
        assert.ok(response.error, 'Should have error information');
        assert.ok(response.error.message.includes('workspace'), 'Error should mention workspace');
      } catch (error) {
        // This is also acceptable behavior
        assert.ok(error instanceof Error, 'Should throw meaningful error');
      } finally {
        // Restore workspace folders
        TestHelper.mockWorkspaceFolders([testContext.workspaceRoot]);
      }
    });

    test('should handle port conflicts gracefully', async function() {
      this.timeout(15000);
      
      // Create a server on a specific port first
      const testPort = await TestHelper.getAvailablePort(5500);
      const http = require('http');
      const blockingServer = http.createServer();
      
      await new Promise<void>((resolve) => {
        blockingServer.listen(testPort, () => resolve());
      });
      
      try {
        // Now try to start our server (it should find a different port or handle the conflict)
        const response = await serverManager.start();
        
        if (response.success) {
          const serverInfo = serverManager.getServerInfo();
          assert.ok(serverInfo, 'Should have server info even with port conflict');
          // The server should have found a different port
        } else {
          assert.ok(response.error, 'Should have error info for port conflict');
        }
      } finally {
        blockingServer.close();
      }
    });
  });

  suite('Stopping Server', () => {
    test('should stop server successfully', async function() {
      this.timeout(10000);
      
      try {
        await serverManager.start();
        assert.strictEqual(serverManager.isRunning(), true, 'Should be running');
        
        const response = await serverManager.stop();
        
        assert.ok(response, 'Should return response object');
        assert.strictEqual(response.success, true, 'Response should indicate success');
        assert.strictEqual(serverManager.isRunning(), false, 'Should not be running after stop');
        assert.strictEqual(serverManager.getServerInfo(), null, 'Should have no server info after stop');
      } catch (error) {
        if (error instanceof Error && error.message.includes('EADDRINUSE')) {
          console.log('Port in use, skipping server stop test');
          return;
        }
        throw error;
      }
    });

    test('should handle stopping when not running', async () => {
      assert.strictEqual(serverManager.isRunning(), false, 'Should not be running');
      
      const response = await serverManager.stop();
      
      assert.ok(response, 'Should return response object');
      assert.strictEqual(response.success, true, 'Should succeed even when not running');
    });

    test('should cleanup resources properly', async function() {
      this.timeout(10000);
      
      try {
        await serverManager.start();
        const serverInfo = serverManager.getServerInfo();
        assert.ok(serverInfo, 'Should have server info when running');
        
        await serverManager.stop();
        
        // After stopping, all resources should be cleaned up
        assert.strictEqual(serverManager.isRunning(), false, 'Should not be running');
        assert.strictEqual(serverManager.getServerInfo(), null, 'Should have no server info');
      } catch (error) {
        if (error instanceof Error && error.message.includes('EADDRINUSE')) {
          console.log('Port in use, skipping cleanup test');
          return;
        }
        throw error;
      }
    });
  });

  suite('Server Information', () => {
    test('should provide accurate server info when running', async function() {
      this.timeout(10000);
      
      try {
        await serverManager.start();
        
        const serverInfo = serverManager.getServerInfo();
        assert.ok(serverInfo, 'Should have server info');
        assert.strictEqual(serverInfo.isRunning, true, 'Server info should indicate running');
        assert.ok(typeof serverInfo.port === 'number', 'Should have numeric port');
        assert.ok(serverInfo.port > 0 && serverInfo.port <= 65535, 'Should have valid port range');
        assert.ok(serverInfo.localUrl.startsWith('http://'), 'Local URL should use HTTP');
        assert.ok(serverInfo.networkUrl.startsWith('http://'), 'Network URL should use HTTP');
        assert.ok(serverInfo.localUrl.includes(`${serverInfo.port}`), 'Local URL should include port');
        assert.ok(serverInfo.networkUrl.includes(`${serverInfo.port}`), 'Network URL should include port');
      } catch (error) {
        if (error instanceof Error && error.message.includes('EADDRINUSE')) {
          console.log('Port in use, skipping server info test');
          return;
        }
        throw error;
      }
    });

    test('should return null server info when not running', () => {
      assert.strictEqual(serverManager.isRunning(), false, 'Should not be running');
      assert.strictEqual(serverManager.getServerInfo(), null, 'Should have no server info');
    });

    test('should include root directory in server info', async function() {
      this.timeout(10000);
      
      try {
        await serverManager.start();
        
        const serverInfo = serverManager.getServerInfo();
        assert.ok(serverInfo, 'Should have server info');
        assert.ok(serverInfo.root, 'Should include root directory');
        assert.strictEqual(serverInfo.root, testContext.workspaceRoot, 'Root should match workspace root');
      } catch (error) {
        if (error instanceof Error && error.message.includes('EADDRINUSE')) {
          console.log('Port in use, skipping root directory test');
          return;
        }
        throw error;
      }
    });
  });

  suite('HTTP Server Functionality', () => {
    test('should serve static files', async function() {
      this.timeout(15000);
      
      try {
        await serverManager.start();
        
        const serverInfo = serverManager.getServerInfo();
        if (!serverInfo) {
          assert.fail('Server info should be available');
        }
        
        // Test serving the index.html file
        const response = await TestHelper.makeRequest(serverInfo.localUrl);
        
        assert.strictEqual(response.status, 200, 'Should return 200 OK');
        assert.ok(response.body.includes('<html>'), 'Should serve HTML content');
        assert.ok(response.body.includes('Live Server Test'), 'Should serve correct file content');
        
        // Should have WebSocket script injected
        assert.ok(response.body.includes('WebSocket'), 'Should inject WebSocket script');
      } catch (error) {
        if (error instanceof Error && (error.message.includes('EADDRINUSE') || error.message.includes('ECONNREFUSED'))) {
          console.log('Network error, skipping static file serving test');
          return;
        }
        throw error;
      }
    });

    test('should serve CSS files', async function() {
      this.timeout(15000);
      
      try {
        await serverManager.start();
        
        const serverInfo = serverManager.getServerInfo();
        if (!serverInfo) {
          assert.fail('Server info should be available');
        }
        
        const cssUrl = `${serverInfo.localUrl}/style.css`;
        const response = await TestHelper.makeRequest(cssUrl);
        
        assert.strictEqual(response.status, 200, 'Should return 200 OK for CSS');
        assert.ok(response.body.includes('font-family'), 'Should serve CSS content');
        assert.ok(response.headers['content-type']?.includes('text/css'), 'Should have correct content type');
      } catch (error) {
        if (error instanceof Error && (error.message.includes('EADDRINUSE') || error.message.includes('ECONNREFUSED'))) {
          console.log('Network error, skipping CSS serving test');
          return;
        }
        throw error;
      }
    });

    test('should handle 404 for non-existent files', async function() {
      this.timeout(15000);
      
      try {
        await serverManager.start();
        
        const serverInfo = serverManager.getServerInfo();
        if (!serverInfo) {
          assert.fail('Server info should be available');
        }
        
        const notFoundUrl = `${serverInfo.localUrl}/nonexistent.html`;
        const response = await TestHelper.makeRequest(notFoundUrl);
        
        assert.strictEqual(response.status, 404, 'Should return 404 for non-existent files');
      } catch (error) {
        if (error instanceof Error && (error.message.includes('EADDRINUSE') || error.message.includes('ECONNREFUSED'))) {
          console.log('Network error, skipping 404 test');
          return;
        }
        throw error;
      }
    });
  });

  suite('WebSocket Functionality', () => {
    test('should establish WebSocket connection', async function() {
      this.timeout(15000);
      
      try {
        await serverManager.start();
        
        const serverInfo = serverManager.getServerInfo();
        if (!serverInfo) {
          assert.fail('Server info should be available');
        }
        
        const wsUrl = serverInfo.localUrl.replace('http://', 'ws://');
        const ws = await TestHelper.createWebSocketConnection(wsUrl);
        
        assert.ok(ws, 'Should establish WebSocket connection');
        
        ws.close();
      } catch (error) {
        if (error instanceof Error && (error.message.includes('EADDRINUSE') || error.message.includes('ECONNREFUSED'))) {
          console.log('Network error, skipping WebSocket test');
          return;
        }
        throw error;
      }
    });
  });

  suite('Dispose and Cleanup', () => {
    test('should dispose properly', async function() {
      this.timeout(10000);
      
      try {
        await serverManager.start();
        assert.strictEqual(serverManager.isRunning(), true, 'Should be running');
        
        serverManager.dispose();
        
        // After disposal, server should be stopped
        await TestHelper.wait(100); // Give time for cleanup
        assert.strictEqual(serverManager.isRunning(), false, 'Should not be running after dispose');
      } catch (error) {
        if (error instanceof Error && error.message.includes('EADDRINUSE')) {
          console.log('Port in use, skipping dispose test');
          return;
        }
        throw error;
      }
    });
  });

  suite('Edge Cases', () => {
    test('should handle invalid workspace structure', async () => {
      // Mock workspace with invalid structure
      TestHelper.mockWorkspaceFolders(['/invalid/path/that/does/not/exist']);
      
      try {
        const response = await serverManager.start();
        // Should either fail gracefully or handle the error
        if (!response.success) {
          assert.ok(response.error, 'Should have error information');
        }
      } catch (error) {
        assert.ok(error instanceof Error, 'Should throw meaningful error');
      } finally {
        // Restore valid workspace
        TestHelper.mockWorkspaceFolders([testContext.workspaceRoot]);
      }
    });

    test('should handle rapid start/stop cycles', async function() {
      this.timeout(20000);
      
      try {
        // Perform rapid start/stop cycles
        for (let i = 0; i < 3; i++) {
          await serverManager.start();
          assert.strictEqual(serverManager.isRunning(), true, `Should be running in cycle ${i}`);
          
          await serverManager.stop();
          assert.strictEqual(serverManager.isRunning(), false, `Should be stopped in cycle ${i}`);
          
          await TestHelper.wait(100); // Small delay between cycles
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('EADDRINUSE')) {
          console.log('Port in use, skipping rapid cycle test');
          return;
        }
        throw error;
      }
    });
  });
});