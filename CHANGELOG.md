# Change Log

All notable changes to the "live-server-lite" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [1.0.0] - 2025-01-20

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