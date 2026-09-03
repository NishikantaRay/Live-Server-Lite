import * as vscode from 'vscode';
import * as path from 'path';
import { ServerManager } from './serverManager';
import { StatusBar } from './statusBar';
import { PerformanceMonitor } from './performanceMonitor';
import { ErrorManager } from './errorManager';
import { BrowserManager } from './browserManager';
import { PreviewManager } from './previewManager';
import { QrCodeManager } from './qrCodeManager';
import { RequestLogEntry } from './types';
import { isHttpsEnabled } from './utils';

let serverManager: ServerManager;
let statusBar: StatusBar;
let performanceMonitor: PerformanceMonitor;
let errorManager: ErrorManager;
let browserManager: BrowserManager;
let previewManager: PreviewManager;
let qrCodeManager: QrCodeManager;
let requestLogChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
  // Initialize managers
  serverManager = new ServerManager();
  statusBar = new StatusBar();
  performanceMonitor = new PerformanceMonitor();
  errorManager = ErrorManager.getInstance();
  browserManager = new BrowserManager();

  // Connect performance monitor to server manager
  serverManager.setPerformanceMonitor(performanceMonitor);

  // Initialize new feature managers
  previewManager = new PreviewManager();
  qrCodeManager = new QrCodeManager();
  requestLogChannel = vscode.window.createOutputChannel('Live Server - Requests');

  // Wire request logger
  serverManager.setRequestLogger((entry: RequestLogEntry) => {
    const statusStr = String(entry.status).padStart(3);
    const durationStr = `${entry.duration}ms`.padStart(7);
    const line = `[${entry.timestamp.toLocaleTimeString()}] ${entry.method.padEnd(6)} ${statusStr}  ${durationStr}  ${entry.path}`;
    requestLogChannel.appendLine(line);
  });

  // Create and show status bar
  statusBar.create();

  // Show welcome experience for first-time users
  showWelcomeExperienceIfNeeded(context);

  // Record extension startup time
  performanceMonitor.recordExtensionStartup();

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

  const showPerformanceReportDisposable = vscode.commands.registerCommand('liveServerLite.showPerformanceReport', async () => {
    await performanceMonitor.showReport();
  });

  const createSampleProjectDisposable = vscode.commands.registerCommand('liveServerLite.createSampleProject', async () => {
    await createSampleHTML();
  });

  const copyUrlDisposable = vscode.commands.registerCommand('liveServerLite.copyUrl', async () => {
    const info = serverManager.getServerInfo();
    if (!info) {
      vscode.window.showWarningMessage('Live Server is not running.');
      return;
    }
    await vscode.env.clipboard.writeText(info.localUrl);
    vscode.window.showInformationMessage(`Copied: ${info.localUrl}`);
  });

  const showRequestLogDisposable = vscode.commands.registerCommand('liveServerLite.showRequestLog', () => {
    requestLogChannel.show(true);
  });

  const previewInEditorDisposable = vscode.commands.registerCommand('liveServerLite.previewInEditor', async () => {
    const info = serverManager.getServerInfo();
    if (!info) {
      vscode.window.showWarningMessage('Live Server is not running. Start the server first.');
      return;
    }
    previewManager.openPreview(info.localUrl);
  });

  const showQrCodeDisposable = vscode.commands.registerCommand('liveServerLite.showQrCode', async () => {
    const info = serverManager.getServerInfo();
    if (!info) {
      vscode.window.showWarningMessage('Live Server is not running. Start the server first.');
      return;
    }
    await qrCodeManager.showQrCode(info.networkUrl || info.localUrl);
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
    showPerformanceReportDisposable,
    createSampleProjectDisposable,
    copyUrlDisposable,
    showRequestLogDisposable,
    previewInEditorDisposable,
    showQrCodeDisposable,
    statusBar.getItem(),
    { dispose: () => serverManager.dispose() },
    { dispose: () => performanceMonitor.dispose() },
    { dispose: () => previewManager.dispose() },
    { dispose: () => qrCodeManager.dispose() },
    { dispose: () => requestLogChannel.dispose() }
  );
}

