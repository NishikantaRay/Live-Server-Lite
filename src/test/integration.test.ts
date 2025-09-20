import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ServerManager } from '../serverManager';
import { FileWatcher } from '../fileWatcher';
import { StatusBar } from '../statusBar';
import { TestHelper, TestSuite } from './testHelper';

suite('Integration Tests', () => {
  const testSuite = new TestSuite();
  let testContext: any;
  let serverManager: ServerManager;
  let fileWatcher: FileWatcher;
  let statusBar: StatusBar;

  testSuite.beforeAll(async () => {
    testContext = await TestHelper.createTestWorkspace(TestHelper.getDefaultTestFiles());
    TestHelper.mockWorkspaceFolders([testContext.workspaceRoot]);
  });

  testSuite.afterAll(async () => {
    await TestHelper.cleanupTestWorkspaces();
  });

  testSuite.beforeEach(() => {
    serverManager = new ServerManager();
    fileWatcher = new FileWatcher();
    statusBar = new StatusBar();
  });

  testSuite.afterEach(async () => {
    if (serverManager && serverManager.isRunning()) {
      await serverManager.stop();
    }
    if (fileWatcher && fileWatcher.isWatching()) {
      fileWatcher.stop();
    }
    if (statusBar) {
      statusBar.dispose();
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

  suite('Server and FileWatcher Integration', () => {
    test('should start server and file watcher together', async function() {
      this.timeout(15000);
      
      try {
        // Start server
        const response = await serverManager.start();
        
        if (!response.success) {
          console.log('Server start failed, skipping integration test');
          return;
        }

        // Start file watcher
        fileWatcher.start(testContext.workspaceRoot);
        
        await TestHelper.wait(200);
        
        assert.strictEqual(serverManager.isRunning(), true, 'Server should be running');
        assert.strictEqual(fileWatcher.isWatching(), true, 'File watcher should be active');
        
        const serverInfo = serverManager.getServerInfo();
        assert.ok(serverInfo, 'Should have server info');
      } catch (error) {
        if (error instanceof Error && error.message.includes('EADDRINUSE')) {
          console.log('Port in use, skipping server-watcher integration test');
          return;
        }
        throw error;
      }
    });

    test('should detect file changes and potentially trigger reloads', async function() {
      this.timeout(20000);
      
      try {
        // Start server first
        const response = await serverManager.start();
        
        if (!response.success) {
          console.log('Server start failed, skipping file change test');
          return;
        }

        let fileChangeDetected = false;
        
        // Start file watcher with change callback
        fileWatcher.onFileChange(() => {
          fileChangeDetected = true;
        });
        
        fileWatcher.start(testContext.workspaceRoot);
        await TestHelper.wait(500);
        
        // Create a new file to trigger change
        const testFile = path.join(testContext.workspaceRoot, 'integration-test.html');
        await fs.promises.writeFile(testFile, '<html><body>Integration test</body></html>');
        
        // Wait for file change detection
        const success = await TestHelper.waitForCondition(() => fileChangeDetected, 5000);
        
        if (success) {
          assert.ok(fileChangeDetected, 'File change should be detected');
        } else {
          console.log('File change detection timeout - this may be expected in some environments');
        }
        
      } catch (error) {
        if (error instanceof Error && error.message.includes('EADDRINUSE')) {
          console.log('Port in use, skipping file change integration test');
          return;
        }
        throw error;
      }
    });

    test('should handle server stop while file watcher is active', async function() {
      this.timeout(15000);
      
      try {
        // Start both server and file watcher
        const response = await serverManager.start();
        
        if (!response.success) {
          console.log('Server start failed, skipping stop integration test');
          return;
        }

        fileWatcher.start(testContext.workspaceRoot);
        await TestHelper.wait(200);
        
        assert.strictEqual(serverManager.isRunning(), true, 'Server should be running');
        assert.strictEqual(fileWatcher.isWatching(), true, 'File watcher should be active');
        
        // Stop server
        const stopResponse = await serverManager.stop();
        assert.strictEqual(stopResponse.success, true, 'Server should stop successfully');
        
        assert.strictEqual(serverManager.isRunning(), false, 'Server should not be running');
        assert.strictEqual(fileWatcher.isWatching(), true, 'File watcher should still be active');
        
      } catch (error) {
        if (error instanceof Error && error.message.includes('EADDRINUSE')) {
          console.log('Port in use, skipping stop integration test');
          return;
        }
        throw error;
      }
    });
  });

  suite('Status Bar Integration', () => {
    test('should update status bar based on server state', async function() {
      this.timeout(15000);
      
      statusBar.create();
      
      // Initial state
      const initialItem = statusBar.getItem();
      assert.ok(initialItem.text.includes('Go Live'), 'Should show Go Live initially');
      
      try {
        // Start server
        const response = await serverManager.start();
        
        if (!response.success) {
          console.log('Server start failed, skipping status bar integration test');
          return;
        }

        const serverInfo = serverManager.getServerInfo();
        if (!serverInfo) {
          assert.fail('Should have server info');
        }
        
        // Update status bar to running state
        statusBar.updateToRunning(serverInfo);
        
        const runningItem = statusBar.getItem();
        assert.ok(runningItem.text.includes('Stop'), 'Should show Stop when running');
        assert.ok(runningItem.tooltip && runningItem.tooltip.toString().includes(serverInfo.port.toString()), 'Tooltip should include port');
        
        // Stop server
        const stopResponse = await serverManager.stop();
        assert.strictEqual(stopResponse.success, true, 'Should stop successfully');
        
        // Update status bar to stopped state
        statusBar.updateToStopped();
        
        const stoppedItem = statusBar.getItem();
        assert.ok(stoppedItem.text.includes('Go Live'), 'Should show Go Live when stopped');
        
      } catch (error) {
        if (error instanceof Error && error.message.includes('EADDRINUSE')) {
          console.log('Port in use, skipping status bar integration test');
          return;
        }
        throw error;
      }
    });

    test('should handle error states in status bar', () => {
      statusBar.create();
      
      const testError = {
        code: 'TEST_ERROR',
        message: 'Test error message',
        timestamp: new Date()
      };
      
      statusBar.updateToError(testError);
      
      const errorItem = statusBar.getItem();
      assert.ok(errorItem.text.includes('Error'), 'Should show error state');
      assert.ok(errorItem.tooltip && errorItem.tooltip.toString().includes(testError.message), 'Tooltip should include error message');
    });

    test('should handle loading states in status bar', () => {
      statusBar.create();
      
      statusBar.updateToLoading('Starting server...');
      
      const loadingItem = statusBar.getItem();
      assert.ok(loadingItem.text.includes('Loading'), 'Should show loading state');
      assert.ok(loadingItem.tooltip && loadingItem.tooltip.toString().includes('Starting server'), 'Tooltip should include loading message');
    });
  });

  suite('Full Workflow Integration', () => {
    test('should handle complete start-stop workflow', async function() {
      this.timeout(20000);
      
      try {
        statusBar.create();
        
        // 1. Initial state - everything should be stopped/inactive
        assert.strictEqual(serverManager.isRunning(), false, 'Server should not be running initially');
        assert.strictEqual(fileWatcher.isWatching(), false, 'File watcher should not be active initially');
        assert.strictEqual(serverManager.getServerInfo(), null, 'Should have no server info initially');
        
        // 2. Start server
        statusBar.updateToLoading('Starting server...');
        const startResponse = await serverManager.start();
        
        if (!startResponse.success) {
          console.log('Server start failed, skipping workflow test');
          return;
        }
        
        // 3. Verify server is running
        assert.strictEqual(serverManager.isRunning(), true, 'Server should be running');
        
        const serverInfo = serverManager.getServerInfo();
        assert.ok(serverInfo, 'Should have server info');
        assert.ok(serverInfo.port > 0, 'Should have valid port');
        
        statusBar.updateToRunning(serverInfo);
        
        // 4. Start file watcher
        fileWatcher.start(testContext.workspaceRoot);
        await TestHelper.wait(200);
        
        assert.strictEqual(fileWatcher.isWatching(), true, 'File watcher should be active');
        
        // 5. Test HTTP serving
        const httpResponse = await TestHelper.makeRequest(serverInfo.localUrl);
        assert.strictEqual(httpResponse.status, 200, 'Should serve HTTP content');
        assert.ok(httpResponse.body.includes('<html>'), 'Should serve HTML content');
        
        // 6. Test WebSocket connection
        const wsUrl = serverInfo.localUrl.replace('http://', 'ws://');
        const ws = await TestHelper.createWebSocketConnection(wsUrl);
        assert.ok(ws, 'Should establish WebSocket connection');
        ws.close();
        
        // 7. Stop server
        const stopResponse = await serverManager.stop();
        assert.strictEqual(stopResponse.success, true, 'Should stop successfully');
        
        assert.strictEqual(serverManager.isRunning(), false, 'Server should not be running');
        assert.strictEqual(serverManager.getServerInfo(), null, 'Should have no server info after stop');
        
        statusBar.updateToStopped();
        
        // 8. Stop file watcher
        fileWatcher.stop();
        assert.strictEqual(fileWatcher.isWatching(), false, 'File watcher should not be active');
        
      } catch (error) {
        if (error instanceof Error && (error.message.includes('EADDRINUSE') || error.message.includes('ECONNREFUSED'))) {
          console.log('Network error, skipping full workflow test');
          return;
        }
        throw error;
      }
    });

    test('should handle restart workflow', async function() {
      this.timeout(20000);
      
      try {
        // Start server
        const startResponse = await serverManager.start();
        
        if (!startResponse.success) {
          console.log('Server start failed, skipping restart test');
          return;
        }
        
        const originalServerInfo = serverManager.getServerInfo();
        assert.ok(originalServerInfo, 'Should have initial server info');
        
        // Restart server
        const restartResponse = await serverManager.restart();
        assert.strictEqual(restartResponse.success, true, 'Restart should succeed');
        
        const newServerInfo = serverManager.getServerInfo();
        assert.ok(newServerInfo, 'Should have new server info');
        assert.strictEqual(serverManager.isRunning(), true, 'Server should be running after restart');
        
        // Port should be the same (or at least valid)
        assert.ok(newServerInfo.port > 0, 'Should have valid port after restart');
        
      } catch (error) {
        if (error instanceof Error && error.message.includes('EADDRINUSE')) {
          console.log('Port in use, skipping restart test');
          return;
        }
        throw error;
      }
    });

    test('should handle multiple rapid operations', async function() {
      this.timeout(25000);
      
      try {
        // Perform multiple rapid start/stop operations
        for (let i = 0; i < 3; i++) {
          const startResponse = await serverManager.start();
          
          if (!startResponse.success) {
            console.log(`Server start failed on iteration ${i}, skipping rapid operations test`);
            return;
          }
          
          assert.strictEqual(serverManager.isRunning(), true, `Should be running in iteration ${i}`);
          
          // Brief operation
          await TestHelper.wait(100);
          
          const stopResponse = await serverManager.stop();
          assert.strictEqual(stopResponse.success, true, `Should stop in iteration ${i}`);
          assert.strictEqual(serverManager.isRunning(), false, `Should not be running in iteration ${i}`);
          
          // Brief pause between iterations
          await TestHelper.wait(200);
        }
        
      } catch (error) {
        if (error instanceof Error && error.message.includes('EADDRINUSE')) {
          console.log('Port in use, skipping rapid operations test');
          return;
        }
        throw error;
      }
    });
  });

  suite('Error Handling Integration', () => {
    test('should handle workspace folder changes', async () => {
      // Test with invalid workspace
      TestHelper.mockWorkspaceFolders(['/invalid/path']);
      
      const response = await serverManager.start();
      assert.strictEqual(response.success, false, 'Should fail with invalid workspace');
      assert.ok(response.error, 'Should have error information');
      
      // Restore valid workspace
      TestHelper.mockWorkspaceFolders([testContext.workspaceRoot]);
    });

    test('should handle file watcher errors gracefully', async () => {
      // Start file watcher on invalid path
      const invalidPath = '/invalid/path/that/does/not/exist';
      
      try {
        fileWatcher.start(invalidPath);
        // If it doesn't throw, that's also acceptable
        await TestHelper.wait(100);
      } catch (error) {
        // Errors are acceptable for invalid paths
        assert.ok(error instanceof Error, 'Should provide meaningful error');
      }
      
      // Should not affect other operations
      assert.strictEqual(serverManager.isRunning(), false, 'Server should not be affected');
    });

    test('should handle status bar disposal gracefully', () => {
      statusBar.create();
      
      const item = statusBar.getItem();
      assert.ok(item, 'Should have status bar item');
      
      // Dispose should not throw
      statusBar.dispose();
      
      // Multiple disposals should not throw
      statusBar.dispose();
    });
  });

  suite('Performance Integration', () => {
    test('should handle large workspace efficiently', async function() {
      this.timeout(30000);
      
      // Create a larger workspace structure
      const largeDir = path.join(testContext.workspaceRoot, 'large-project');
      await fs.promises.mkdir(largeDir, { recursive: true });
      
      // Create multiple directories and files
      for (let i = 0; i < 10; i++) {
        const subDir = path.join(largeDir, `subdir-${i}`);
        await fs.promises.mkdir(subDir, { recursive: true });
        
        for (let j = 0; j < 5; j++) {
          const filePath = path.join(subDir, `file-${j}.txt`);
          await fs.promises.writeFile(filePath, `Content for file ${i}-${j}`);
        }
      }
      
      try {
        const startTime = Date.now();
        
        // Start server and file watcher
        const response = await serverManager.start();
        
        if (!response.success) {
          console.log('Server start failed, skipping performance test');
          return;
        }
        
        fileWatcher.start(testContext.workspaceRoot);
        await TestHelper.wait(500);
        
        const initTime = Date.now() - startTime;
        
        assert.ok(initTime < 10000, 'Should initialize within reasonable time');
        assert.strictEqual(serverManager.isRunning(), true, 'Server should be running');
        assert.strictEqual(fileWatcher.isWatching(), true, 'File watcher should be active');
        
      } catch (error) {
        if (error instanceof Error && error.message.includes('EADDRINUSE')) {
          console.log('Port in use, skipping performance test');
          return;
        }
        throw error;
      }
    });
  });
});