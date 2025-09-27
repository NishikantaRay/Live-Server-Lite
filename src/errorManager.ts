import * as vscode from 'vscode';

export interface ErrorContext {
  operation: string;
  component: string;
  userAction?: string;
  technical?: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ErrorSolution {
  title: string;
  description: string;
  action?: string;
  command?: string;
  args?: any[];
}

/**
 * Enhanced error management with user-friendly messages and solutions
 */
export class ErrorManager {
  private static instance: ErrorManager;
  private errorLog: ErrorContext[] = [];
  private maxLogSize = 100;

  static getInstance(): ErrorManager {
    if (!ErrorManager.instance) {
      ErrorManager.instance = new ErrorManager();
    }
    return ErrorManager.instance;
  }

  /**
   * Handle and display user-friendly errors
   */
  async handleError(error: Error | string, context: Partial<ErrorContext> = {}): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorCode = this.getErrorCode(errorMessage);
    
    const fullContext: ErrorContext = {
      operation: 'Unknown',
      component: 'Extension',
      severity: 'medium',
      timestamp: new Date(),
      technical: errorMessage,
      ...context
    };

    // Log error
    this.logError(fullContext);

    // Get user-friendly message and solutions
    const { message, solutions } = this.getErrorInfo(errorCode, errorMessage, fullContext);

    // Show error with solutions
    await this.showErrorWithSolutions(message, solutions, fullContext);
  }

  /**
   * Get error code from message
   */
  private getErrorCode(message: string): string {
    if (message.includes('EADDRINUSE')) {return 'PORT_IN_USE';}
    if (message.includes('EACCES')) {return 'PERMISSION_DENIED';}
    if (message.includes('ENOENT')) {return 'FILE_NOT_FOUND';}
    if (message.includes('workspace')) {return 'NO_WORKSPACE';}
    if (message.includes('browser')) {return 'BROWSER_ERROR';}
    return 'GENERIC_ERROR';
  }

  /**
   * Get user-friendly error information and solutions
   */
  private getErrorInfo(errorCode: string, originalMessage: string, context: ErrorContext): { message: string; solutions: ErrorSolution[] } {
    switch (errorCode) {
      case 'PORT_IN_USE':
        const portMatch = originalMessage.match(/\d+/);
        const port = portMatch ? portMatch[0] : 'the specified port';
        return {
          message: `🚫 Port ${port} is already being used by another application.`,
          solutions: [
            {
              title: 'Use Different Port',
              description: 'Live Server will automatically try the next available port',
              action: 'Retry with Different Port'
            },
            {
              title: 'Configure Custom Port',
              description: 'Set a specific port in settings',
              action: 'Open Settings',
              command: 'workbench.action.openSettings',
              args: ['liveServerLite.port']
            }
          ]
        };

      case 'NO_WORKSPACE':
        return {
          message: '📁 No workspace folder is open. Live Server needs a folder to serve files from.',
          solutions: [
            {
              title: 'Open Folder',
              description: 'Open a folder containing your HTML files',
              action: 'Open Folder',
              command: 'vscode.openFolder'
            }
          ]
        };

      case 'BROWSER_ERROR':
        return {
          message: '🌐 Unable to open browser. The specified browser may not be installed or accessible.',
          solutions: [
            {
              title: 'Use System Default',
              description: 'Switch to system default browser',
              action: 'Use Default Browser'
            },
            {
              title: 'Select Different Browser',
              description: 'Choose from available browsers',
              action: 'Select Browser',
              command: 'liveServerLite.selectBrowser'
            }
          ]
        };

      default:
        return {
          message: `❌ ${context.operation || 'Operation'} failed: ${originalMessage}`,
          solutions: [
            {
              title: 'Restart Extension',
              description: 'Reload the window to restart the extension',
              action: 'Reload Window',
              command: 'workbench.action.reloadWindow'
            },
            {
              title: 'Report Issue',
              description: 'Report this issue on GitHub',
              action: 'Report Bug'
            }
          ]
        };
    }
  }

  /**
   * Show error message with actionable solutions
   */
  private async showErrorWithSolutions(
    message: string, 
    solutions: ErrorSolution[], 
    context: ErrorContext
  ): Promise<void> {
    const actions = solutions.map(s => s.action).filter(Boolean) as string[];
    
    const selectedAction = await vscode.window.showErrorMessage(message, ...actions);
    
    if (!selectedAction) {return;}

    const solution = solutions.find(s => s.action === selectedAction);
    if (!solution) {return;}

    // Execute solution
    if (solution.command) {
      await vscode.commands.executeCommand(solution.command, ...(solution.args || []));
    } else {
      await this.handleCustomAction(selectedAction, context);
    }
  }

  /**
   * Handle custom error solution actions
   */
  private async handleCustomAction(action: string, context: ErrorContext): Promise<void> {
    switch (action) {
      case 'Report Bug':
        await this.reportBug(context);
        break;
      case 'Use Default Browser':
        const config = vscode.workspace.getConfiguration('liveServerLite');
        await config.update('browserPath', 'default', vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage('✅ Browser set to system default');
        break;
    }
  }

  /**
   * Log error for debugging
   */
  private logError(context: ErrorContext): void {
    this.errorLog.push(context);
    
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }
  }

  /**
   * Report bug with context
   */
  private async reportBug(context: ErrorContext): Promise<void> {
    const bugTitle = encodeURIComponent(`[Bug] ${context.operation} failed`);
    const issueUrl = `https://github.com/NishikantaRay/Live-Server-Lite/issues/new?title=${bugTitle}&labels=bug`;
    await vscode.env.openExternal(vscode.Uri.parse(issueUrl));
  }
}