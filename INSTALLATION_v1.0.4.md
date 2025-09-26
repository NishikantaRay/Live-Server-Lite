# Live Server Lite v1.0.4 Installation

## 🎉 VSIX Package Ready!

**File:** `live-server-lite-1.0.4.vsix` (676KB)
**Version:** 1.0.4 with notification and browser opening fixes

## Installation Methods

### Method 1: VS Code Command Palette (Recommended)
1. Open VS Code
2. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
3. Type: `Extensions: Install from VSIX...`
4. Select the `live-server-lite-1.0.4.vsix` file
5. Click "Install" and reload VS Code when prompted

### Method 2: VS Code Extensions View
1. Open VS Code
2. Go to Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`)
3. Click the "..." menu in the top-right of the Extensions view
4. Select "Install from VSIX..."
5. Choose the `live-server-lite-1.0.4.vsix` file
6. Restart VS Code if needed

### Method 3: Command Line
```bash
code --install-extension live-server-lite-1.0.4.vsix
```

## ✅ What's Fixed in v1.0.4

### 🐛 Issue Fixes
- **Fixed notification display**: No more "$(check) Open Browser" - now shows clean "Open Browser" text
- **Fixed duplicate URL opening**: URL now opens only when you click "Open Browser", not automatically
- **Added Brave browser support**: Brave browser is now detected and selectable

### 🧪 Testing Your Installation

1. **Create a test HTML file** or use the included `test-index.html`
2. **Right-click the file** and select "Open with Live Server"
3. **Verify the notification** shows clean "Open Browser" button text (no $(check) prefix)
4. **Click "Open Browser"** and confirm it opens only once in your browser
5. **Close the browser tab** and verify it doesn't automatically reopen

## 🔧 Configuration

The extension supports these browsers:
- **Chrome** (auto-detected)
- **Brave** (auto-detected) ✨ NEW!
- **Firefox** (auto-detected)
- **Safari** (macOS only)
- **Edge** (auto-detected)
- **Custom browser** (specify path)

To configure your browser:
1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type: `Live Server Lite: Select Browser`
3. Choose your preferred browser

## 🎯 Features

- ✅ Live reload with WebSocket
- ✅ HTTPS support with auto-generated certificates
- ✅ Cross-platform compatibility
- ✅ Configurable ports and hosts
- ✅ File watching with optimizations
- ✅ Status bar integration
- ✅ Browser selection and management
- ✅ Notification system (now fixed!)

## 📁 File Location

The VSIX file is located at:
```
/Users/nishikantaray/Desktop/Live-Server-Lite/live-server-lite-1.0.4.vsix
```

## 🆘 Support

If you encounter any issues:
1. Check the [GitHub Issues](https://github.com/NishikantaRay/Live-Server-Lite/issues)
2. Create a new issue with details
3. Email: nishikantaray1@gmail.com

---

**Happy coding! 🚀**