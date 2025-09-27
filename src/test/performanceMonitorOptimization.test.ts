import * as assert from 'assert';
import * as vscode from 'vscode';
import { PerformanceMonitor } from '../performanceMonitor';

suite('Performance Monitor Memory Optimization Tests', () => {
  let performanceMonitor: PerformanceMonitor;
  let mockServerRunning = false;

  setup(() => {
    // Create performance monitor with test-friendly settings
    performanceMonitor = new PerformanceMonitor({
      enabled: true,
      collectInterval: 1000, // 1 second for faster testing
      memoryThreshold: 100, // Low threshold for testing
      showWarnings: true,
      warningCooldown: 2000, // 2 seconds for testing
      maxWarningsPerSession: 2
    });
  });

  teardown(() => {
    if (performanceMonitor) {
      performanceMonitor.dispose();
    }
  });

  suite('Server State Tracking', () => {
    test('should track server start/stop state correctly', () => {
      assert.strictEqual(performanceMonitor.isServerRunning(), false, 'Should start with server stopped');
      
      performanceMonitor.onServerStart();
      assert.strictEqual(performanceMonitor.isServerRunning(), true, 'Should track server as running');
      
      performanceMonitor.onServerStop();
      assert.strictEqual(performanceMonitor.isServerRunning(), false, 'Should track server as stopped');
    });

    test('should reset warning state on server start', () => {
      // Simulate some warnings
      (performanceMonitor as any).warningCount = 2;
      (performanceMonitor as any).memoryIssueReported = true;
      
      performanceMonitor.onServerStart();
      
      assert.strictEqual((performanceMonitor as any).warningCount, 0, 'Should reset warning count');
      assert.strictEqual((performanceMonitor as any).memoryIssueReported, false, 'Should reset memory issue flag');
    });

    test('should reset warning state on server stop', () => {
      // Simulate some warnings
      (performanceMonitor as any).warningCount = 1;
      (performanceMonitor as any).memoryIssueReported = true;
      
      performanceMonitor.onServerStop();
      
      assert.strictEqual((performanceMonitor as any).warningCount, 0, 'Should reset warning count');
      assert.strictEqual((performanceMonitor as any).memoryIssueReported, false, 'Should reset memory issue flag');
    });
  });

  suite('Memory Warning Logic', () => {
    test('should not show warnings when server is stopped', async () => {
      let warningShown = false;
      
      // Mock showMemoryWarning to track if it's called
      (performanceMonitor as any).showMemoryWarning = async () => {
        warningShown = true;
      };
      
      // Mock high memory usage
      (performanceMonitor as any).metrics = {
        memoryUsage: { rss: 200 } // Above threshold
      };
      
      // Server is stopped, should not warn
      (performanceMonitor as any).checkThresholds();
      
      assert.strictEqual(warningShown, false, 'Should not show warning when server is stopped');
    });

    test('should show warnings when server is running and memory is high', async () => {
      let warningShown = false;
      let warningMessage = '';
      
      // Mock showMemoryWarning to track calls
      (performanceMonitor as any).showMemoryWarning = async (usage: number) => {
        warningShown = true;
        warningMessage = `Warning for ${usage}MB`;
      };
      
      // Start server and wait for startup period
      performanceMonitor.onServerStart();
      (performanceMonitor as any).serverStartTime = Date.now() - 31000; // 31 seconds ago
      
      // Mock high memory usage
      (performanceMonitor as any).metrics = {
        memoryUsage: { rss: 200 } // Above threshold
      };
      
      // Should show warning now
      (performanceMonitor as any).checkThresholds();
      
      assert.strictEqual(warningShown, true, 'Should show warning when server is running and memory is high');
      assert.ok(warningMessage.includes('200MB'), 'Should include memory usage in warning');
    });

    test('should respect startup grace period', async () => {
      let warningShown = false;
      
      // Mock showMemoryWarning
      (performanceMonitor as any).showMemoryWarning = async () => {
        warningShown = true;
      };
      
      // Start server recently (within grace period)
      performanceMonitor.onServerStart();
      (performanceMonitor as any).serverStartTime = Date.now() - 15000; // 15 seconds ago
      
      // Mock high memory usage
      (performanceMonitor as any).metrics = {
        memoryUsage: { rss: 200 }
      };
      
      // Should not warn during grace period
      (performanceMonitor as any).checkThresholds();
      
      assert.strictEqual(warningShown, false, 'Should not warn during startup grace period');
    });

    test('should respect warning cooldown period', async () => {
      let warningCount = 0;
      
      // Mock showMemoryWarning to count calls
      (performanceMonitor as any).showMemoryWarning = async () => {
        warningCount++;
      };
      
      // Setup server running state
      performanceMonitor.onServerStart();
      (performanceMonitor as any).serverStartTime = Date.now() - 31000;
      (performanceMonitor as any).metrics = { memoryUsage: { rss: 200 } };
      
      // First warning should show
      (performanceMonitor as any).checkThresholds();
      assert.strictEqual(warningCount, 1, 'First warning should show');
      
      // Immediate second check should not warn (cooldown)
      (performanceMonitor as any).checkThresholds();
      assert.strictEqual(warningCount, 1, 'Should respect cooldown period');
      
      // Simulate cooldown period passed
      (performanceMonitor as any).lastWarningTime = Date.now() - 3000; // 3 seconds ago
      (performanceMonitor as any).checkThresholds();
      assert.strictEqual(warningCount, 2, 'Should warn after cooldown period');
    });

    test('should respect maximum warnings per session', async () => {
      let warningCount = 0;
      
      // Mock showMemoryWarning
      (performanceMonitor as any).showMemoryWarning = async () => {
        warningCount++;
      };
      
      // Setup server running state
      performanceMonitor.onServerStart();
      (performanceMonitor as any).serverStartTime = Date.now() - 31000;
      (performanceMonitor as any).metrics = { memoryUsage: { rss: 200 } };
      
      // Simulate warnings up to maximum
      (performanceMonitor as any).checkThresholds(); // Warning 1
      (performanceMonitor as any).lastWarningTime = Date.now() - 3000;
      (performanceMonitor as any).checkThresholds(); // Warning 2
      
      assert.strictEqual(warningCount, 2, 'Should show maximum warnings');
      
      // Try to trigger another warning
      (performanceMonitor as any).lastWarningTime = Date.now() - 3000;
      (performanceMonitor as any).checkThresholds(); // Should not warn
      
      assert.strictEqual(warningCount, 2, 'Should not exceed maximum warnings per session');
      assert.strictEqual((performanceMonitor as any).memoryIssueReported, true, 'Should mark issue as reported');
    });

    test('should reset warning state when memory normalizes', async () => {
      // Setup high memory warning state
      performanceMonitor.onServerStart();
      (performanceMonitor as any).serverStartTime = Date.now() - 31000;
      (performanceMonitor as any).warningCount = 2;
      (performanceMonitor as any).memoryIssueReported = true;
      
      // Simulate memory returning to normal
      (performanceMonitor as any).metrics = { memoryUsage: { rss: 50 } }; // Below threshold
      (performanceMonitor as any).checkThresholds();
      
      assert.strictEqual((performanceMonitor as any).warningCount, 0, 'Should reset warning count');
      assert.strictEqual((performanceMonitor as any).memoryIssueReported, false, 'Should reset memory issue flag');
    });
  });

  suite('Performance Report', () => {
    test('should include server state in performance report', () => {
      performanceMonitor.onServerStart();
      
      const report = performanceMonitor.generateReport();
      
      assert.ok(report.includes('Server Status:'), 'Should include server status section');
      assert.ok(report.includes('Running: ✅ Yes'), 'Should show server as running');
      assert.ok(report.includes('Uptime:'), 'Should include uptime information');
      assert.ok(report.includes('Warnings:'), 'Should include warning count');
    });

    test('should show server as stopped in report when not running', () => {
      const report = performanceMonitor.generateReport();
      
      assert.ok(report.includes('Running: ❌ No'), 'Should show server as not running');
      assert.ok(report.includes('Uptime: N/A'), 'Should show N/A for uptime when stopped');
    });
  });

  suite('Manual Warning Reset', () => {
    test('should manually reset warning state', () => {
      // Setup warning state
      (performanceMonitor as any).warningCount = 2;
      (performanceMonitor as any).memoryIssueReported = true;
      (performanceMonitor as any).lastWarningTime = Date.now();
      
      performanceMonitor.resetWarnings();
      
      assert.strictEqual((performanceMonitor as any).warningCount, 0, 'Should reset warning count');
      assert.strictEqual((performanceMonitor as any).memoryIssueReported, false, 'Should reset memory issue flag');
      assert.strictEqual((performanceMonitor as any).lastWarningTime, 0, 'Should reset last warning time');
    });
  });

  suite('Disposal Cleanup', () => {
    test('should reset warning state on disposal', () => {
      // Setup warning state
      (performanceMonitor as any).warningCount = 1;
      (performanceMonitor as any).memoryIssueReported = true;
      
      performanceMonitor.dispose();
      
      assert.strictEqual((performanceMonitor as any).warningCount, 0, 'Should reset warning count on disposal');
      assert.strictEqual((performanceMonitor as any).memoryIssueReported, false, 'Should reset memory issue flag on disposal');
    });
  });

  suite('Integration with Server Manager', () => {
    test('should properly integrate with server lifecycle', () => {
      // Simulate server manager lifecycle
      assert.strictEqual(performanceMonitor.isServerRunning(), false, 'Should start stopped');
      
      // Server starts
      performanceMonitor.onServerStart();
      assert.strictEqual(performanceMonitor.isServerRunning(), true, 'Should track server start');
      
      // Server stops  
      performanceMonitor.onServerStop();
      assert.strictEqual(performanceMonitor.isServerRunning(), false, 'Should track server stop');
    });
  });
});