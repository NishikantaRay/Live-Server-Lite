import * as vscode from 'vscode';
import { 
  NotificationManager as INotificationManager, 
  NotificationOptions, 
  NotificationAction, 
  NotificationSeverity 
} from './types';

export class NotificationManager implements INotificationManager {
  private isEnabled = true;
  private showInStatusBar = true;

  /**
   * Initialize the notification manager with options
   */
  initialize(options: NotificationOptions): void {
    this.isEnabled = options.enabled ?? true;
    this.showInStatusBar = options.showInStatusBar ?? true;
  }

  /**
   * Show server started notification
   */
  async showServerStarted(port: number, url: string): Promise<string | undefined> {
    if (!this.isEnabled) {
      return;
    }

    const message = `Live Server started on port ${port}`;
    const actions: NotificationAction[] = [
      { label: 'Open Browser', action: 'openBrowser', isRecommended: true },
      { label: 'Copy URL', action: 'copyUrl', isRecommended: false },
      { label: 'Show in Status Bar', action: 'showStatusBar', isRecommended: false }
    ];

    return this.showNotification(message, 'info', actions, { url, port: port.toString() });
  }

  /**
   * Show server stopped notification
   */
  async showServerStopped(port: number): Promise<string | undefined> {
    if (!this.isEnabled) {
      return;
    }

    const message = `Live Server stopped (was on port ${port})`;
    const actions: NotificationAction[] = [
      { label: 'Restart', action: 'restart', isRecommended: true },
      { label: 'Start on Different Port', action: 'startDifferentPort', isRecommended: false }
    ];

    return this.showNotification(message, 'info', actions, { port: port.toString() });
  }

  /**
   * Show port in use error notification
   */
  async showPortInUse(port: number, suggestedPort?: number): Promise<string | undefined> {
    if (!this.isEnabled) {
      return;
    }

    const message = `Port ${port} is already in use`;
    const actions: NotificationAction[] = [
      { 
        label: suggestedPort ? `Try Port ${suggestedPort}` : 'Try Random Port', 
        action: 'tryDifferentPort', 
        isRecommended: true 
      },
      { label: 'Stop Other Server', action: 'stopOtherServer', isRecommended: false },
      { label: 'Show Running Processes', action: 'showProcesses', isRecommended: false }
    ];

    const context = { 
      port: port.toString(), 
      ...(suggestedPort && { suggestedPort: suggestedPort.toString() })
    };

    return this.showNotification(message, 'error', actions, context);
  }

  /**
   * Show server error notification
   */
  async showServerError(error: Error): Promise<string | undefined> {
    if (!this.isEnabled) {
      return;
    }

    const message = `Live Server error: ${error.message}`;
    const actions: NotificationAction[] = [
      { label: 'Restart Server', action: 'restart', isRecommended: true },
      { label: 'Check Logs', action: 'checkLogs', isRecommended: false },
      { label: 'Report Issue', action: 'reportIssue', isRecommended: false }
    ];

    return this.showNotification(message, 'error', actions, { error: error.message });
  }

  /**
   * Show file watching error notification
   */
  async showWatchingError(path: string, error: Error): Promise<string | undefined> {
    if (!this.isEnabled) {
      return;
    }

    const message = `File watching error for ${path}`;
    const actions: NotificationAction[] = [
      { label: 'Restart Watcher', action: 'restartWatcher', isRecommended: true },
      { label: 'Change Watch Path', action: 'changeWatchPath', isRecommended: false },
      { label: 'Disable File Watching', action: 'disableWatching', isRecommended: false }
    ];

    return this.showNotification(message, 'warning', actions, { 
      path, 
      error: error.message 
    });
  }

  /**
   * Show browser opening error notification
   */
  async showBrowserError(browserPath: string, error: Error): Promise<string | undefined> {
    if (!this.isEnabled) {
      return;
    }

    const message = `Failed to open browser: ${browserPath}`;
    const actions: NotificationAction[] = [
      { label: 'Try Default Browser', action: 'tryDefaultBrowser', isRecommended: true },
      { label: 'Copy URL', action: 'copyUrl', isRecommended: false },
      { label: 'Configure Browser', action: 'configureBrowser', isRecommended: false }
    ];

    return this.showNotification(message, 'warning', actions, { 
      browserPath, 
      error: error.message 
    });
  }

  /**
   * Enable or disable notifications
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    
    if (enabled) {
      vscode.window.showInformationMessage('Live Server notifications enabled');
    } else {
      vscode.window.showInformationMessage('Live Server notifications disabled');
    }
  }

  /**
   * Check if notifications are enabled
   */
  isNotificationsEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Show certificate warning for self-signed certificates
   */
  async showCertificateWarning(domain: string, certPath: string): Promise<string | undefined> {
    if (!this.isEnabled) {
      return;
    }

    const message = `HTTPS server is using a self-signed certificate for ${domain}. Your browser will show security warnings.`;
    const actions: NotificationAction[] = [
      { label: 'I Understand', action: 'acknowledge', isRecommended: true },
      { label: 'Show Certificate Path', action: 'showCertPath', isRecommended: false },
      { label: 'Learn More', action: 'learnMore', isRecommended: false }
    ];

    const result = await this.showNotification(message, 'warning', actions, { 
      domain, 
      certPath,
      type: 'certificate-warning'
    });

    // Handle specific actions
    if (result === 'showCertPath') {
      await vscode.window.showInformationMessage(`Certificate location: ${certPath}`);
    } else if (result === 'learnMore') {
      await vscode.env.openExternal(vscode.Uri.parse('https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts'));
    }

    return result;
  }

  /**
   * Show a generic notification with actions
   */
  private async showNotification(
    message: string, 
    severity: NotificationSeverity, 
    actions: NotificationAction[] = [],
    context: Record<string, string> = {}
  ): Promise<string | undefined> {
    
    // Prepare action labels for VS Code
    const actionLabels = actions.map(action => {
      return action.isRecommended ? `$(check) ${action.label}` : action.label;
    });

    let result: string | undefined;

    try {
      // Show notification based on severity
      switch (severity) {
        case 'info':
          result = await vscode.window.showInformationMessage(message, ...actionLabels);
          break;
        case 'warning':
          result = await vscode.window.showWarningMessage(message, ...actionLabels);
          break;
        case 'error':
          result = await vscode.window.showErrorMessage(message, ...actionLabels);
          break;
        default:
          result = await vscode.window.showInformationMessage(message, ...actionLabels);
      }

      // Find the selected action and return its action identifier
      if (result) {
        const cleanResult = result.replace('$(check) ', '');
        const selectedAction = actions.find(action => 
          action.label === cleanResult || `$(check) ${action.label}` === result
        );
        
        if (selectedAction) {
          console.log(`Notification action selected: ${selectedAction.action}`, context);
          return selectedAction.action;
        }
      }

    } catch (error) {
      console.error('Error showing notification:', error);
    }

    return result;
  }
}