# Live Server Lite

A lightweight **Visual Studio Code extension** that provides instant live preview of your web projects with automatic browser refresh on file changes.

---

## ✨ Features

- 🚀 **Quick Start**: Launch a local development server with one command.
- 🔄 **Auto-reload**: Automatically refreshes your browser when files change.
- 🎯 **Right-click Support**: Open any HTML file directly with Live Server Lite.
- 📊 **Status Bar Integration**: Start/stop the server with a single click.
- 🌐 **Smart File Opening**: Opens the specific HTML file instead of only `index.html`.
- ⚡ **WebSocket Live Reload**: Fast and reliable auto-refresh.
- 🛡️ **Robust Error Handling**: User-friendly error messages.
- 📱 **Cross-platform**: Works on Windows, macOS, and Linux.
- 🌍 **Network Access**: Access your site from other devices on the same network.

---

## 📦 Installation

### From VS Code Marketplace (Recommended)

1. Open VS Code.
2. Go to **Extensions** (`Ctrl+Shift+X` / `Cmd+Shift+X`).
3. Search for **Live Server Lite**.
4. Click **Install**.

### From VSIX File

1. Download the `.vsix` file from the [releases](https://github.com/Nishikanta12/live-server-lite/releases).
2. In VS Code, press `Ctrl+Shift+P` / `Cmd+Shift+P`.
3. Type **Install from VSIX**.
4. Select the downloaded `.vsix` file.

---

## 🚀 Usage

### Start the Server

- **Method 1: Right-click HTML File**  
  Right-click any `.html` file in the Explorer and choose **Open with Live Server Lite**.

- **Method 2: Status Bar Button**  
  Click the **📡 Go Live** button at the bottom of VS Code.

- **Method 3: Command Palette**  
  Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`), type  
  **Live Server Lite: Start Server**, and press Enter.

Your project will open in your default browser on `http://localhost:5500` (or the next available port).

### 🌍 Network Access

The server automatically binds to all network interfaces (`0.0.0.0`), making it accessible from other devices on your network. When you start the server, you'll see both URLs:

- **Local**: `http://localhost:5500` - Access from your computer
- **Network**: `http://192.168.x.x:5500` - Access from other devices (phones, tablets, etc.)

You can click "Copy Network URL" to easily share the network address with other devices on your network.

### Stop the Server

- Click **⏹️ Stop Live Server** in the status bar, **or**
- Use the Command Palette: **Live Server Lite: Stop Server**.

---

## 🛠️ How It Works

- **Express.js** serves static files.
- **WebSocket** enables real-time communication for live reload.
- **Chokidar** efficiently watches for file changes.
- Automatic script injection refreshes the browser when files change.

---

## 📂 Supported File Types

- **HTML** (`.html`, `.htm`)
- **CSS / Preprocessors** (`.css`, `.scss`, `.sass`, `.less`)
- **JavaScript / TypeScript / JSX / TSX**
- **Images** (`.jpg`, `.png`, `.gif`, `.svg`, `.webp`)
- **Other assets** (fonts, videos, etc.)

---

## 🔧 Development

### Prerequisites

- Node.js v16 or higher
- npm or yarn
- Visual Studio Code ^1.74.0

### Build from Source

```bash
git clone https://github.com/NishikantaRay/live-server-lite.git
cd live-server-lite
npm install
npm run compile     # Build the extension
npm run package     # Package for VS Code
```

### Run in Development

1. Open the project in VS Code
2. Press `F5` to open Extension Development Host
3. Test the extension in the new window

---

## 🤝 Contributing

Contributions are welcome! For major changes, please open an issue first to discuss what you would like to change.

### Development Setup

1. Fork the repository
2. Clone your fork locally
3. Install dependencies: `npm install`
4. Make your changes
5. Test with `F5` (Extension Development Host)
6. Submit a pull request

---

## 📋 Requirements

- **Visual Studio Code** ^1.74.0
- **Node.js** environment for development
- An open workspace/folder in VS Code

---

## 🐛 Known Issues

- Currently serves from workspace root only
- WebSocket connections may need manual refresh on network switching

---

## 📝 Release Notes

### 0.0.5 (Latest)

- ✨ **NEW**: Network access support - access from other devices on your network
- ✨ **NEW**: Automatic IP address detection and display  
- ✨ **NEW**: "Copy Network URL" button for easy sharing
- 🔧 **Improved**: Enhanced status bar tooltip with both local and network URLs
- 🔧 **Improved**: Better user experience with URL selection options

### 0.0.4

- ✨ **NEW**: Right-click context menu for HTML files
- ✨ **NEW**: Status bar integration with "Go Live" button
- ✨ **NEW**: Smart file opening for specific HTML files
- 🔧 **Improved**: Better error handling and user feedback
- 🔧 **Improved**: Enhanced WebSocket live reload functionality

### 0.0.2

- Fixed command registration issues
- Added proper start/stop server functionality
- Enhanced error handling and user feedback
- Improved extension robustness

### 0.0.1

- Initial release
- Basic live server functionality
- Start/Stop commands
- Auto-reload on file changes

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙋‍♂️ Support

If you encounter any issues:

1. Check the [Known Issues](#-known-issues) section
2. Search existing issues in the [GitHub repository](https://github.com/NishikantaRay/live-server-lite)
3. Create a new issue with detailed information

---

## 🌟 Feedback

Your feedback is valuable! Please:

- ⭐ Star the repository on GitHub
- 📝 Leave a review on the VS Code Marketplace  
- 🐛 Report bugs or suggest features

---

## 👨‍💻 Author

Created by **Nishikanta Ray**
- GitHub: [@NishikantaRay](https://github.com/NishikantaRay)

---

**Enjoy coding with Live Server Lite!** 🎉

*Making web development faster, one reload at a time.*
