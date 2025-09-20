import * as vscode from 'vscode';
import { StatusBarManager, ServerInfo, ServerError } from './types';

export class StatusBar implements StatusBarManager {
  private statusBarItem: vscode.StatusBarItem;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  }

  /**
   * Create and show the status bar item
   */
  create(): void {
    this.updateToStopped();
    this.statusBarItem.show();
  }

  /**
   * Update status bar to show running state
   */
  updateToRunning(serverInfo: ServerInfo): void {
    this.statusBarItem.text = '$(debug-stop) Stop Live Server';
    this.statusBarItem.command = 'liveServerLite.stop';
    this.statusBarItem.tooltip = `Live Server running on port ${serverInfo.port}\n• Local: ${serverInfo.localUrl}\n• Network: ${serverInfo.networkUrl}`;
    this.statusBarItem.backgroundColor = undefined;
  }

  /**
   * Update status bar to show stopped state
   */
  updateToStopped(): void {
    this.statusBarItem.text = '$(broadcast) Go Live';
    this.statusBarItem.command = 'liveServerLite.start';
    this.statusBarItem.tooltip = 'Click to run Live Server Lite';
    this.statusBarItem.backgroundColor = undefined;
  }

  /**
   * Update status bar to show error state
   */
  updateToError(error: ServerError): void {
    this.statusBarItem.text = '$(warning) Server Error';
    this.statusBarItem.command = 'liveServerLite.start';
    this.statusBarItem.tooltip = `Error: ${error.message}\nClick to retry`;
    this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
  }

  /**
   * Update status bar to show loading state
   */
  updateToLoading(message: string): void {
    this.statusBarItem.text = '$(loading~spin) Loading...';
    this.statusBarItem.command = undefined;
    this.statusBarItem.tooltip = message;
    this.statusBarItem.backgroundColor = undefined;
  }

  /**
   * Dispose of the status bar item
   */
  dispose(): void {
    this.statusBarItem.dispose();
  }

  /**
   * Get the underlying VS Code status bar item
   */
  getItem(): vscode.StatusBarItem {
    return this.statusBarItem;
  }
}