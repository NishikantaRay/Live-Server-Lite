import * as vscode from 'vscode';
import express from 'express';
import * as http from 'http';
import * as WebSocket from 'ws';
import * as chokidar from 'chokidar';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

let server: http.Server | undefined;
let watcher: chokidar.FSWatcher | undefined;
let statusBarItem: vscode.StatusBarItem;

// Helper function to get local IP address
function getLocalIPAddress(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (iface) {
      for (const alias of iface) {
        if (alias.family === 'IPv4' && !alias.internal) {
          return alias.address;
        }
      }
    }
  }
  return '127.0.0.1';
}

export function activate(context: vscode.ExtensionContext) {
  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'liveServerLite.start';
  statusBarItem.text = '$(broadcast) Go Live';
  statusBarItem.tooltip = 'Click to run Live Server Lite';
  statusBarItem.show();

  const startDisposable = vscode.commands.registerCommand('liveServerLite.start', () => {
    startLiveServer();
  });

  const stopDisposable = vscode.commands.registerCommand('liveServerLite.stop', () => {
    stopLiveServer();
  });

  const openWithLiveServerDisposable = vscode.commands.registerCommand('liveServerLite.openWithLiveServer', (uri: vscode.Uri) => {
    startLiveServer(uri);
  });

  context.subscriptions.push(startDisposable, stopDisposable, openWithLiveServerDisposable, statusBarItem);
}

function startLiveServer(htmlUri?: vscode.Uri) {
    if (server) {
      vscode.window.showInformationMessage('Server already running.');
      return;
    }

    const app = express();
    const port = 5500;
    const workspaceFolders = vscode.workspace.workspaceFolders;
    
    if (!workspaceFolders) {
      vscode.window.showErrorMessage('No workspace folder is open.');
      return;
    }
    
    const root = workspaceFolders[0].uri.fsPath;
    
    // Determine the default file to open
    let defaultFile = '/index.html';
    if (htmlUri) {
      const relativePath = path.relative(root, htmlUri.fsPath);
      defaultFile = '/' + relativePath.replace(/\\/g, '/');
    }

    // Middleware to inject WS script into HTML responses
    app.use(async (req, res, next) => {
      const filePath = path.join(root, req.path === '/' ? defaultFile : req.path);
      if (filePath.endsWith('.html') && fs.existsSync(filePath)) {
        try {
          let html = await fs.promises.readFile(filePath, 'utf8');
          const inject = `<script>
            const ws = new WebSocket(\`ws://\${location.host}\`);
            ws.onmessage = () => location.reload();
            ws.onerror = () => console.log('WebSocket connection error');
          </script>`;
          // inject before closing </body>, or at end if no </body>
          html = html.replace(/<\/body>/i, `${inject}</body>`) + (!html.match(/<\/body>/i) ? inject : '');
          res.setHeader('Content-Type', 'text/html');
          return res.send(html);
        } catch (error) {
          console.error('Error reading HTML file:', error);
        }
      }
      next();
    });

    // Serve other static assets normally
    app.use(express.static(root));

    server = http.createServer(app);
    const wss = new WebSocket.Server({ server });

    watcher = chokidar.watch(root, { 
      ignoreInitial: true,
      ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**']
    });
    
    watcher.on('all', () => {
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send('reload');
        }
      });
    });

  server.listen(port, '0.0.0.0', () => {
    const localIP = getLocalIPAddress();
    const localUrl = `http://localhost:${port}${htmlUri ? defaultFile : ''}`;
    const networkUrl = `http://${localIP}:${port}${htmlUri ? defaultFile : ''}`;
    
    vscode.window.showInformationMessage(
      `Live Server running at:\n• Local: ${localUrl}\n• Network: ${networkUrl}`,
      'Open Local', 'Copy Network URL'
    ).then(selection => {
      if (selection === 'Open Local') {
        vscode.env.openExternal(vscode.Uri.parse(localUrl));
      } else if (selection === 'Copy Network URL') {
        vscode.env.clipboard.writeText(networkUrl);
        vscode.window.showInformationMessage('Network URL copied to clipboard!');
      }
    });
    
    // Also open local URL by default
    vscode.env.openExternal(vscode.Uri.parse(localUrl));
    
    // Update status bar
    statusBarItem.text = '$(debug-stop) Stop Live Server';
    statusBarItem.command = 'liveServerLite.stop';
    statusBarItem.tooltip = `Live Server running\n• Local: ${localUrl}\n• Network: ${networkUrl}`;
  });    server.on('error', (error) => {
      vscode.window.showErrorMessage(`Failed to start server: ${error.message}`);
      server = undefined;
      watcher?.close();
      watcher = undefined;
    });
}

function stopLiveServer() {
  if (server) {
    server.close(() => {
      vscode.window.showInformationMessage('Live Server stopped.');
    });
    server = undefined;
    watcher?.close();
    watcher = undefined;
    
    // Update status bar
    statusBarItem.text = '$(broadcast) Go Live';
    statusBarItem.command = 'liveServerLite.start';
    statusBarItem.tooltip = 'Click to run Live Server Lite';
  } else {
    vscode.window.showInformationMessage('No server is currently running.');
  }
}

export function deactivate() {
  if (server) {
    server.close();
    server = undefined;
  }
  if (watcher) {
    watcher.close();
    watcher = undefined;
  }
}
