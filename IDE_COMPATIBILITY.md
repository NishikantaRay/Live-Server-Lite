# IDE Compatibility Guide

## Overview

Live Server Lite is designed to work across multiple IDEs and editors that support VS Code extensions. This document outlines the compatibility matrix, supported features, and known limitations for each supported environment.

## Supported IDEs and Editors

### 🟢 Fully Supported

#### Visual Studio Code
- **Version**: 1.74.0+
- **Marketplace**: VS Code Marketplace
- **Status**: ✅ Fully Supported
- **Features**: All features supported
- **Installation**: Standard marketplace installation

#### VSCodium
- **Version**: 1.74.0+
- **Marketplace**: Open VSX Registry
- **Status**: ✅ Fully Supported
- **Features**: All features supported except marketplace-specific integrations
- **Installation**: Via Open VSX or manual VSIX installation

### 🟡 Mostly Supported

#### Cursor
- **Version**: Based on VS Code 1.74.0+
- **Marketplace**: Via VSIX or extension sync
- **Status**: 🟡 Mostly Supported
- **Limitations**: 
  - Browser integration may have limitations
  - Some webview features might not work as expected
- **Installation**: Manual VSIX installation or extension sync

#### Code - OSS (Open Source Build)
- **Version**: 1.74.0+
- **Marketplace**: Open VSX Registry
- **Status**: 🟡 Mostly Supported
- **Limitations**: 
  - No access to VS Code Marketplace
  - Limited telemetry integration
- **Installation**: Via Open VSX or manual VSIX installation

### 🟠 Partially Supported

#### GitHub Codespaces
- **Version**: VS Code Web based
- **Marketplace**: VS Code Marketplace
- **Status**: 🟠 Partially Supported
- **Limitations**: 
  - Browser integration is limited
  - Local file system access restrictions
  - Port forwarding required for server functionality
- **Installation**: Standard marketplace installation

#### Gitpod
- **Version**: Theia/VS Code compatible
- **Marketplace**: Open VSX Registry
- **Status**: 🟠 Partially Supported
- **Limitations**: 
  - Browser integration is limited
  - Workspace-specific networking
  - Some terminal features may not work
- **Installation**: Via workspace configuration or Open VSX

#### Eclipse Theia
- **Version**: VS Code API ~1.60.0 compatible
- **Marketplace**: Open VSX Registry or manual
- **Status**: 🟠 Partially Supported
- **Limitations**: 
  - Limited VS Code API compatibility
  - Status bar features may be limited
  - Webview support is basic
  - Terminal integration may vary
- **Installation**: Manual VSIX installation or Open VSX

### 🔴 Limited/Experimental Support

#### Other VS Code Compatible Editors
Various other editors claim VS Code extension compatibility but may have significant limitations.

## Feature Compatibility Matrix

| Feature | VS Code | VSCodium | Cursor | Code-OSS | Codespaces | Gitpod | Theia |
|---------|---------|----------|---------|----------|------------|--------|-------|
| ✅ Live Server | ✅ | ✅ | ✅ | ✅ | 🟠 | 🟠 | 🟡 |
| ✅ Auto Reload | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ✅ HTTPS Support | ✅ | ✅ | ✅ | ✅ | 🟠 | 🟠 | 🟡 |
| ✅ Status Bar | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 |
| ✅ File Watching | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ✅ Commands | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ✅ Configuration | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ✅ Context Menus | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 |
| ✅ Notifications | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ✅ Browser Opening | ✅ | ✅ | 🟡 | ✅ | 🔴 | 🔴 | 🔴 |
| ✅ Port Detection | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | ✅ |
| ✅ SSL Certificates | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | 🟡 |

**Legend:**
- ✅ Full Support
- 🟡 Partial Support
- 🟠 Limited Support
- 🔴 Not Supported

## Installation Guide

### VS Code Marketplace (VS Code, Codespaces)
```
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Live Server Lite"
4. Click Install
```

### Open VSX Registry (VSCodium, Code-OSS, Gitpod)
```
1. Open your editor
2. Go to Extensions
3. Search for "Live Server Lite" 
4. Install from Open VSX
```

### Manual VSIX Installation (Cursor, Theia, Others)
```
1. Download the .vsix file from releases
2. Open command palette (Ctrl+Shift+P)
3. Run "Extensions: Install from VSIX..."
4. Select the downloaded .vsix file
```

## Platform Support

