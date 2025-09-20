import * as vscode from 'vscode';
import { ServerManager } from './serverManager';
import { StatusBar } from './statusBar';

let serverManager: ServerManager;
let statusBar: StatusBar;

export function activate(context: vscode.ExtensionContext) {
  // Initialize managers
  serverManager = new ServerManager();
  statusBar = new StatusBar();
  
  // Create and show status bar
  statusBar.create();

  // Register commands
  const startDisposable = vscode.commands.registerCommand('liveServerLite.start', async () => {
    await startLiveServer();
  });

  const stopDisposable = vscode.commands.registerCommand('liveServerLite.stop', async () => {
    await stopLiveServer();
  });

  const openWithLiveServerDisposable = vscode.commands.registerCommand('liveServerLite.openWithLiveServer', async (uri: vscode.Uri) => {
    await startLiveServer(uri);
  });

  const selectBrowserDisposable = vscode.commands.registerCommand('liveServerLite.selectBrowser', async () => {
    await selectBrowser();
  });

  const toggleNotificationsDisposable = vscode.commands.registerCommand('liveServerLite.toggleNotifications', async () => {
    await toggleNotifications();
  });

  const openBrowserSelectionDisposable = vscode.commands.registerCommand('liveServerLite.openBrowserSelection', async () => {
    await openBrowserSelection();
  });

  // Add to subscriptions
  context.subscriptions.push(
    startDisposable, 
    stopDisposable, 
    openWithLiveServerDisposable,
    selectBrowserDisposable,
    toggleNotificationsDisposable,
    openBrowserSelectionDisposable,
    statusBar.getItem(),
    { dispose: () => serverManager.dispose() }
  );
}

async function startLiveServer(htmlUri?: vscode.Uri): Promise<void> {
  try {
    if (serverManager.isRunning()) {
      vscode.window.showInformationMessage('Server is already running.');
      return;
    }

    const response = await serverManager.start(htmlUri);
    
    if (!response.success) {
      const errorMessage = response.error?.message || 'Unknown error occurred';
      vscode.window.showErrorMessage(`Failed to start Live Server: ${errorMessage}`);
      if (response.error) {
        statusBar.updateToError(response.error);
      }
      return;
    }

    const serverInfo = serverManager.getServerInfo();
    if (!serverInfo) {
      throw new Error('Failed to get server information');
    }

    // Update status bar
    statusBar.updateToRunning(serverInfo);

    // Show success message with options
    const selection = await vscode.window.showInformationMessage(
      `Live Server running at:\n• Local: ${serverInfo.localUrl}\n• Network: ${serverInfo.networkUrl}`,
      'Open Local', 
      'Copy Network URL'
    );

    if (selection === 'Open Local') {
      await vscode.env.openExternal(vscode.Uri.parse(serverInfo.localUrl));
    } else if (selection === 'Copy Network URL') {
      await vscode.env.clipboard.writeText(serverInfo.networkUrl);
      vscode.window.showInformationMessage('Network URL copied to clipboard!');
    }

    // Also open local URL by default
    await vscode.env.openExternal(vscode.Uri.parse(serverInfo.localUrl));

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    vscode.window.showErrorMessage(`Failed to start Live Server: ${errorMessage}`);
    statusBar.updateToError({
      code: 'EXTENSION_ERROR',
      message: errorMessage,
      timestamp: new Date()
    });
  }
}

async function stopLiveServer(): Promise<void> {
  try {
    if (!serverManager.isRunning()) {
      vscode.window.showInformationMessage('No server is currently running.');
      return;
    }

    const response = await serverManager.stop();
    
    if (!response.success) {
      const errorMessage = response.error?.message || 'Unknown error occurred';
      vscode.window.showErrorMessage(`Failed to stop Live Server: ${errorMessage}`);
      return;
    }

    statusBar.updateToStopped();
    vscode.window.showInformationMessage('Live Server stopped.');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    vscode.window.showErrorMessage(`Failed to stop Live Server: ${errorMessage}`);
  }
}

/**
 * Select browser for opening Live Server
 */
async function selectBrowser(): Promise<void> {
  try {
    // Get the browser manager from server manager (needs to be exposed)
    const config = vscode.workspace.getConfiguration('liveServerLite');
    const currentBrowser = config.get('browserPath', 'default');

    const quickPickItems = [
      { 
        label: currentBrowser === 'default' ? '$(check) System Default' : 'System Default', 
        value: 'default',
        description: 'Use system default browser'
      },
      { 
        label: 'Custom Path...', 
        value: 'custom',
        description: 'Specify custom browser executable'
      }
    ];

    const selected = await vscode.window.showQuickPick(quickPickItems, {
      placeHolder: 'Select browser for Live Server',
      matchOnDescription: true
    });

    if (!selected) {
      return;
    }

    let browserPath = selected.value;
    if (selected.value === 'custom') {
      const customPath = await vscode.window.showInputBox({
        prompt: 'Enter path to browser executable',
        placeHolder: 'e.g., /Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        value: currentBrowser !== 'default' ? currentBrowser : '',
        validateInput: (value) => {
          if (!value || value.trim() === '') {
            return 'Please enter a valid path';
          }
          return null;
        }
      });
      
      if (!customPath) {
        return;
      }
      
      browserPath = customPath;
    }

    await config.update('browserPath', browserPath, vscode.ConfigurationTarget.Global);
    
    const message = browserPath === 'default' 
      ? 'Browser set to system default' 
      : `Browser set to: ${browserPath}`;
    vscode.window.showInformationMessage(message);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    vscode.window.showErrorMessage(`Failed to select browser: ${errorMessage}`);
  }
}

/**
 * Toggle notifications on/off
 */
async function toggleNotifications(): Promise<void> {
  try {
    const config = vscode.workspace.getConfiguration('liveServerLite');
    const enabled = config.get('notifications.enabled', true);
    
    await config.update('notifications.enabled', !enabled, vscode.ConfigurationTarget.Global);
    
    const message = !enabled 
      ? 'Live Server notifications enabled' 
      : 'Live Server notifications disabled';
    vscode.window.showInformationMessage(message);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    vscode.window.showErrorMessage(`Failed to toggle notifications: ${errorMessage}`);
  }
}

/**
 * Open browser selection dialog
 */
async function openBrowserSelection(): Promise<void> {
  if (!serverManager.isRunning()) {
    vscode.window.showInformationMessage('Start Live Server first to select a browser');
    return;
  }

  try {
    const serverInfo = serverManager.getServerInfo();
    if (!serverInfo) {
      vscode.window.showErrorMessage('Server information not available');
      return;
    }

    const quickPickItems = [
      { 
        label: '$(browser) System Default',
        value: 'default',
        description: serverInfo.localUrl
      },
      { 
        label: '$(settings) Select Browser...',
        value: 'select',
        description: 'Choose specific browser'
      }
    ];

    const selected = await vscode.window.showQuickPick(quickPickItems, {
      placeHolder: 'Open Live Server in browser',
      matchOnDescription: true
    });

    if (selected?.value === 'default') {
      await vscode.env.openExternal(vscode.Uri.parse(serverInfo.localUrl));
    } else if (selected?.value === 'select') {
      await selectBrowser();
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    vscode.window.showErrorMessage(`Failed to open browser selection: ${errorMessage}`);
  }
}

export function deactivate() {
  if (serverManager) {
    serverManager.dispose();
  }
  
  if (statusBar) {
    statusBar.dispose();
  }
}
