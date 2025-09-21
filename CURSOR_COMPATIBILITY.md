# 🖥️ Cursor IDE Compatibility Guide

## ✅ Live Server - Now Compatible with Cursor!

**Good news!** Live Server extension v1.0.2+ is now fully compatible with **Cursor IDE** and other VS Code-based editors.

### 🔧 Compatibility Details

| **Editor** | **Minimum Version** | **Status** | **Notes** |
|------------|-------------------|------------|-----------|
| **VS Code** | 1.74.0+ | ✅ Fully Compatible | All features supported |
| **Cursor IDE** | 1.99.3+ | ✅ Fully Compatible | All features supported |
| **VS Codium** | 1.74.0+ | ✅ Compatible | Open source VS Code |
| **Code - OSS** | 1.74.0+ | ✅ Compatible | Microsoft's open source version |

### 🚀 Installation in Cursor

#### Method 1: Cursor Extensions Marketplace
1. Open Cursor IDE
2. Click Extensions panel (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for **"Live Server"**
4. Install **"Live Server - Auto Reload & Static Server"** by Nishikanta12
5. Reload Cursor if prompted

#### Method 2: Install from VSIX (If needed)
1. Download the latest `.vsix` file from [GitHub Releases](https://github.com/NishikantaRay/Live-Server-Lite/releases)
2. In Cursor: `Ctrl+Shift+P` / `Cmd+Shift+P` → "Extensions: Install from VSIX..."
3. Select the downloaded `.vsix` file
4. Restart Cursor

### 🎯 Features in Cursor IDE

All Live Server features work perfectly in Cursor:

✅ **Core Features**
- Right-click HTML → "Open with Live Server"
- Auto-reload on file saves (HTML, CSS, JS)
- WebSocket-based real-time updates
- Multi-browser support
- Status bar integration

✅ **Advanced Features**  
- HTTPS development server with SSL certificates
- Network access for mobile device testing
- Smart notifications with quick actions
- Performance optimized file watching
- Custom browser selection

✅ **Configuration**
- All VS Code settings work identically
- Workspace-specific configuration supported
- Command palette integration

### 🔧 Cursor-Specific Tips

#### **1. AI-Powered Development with Live Server**
Cursor's AI features work great with Live Server:
- Use AI to generate HTML/CSS → Save → Instant preview
- AI code completions → Live Server shows results immediately
- Perfect for rapid prototyping with AI assistance

#### **2. Cursor's Composer + Live Server**
- Use Composer to create entire web components
- Live Server provides instant feedback as you iterate
- Great for testing AI-generated code in real-time

#### **3. File Watching Performance**
Cursor handles file watching slightly differently:
```json
{
  "liveServerLite.watcher.useNativeWatcher": true,
  "liveServerLite.watcher.batchEvents": true,
  "liveServerLite.watcher.batchDelay": 300
}
```

### 🐛 Troubleshooting in Cursor

#### **Issue: Extension not appearing in Cursor**
**Solution:**
1. Ensure Cursor is updated to v1.99.3+
2. Clear Cursor's extension cache: `Ctrl+Shift+P` → "Developer: Reload Window"
3. Check if Cursor is blocking VS Code extensions (check settings)

#### **Issue: HTTPS certificates not generating**
**Solution:**
1. Grant Cursor file system permissions
2. Try running Cursor as administrator/sudo (one time)
3. Use custom certificate path if auto-generation fails

#### **Issue: Port conflicts with Cursor's dev server**
**Solution:**
```json
{
  "liveServerLite.port": 3000,
  "liveServerLite.https.port": 3443
}
```

### 🎯 Cursor + Live Server Workflow

#### **Perfect for AI-Driven Development:**

1. **Use Cursor's AI to generate code**
   ```html
   <!-- Ask Cursor AI: "Create a responsive landing page" -->
   <html>...</html>
   ```

2. **Right-click → "Open with Live Server"**
   - Instant preview of AI-generated code
   - No manual refresh needed

3. **Iterate with AI assistance**
   - Cursor AI suggests improvements
   - Live Server shows changes immediately
   - Perfect feedback loop

4. **Test across devices**
   - Use network URLs for mobile testing
   - AI helps optimize for different screen sizes
   - Live updates across all devices

### 🚀 Why Cursor + Live Server is Amazing

| **Cursor Feature** | **+ Live Server** | **= Result** |
|-------------------|------------------|-------------|
| 🤖 AI Code Generation | ⚡ Instant Preview | Rapid prototyping |
| 🧠 Smart Completions | 🔄 Auto-reload | Immediate feedback |
| 📝 Code Explanations | 🌐 Live Testing | Better understanding |
| 🔧 Refactoring AI | 📱 Multi-device | Perfect responsive design |

### 📞 Support

If you encounter any Cursor-specific issues:

1. **Check compatibility**: Ensure Cursor v1.99.3+
2. **GitHub Issues**: [Report Cursor-specific problems](https://github.com/NishikantaRay/Live-Server-Lite/issues)
3. **Cursor Community**: Share experiences in Cursor Discord/forums

### 🎉 Happy Coding!

The combination of **Cursor's AI-powered development** + **Live Server's instant preview** creates an incredibly productive web development environment. Enjoy building amazing projects! 

---

**💡 Pro Tip**: Use Cursor's AI to ask "How can I improve this website's performance?" while Live Server shows the results in real-time!