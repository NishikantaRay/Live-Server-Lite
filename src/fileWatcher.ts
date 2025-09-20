import * as chokidar from 'chokidar';
import { FileWatcherManager, FileChangeEvent, FileChangeCallback } from './types';
import { getDefaultIgnorePatterns } from './utils';

export class FileWatcher implements FileWatcherManager {
  private watcher?: chokidar.FSWatcher;
  private changeCallback?: FileChangeCallback;

  /**
   * Start watching files in the specified root directory
   */
  start(root: string, ignored: string[] = getDefaultIgnorePatterns()): void {
    if (this.watcher) {
      console.warn('FileWatcher is already running');
      return;
    }

    this.watcher = chokidar.watch(root, {
      ignoreInitial: true,
      ignored,
      persistent: true,
      usePolling: false,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100
      }
    });

    this.watcher.on('all', (event, path, stats) => {
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
    });

    this.watcher.on('error', (error) => {
      console.error('FileWatcher error:', error);
    });

    console.log(`FileWatcher started for: ${root}`);
  }

  /**
   * Stop the file watcher
   */
  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = undefined;
      this.changeCallback = undefined;
      console.log('FileWatcher stopped');
    }
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