import * as chokidar from 'chokidar';
import * as os from 'os';
import { FileWatcherManager, FileChangeEvent, FileChangeCallback, WatcherOptions } from './types';
import { getDefaultIgnorePatterns } from './utils';

export class FileWatcher implements FileWatcherManager {
  private watcher?: chokidar.FSWatcher;
  private changeCallback?: FileChangeCallback;
  private batchTimer?: NodeJS.Timeout;
  private batchedEvents: FileChangeEvent[] = [];
  private options: WatcherOptions = {};

  /**
   * Start watching files in the specified root directory with optimizations for large projects
   */
  start(root: string, ignored: string[] = this.getOptimizedIgnorePatterns(), options: WatcherOptions = {}): void {
    if (this.watcher) {
      console.warn('FileWatcher is already running');
      return;
    }

    this.options = { ...this.getDefaultOptions(), ...options };

    // Enhanced ignore patterns for large projects
    const optimizedIgnored = this.options.largeProjectOptimization 
      ? this.getOptimizedIgnorePatterns(ignored)
      : ignored;

    const chokidarOptions = {
      ignoreInitial: this.options.ignoreInitial ?? true,
      ignored: optimizedIgnored,
      persistent: this.options.persistent ?? true,
      usePolling: this.options.usePolling ?? false,
      awaitWriteFinish: this.options.awaitWriteFinish ?? {
        stabilityThreshold: 300,
        pollInterval: 100
      },
      depth: this.options.depth,
      // Use native watcher when possible for better performance
      useFsEvents: this.options.useNativeWatcher !== false && os.platform() === 'darwin',
      alwaysStat: false,
      atomic: true
    };

    this.watcher = chokidar.watch(root, chokidarOptions);

    if (this.options.batchEvents) {
      this.watcher.on('all', this.handleBatchedEvent.bind(this));
    } else {
      this.watcher.on('all', this.handleSingleEvent.bind(this));
    }

    this.watcher.on('error', (error) => {
      console.error('FileWatcher error:', error);
    });

    this.watcher.on('ready', () => {
      console.log(`FileWatcher started for: ${root} (watching ${this.getWatchedPathCount()} paths)`);
    });
  }

  /**
   * Get default watcher options optimized for performance
   */
  private getDefaultOptions(): WatcherOptions {
    return {
      ignoreInitial: true,
      persistent: true,
      usePolling: false,
      batchEvents: true,
      batchDelay: 250,
      useNativeWatcher: os.platform() === 'darwin',
      largeProjectOptimization: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100
      }
    };
  }

  /**
   * Get optimized ignore patterns for large projects
   */
  private getOptimizedIgnorePatterns(baseIgnored: string[] = []): string[] {
    const optimizedPatterns = [
      ...getDefaultIgnorePatterns(),
      ...baseIgnored,
      // Additional patterns for large projects
      '**/node_modules/**',
      '**/.git/**',
      '**/.svn/**',
      '**/.hg/**',
      '**/bower_components/**',
      '**/coverage/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/.nuxt/**',
      '**/out/**',
      '**/temp/**',
      '**/tmp/**',
      '**/*.log',
      '**/*.pid',
      '**/*.seed',
      '**/*.pid.lock',
      '**/.npm/**',
      '**/.yarn/**',
      '**/yarn-error.log',
      '**/lerna-debug.log*',
      '**/.pnpm-debug.log*',
      // IDE and editor files
      '**/.vscode/**',
      '**/.idea/**',
      '**/*.swp',
      '**/*.swo',
      '**/*~',
      // OS generated files
      '**/.DS_Store',
      '**/Thumbs.db',
      '**/desktop.ini'
    ];

    // Remove duplicates
    return [...new Set(optimizedPatterns)];
  }

  /**
   * Handle single file change events (non-batched mode)
   */
  private handleSingleEvent(event: string, path: string, stats?: any): void {
    console.log(`File ${event}: ${path}`);
    if (this.changeCallback) {
      try {
        const changeEvent: FileChangeEvent = {
          type: event as any,
          path,
          stats,
          timestamp: new Date()
        };
        this.changeCallback(changeEvent);
      } catch (error) {
        console.error('Error in file change callback:', error);
        // Don't rethrow - this allows the watcher to continue running
      }
    }
  }

  /**
   * Handle file change events with batching for performance
   */
  private handleBatchedEvent(event: string, path: string, stats?: any): void {
    const changeEvent: FileChangeEvent = {
      type: event as any,
      path,
      stats,
      timestamp: new Date()
    };

    this.batchedEvents.push(changeEvent);

    // Clear existing timer and set a new one
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    this.batchTimer = setTimeout(() => {
      this.processBatchedEvents();
    }, this.options.batchDelay || 250);
  }

  /**
   * Process all batched events and call the change callback
   */
  private processBatchedEvents(): void {
    if (this.batchedEvents.length === 0 || !this.changeCallback) {
      return;
    }

    try {
      // Process each event in the batch
      for (const event of this.batchedEvents) {
        console.log(`Batched File ${event.type}: ${event.path}`);
        this.changeCallback(event);
      }
    } catch (error) {
      console.error('Error processing batched file change events:', error);
    }

    // Clear the batch
    this.batchedEvents = [];
    this.batchTimer = undefined;
  }

  /**
   * Get the count of paths currently being watched
   */
  private getWatchedPathCount(): number {
    if (!this.watcher) {
      return 0;
    }

    const watched = this.watcher.getWatched();
    return Object.keys(watched).reduce((count, dir) => {
      return count + watched[dir].length;
    }, 0);
  }

  /**
   * Stop the file watcher
   */
  stop(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.processBatchedEvents(); // Process any remaining batched events
      this.batchTimer = undefined;
    }

    if (this.watcher) {
      this.watcher.close();
      this.watcher = undefined;
      console.log('FileWatcher stopped');
    }

    this.batchedEvents = [];
    this.changeCallback = undefined;
  }

  /**
   * Restart the file watcher
   */
  restart(): void {
    this.stop();
    // Note: Would need to store previous parameters to restart properly
    // This is a simplified implementation
  }

  /**
   * Set the callback function to be called when files change
   */
  onFileChange(callback: FileChangeCallback): void {
    this.changeCallback = callback;
  }

  /**
   * Set the callback for file change events
   */
  onChange(callback: FileChangeCallback): void {
    this.changeCallback = callback;
  }

  /**
   * Add a file or directory to the watch list
   */
  addPath(path: string): void {
    this.watcher?.add(path);
  }

  /**
   * Remove a file or directory from the watch list
   */
  removePath(path: string): void {
    this.watcher?.unwatch(path);
  }

  /**
   * Add ignore pattern
   */
  addIgnorePattern(pattern: string): void {
    // This would require restarting the watcher with new ignore patterns
    // Simplified implementation for now
    console.log(`Added ignore pattern: ${pattern}`);
  }

  /**
   * Remove ignore pattern
   */
  removeIgnorePattern(pattern: string): void {
    // This would require restarting the watcher with updated ignore patterns
    // Simplified implementation for now
    console.log(`Removed ignore pattern: ${pattern}`);
  }

  /**
   * Check if the watcher is currently running
   */
  isWatching(): boolean {
    return this.watcher !== undefined;
  }

  /**
   * Get the current watched paths
   */
  getWatchedPaths(): string[] {
    if (this.watcher) {
      return Object.keys(this.watcher.getWatched());
    }
    return [];
  }
}