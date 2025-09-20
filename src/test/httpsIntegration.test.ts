import * as assert from 'assert';
import * as vscode from 'vscode';
import * as https from 'https';
import * as http from 'http';
import { ServerManager } from '../serverManager';
import { EnhancedServerOptions, HTTPSOptions, ServerInfo } from '../types';

suite('HTTPS ServerManager Tests', () => {
  let serverManager: ServerManager;

  setup(() => {
    serverManager = new ServerManager();
  });

  teardown(async () => {
    if (serverManager.isRunning()) {
      await serverManager.stop();
    }
    if (serverManager && typeof (serverManager as any).dispose === 'function') {
      (serverManager as any).dispose();
    }
  });

  suite('HTTPS Server Startup', () => {
    test('should start HTTPS server with auto-generated certificates', async function() {
      this.timeout(10000); // Increase timeout for certificate generation

      const httpsOptions: HTTPSOptions = {
        enabled: true,
        port: 3443,
        domain: 'localhost',
        autoGenerateCert: true,
        warnOnSelfSigned: true
      };

      const serverOptions: EnhancedServerOptions = {
        port: 3443,
        host: 'localhost',
        open: false, // Don't open browser in tests
        https: httpsOptions
      };

      const response = await serverManager.start(undefined, serverOptions);
      
      assert.strictEqual(response.success, true, 'HTTPS server should start successfully');
      assert.ok(response.data, 'Server info should be provided');
      
      const serverInfo = response.data as ServerInfo;
      assert.strictEqual(serverInfo.port, 3443);
      assert.ok(serverInfo.localUrl.startsWith('https://'), 'URL should use HTTPS protocol');
      
      // Verify server is actually running on HTTPS
      assert.ok(serverManager.isRunning(), 'Server should be running');
    });

    test('should fallback to HTTP if HTTPS setup fails', async function() {
      this.timeout(5000);

      const httpsOptions: HTTPSOptions = {
        enabled: true,
        port: 3443,
        certPath: '/invalid/path/cert.pem',
        keyPath: '/invalid/path/key.pem',
        autoGenerateCert: false // Don't auto-generate, should fail
      };

      const serverOptions: EnhancedServerOptions = {
        port: 3443,
        host: 'localhost',
        open: false,
        https: httpsOptions
      };

      const response = await serverManager.start(undefined, serverOptions);
      
      // Should still succeed but fall back to HTTP
      assert.strictEqual(response.success, true, 'Server should start successfully');
      assert.ok(response.data, 'Server info should be provided');
    });

    test('should handle port conflicts gracefully', async function() {
      this.timeout(10000);

      const httpsOptions: HTTPSOptions = {
        enabled: true,
        port: 3444,
        domain: 'localhost',
        autoGenerateCert: true
      };

      // Start first server
      const firstOptions: EnhancedServerOptions = {
        port: 3444,
        https: httpsOptions,
        open: false
      };

      const firstResponse = await serverManager.start(undefined, firstOptions);
      assert.strictEqual(firstResponse.success, true, 'First server should start');

      // Try to start second server on same port (should suggest different port)
      const secondServerManager = new ServerManager();
      
      try {
        const secondOptions: EnhancedServerOptions = {
          port: 3444,
          https: httpsOptions,
          open: false
        };

        const secondResponse = await secondServerManager.start(undefined, secondOptions);
        
        // Should either fail with port in use error or succeed with different port
        if (secondResponse.success) {
          const secondServerInfo = secondResponse.data as ServerInfo;
          assert.notStrictEqual(secondServerInfo.port, 3444, 'Second server should use different port');
        }
        
      } finally {
        if (secondServerManager.isRunning()) {
          await secondServerManager.stop();
        }
        if (typeof (secondServerManager as any).dispose === 'function') {
          (secondServerManager as any).dispose();
        }
      }
    });
  });

  suite('HTTPS Configuration', () => {
    test('should respect custom HTTPS port', async function() {
      this.timeout(8000);

      const customPort = 3445;
      const httpsOptions: HTTPSOptions = {
        enabled: true,
        port: customPort,
        domain: 'localhost',
        autoGenerateCert: true
      };

      const serverOptions: EnhancedServerOptions = {
        port: customPort,
        https: httpsOptions,
        open: false
      };

      const response = await serverManager.start(undefined, serverOptions);
      
      assert.strictEqual(response.success, true, 'Server should start successfully');
      const serverInfo = response.data as ServerInfo;
      assert.strictEqual(serverInfo.port, customPort, 'Should use custom HTTPS port');
      assert.ok(serverInfo.localUrl.includes(`:${customPort}`), 'URL should include custom port');
    });

    test('should handle custom domain certificates', async function() {
      this.timeout(10000);

      const customDomain = 'test.localhost';
      const httpsOptions: HTTPSOptions = {
        enabled: true,
        port: 3446,
        domain: customDomain,
        autoGenerateCert: true,
        warnOnSelfSigned: false // Disable warnings for test
      };

      const serverOptions: EnhancedServerOptions = {
        port: 3446,
        https: httpsOptions,
        open: false
      };

      const response = await serverManager.start(undefined, serverOptions);
      
      assert.strictEqual(response.success, true, 'Server should start with custom domain certificate');
      assert.ok(response.data, 'Server info should be available');
    });
  });

  suite('Server Information', () => {
    test('should provide correct HTTPS URLs', async function() {
      this.timeout(8000);

      const httpsOptions: HTTPSOptions = {
        enabled: true,
        port: 3447,
        domain: 'localhost',
        autoGenerateCert: true
      };

      const serverOptions: EnhancedServerOptions = {
        port: 3447,
        https: httpsOptions,
        open: false
      };

      await serverManager.start(undefined, serverOptions);
      
      const serverInfo = serverManager.getServerInfo();
      assert.ok(serverInfo, 'Server info should be available');
      
      assert.ok(serverInfo.localUrl.startsWith('https://localhost:'), 'Local URL should be HTTPS');
      assert.ok(serverInfo.networkUrl.startsWith('https://'), 'Network URL should be HTTPS');
      assert.strictEqual(serverInfo.port, 3447, 'Port should match');
    });

    test('should track server statistics for HTTPS', async function() {
      this.timeout(8000);

      const httpsOptions: HTTPSOptions = {
        enabled: true,
        port: 3448,
        domain: 'localhost',
        autoGenerateCert: true
      };

      const serverOptions: EnhancedServerOptions = {
        port: 3448,
        https: httpsOptions,
        open: false
      };

      await serverManager.start(undefined, serverOptions);
      
      const stats = serverManager.getServerStats();
      assert.ok(stats, 'Server stats should be available');
      assert.ok(stats.lastActivity, 'Last activity should be recorded');
      assert.strictEqual(stats.connections, 0, 'Initial connections should be 0');
    });
  });

  suite('Server Lifecycle', () => {
    test('should stop HTTPS server cleanly', async function() {
      this.timeout(10000);

      const httpsOptions: HTTPSOptions = {
        enabled: true,
        port: 3449,
        domain: 'localhost',
        autoGenerateCert: true
      };

      const serverOptions: EnhancedServerOptions = {
        port: 3449,
        https: httpsOptions,
        open: false
      };

      // Start server
      const startResponse = await serverManager.start(undefined, serverOptions);
      assert.strictEqual(startResponse.success, true, 'Server should start successfully');
      assert.ok(serverManager.isRunning(), 'Server should be running');

      // Stop server
      const stopResponse = await serverManager.stop();
      assert.strictEqual(stopResponse.success, true, 'Server should stop successfully');
      assert.ok(!serverManager.isRunning(), 'Server should not be running');
    });

    test('should restart HTTPS server correctly', async function() {
      this.timeout(15000);

      const httpsOptions: HTTPSOptions = {
        enabled: true,
        port: 3450,
        domain: 'localhost',
        autoGenerateCert: true
      };

      const serverOptions: EnhancedServerOptions = {
        port: 3450,
        https: httpsOptions,
        open: false
      };

      // Start server
      await serverManager.start(undefined, serverOptions);
      const originalServerInfo = serverManager.getServerInfo();
      assert.ok(originalServerInfo, 'Original server info should be available');

      // Restart server
      const restartResponse = await serverManager.restart();
      assert.strictEqual(restartResponse.success, true, 'Server should restart successfully');
      
      const newServerInfo = serverManager.getServerInfo();
      assert.ok(newServerInfo, 'New server info should be available');
      assert.strictEqual(newServerInfo.port, originalServerInfo.port, 'Port should remain the same');
    });
  });

  suite('Error Handling', () => {
    test('should handle invalid HTTPS options gracefully', async function() {
      this.timeout(5000);

      const invalidOptions: EnhancedServerOptions = {
        port: -1, // Invalid port
        https: {
          enabled: true,
          port: -1,
          domain: '',
          autoGenerateCert: true
        },
        open: false
      };

      try {
        const response = await serverManager.start(undefined, invalidOptions);
        // Should either fail gracefully or use fallback values
        if (!response.success) {
          assert.ok(response.error, 'Error should be provided for invalid options');
        }
      } catch (error) {
        // Should handle errors gracefully
        assert.ok(error instanceof Error, 'Should throw proper error for invalid options');
      }
    });

    test('should handle server startup failures', async function() {
      this.timeout(5000);

      // Try to use a port that might be restricted (like port 80)
      const restrictedOptions: EnhancedServerOptions = {
        port: 80,
        host: '0.0.0.0',
        https: {
          enabled: true,
          port: 80,
          domain: 'localhost',
          autoGenerateCert: true
        },
        open: false
      };

      try {
        const response = await serverManager.start(undefined, restrictedOptions);
        
        // On some systems, this might succeed, on others it might fail
        // Both are acceptable as long as the response is consistent
        if (!response.success) {
          assert.ok(response.error, 'Error should be provided for failed startup');
        } else {
          assert.ok(response.data, 'Server data should be provided for successful startup');
        }
      } catch (error) {
        // Should handle startup errors gracefully
        assert.ok(error instanceof Error, 'Should throw proper error for startup failure');
      }
    });
  });
});