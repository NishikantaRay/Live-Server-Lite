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
 * Inject WebSocket script into HTML content
 */
export function injectWebSocketScript(html: string): string {
  const inject = `<script>
    const ws = new WebSocket(\`ws://\${location.host}\`);
    ws.onmessage = () => location.reload();
    ws.onerror = () => console.log('WebSocket connection error');
  </script>`;
  
  // Inject before closing </body>, or at end if no </body>
  return html.replace(/<\/body>/i, `${inject}</body>`) + (!html.match(/<\/body>/i) ? inject : '');
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