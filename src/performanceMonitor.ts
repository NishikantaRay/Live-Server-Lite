import * as vscode from 'vscode';

export interface PerformanceMetrics {
  extensionStartupTime: number;
  serverStartupTime: number;
  fileWatcherInitTime: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  activeConnections: number;
  lastActivity: Date;
}

export interface PerformanceMonitorOptions {
  enabled: boolean;
  collectInterval: number; // ms
  memoryThreshold: number; // MB
  showWarnings: boolean;
  warningCooldown: number; // ms between warnings
  maxWarningsPerSession: number;
}

/**
 * Performance monitoring and analytics for Live Server Lite
 */
export class PerformanceMonitor {
  private startTime: number;
  private metrics: Partial<PerformanceMetrics> = {};
  private options: PerformanceMonitorOptions;
  private monitoringInterval?: NodeJS.Timeout;
  private lastWarningTime: number = 0;
  private warningCount: number = 0;
  private memoryIssueReported: boolean = false;
  private serverRunning: boolean = false;
  private serverStartTime: number = 0;

  constructor(options: Partial<PerformanceMonitorOptions> = {}) {
    this.startTime = Date.now();
    this.options = {
      enabled: true,
      collectInterval: 30000, // 30 seconds
      memoryThreshold: 200, // 200MB
      showWarnings: true,
      warningCooldown: 300000, // 5 minutes between warnings
      maxWarningsPerSession: 3, // Max 3 warnings per session
      ...options
    };

    if (this.options.enabled) {
      this.startMonitoring();
    }
  }

  /**
   * Record extension startup completion
   */
  recordExtensionStartup(): void {
    this.metrics.extensionStartupTime = Date.now() - this.startTime;
  }

  /**
   * Record server startup time
   */
  recordServerStartup(startTime: number): void {
    this.metrics.serverStartupTime = Date.now() - startTime;
  }

  /**
   * Record file watcher initialization time
   */
  recordFileWatcherInit(startTime: number): void {
    this.metrics.fileWatcherInitTime = Date.now() - startTime;
  }

  /**
   * Update connection count
   */
  updateConnectionCount(count: number): void {
    this.metrics.activeConnections = count;
    this.metrics.lastActivity = new Date();
  }

  /**
   * Notify that server has started
   */
  onServerStart(): void {
    this.serverRunning = true;
    this.serverStartTime = Date.now();
    // Reset warning state when server starts (fresh session)
    this.resetWarnings();
    console.log('Live Server Lite: Performance monitoring active (server started)');
  }

  /**
   * Notify that server has stopped
   */
  onServerStop(): void {
    this.serverRunning = false;
    this.serverStartTime = 0;
    // Reset warnings when server stops
    this.resetWarnings();
    console.log('Live Server Lite: Performance monitoring paused (server stopped)');
  }

  /**
   * Check if server is currently running
   */
  isServerRunning(): boolean {
    return this.serverRunning;
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    this.collectCurrentMetrics();
    return this.metrics as PerformanceMetrics;
  }

  /**
   * Start continuous monitoring
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.collectCurrentMetrics();
      this.checkThresholds();
    }, this.options.collectInterval);
  }

  /**
   * Collect current performance metrics
   */
  private collectCurrentMetrics(): void {
    const memUsage = process.memoryUsage();
    this.metrics.memoryUsage = {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100, // MB
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100, // MB
      external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100, // MB
      rss: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100 // MB
    };
  }

  /**
   * Check performance thresholds and show smart warnings
   * Only shows warnings when server is actively running
   */
  private checkThresholds(): void {
    if (!this.options.showWarnings || !this.metrics.memoryUsage) {
      return;
    }

    // CRITICAL: Only show memory warnings when server is actually running
    if (!this.serverRunning) {
      return;
    }

    const memUsage = this.metrics.memoryUsage.rss;
    const now = Date.now();
    const serverUptime = this.serverStartTime > 0 ? now - this.serverStartTime : 0;
    
    // Only warn if memory is significantly high AND server has been running for at least 30 seconds
    if (memUsage > this.options.memoryThreshold && serverUptime > 30000) {
      // Smart warning logic - don't spam user
      const shouldWarn = (
        // First time warning
        this.warningCount === 0 ||
        // Cooldown period passed AND haven't exceeded max warnings
        (now - this.lastWarningTime > this.options.warningCooldown && 
         this.warningCount < this.options.maxWarningsPerSession)
      );

      if (shouldWarn && !this.memoryIssueReported) {
        this.showMemoryWarning(memUsage);
        this.lastWarningTime = now;
        this.warningCount++;
        
        // If we've reached max warnings, mark as reported for this session
        if (this.warningCount >= this.options.maxWarningsPerSession) {
          this.memoryIssueReported = true;
          console.log('Live Server Lite: Memory warnings disabled for this session (max reached)');
        }
      }
    } else {
      // Memory is back to normal, reset warning state
      if (this.memoryIssueReported || this.warningCount > 0) {
        this.memoryIssueReported = false;
        this.warningCount = 0;
        console.log('Live Server Lite: Memory usage normalized, warning system reset');
      }
    }
  }