### Windows
- **Supported Versions**: Windows 10, 11, Server 2019+
- **Architecture**: x64, ARM64
- **Browsers**: Chrome, Firefox, Edge, Internet Explorer 11+
- **Special Notes**: PowerShell and Command Prompt supported

### macOS
- **Supported Versions**: macOS 10.15+
- **Architecture**: Intel x64, Apple Silicon (M1/M2)
- **Browsers**: Safari, Chrome, Firefox, Edge
- **Special Notes**: App Store notarization compatible

### Linux
- **Distributions**: Ubuntu, Debian, CentOS, Fedora, Arch, others
- **Architecture**: x64, ARM64
- **Browsers**: Chrome, Chromium, Firefox
- **Special Notes**: Snap and Flatpak compatible

## API Compatibility

### Minimum VS Code API Version
- **Required**: 1.74.0
- **Recommended**: 1.80.0+
- **Maximum Tested**: 1.85.0

### Core API Dependencies
- `vscode.workspace` - Workspace management
- `vscode.window` - UI interactions  
- `vscode.commands` - Command registration
- `vscode.languages` - File type detection
- `vscode.env` - Environment access

### Optional API Usage
- `vscode.window.createWebviewPanel` - Webview support (fallback: external browser)
- `vscode.window.createTerminal` - Terminal integration (fallback: notifications)
- `vscode.authentication` - Future authentication features

## Troubleshooting Common Issues

### Extension Not Working
1. **Check IDE Version**: Ensure your IDE supports VS Code API 1.74.0+
2. **Verify Installation**: Reinstall from appropriate marketplace
3. **Check Permissions**: Ensure file system access permissions
4. **Review Logs**: Check IDE developer tools/logs

### Server Won't Start
1. **Port Issues**: Check if ports 3000/3443 are available
2. **File Permissions**: Ensure read/write access to workspace
3. **Firewall**: Check firewall settings
4. **Network Interface**: Verify network interface availability

### Browser Won't Open
1. **Browser Detection**: Extension may not detect browser on your system
2. **Manual Opening**: Use displayed URL to manually open browser
3. **Default Browser**: Set system default browser
4. **Browser Path**: Configure custom browser path in settings

### HTTPS Issues
1. **Certificate Generation**: May fail on restricted systems
2. **Custom Certificates**: Use custom SSL certificates if needed
3. **Port Conflicts**: HTTPS port 3443 may be in use
4. **Security Policies**: Corporate security may block self-signed certificates

## Feature Limitations by IDE

### Browser Integration
- **Full Support**: VS Code, VSCodium, Code-OSS
- **Limited**: Cursor (some browsers may not open)
- **None**: Codespaces, Gitpod, Theia (use manual URLs)

### File System Access
- **Full Support**: Desktop IDEs
- **Limited**: Web-based IDEs (Codespaces, Gitpod)
- **Sandboxed**: Some online editors

### Network Access
- **Direct**: Desktop IDEs
- **Proxied**: Codespaces (port forwarding)
- **Restricted**: Some corporate environments

## Testing Your IDE Compatibility

Run our compatibility test suite to verify support:

```bash
# Install dependencies
npm install

# Run compatibility tests  
npm run test -- --grep "IDE Compatibility"
npm run test -- --grep "API Version Compatibility"
npm run test -- --grep "Cross-Platform Compatibility"
```

## Contributing IDE Support

To add support for a new IDE:

1. Check VS Code API compatibility
2. Test extension installation
3. Verify core features work
4. Document limitations
5. Add test cases
6. Submit PR with compatibility info

## Support Matrix Summary

| IDE Category | Count | Support Level | Notes |
|--------------|-------|---------------|-------|
| **Full Support** | 2 | ✅ 100% | VS Code, VSCodium |
| **Mostly Supported** | 2 | 🟡 90% | Cursor, Code-OSS |  
| **Partially Supported** | 3 | 🟠 70% | Codespaces, Gitpod, Theia |
| **Limited Support** | Many | 🔴 30% | Various VS Code-compatible editors |

**Total Estimated Compatible IDEs: 7+ major IDEs with 50+ compatible editors**

## Getting Help

- **Issues**: Report IDE-specific issues on GitHub
- **Discussions**: Ask questions in GitHub Discussions
- **Documentation**: Check README for basic setup
- **Community**: Join VS Code extension development communities

---

*Last Updated: December 2024*
*Extension Version: 1.0.3+*