async function startLiveServer(htmlUri?: vscode.Uri): Promise<void> {
  try {
    if (serverManager.isRunning()) {
      const currentServerInfo = serverManager.getServerInfo();
      if (currentServerInfo) {
        const selection = await vscode.window.showInformationMessage(
          `Live Server is already running at ${currentServerInfo.localUrl}`,
          'Open Browser',
          'Stop & Restart',
          'View Status'
        );

        if (selection === 'Open Browser') {
          if (isValidLocalUrl(currentServerInfo.localUrl)) {
            await vscode.env.openExternal(vscode.Uri.parse(currentServerInfo.localUrl));
          }
        } else if (selection === 'Stop & Restart') {
          await serverManager.stop();
          // Continue with start process below
        } else if (selection === 'View Status') {
          vscode.commands.executeCommand('liveServerLite.showServerInfo');
          return;
        } else {
          return;
        }
      } else {
        return;
      }
    }

    const config = vscode.workspace.getConfiguration('liveServerLite');
    const httpsEnabled = isHttpsEnabled(config);

    let serverOptions;
    if (httpsEnabled) {
      serverOptions = {
        port: config.get<number>('https.port', 3443),
        host: config.get<string>('host', 'localhost'),
        open: config.get<boolean>('openBrowser', true),
        https: {
          enabled: true,
          port: config.get<number>('https.port', 3443),
          certPath: config.get<string>('https.certPath', ''),
          keyPath: config.get<string>('https.keyPath', ''),
          domain: config.get<string>('https.domain', 'localhost'),
          autoGenerateCert: config.get<boolean>('https.autoGenerateCert', true),
          warnOnSelfSigned: config.get<boolean>('https.warnOnSelfSigned', true)
        }
      };
    }

    const response = await serverManager.start(htmlUri, serverOptions);

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

    // The notificationManager in serverManager already handles user notifications
    // No need for duplicate notifications here

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    // Use enhanced error handling
    await errorManager.handleError(error instanceof Error ? error : errorMessage, {
      operation: 'Start Live Server',
      component: 'Extension',
      severity: 'high'
    });

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
      const selection = await vscode.window.showInformationMessage(
        'No Live Server is currently running.',
        'Start Server',
        'View Status'
      );

      if (selection === 'Start Server') {
        vscode.commands.executeCommand('liveServerLite.start');
      } else if (selection === 'View Status') {
        vscode.commands.executeCommand('liveServerLite.showServerInfo');
      }
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
          if (!path.isAbsolute(value.trim())) {
            return 'Please enter an absolute path to the browser executable';
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
    vscode.window.showInformationMessage('Start Live Server first to open a browser');
    return;
  }

  try {
    const serverInfo = serverManager.getServerInfo();
    if (!serverInfo) {
      vscode.window.showErrorMessage('Server information not available');
      return;
    }

    const selectedBrowserPath = await browserManager.showBrowserSelection();
    if (selectedBrowserPath !== undefined) {
      await browserManager.openBrowser(serverInfo.localUrl, selectedBrowserPath);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    vscode.window.showErrorMessage(`Failed to open browser: ${errorMessage}`);
  }
}

/**
 * Start HTTPS server with SSL certificates
 */
async function startHttpsServer(htmlUri?: vscode.Uri): Promise<void> {
  try {
    if (serverManager.isRunning()) {
      const currentServerInfo = serverManager.getServerInfo();
      if (currentServerInfo) {
        const selection = await vscode.window.showInformationMessage(
          `Live Server is already running at ${currentServerInfo.localUrl}`,
          'Open Browser',
          'Stop & Start HTTPS',
          'View Status'
        );

        if (selection === 'Open Browser') {
          if (isValidLocalUrl(currentServerInfo.localUrl)) {
            await vscode.env.openExternal(vscode.Uri.parse(currentServerInfo.localUrl));
          }
        } else if (selection === 'Stop & Start HTTPS') {
          await serverManager.stop();
          // Continue with HTTPS start process below
        } else if (selection === 'View Status') {
          vscode.commands.executeCommand('liveServerLite.showServerInfo');
          return;
        } else {
          return;
        }
      } else {
        return;
      }
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
    const currentHttpsMode = isHttpsEnabled(config);

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
      await config.update('https.enabled', useHttps, vscode.ConfigurationTarget.Workspace);

      // isHttpsEnabled() ORs in the deprecated `liveServerLite.https` boolean,
      // so a user upgrading from <=1.3.1 with that key set could never toggle
      // HTTPS back off. Clear it once we own the namespaced flag.
      if (!useHttps) {
        for (const target of [
          vscode.ConfigurationTarget.Workspace,
          vscode.ConfigurationTarget.Global
        ]) {
          try {
            if (config.inspect('https')) {
              await config.update('https', undefined, target);
            }
          } catch {
            // Setting absent at this scope, or not writable — nothing to clear.
          }
        }
      }

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

/**
 * Show welcome experience for first-time users
 */
async function showWelcomeExperienceIfNeeded(context: vscode.ExtensionContext): Promise<void> {
  const hasSeenWelcome = context.globalState.get('liveServerLite.hasSeenWelcome', false);

  if (!hasSeenWelcome) {
    const selection = await vscode.window.showInformationMessage(
      '🚀 Welcome to Live Server Lite! Get started with live reloading for your web development.',
      'Quick Start Guide',
      'Open Sample HTML',
      'Configure Settings',
      'Don\'t Show Again'
    );

    switch (selection) {
      case 'Quick Start Guide':
        await showQuickStartGuide();
        break;
      case 'Open Sample HTML':
        await createSampleHTML();
        break;
      case 'Configure Settings':
        await vscode.commands.executeCommand('workbench.action.openSettings', 'liveServerLite');
        break;
    }

    if (selection && selection !== 'Don\'t Show Again') {
      // Mark as seen but allow showing again if they didn't dismiss
      await context.globalState.update('liveServerLite.hasSeenWelcome', false);
    } else if (selection === 'Don\'t Show Again') {
      await context.globalState.update('liveServerLite.hasSeenWelcome', true);
    }
  }
}

/**
 * Show quick start guide
 */
async function showQuickStartGuide(): Promise<void> {
  const guide = [
    '🎯 Quick Start Guide',
    '',
    '1. Create/Open an HTML file in your workspace',
    '2. Right-click the file → "Open with Live Server"',
    '3. Click "Open Browser" in the notification',
    '4. Edit your files - changes auto-reload in browser!',
    '',
    '⚙️ Pro Tips:',
    '• Use status bar "Go Live" button for quick start',
    '• Configure browser: Cmd/Ctrl+P → "Live Server: Select Browser"',
    '• Enable HTTPS: Settings → "Live Server Lite" → HTTPS',
    '• Customize port: Settings → "Live Server Lite" → Port'
  ].join('\n');

  await vscode.window.showInformationMessage(guide, { modal: true });
}

/**
 * Create a sample HTML file for testing
 */
async function createSampleHTML(): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showWarningMessage('Please open a folder first to create the sample HTML file.');
    return;
  }

  const sampleHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Live Server Lite - Sample</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        .status { background: #4CAF50; color: white; padding: 10px; border-radius: 5px; text-align: center; }
        .instructions { background: #f5f5f5; padding: 20px; border-left: 4px solid #2196F3; margin: 20px 0; }
    </style>
</head>
<body>
    <h1>🚀 Live Server Lite Sample</h1>
    <div class="status">✅ Live Server is working!</div>
    <div class="instructions">
        <h3>Try This:</h3>
        <ol>
            <li>Right-click this file and select "Open with Live Server"</li>
            <li>Edit this text and save the file</li>
            <li>Watch the browser auto-reload! ✨</li>
        </ol>
    </div>
    <p><strong>Timestamp:</strong> <span id="time"></span></p>
    <script>document.getElementById('time').textContent = new Date().toLocaleString();</script>
</body>
</html>`;

  const samplePath = vscode.Uri.joinPath(workspaceFolder.uri, 'live-server-sample.html');

  try {
    await vscode.workspace.fs.writeFile(samplePath, Buffer.from(sampleHTML, 'utf8'));
    const doc = await vscode.workspace.openTextDocument(samplePath);
    await vscode.window.showTextDocument(doc);

    const startNow = await vscode.window.showInformationMessage(
      '✅ Sample HTML created! Would you like to start Live Server now?',
      'Start Live Server',
      'Later'
    );

    if (startNow === 'Start Live Server') {
      await startLiveServer(samplePath);
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to create sample file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function isValidLocalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function deactivate() {
  if (serverManager) {
    serverManager.dispose();
  }

  if (statusBar) {
    statusBar.dispose();
  }

  if (performanceMonitor) {
    performanceMonitor.dispose();
  }
}
