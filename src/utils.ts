import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { NetworkInterface } from './types';

/**
 * Get the local IP address for network access
 */
export function getLocalIPAddress(): string {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (iface) {
      for (const alias of iface) {
        const networkInterface: NetworkInterface = {
          family: alias.family,
          address: alias.address,
          internal: alias.internal
        };
        
        if (networkInterface.family === 'IPv4' && !networkInterface.internal) {
          return networkInterface.address;
        }
      }
    }
  }
  return '127.0.0.1';
}

/**
 * Generate URLs for local and network access
 */
export function generateUrls(port: number, filePath: string = '', isHttps: boolean = false): { localUrl: string; networkUrl: string } {
  const localIP = getLocalIPAddress();
  const protocol = isHttps ? 'https' : 'http';
  const localUrl = `${protocol}://localhost:${port}${filePath}`;
  const networkUrl = `${protocol}://${localIP}:${port}${filePath}`;
  
  return { localUrl, networkUrl };
}

/**
 * Get relative path from root directory
 */
export function getRelativePath(root: string, filePath: string): string {
  // Normalize both paths to handle cross-platform differences
  let normalizedRoot = path.normalize(root);
  let normalizedFilePath = path.normalize(filePath);
  
  // Convert Windows paths to Unix-style for consistent handling
  if (process.platform === 'win32' || root.includes('\\') || filePath.includes('\\')) {
    normalizedRoot = normalizedRoot.replace(/\\/g, '/');
    normalizedFilePath = normalizedFilePath.replace(/\\/g, '/');
  }
  
  // Check if filePath starts with root
  if (normalizedFilePath.startsWith(normalizedRoot)) {
    // Simple case: file is within root directory
    let relativePath = normalizedFilePath.substring(normalizedRoot.length);
    
    // Ensure the path starts with '/'
    if (!relativePath.startsWith('/')) {
      relativePath = '/' + relativePath;
    }
    
    return relativePath;
  }
  
  // Fallback: try to use path.relative() and normalize the result
  let relativePath = path.relative(normalizedRoot, normalizedFilePath);
  relativePath = relativePath.replace(/\\/g, '/');
  
  // Ensure the path starts with '/' (for consistency with web URLs)
  if (!relativePath.startsWith('/')) {
    relativePath = '/' + relativePath;
  }
  
  return relativePath;
}

/**
 * Check if a file exists asynchronously
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read file content asynchronously
 */
export async function readFileContent(filePath: string): Promise<string> {
  return fs.promises.readFile(filePath, 'utf8');
}

/**
 * Escape a string for safe interpolation into HTML markup.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Inject the live-reload WebSocket client into HTML content.
 *
 * The socket must use `wss:` when the page is served over HTTPS; a `ws:`
 * connection from an HTTPS page is blocked as mixed content, which silently
 * breaks live reload.
 */
export function injectWebSocketScript(html: string, isHttps: boolean = false): string {
  const protocol = isHttps ? 'wss' : 'ws';
  const inject = `<script>
    (function () {
      var ws = new WebSocket('${protocol}://' + location.host);
      ws.onmessage = function () { location.reload(); };
      ws.onerror = function () { console.log('WebSocket connection error'); };
    })();
  </script>`;

  // Inject before closing </body>, or append if there is no </body>
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${inject}</body>`);
  }
  return html + inject;
}

/**
 * Get default ignored patterns for file watching
 */
export function getDefaultIgnorePatterns(): string[] {
  return [
    '**/node_modules/**',
    '**/.git/**',
    '**/dist/**',
    '**/out/**',
    '**/.vscode/**',
    '**/coverage/**',
    '**/.nyc_output/**'
  ];
}

/**
 * Read the HTTPS enabled flag, tolerating the legacy `liveServerLite.https`
 * boolean setting.
 *
 * `liveServerLite.https` used to be declared as a boolean while
 * `liveServerLite.https.*` sub-settings were declared alongside it. VS Code
 * cannot store a scalar and an object at the same configuration node, so the
 * sub-keys won and `get('https')` returned an object instead of the boolean the
 * caller expected. The flag now lives at `liveServerLite.https.enabled`; users
 * with the old setting in their settings.json are still honoured here.
 */
export function isHttpsEnabled(config: {
  get<T>(section: string, defaultValue: T): T;
}): boolean {
  // Current, non-colliding key.
  if (config.get<boolean>('https.enabled', false) === true) {
    return true;
  }

  // Legacy key: only a real boolean `true` counts. When the namespace
  // collision is in play this reads back as an object, which must not be
  // treated as "enabled" just because objects are truthy.
  const legacy = config.get<unknown>('https', false);
  return legacy === true;
}
