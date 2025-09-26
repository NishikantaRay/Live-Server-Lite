# Release Notes v1.0.4

## Fixes

### Issue Fixes (September 26, 2025)

**🐛 Fixed Notification Display Issue**
- Fixed notification buttons showing "$(check) Open Browser" instead of clean "Open Browser" text
- Notifications now display properly formatted button labels

**🐛 Fixed Duplicate URL Opening**
- Fixed issue where Live Server URL was opening multiple times
- Removed automatic browser opening to prevent double-opening
- URL now opens only when user explicitly clicks "Open Browser" button

**🎉 Enhanced Browser Support**
- Added explicit support for Brave browser
- Brave browser is now automatically detected and available in browser selection
- Improved browser path detection for macOS, Windows, and Linux

## Technical Details

- Modified `NotificationManager` to remove check mark prefixes from action buttons
- Updated `ServerManager` to eliminate automatic browser opening
- Enhanced `BrowserManager` with Brave browser configuration
- All changes maintain backward compatibility
- No breaking changes to existing functionality

## Testing

- ✅ 145 tests passing
- ✅ All core functionality preserved  
- ✅ Notification system working correctly
- ✅ Browser opening behavior fixed
- ✅ Cross-platform compatibility maintained

## Installation

Install this version via the VSIX file or from the VS Code Marketplace once published.

---

**Previous versions:**
- v1.0.3 - Base functionality with HTTPS support
- v1.0.2 - Enhanced features and stability improvements
- v1.0.1 - Initial marketplace release