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
  private watchRoot?: string;
  private watchIgnored: string[] = [];
  private watchOptions: WatcherOptions = {};
  private extraIgnorePatterns: string[] = [];

  /**
   * Start watching files in the specified root directory with optimizations for large projects
   */
  start(root: string, ignored: string[] = [], options: WatcherOptions = {}): void {
    if (this.watcher) {
      console.warn('FileWatcher is already running');
      return;
    }

    this.watchRoot = root;
    this.watchIgnored = ignored;
    this.watchOptions = options;

    this.options = { ...this.getDefaultOptions(), ...options };

    // Enhanced ignore patterns for large projects
    const allIgnored = [...ignored, ...this.extraIgnorePatterns];
    const optimizedIgnored = this.options.largeProjectOptimization
      ? this.getOptimizedIgnorePatterns(allIgnored)
      : allIgnored;

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
      this.batchedEvents = [];
      this.batchTimer = undefined;
      return;
    }

    try {
      // Use the last event to represent the entire batch — triggers a single reload
      const lastEvent = this.batchedEvents[this.batchedEvents.length - 1];
      console.log(`Batch of ${this.batchedEvents.length} file change(s), triggering reload`);
      this.changeCallback(lastEvent);
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
    if (!this.watchRoot) {
      return;
    }
    const savedCallback = this.changeCallback;
    this.stop();
    this.start(
      this.watchRoot,
      [...this.watchIgnored, ...this.extraIgnorePatterns],
      this.watchOptions
    );
    if (savedCallback) {
      this.changeCallback = savedCallback;
    }
  }

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

  addIgnorePattern(pattern: string): void {
    if (!this.extraIgnorePatterns.includes(pattern)) {
      this.extraIgnorePatterns.push(pattern);
      if (this.isWatching()) {
        this.restart();
      }
    }
  }

  removeIgnorePattern(pattern: string): void {
    const idx = this.extraIgnorePatterns.indexOf(pattern);
    if (idx !== -1) {
      this.extraIgnorePatterns.splice(idx, 1);
      if (this.isWatching()) {
        this.restart();
      }
    }
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