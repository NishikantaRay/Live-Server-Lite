# Change Log

All notable changes to the "live-server-lite" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [1.3.2] - 2026-08-31

### 🐛 Bug Fixes

#### Fixed: "Cannot GET /" when opening the server (#1, #2, #3, #5, #6, #7, #9, #10, #11)
- The server now resolves an index file for **any** directory, not just the workspace root.
  Projects whose entry point lives in a subfolder (`public/index.html`, `src/index.html`, …)
  previously fell through to Express's default `Cannot GET /` page.
- Index resolution now also tries `index.htm`, `Index.html`, and `default.html`, so projects
  work identically on case-sensitive filesystems (Linux) and case-insensitive ones (macOS/Windows).
- Directories without any index file now render a browsable file listing instead of a bare 404,
  including a link to the parent directory.
- Requests that escape the served root (e.g. `/../../etc/passwd`, including URL-encoded forms)
  are rejected with `403` instead of being resolved against the filesystem.
- Filenames in the directory listing are HTML-escaped and URL-encoded, so names containing
  `&`, `<`, quotes, or spaces link correctly and cannot inject markup.

#### Fixed: HTTPS not used when starting from the status bar (#12)
- `liveServerLite.https` was declared as a boolean *and* used as the parent namespace for
  `liveServerLite.https.port`, `.certPath`, and friends. VS Code cannot store a scalar and an
  object at the same configuration node, so the sub-keys won: reading the flag returned an
  object and the value written by **Toggle HTTPS/HTTP** was discarded. Starting from the status
  bar therefore always fell back to plain HTTP.
- The flag now lives at **`liveServerLite.https.enabled`**, which no longer collides.
  The old `liveServerLite.https: true` setting is still honoured, so existing configurations
  keep working.

#### Fixed: live reload silently broken over HTTPS
- The injected reload client hardcoded `ws://`. Browsers block an insecure WebSocket from an
  HTTPS page as mixed content, so live reload never connected when HTTPS was enabled.
  The client now uses `wss://` on HTTPS pages and `ws://` on HTTP pages.

### 🔒 Security

- Resolved all 18 `npm audit` findings (11 high, 5 moderate, 2 low) — now reports **0 vulnerabilities**.
  - Runtime: `ws` 8.18.3 → 8.21.3 (uninitialized memory disclosure, DoS via tiny fragments),
    `node-forge` 1.3.1 → 1.4.0 (RSA/Ed25519 signature forgery, ASN.1 issues, basicConstraints bypass),
    plus patched `qs`, `path-to-regexp`, `body-parser`, and `picomatch` via Express's tree.
  - Build/test only: `webpack`, `terser-webpack-plugin`, `serialize-javascript`, `diff`, and others.
  - Added `overrides` for `serialize-javascript` and `diff`, whose patched releases sit behind
    major-version pins inside `mocha`. No published `mocha` carries the fix yet.

### 🔧 Dependencies

- **Fixed:** `node-forge` was declared in `devDependencies` despite being imported at runtime by
  `certificateManager.ts` for HTTPS certificate generation. Moved to `dependencies` where it belongs.

### ⚙️ Settings

- **Added:** `liveServerLite.https.enabled` — replaces the colliding `liveServerLite.https` boolean.
- **Deprecated:** `liveServerLite.https` — still read for backward compatibility.

## [1.2.0] - 2026-05-23

### ✨ New Features

#### 📱 QR Code for Mobile Access
- New command: **`Live Server Lite: Show QR Code for Mobile`**
- Generates a scannable QR code for the server's network URL in an in-editor WebView panel
- Works immediately when the server is running — scan with any phone to open on mobile
- Displays both network URL and local URL side-by-side for easy sharing
- Requires device to be on the same Wi-Fi network as your computer

#### 🖥️ Preview in Editor (Inline WebView)
- New command: **`Live Server Lite: Preview in Editor`**
- Opens a live in-editor preview panel beside your code (VS Code split view)
- Toolbar with URL display and one-click refresh button
- Reuses the same panel on repeated invocations (no duplicate panels)
- Fully sandboxed iframe — supports scripts, forms, and same-origin navigation

#### 📋 Copy Server URL
- New command: **`Live Server Lite: Copy Server URL`**
- Instantly copies the local server URL to the clipboard
- Shows a confirmation notification with the copied URL

#### 📊 HTTP Request Logger
- New command: **`Live Server Lite: Show Request Log`**
- Logs every HTTP request to the **"Live Server - Requests"** output channel
- Displays method, status code, response time (ms), and path per request
- Zero-config — automatically active when the server is running
- Controlled by new setting: `liveServerLite.requestLog.enabled`

#### 🔀 SPA (Single Page Application) Mode
- New setting: **`liveServerLite.spa`** (boolean, default: `false`)
- When enabled, all unmatched routes return `index.html` instead of 404
- Essential for React, Vue, Angular, and other apps using client-side routing
- Works transparently alongside existing static file serving

#### 🔁 Proxy Support
- New setting: **`liveServerLite.proxy`** (array, default: `[]`)
- Forward request path prefixes to upstream servers (e.g. `/api` → `http://localhost:8080`)
- Built-in proxy handler with HTTP and HTTPS upstream support
- Supports `context`, `target`, `changeOrigin`, and `secure` options per rule
- No additional dependencies — uses Node.js built-in `http`/`https` modules