  /**
   * Show smart memory usage warning with better UX
   * Only shown when server is actively running
   */
  private async showMemoryWarning(currentUsage: number): Promise<void> {
    const warningNumber = this.warningCount + 1;
    const remainingWarnings = this.options.maxWarningsPerSession - warningNumber;
    const serverUptime = this.serverStartTime > 0 ? 
      Math.round((Date.now() - this.serverStartTime) / 1000) : 0;
    
    let message = `⚠️ Live Server is using ${currentUsage}MB of memory`;
    
    if (serverUptime > 0) {
      message += ` (running for ${Math.floor(serverUptime / 60)}m ${serverUptime % 60}s)`;
    }
    
    if (currentUsage > 500) {
      message += '. This is unusually high and may affect performance.';
    } else {
      message += '. Consider optimizing if experiencing slowness.';
    }
    
    if (remainingWarnings > 0) {
      message += ` (${remainingWarnings} more warnings this session)`;
    } else {
      message += ' (final warning this session)';
    }

    const actions = ['Optimize Settings', 'Restart Extension', 'Show Report', 'Dismiss'];
    
    const action = await vscode.window.showWarningMessage(message, ...actions);

    switch (action) {
      case 'Optimize Settings':
        await this.showOptimizationSuggestions();
        break;
      case 'Restart Extension':
        await vscode.commands.executeCommand('workbench.action.reloadWindow');
        break;
      case 'Show Report':
        await this.showReport();
        break;
      case 'Dismiss':
        // User dismissed, reduce warning frequency
        this.options.warningCooldown = Math.min(this.options.warningCooldown * 2, 1800000); // Max 30min
        break;
    }
  }

  /**
   * Show optimization suggestions
   */
  private async showOptimizationSuggestions(): Promise<void> {
    const suggestions = [
      '📁 **Ignore Large Directories**: Add node_modules, dist, build to ignore patterns',
      '⏱️ **Increase Debounce**: Set debounceDelay to 1000ms or higher',
      '🔄 **Enable Batching**: Ensure watcher.batchEvents is true',
      '🚫 **Disable Monitoring**: Set performance.monitoring to false',
      '💾 **Lower Threshold**: Increase memory threshold to reduce warnings',
      '',
      '**Quick Fix**: Add to settings.json:',
      '```json',
      '{',
      '  "liveServerLite.watcher.largeProjectOptimization": true,',
      '  "liveServerLite.ignoreFiles": ["node_modules/**", "dist/**"],',
      '  "liveServerLite.debounceDelay": 1000',
      '}',
      '```'
    ].join('\n');

    const action = await vscode.window.showInformationMessage(
      suggestions,
      { modal: true },
      'Open Settings',
      'Copy Settings'
    );

    if (action === 'Open Settings') {
      await vscode.commands.executeCommand('workbench.action.openSettings', 'liveServerLite');
    } else if (action === 'Copy Settings') {
      const settingsText = `{
  "liveServerLite.watcher.largeProjectOptimization": true,
  "liveServerLite.ignoreFiles": ["node_modules/**", "dist/**", "build/**"],
  "liveServerLite.debounceDelay": 1000,
  "liveServerLite.performance.memoryThreshold": 500
}`;
      await vscode.env.clipboard.writeText(settingsText);
      vscode.window.showInformationMessage('📋 Optimization settings copied to clipboard!');
    }
  }

  /**
   * Reset warning state (useful for testing or manual reset)
   */
  resetWarnings(): void {
    this.warningCount = 0;
    this.lastWarningTime = 0;
    this.memoryIssueReported = false;
    console.log('Live Server Lite: Warning system reset manually');
  }
  generateReport(): string {
    const metrics = this.getMetrics();
    const serverUptime = this.serverStartTime > 0 ? 
      Math.round((Date.now() - this.serverStartTime) / 1000) : 0;
    
    return [
      '📊 **Live Server Lite Performance Report**',
      '',
      `�️ **Server Status:**`,
      `  • Running: ${this.serverRunning ? '✅ Yes' : '❌ No'}`,
      `  • Uptime: ${serverUptime > 0 ? `${Math.floor(serverUptime / 60)}m ${serverUptime % 60}s` : 'N/A'}`,
      `  • Warnings: ${this.warningCount}/${this.options.maxWarningsPerSession}`,
      '',
      `�🚀 **Startup Times:**`,
      `  • Extension: ${metrics.extensionStartupTime || 'N/A'}ms`,
      `  • Server: ${metrics.serverStartupTime || 'N/A'}ms`,
      `  • File Watcher: ${metrics.fileWatcherInitTime || 'N/A'}ms`,
      '',
      `💾 **Memory Usage:**`,
      `  • Heap Used: ${metrics.memoryUsage?.heapUsed || 'N/A'}MB`,
      `  • Heap Total: ${metrics.memoryUsage?.heapTotal || 'N/A'}MB`,
      `  • RSS: ${metrics.memoryUsage?.rss || 'N/A'}MB`,
      `  • Threshold: ${this.options.memoryThreshold}MB`,
      '',
      `🌐 **Network:**`,
      `  • Active Connections: ${metrics.activeConnections || 0}`,
      `  • Last Activity: ${metrics.lastActivity?.toLocaleString() || 'N/A'}`,
      '',
      `⏰ **Monitoring Since:** ${new Date(this.startTime).toLocaleString()}`
    ].join('\n');
  }

  /**
   * Show performance report
   */
  async showReport(): Promise<void> {
    const report = this.generateReport();
    await vscode.window.showInformationMessage(report, { modal: true });
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    
    // Reset warning state on disposal
    this.resetWarnings();
  }
}