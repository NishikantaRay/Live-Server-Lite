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

  const startHttpsDisposable = vscode.commands.registerCommand('liveServerLite.startHttps', async () => {
    await startHttpsServer();
  });

  const toggleHttpsDisposable = vscode.commands.registerCommand('liveServerLite.toggleHttps', async () => {
    await toggleHttpsMode();
  });

  const generateCertificateDisposable = vscode.commands.registerCommand('liveServerLite.generateCertificate', async () => {
    await generateCertificate();
  });

  // Add to subscriptions
  context.subscriptions.push(
    startDisposable, 
    stopDisposable, 
    openWithLiveServerDisposable,
    selectBrowserDisposable,
    toggleNotificationsDisposable,
    openBrowserSelectionDisposable,
    startHttpsDisposable,
    toggleHttpsDisposable,
    generateCertificateDisposable,
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
      'Open Browser', 
      'Copy Network URL'
    );

    if (selection === 'Open Browser') {
      await vscode.env.openExternal(vscode.Uri.parse(serverInfo.localUrl));
    } else if (selection === 'Copy Network URL') {
      await vscode.env.clipboard.writeText(serverInfo.networkUrl);
      vscode.window.showInformationMessage('Network URL copied to clipboard!');
    }

    // Don't automatically open browser - only open when user explicitly selects "Open Browser"

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

/**
 * Start HTTPS server with SSL certificates
 */
async function startHttpsServer(htmlUri?: vscode.Uri): Promise<void> {
  try {
    if (serverManager.isRunning()) {
      vscode.window.showInformationMessage('Server is already running.');
      return;
    }

    const config = vscode.workspace.getConfiguration('liveServerLite');
    
    const httpsOptions = {
      enabled: true,
      port: config.get<number>('https.port', 3443),
      certPath: config.get<string>('https.certPath', ''),
      keyPath: config.get<string>('https.keyPath', ''),
      domain: config.get<string>('https.domain', 'localhost'),
      autoGenerateCert: config.get<boolean>('https.autoGenerateCert', true),
      warnOnSelfSigned: config.get<boolean>('https.warnOnSelfSigned', true)
    };

    const serverOptions = {
      port: httpsOptions.port,
      host: config.get<string>('host', 'localhost'),
      open: config.get<boolean>('openBrowser', true),
      https: httpsOptions
    };

    const response = await serverManager.start(htmlUri, serverOptions);
    
    if (response.success && response.data) {
      statusBar.updateToRunning(response.data as any);
    } else {
      const errorMessage = response.error?.message || 'Unknown error occurred';
      vscode.window.showErrorMessage(`Failed to start HTTPS server: ${errorMessage}`);
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    vscode.window.showErrorMessage(`Failed to start HTTPS server: ${errorMessage}`);
  }
}

/**
 * Toggle between HTTP and HTTPS modes
 */
async function toggleHttpsMode(): Promise<void> {
  try {
    const config = vscode.workspace.getConfiguration('liveServerLite');
    const currentHttpsMode = config.get<boolean>('https', false);
    
    const selection = await vscode.window.showQuickPick([
      {
        label: '$(shield) HTTPS (Secure)',
        value: 'https',
        description: 'Use SSL/TLS encryption (self-signed certificate)',
        picked: currentHttpsMode
      },
      {
        label: '$(globe) HTTP (Standard)',
        value: 'http',
        description: 'Standard unencrypted connection',
        picked: !currentHttpsMode
      }
    ], {
      placeHolder: 'Select server protocol',
      canPickMany: false
    });

    if (selection?.value) {
      const useHttps = selection.value === 'https';
      
      // Update configuration
      await config.update('https', useHttps, vscode.ConfigurationTarget.Workspace);
      
      // Restart server if it's running
      if (serverManager.isRunning()) {
        await serverManager.stop();
        
        if (useHttps) {
          await startHttpsServer();
        } else {
          await startLiveServer();
        }
      }
      
      vscode.window.showInformationMessage(`Live Server protocol set to ${selection.label.includes('HTTPS') ? 'HTTPS' : 'HTTP'}`);
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    vscode.window.showErrorMessage(`Failed to toggle HTTPS mode: ${errorMessage}`);
  }
}

/**
 * Generate SSL certificate for HTTPS
 */
async function generateCertificate(): Promise<void> {
  try {
    // Get certificate configuration
    const config = vscode.workspace.getConfiguration('liveServerLite');
    
    const domain = await vscode.window.showInputBox({
      prompt: 'Enter domain name for certificate',
      value: config.get<string>('https.domain', 'localhost'),
      validateInput: (input: string) => {
        if (!input.trim()) {
          return 'Domain name is required';
        }
        return null;
      }
    });

    if (!domain) {
      return;
    }

    // Show progress
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Generating SSL Certificate',
      cancellable: false
    }, async (progress) => {
      progress.report({ message: `Creating certificate for ${domain}...` });
      
      // Access the certificate manager through the server manager
      const certificateManager = (serverManager as any).certificateManager;
      
      if (!certificateManager) {
        throw new Error('Certificate manager not available');
      }

      try {
        const certInfo = await certificateManager.getCertificates({
          domain,
          generateIfMissing: true
        });

        if (certInfo) {
          progress.report({ message: 'Certificate generated successfully!' });
          
          const showPath = await vscode.window.showInformationMessage(
            `SSL certificate generated for ${domain}`,
            'Show Certificate Path',
            'Update Configuration'
          );

          if (showPath === 'Show Certificate Path') {
            await vscode.window.showInformationMessage(`Certificate: ${certInfo.certPath}\nPrivate Key: ${certInfo.keyPath}`);
          } else if (showPath === 'Update Configuration') {
            await config.update('https.domain', domain, vscode.ConfigurationTarget.Workspace);
            await config.update('https.certPath', certInfo.certPath, vscode.ConfigurationTarget.Workspace);
            await config.update('https.keyPath', certInfo.keyPath, vscode.ConfigurationTarget.Workspace);
            vscode.window.showInformationMessage('HTTPS configuration updated');
          }
        } else {
          throw new Error('Failed to generate certificate');
        }
      } catch (certError) {
        throw new Error(`Certificate generation failed: ${certError instanceof Error ? certError.message : 'Unknown error'}`);
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    vscode.window.showErrorMessage(`Failed to generate certificate: ${errorMessage}`);
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
