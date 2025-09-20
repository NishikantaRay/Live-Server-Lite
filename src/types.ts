import * as vscode from 'vscode';
import * as http from 'http';
import * as WebSocket from 'ws';
import * as chokidar from 'chokidar';
import * as fs from 'fs';

// Server Configuration Types
export interface ServerConfig {
  port: number;
  host: string;
  root: string;
  defaultFile: string;
  ignored: string[];
  cors?: boolean;
  https?: boolean;
  proxy?: ProxyConfig[];
  middleware?: MiddlewareConfig[];
}

export interface ProxyConfig {
  context: string;
  target: string;
  changeOrigin?: boolean;
  secure?: boolean;
}

export interface MiddlewareConfig {
  path: string;
  handler: string;
  options?: Record<string, any>;
}

export interface ServerOptions {
  autoOpen?: boolean;
  browser?: string;
  fallback?: string;
  logLevel?: 'silent' | 'info' | 'debug';
  watch?: boolean;
}

// Server Information Types
export interface ServerInfo {
  port: number;
  localUrl: string;
  networkUrl: string;
  isRunning: boolean;
  startTime?: Date;
  connections?: number;
  root?: string;
}

export interface ServerStats {
  uptime: number;
  requests: number;
  connections: number;
  errors: number;
  lastActivity: Date;
}

export interface ServerResponse {
  success: boolean;
  message: string;
  data?: ServerInfo | ServerStats;
  error?: ServerError;
}

export interface ServerError {
  code: string;
  message: string;
  details?: string;
  timestamp: Date;
}

// Manager Interfaces
export interface LiveServerManager {
  start(htmlUri?: vscode.Uri, options?: ServerOptions): Promise<ServerResponse>;
  stop(): Promise<ServerResponse>;
  restart(): Promise<ServerResponse>;
  isRunning(): boolean;
  getServerInfo(): ServerInfo | null;
  getServerStats(): ServerStats | null;
  updateConfig(config: Partial<ServerConfig>): void;
}

export interface FileWatcherManager {
  start(root: string, ignored?: string[], options?: WatcherOptions): void;
  stop(): void;
  restart(): void;
  onFileChange(callback: FileChangeCallback): void;
  addIgnorePattern(pattern: string): void;
  removeIgnorePattern(pattern: string): void;
  isWatching(): boolean;
  getWatchedPaths(): string[];
}

export interface StatusBarManager {
  create(): void;
  updateToRunning(serverInfo: ServerInfo): void;
  updateToStopped(): void;
  updateToError(error: ServerError): void;
  updateToLoading(message: string): void;
  dispose(): void;
}

// File Watcher Types
export interface WatcherOptions {
  ignoreInitial?: boolean;
  persistent?: boolean;
  usePolling?: boolean;
  awaitWriteFinish?: {
    stabilityThreshold: number;
    pollInterval: number;
  };
  depth?: number;
}

export interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';
  path: string;
  stats?: fs.Stats;
  timestamp: Date;
}

export type FileChangeCallback = (event: FileChangeEvent) => void;

// Server State Types
export interface ServerState {
  server?: http.Server;
  watcher?: chokidar.FSWatcher;
  webSocketServer?: WebSocket.Server;
  config?: ServerConfig;
  stats?: ServerStats;
  connections?: Set<WebSocket>;
  startTime?: Date;
}

export interface ExtensionState {
  serverManager: LiveServerManager | null;
  statusBar: StatusBarManager | null;
  isActive: boolean;
  config: ExtensionConfig;
}

export interface ExtensionConfig {
  defaultPort: number;
  autoOpen: boolean;
  browser: string;
  root: string;
  ignored: string[];
  logLevel: 'silent' | 'info' | 'debug';
}

// Network and Utility Types
export interface NetworkInterface {
  family: string;
  address: string;
  internal: boolean;
}

export interface UrlInfo {
  localUrl: string;
  networkUrl: string;
  port: number;
  protocol: 'http' | 'https';
}

export interface HtmlInjection {
  script: string;
  position: 'head' | 'body' | 'before-body-end';
}

// WebSocket Types
export interface WebSocketMessage {
  type: 'reload' | 'refresh' | 'error' | 'info';
  data?: any;
  timestamp: Date;
}

export interface WebSocketConnection {
  id: string;
  socket: WebSocket;
  connectedAt: Date;
  lastActivity: Date;
}

// Test Types
export interface TestContext {
  workspaceRoot: string;
  tempDir: string;
  testFiles: string[];
}

export interface MockServerConfig extends Partial<ServerConfig> {
  mockPort?: number;
  mockError?: boolean;
}

export interface TestFile {
  path: string;
  content: string;
  encoding?: BufferEncoding;
}

// Event Types
export interface ServerEvent {
  type: 'start' | 'stop' | 'error' | 'request' | 'connection';
  timestamp: Date;
  data?: any;
}

export interface ExtensionEvent {
  type: 'activate' | 'deactivate' | 'command' | 'error';
  command?: string;
  timestamp: Date;
  data?: any;
}

// Configuration Validation Types
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

// Logging Types
export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: Date;
  module?: string;
  data?: any;
}

export interface Logger {
  debug(message: string, data?: any): void;
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, data?: any): void;
}

// Disposable Pattern
export interface Disposable {
  dispose(): void;
}