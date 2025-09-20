# Change Log

All notable changes to the "live-server-lite" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

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

## [0.0.6] - Previous Release

### Added
- Complete modular architecture refactoring
- Comprehensive TypeScript interface system (20+ interfaces)
- Enhanced testing suite with 100+ test cases
- Professional documentation with FAQ and troubleshooting
- Status bar integration with real-time feedback

## [Unreleased]

- Future enhancements and features