### Improved
- TypeScript interfaces updated: `EnhancedServerOptions` now includes `spa` and `proxy` fields
- New `RequestLogEntry` interface in `types.ts` for structured request logging
- `ServerManager` now exposes `setRequestLogger()` for pluggable logging
- `tsconfig.json` updated to include DOM lib types (needed for `@types/qrcode`)



### 🚀 Major Release - Production-Ready HTTPS Security Platform

#### Added
- 🔐 **Complete HTTPS Support**: Full SSL/TLS implementation with automatic certificate management
  - Dual-protocol server supporting both HTTP and HTTPS modes
  - Automatic certificate generation with self-signed SSL certificates
  - Custom certificate loading support for development environments
  - Intelligent protocol fallback and error handling

- 🔐 **Certificate Management System**
  - New module: `certificateManager.ts` - Complete SSL certificate lifecycle management
  - Auto-generation of self-signed certificates with proper CN configuration
  - Certificate validation and expiration checking
  - Secure storage integration with VS Code's storage system
  - Certificate cleanup and lifecycle management

- 🔐 **Security Features**
  - Real-time certificate warnings and security status notifications
  - HTTPS configuration validation with detailed error reporting
  - Security headers and best practices implementation
  - Certificate trust warnings for self-signed certificates

#### Enhanced
- 🔧 **VS Code Integration**
  - New commands: `Live Server Lite: Start HTTPS Server`, `Live Server Lite: Generate Certificate`
  - Enhanced status bar with HTTPS protocol indicators
  - Improved configuration schema with HTTPS settings
  - Better error messages and troubleshooting guidance

- 🧪 **Comprehensive Testing**
  - 120+ test cases including HTTPS integration and certificate management
  - New test suites: `certificateManager.test.ts`, `httpsIntegration.test.ts`
  - Edge case testing for certificate generation and validation
  - Integration tests for dual-protocol server functionality

- 📚 **Enterprise Documentation**
  - Complete HTTPS usage guide with practical examples
  - Security considerations and best practices
  - Troubleshooting guide for certificate issues
  - Configuration reference for all HTTPS settings

## [0.0.7] - 2025-09-20

### Added
- 🆕 **Browser Selection System**: Choose specific browsers or use system default
  - New command: `Live Server Lite: Select Browser`
  - New command: `Live Server Lite: Open in Browser...`
  - Support for Chrome, Firefox, Safari, Edge with auto-detection
  - Custom browser path support

- 🆕 **Smart Notifications**: Desktop notifications with actionable quick actions
  - Server start/stop notifications with quick browser opening
  - Port conflict detection with automatic resolution suggestions  
  - Error notifications with troubleshooting recommendations
  - New command: `Live Server Lite: Toggle Notifications`

- 🆕 **Performance Optimizations**: Enhanced file watching for large projects
  - Batched file change events to prevent browser refresh storms
  - Native file system watchers (FSEvents on macOS) for better performance
  - Large project optimization with smart ignore patterns
  - Auto-excludes node_modules, .git, build folders, and common artifacts

- 🆕 **Enhanced Configuration**: New settings for performance and UX
  - `liveServerLite.browserPath`: Specify browser executable
  - `liveServerLite.browserArgs`: Additional browser arguments
  - `liveServerLite.notifications.*`: Control notification behavior
  - `liveServerLite.watcher.*`: Fine-tune file watching performance

### Improved
- Updated TypeScript interfaces for better type safety
- Enhanced error handling with user-friendly messages
- Better resource management and cleanup
- Comprehensive README documentation with new features

### Technical
- Added `BrowserManager` class for cross-platform browser management
- Added `NotificationManager` class for VS Code notification integration
- Enhanced `FileWatcher` with batching and native watcher support
- Expanded test coverage for new features

## [0.0.6] - 2025-01-19

### 🏗️ Architectural Excellence Update

#### Added
- 🏗️ **Complete Modular Refactoring**: Professional architecture with separation of concerns
  - New module: `serverManager.ts` - Centralized server lifecycle management
  - New module: `fileWatcher.ts` - Intelligent file system monitoring
  - New module: `statusBar.ts` - VS Code status bar integration
  - New module: `utils.ts` - Shared utilities and helper functions
  - New module: `types.ts` - Comprehensive TypeScript type definitions (20+ interfaces)

- 🔧 **Enhanced File Watching**: Optimized performance with intelligent change detection
  - Debounced file change events to prevent excessive reloads
  - Smart filtering to ignore temporary and system files
  - Recursive directory monitoring with performance optimizations
  - Cross-platform compatibility improvements

- 📊 **Status Bar Integration**: Real-time server status with interactive controls
  - Live server status indicator with port information
  - Click-to-start/stop functionality directly from status bar
  - Visual feedback for server state changes
  - Better user experience with immediate status visibility

#### Enhanced
- 🧪 **Comprehensive Testing**: Full test suite with 90+ test cases and edge case coverage
  - New test files: `serverManager.test.ts`, `fileWatcher.test.ts`, `utils.test.ts`
  - Integration tests for complete workflow validation
  - Edge case testing for error scenarios and boundary conditions
  - Performance testing for file watching and server operations

- 📚 **Professional Documentation**: Complete API reference and architectural documentation
  - Detailed README with usage examples and configuration options
  - API documentation for all modules and interfaces
  - FAQ section addressing common user questions
  - Troubleshooting guide for development issues

#### Technical Improvements
- TypeScript strict mode compliance with enhanced type safety
- Improved error handling with detailed error messages
- Better resource management and cleanup procedures
- Enhanced code organization following VS Code extension best practices

## [Unreleased]

- Future enhancements and features