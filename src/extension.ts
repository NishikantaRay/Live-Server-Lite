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

  // Add to subscriptions
  context.subscriptions.push(
    startDisposable, 
    stopDisposable, 
    openWithLiveServerDisposable, 
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

export function deactivate() {
  if (serverManager) {
    serverManager.dispose();
  }
  
  if (statusBar) {
    statusBar.dispose();
  }
}
