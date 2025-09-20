# Live Server Lite - Code Architecture

This document describes the refactored architecture of Live Server Lite extension.

## Directory Structure

```
src/
├── extension.ts        # Main extension entry point
├── index.ts           # Module exports
├── types.ts           # TypeScript interfaces and types
├── utils.ts           # Utility functions
├── serverManager.ts   # Server management logic
├── fileWatcher.ts     # File watching functionality
├── statusBar.ts       # Status bar management
└── test/
    └── extension.test.ts # Comprehensive tests
```

## Architecture Overview

The extension has been refactored into separate modules for better maintainability, testability, and separation of concerns.

### Core Modules

#### 1. **ServerManager** (`serverManager.ts`)
- **Purpose**: Manages the Express HTTP server and WebSocket connections
- **Responsibilities**:
  - Start/stop the live server
  - Handle server configuration
  - Manage WebSocket broadcasting for live reload
  - Error handling and cleanup
- **Key Methods**:
  - `start(htmlUri?: vscode.Uri): Promise<void>`
  - `stop(): Promise<void>`
  - `isRunning(): boolean`
  - `getServerInfo(): ServerInfo | null`

#### 2. **FileWatcher** (`fileWatcher.ts`)
- **Purpose**: Monitors file system changes in the workspace
- **Responsibilities**:
  - Watch for file changes in the project directory
  - Filter out ignored patterns (node_modules, .git, etc.)
  - Trigger callbacks when files change
  - Manage watcher lifecycle
- **Key Methods**:
  - `start(root: string, ignored: string[]): void`
  - `stop(): void`
  - `onFileChange(callback: () => void): void`
  - `isWatching(): boolean`

#### 3. **StatusBar** (`statusBar.ts`)
- **Purpose**: Manages the VS Code status bar integration
- **Responsibilities**:
  - Show current server state (running/stopped/error)
  - Provide click actions for start/stop
  - Display server information in tooltips
  - Handle different visual states
- **Key Methods**:
  - `create(): void`
  - `updateToRunning(serverInfo: ServerInfo): void`
  - `updateToStopped(): void`
  - `updateToError(message: string): void`

#### 4. **Utils** (`utils.ts`)
- **Purpose**: Common utility functions used across the extension
- **Functions**:
  - `getLocalIPAddress(): string` - Get local network IP
  - `generateUrls(port: number, filePath?: string)` - Create local/network URLs
  - `injectWebSocketScript(html: string): string` - Add reload script to HTML
  - `fileExists(filePath: string): Promise<boolean>` - Check file existence
  - `getDefaultIgnorePatterns(): string[]` - Get default file patterns to ignore

#### 5. **Types** (`types.ts`)
- **Purpose**: TypeScript interfaces and type definitions
- **Key Interfaces**:
  - `ServerConfig` - Server configuration options
  - `ServerInfo` - Running server information
  - `LiveServerManager` - Server manager interface
  - `FileWatcherManager` - File watcher interface
  - `StatusBarManager` - Status bar interface

### Main Extension (`extension.ts`)

The main extension file has been simplified to act as a coordinator between modules:

- **Initialization**: Creates instances of ServerManager and StatusBar
- **Command Registration**: Registers VS Code commands
- **Event Coordination**: Orchestrates interactions between modules
- **Error Handling**: Provides user feedback for operations

## Benefits of the Refactored Architecture

### 1. **Separation of Concerns**
- Each module has a single responsibility
- Server logic is isolated from UI logic
- File watching is independent of server management

### 2. **Better Testability**
- Each module can be tested independently
- Mock objects can be easily created
- Unit tests cover specific functionality

### 3. **Improved Maintainability**
- Changes to one module don't affect others
- Easier to add new features
- Clear interfaces between components

### 4. **Enhanced Type Safety**
- Strong TypeScript typing throughout
- Interfaces define clear contracts
- Better IDE support and error detection

### 5. **Scalability**
- Easy to add new features (configuration, multiple servers, etc.)
- Modular design allows for future enhancements
- Plugin architecture potential

## Usage Examples

### Using ServerManager
```typescript
const serverManager = new ServerManager();

// Start server
await serverManager.start();

// Check if running
if (serverManager.isRunning()) {
  const info = serverManager.getServerInfo();
  console.log(`Server running on ${info?.localUrl}`);
}

// Stop server
await serverManager.stop();
```

### Using FileWatcher
```typescript
const fileWatcher = new FileWatcher();

// Start watching
fileWatcher.start('/path/to/project', ['**/node_modules/**']);

// Set change callback
fileWatcher.onFileChange(() => {
  console.log('Files changed!');
});

// Stop watching
fileWatcher.stop();
```

## Testing

The refactored code includes comprehensive tests:
- **Unit tests** for each module
- **Integration tests** for module interactions
- **Utility function tests** for helper functions
- **Type safety tests** for interfaces

Run tests with:
```bash
npm test
```

## Future Enhancements

The modular architecture makes it easy to add:
- **Configuration management** - User settings for ports, paths, etc.
- **Multiple server support** - Run multiple servers simultaneously
- **Advanced file filtering** - More sophisticated ignore patterns
- **Plugin system** - Extension points for custom functionality
- **Logging system** - Structured logging across modules
- **Performance monitoring** - Server and file watching metrics