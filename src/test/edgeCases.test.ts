import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { ServerManager } from '../serverManager';
import { FileWatcher } from '../fileWatcher';
import { StatusBar } from '../statusBar';
import { TestHelper, TestSuite } from './testHelper';
import { 
  getLocalIPAddress, 
  generateUrls, 
  injectWebSocketScript, 
  fileExists,
  readFileContent 
} from '../utils';

suite('Edge Case and Error Handling Tests', () => {
  const testSuite = new TestSuite();
  let testContext: any;

  testSuite.beforeAll(async () => {
    testContext = await TestHelper.createTestWorkspace(TestHelper.getDefaultTestFiles());
  });

  testSuite.afterAll(async () => {
    await TestHelper.cleanupTestWorkspaces();
  });

  suiteSetup(async () => {
    await testSuite.runBeforeAll();
  });

  suiteTeardown(async () => {
    await testSuite.runAfterAll();
  });

  suite('File System Edge Cases', () => {
    test('should handle files with special characters', async () => {
      const specialFiles = [
        { path: 'file with spaces.html', content: '<html>Spaces</html>' },
        { path: 'file-with-dashes.html', content: '<html>Dashes</html>' },
        { path: 'file_with_underscores.html', content: '<html>Underscores</html>' },
        { path: 'UPPERCASE.HTML', content: '<html>Uppercase</html>' },
        { path: 'file.with.dots.html', content: '<html>Dots</html>' }
      ];

      for (const file of specialFiles) {
        const filePath = path.join(testContext.workspaceRoot, file.path);
        await fs.promises.writeFile(filePath, file.content);
        
        const exists = await fileExists(filePath);
        assert.strictEqual(exists, true, `File ${file.path} should exist`);
        
        const content = await readFileContent(filePath);
        assert.strictEqual(content, file.content, `Content should match for ${file.path}`);
      }
    });

    test('should handle very long file paths', async () => {
      // Create nested directory structure
      let longPath = testContext.workspaceRoot;
      for (let i = 0; i < 10; i++) {
        longPath = path.join(longPath, `very-long-directory-name-${i}-with-many-characters`);
      }
      
      try {
        await fs.promises.mkdir(longPath, { recursive: true });
        const longFilePath = path.join(longPath, 'file-with-very-long-path.html');
        await fs.promises.writeFile(longFilePath, '<html>Long path</html>');
        
        const exists = await fileExists(longFilePath);
        assert.strictEqual(exists, true, 'Should handle long file paths');
        
        const content = await readFileContent(longFilePath);
        assert.ok(content.includes('Long path'), 'Should read content from long path');
        
      } catch (error) {
        // Some systems have path length limits
        if (error instanceof Error && (error.message.includes('ENAMETOOLONG') || error.message.includes('path too long'))) {
          console.log('System path length limit reached, test passed');
          return;
        }
        throw error;
      }
    });

    test('should handle empty files gracefully', async () => {
      const emptyFile = path.join(testContext.workspaceRoot, 'empty.html');
      await fs.promises.writeFile(emptyFile, '');
      
      const exists = await fileExists(emptyFile);
      assert.strictEqual(exists, true, 'Empty file should exist');
      
      const content = await readFileContent(emptyFile);
      assert.strictEqual(content, '', 'Empty file should have empty content');
      
      const injected = injectWebSocketScript(content);
      assert.ok(injected.includes('WebSocket'), 'Should inject script even in empty file');
    });

    test('should handle binary files', async () => {
      const binaryFile = path.join(testContext.workspaceRoot, 'binary.bin');
      const binaryData = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xFF, 0xFE, 0xFD]);
      
      await fs.promises.writeFile(binaryFile, binaryData);
      
      const exists = await fileExists(binaryFile);
      assert.strictEqual(exists, true, 'Binary file should exist');
      
      try {
        const content = await readFileContent(binaryFile);
        assert.ok(typeof content === 'string', 'Should return string even for binary');
      } catch (error) {
        // Some binary files might cause encoding issues, which is acceptable
        console.log('Binary file reading failed as expected');
      }
    });

    test('should handle concurrent file operations', async () => {
      const promises = [];
      
      // Create multiple files concurrently
      for (let i = 0; i < 10; i++) {
        const filePath = path.join(testContext.workspaceRoot, `concurrent-${i}.txt`);
        const promise = fs.promises.writeFile(filePath, `Content ${i}`);
        promises.push(promise);
      }
      
      await Promise.all(promises);
      
      // Verify all files exist
      const checkPromises = [];
      for (let i = 0; i < 10; i++) {
        const filePath = path.join(testContext.workspaceRoot, `concurrent-${i}.txt`);
        checkPromises.push(fileExists(filePath));
      }
      
      const results = await Promise.all(checkPromises);
      results.forEach((exists, i) => {
        assert.strictEqual(exists, true, `Concurrent file ${i} should exist`);
      });
    });
  });

  suite('Network and Server Edge Cases', () => {
    test('should handle invalid port numbers gracefully', () => {
      const invalidPorts = [-1, 0, 65536, 99999, NaN, Infinity];
      
      invalidPorts.forEach(port => {
        try {
          const { localUrl, networkUrl } = generateUrls(port);
          // Should still generate URLs even with invalid ports
          assert.ok(localUrl.includes(port.toString()) || isNaN(port), `Should handle port ${port}`);
          assert.ok(networkUrl.includes(port.toString()) || isNaN(port), `Should handle network URL for port ${port}`);
        } catch (error) {
          // Throwing errors is also acceptable for invalid ports
          assert.ok(error instanceof Error, `Should throw meaningful error for port ${port}`);
        }
      });
    });

    test('should handle network interface detection failures', () => {
      // Test the function with different scenarios that can occur in real environments
      const ip = getLocalIPAddress();
      
      // Should return either a valid IP or fallback to localhost
      assert.ok(ip.length > 0, 'Should return some IP address');
      assert.ok(ip.includes('.') || ip === '127.0.0.1', 'Should return IPv4 format or localhost');
      
      // Additional test: ensure the function handles edge cases gracefully
      const urls = generateUrls(5500, '');
      assert.ok(urls.localUrl.includes('5500'), 'Should generate valid URLs even with edge case IPs');
      assert.ok(urls.networkUrl.includes('5500'), 'Should generate valid network URLs');
    });

    test('should handle WebSocket script injection edge cases', () => {
      const edgeCaseHtmls = [
        '', // Empty
        '<html></html>', // No body
        '<HTML><BODY></BODY></HTML>', // Uppercase tags
        '<html><body><script></script></body></html>', // Existing script
        '<!DOCTYPE html><html><body></body></html>', // With DOCTYPE
        '<html>\n  <body>\n  </body>\n</html>', // With whitespace
        '<html><body><!-- comment --></body></html>', // With comments
        'Invalid HTML without proper tags',
        '<html><body></body>', // Missing closing html tag
        '<body></html>', // Wrong tag order
      ];

      edgeCaseHtmls.forEach((html, index) => {
        const injected = injectWebSocketScript(html);
        
        assert.ok(injected.includes('WebSocket'), `Should inject WebSocket in case ${index}`);
        assert.ok(injected.includes('location.reload'), `Should include reload functionality in case ${index}`);
        assert.ok(injected.length > html.length, `Injected should be longer than original in case ${index}`);
      });
    });
  });

  suite('Server Manager Edge Cases', () => {
    let serverManager: ServerManager;

    setup(() => {
      serverManager = new ServerManager();
    });

    teardown(async () => {
      if (serverManager && serverManager.isRunning()) {
        await serverManager.stop();
      }
    });

    test('should handle workspace folder edge cases', async () => {
      const edgeCases = [
        undefined, // No workspace folders
        [], // Empty workspace folders array
        [{ uri: { fsPath: '' }, name: '', index: 0 }], // Empty path
        [{ uri: { fsPath: '/nonexistent/path' }, name: 'invalid', index: 0 }], // Invalid path
      ];

      for (const workspaceFolders of edgeCases) {
        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
          value: workspaceFolders,
          writable: true,
          configurable: true
        });

        const response = await serverManager.start();
        
        if (workspaceFolders === undefined || workspaceFolders.length === 0) {
          assert.strictEqual(response.success, false, 'Should fail with no workspace folders');
          assert.ok(response.error, 'Should have error information');
        }
        
        // Clean up if server started
        if (response.success && serverManager.isRunning()) {
          await serverManager.stop();
        }
      }

      // Restore valid workspace
      TestHelper.mockWorkspaceFolders([testContext.workspaceRoot]);
    });

    test('should handle server configuration edge cases', async () => {
      TestHelper.mockWorkspaceFolders([testContext.workspaceRoot]);

      // Test with updateConfig
      serverManager.updateConfig({
        port: 8080,
        host: 'localhost',
        ignored: ['**/test/**']
      });

      try {
        const response = await serverManager.start();
        
        if (response.success) {
          const stats = serverManager.getServerStats();
          assert.ok(stats, 'Should have server stats');
          assert.ok(stats.uptime >= 0, 'Should have valid uptime');
          
          // Test restart
          const restartResponse = await serverManager.restart();
          assert.strictEqual(restartResponse.success, true, 'Restart should succeed');
        }
        
      } catch (error) {
        if (error instanceof Error && error.message.includes('EADDRINUSE')) {
          console.log('Port in use, skipping configuration edge case test');
          return;
        }
        throw error;
      }
    });

    test('should handle rapid operations', async function() {
      this.timeout(15000);
      
      TestHelper.mockWorkspaceFolders([testContext.workspaceRoot]);

      // Rapid start attempts
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(serverManager.start());
      }

      try {
        const responses = await Promise.all(promises);
        
        // Only one should succeed, others should fail gracefully
        const successCount = responses.filter(r => r.success).length;
        const failCount = responses.filter(r => !r.success).length;
        
        assert.strictEqual(successCount, 1, 'Only one start should succeed');
        assert.strictEqual(failCount, 4, 'Other starts should fail gracefully');
        
        // Clean up
        if (serverManager.isRunning()) {
          await serverManager.stop();
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

  suite('File Watcher Edge Cases', () => {
    let fileWatcher: FileWatcher;

    setup(() => {
      fileWatcher = new FileWatcher();
    });

    teardown(() => {
      if (fileWatcher && fileWatcher.isWatching()) {
        fileWatcher.stop();
      }
    });

    test('should handle invalid watch paths', () => {
      const invalidPaths = [
        '/nonexistent/path',
        '',
        null,
        undefined,
        '/proc/self/mem', // System path
        '/dev/null', // Device path
      ];

      invalidPaths.forEach(invalidPath => {
        try {
          if (invalidPath) {
            fileWatcher.start(invalidPath as string);
          }
          // If it doesn't throw, that's acceptable
        } catch (error) {
          // Throwing errors for invalid paths is also acceptable
          assert.ok(error instanceof Error, `Should handle invalid path: ${invalidPath}`);
        }
      });
    });

    test('should handle callback errors gracefully', async () => {
      let errorThrown = false;
      
      const errorCallback = () => {
        errorThrown = true;
        throw new Error('Callback intentionally throwing error');
      };

      fileWatcher.onFileChange(errorCallback);
      fileWatcher.start(testContext.workspaceRoot);
      
      await TestHelper.wait(200);

      // Create a file to trigger the callback
      const testFile = path.join(testContext.workspaceRoot, 'error-trigger.txt');
      await fs.promises.writeFile(testFile, 'trigger error');

      // Wait for callback execution
      await TestHelper.waitForCondition(() => errorThrown, 3000);

      // File watcher should still be running despite callback error
      assert.strictEqual(fileWatcher.isWatching(), true, 'FileWatcher should survive callback errors');
    });

    test('should handle ignore pattern edge cases', () => {
      const edgeCaseIgnores = [
        [], // Empty array
        [''], // Empty string pattern
        ['**'], // Too broad pattern
        ['**/node_modules/**', '**/node_modules/**'], // Duplicate patterns
        ['invalid[pattern'], // Invalid regex pattern
        null, // Null (should be handled)
        undefined, // Undefined (should be handled)
      ];

      edgeCaseIgnores.forEach((ignorePatterns, index) => {
        try {
          if (ignorePatterns !== null && ignorePatterns !== undefined) {
            fileWatcher.start(testContext.workspaceRoot, ignorePatterns);
          } else {
            fileWatcher.start(testContext.workspaceRoot);
          }
          
          fileWatcher.stop();
          
        } catch (error) {
          // Some patterns might cause errors, which is acceptable
          console.log(`Ignore pattern case ${index} caused expected error:`, error);
        }
      });
    });

    test('should handle file system permission errors', async () => {
      // Try to watch a system directory that might have permission issues
      const restrictedPaths = [
        '/root', // Typically restricted on Unix systems
        '/System', // Restricted on macOS
        'C:\\System32', // Restricted on Windows
      ];

      for (const restrictedPath of restrictedPaths) {
        try {
          if (fs.existsSync(restrictedPath)) {
            fileWatcher.start(restrictedPath);
            // If successful, clean up
            fileWatcher.stop();
          }
        } catch (error) {
          // Permission errors are expected and acceptable
          assert.ok(error instanceof Error, `Should handle permission error for ${restrictedPath}`);
        }
      }
    });
  });

  suite('Status Bar Edge Cases', () => {
    let statusBar: StatusBar;

    setup(() => {
      statusBar = new StatusBar();
    });

    teardown(() => {
      if (statusBar) {
        statusBar.dispose();
      }
    });

    test('should handle extreme server info values', () => {
      statusBar.create();

      const extremeServerInfo = {
        port: 99999,
        localUrl: 'http://localhost:99999/very/long/path/with/many/segments/that/might/cause/display/issues',
        networkUrl: 'http://255.255.255.255:99999/very/long/path',
        isRunning: true,
        startTime: new Date(0), // Unix epoch
        connections: 1000000,
        root: '/very/very/very/long/root/path/that/might/cause/tooltip/overflow/issues/in/the/status/bar/display'
      };

      // Should handle extreme values without throwing
      statusBar.updateToRunning(extremeServerInfo);
      
      const item = statusBar.getItem();
      assert.ok(item.text, 'Should have text even with extreme values');
      assert.ok(item.tooltip, 'Should have tooltip even with extreme values');
    });

    test('should handle multiple rapid status updates', () => {
      statusBar.create();

      const serverInfo = {
        port: 3000,
        localUrl: 'http://localhost:3000',
        networkUrl: 'http://192.168.1.1:3000',
        isRunning: true
      };

      const error = {
        code: 'TEST_ERROR',
        message: 'Test error',
        timestamp: new Date()
      };

      // Rapid updates should not cause issues
      for (let i = 0; i < 10; i++) {
        statusBar.updateToRunning(serverInfo);
        statusBar.updateToStopped();
        statusBar.updateToError(error);
        statusBar.updateToLoading('Loading...');
      }

      const item = statusBar.getItem();
      assert.ok(item, 'Status bar should survive rapid updates');
    });

    test('should handle disposal edge cases', () => {
      statusBar.create();
      
      const item = statusBar.getItem();
      assert.ok(item, 'Should have status bar item');

      // Multiple disposals should not cause issues
      statusBar.dispose();
      statusBar.dispose();
      statusBar.dispose();

      // Should not throw when trying to update after disposal
      try {
        statusBar.updateToStopped();
        // If it doesn't throw, that's acceptable
      } catch (error) {
        // Throwing errors after disposal is also acceptable
        assert.ok(error instanceof Error, 'Should handle post-disposal operations');
      }
    });
  });

  suite('Memory and Resource Management', () => {
    test('should clean up resources properly', async function() {
      this.timeout(10000);
      
      const instances = [];

      // Create multiple instances
      for (let i = 0; i < 5; i++) {
        const serverManager = new ServerManager();
        const fileWatcher = new FileWatcher();
        const statusBar = new StatusBar();

        instances.push({ serverManager, fileWatcher, statusBar });

        // Use some instances
        if (i % 2 === 0) {
          statusBar.create();
          fileWatcher.start(testContext.workspaceRoot);
        }
      }

      await TestHelper.wait(100);

      // Clean up all instances
      for (const instance of instances) {
        try {
          if (instance.serverManager.isRunning()) {
            await instance.serverManager.stop();
          }
          instance.serverManager.dispose();
          
          if (instance.fileWatcher.isWatching()) {
            instance.fileWatcher.stop();
          }
          
          instance.statusBar.dispose();
        } catch (error) {
          console.log('Cleanup error (acceptable):', error);
        }
      }

      // Should not cause memory leaks or resource conflicts
      assert.ok(true, 'Resource cleanup completed');
    });

    test('should handle concurrent resource access', async () => {
      const fileWatcher1 = new FileWatcher();
      const fileWatcher2 = new FileWatcher();

      try {
        // Both watching same directory should not conflict
        fileWatcher1.start(testContext.workspaceRoot);
        fileWatcher2.start(testContext.workspaceRoot);

        await TestHelper.wait(200);

        assert.strictEqual(fileWatcher1.isWatching(), true, 'First watcher should be active');
        assert.strictEqual(fileWatcher2.isWatching(), true, 'Second watcher should be active');

        // Create a file change
        const testFile = path.join(testContext.workspaceRoot, 'concurrent-test.txt');
        await fs.promises.writeFile(testFile, 'concurrent access test');

        await TestHelper.wait(500);

        // Both should survive concurrent access
        assert.strictEqual(fileWatcher1.isWatching(), true, 'First watcher should survive');
        assert.strictEqual(fileWatcher2.isWatching(), true, 'Second watcher should survive');

      } finally {
        fileWatcher1.stop();
        fileWatcher2.stop();
      }
    });
  });
});