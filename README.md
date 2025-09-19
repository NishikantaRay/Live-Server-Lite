# Live Server Lite# Live Server Lite



A lightweight live server extension for Visual Studio Code that provides instant live preview of your web projects with automatic browser refresh on file changes.A lightweight live server extension for Visual Studio Code that provides instant live preview of your web projects with automatic browser refresh on file changes.



## ✨ Features## ✨ Features



- 🚀 **Quick Start**: Launch a local development server with one command- 🚀 **Quick Start**: Launch a local development server with one command

- 🔄 **Auto-reload**: Automatically refreshes your browser when files change- 🔄 **Auto-reload**: Automatically refreshes your browser when files change

- 🎯 **Right-click Support**: Open any HTML file directly with Live Server- 🎯 **Simple & Lightweight**: Minimal setup, maximum productivity

- 📊 **Status Bar Integration**: Easy access via status bar button- 📱 **Cross-platform**: Works on Windows, macOS, and Linux

- 🌐 **Smart File Opening**: Opens specific HTML files instead of just index.html- 🌐 **Multiple Browsers**: Opens in your default browser automatically

- ⚡ **WebSocket Live Reload**: Fast and reliable auto-refresh using WebSocket technology- ⚡ **Fast**: Optimized for quick development cycles

- 🛡️ **Error Handling**: Robust error handling with user-friendly messages

- 📱 **Cross-platform**: Works on Windows, macOS, and Linux## 📦 Installation



## 📦 Installation### From VS Code Marketplace (Recommended)

1. Open VS Code

### From VS Code Marketplace (Recommended)2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)

1. Open VS Code3. Search for "Live Server Lite"

2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)4. Click Install

3. Search for "Live Server Lite"

4. Click Install### From VSIX File

1. Download the `.vsix` file from releases

### From VSIX File2. Open VS Code

1. Download the `.vsix` file from releases3. Press `Ctrl+Shift+P` / `Cmd+Shift+P`

2. Open VS Code4. Type "Install from VSIX"

3. Press `Ctrl+Shift+P` / `Cmd+Shift+P`5. Select the downloaded `.vsix` file

4. Type "Install from VSIX"

5. Select the downloaded `.vsix` file## 🚀 Usage



## 🚀 Usage### Starting the Server



### Method 1: Right-click on HTML File (New!)1. Open your project folder in VS Code

1. Right-click on any `.html` file in the VS Code Explorer2. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)

2. Select **"Open with Live Server Lite"**3. Type "Live Server Lite: Start Server" and press Enter

3. Your HTML file opens in browser with live reload enabled4. Your default browser will open with your project running on a local server

5. The server typically runs on `http://localhost:3000` or the next available port

### Method 2: Status Bar Button (New!)

1. Look for the **"📡 Go Live"** button in the bottom status bar### Stopping the Server

2. Click it to start the server (opens index.html by default)

3. When running, button changes to **"⏹️ Stop Live Server"**1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)

2. Type "Live Server Lite: Stop Server" and press Enter

### Method 3: Command Palette3. The server will stop and the browser tab will no longer auto-refresh

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)

2. Type "Live Server Lite: Start Server" and press Enter### Alternative Methods

3. Your default browser will open with your project running on `http://localhost:5500`

- **Right-click**: Right-click on an HTML file in the Explorer and select "Start Live Server"

### Stopping the Server- **Status Bar**: Click the "Live Server" button in the status bar (when available)

- Click the **"⏹️ Stop Live Server"** button in status bar, OR

- Use Command Palette: "Live Server Lite: Stop Server"## 🛠️ Configuration



## 🛠️ How It WorksCurrently, Live Server Lite works with default settings optimized for most use cases. Future versions will include customizable options for:



Live Server Lite uses:- Custom port selection

- **Express.js** for serving static files- Browser selection

- **WebSocket** for real-time communication with browser- Auto-open preferences

- **Chokidar** for efficient file watching- File watching patterns

- **Automatic Script Injection** to enable live reload in your HTML pages

## 📂 Supported File Types

The extension automatically injects a small WebSocket client script into your HTML pages that listens for file changes and refreshes the browser automatically.

Live Server Lite works with all web technologies:

## 📂 Supported File Types

- **HTML** files (.html, .htm)

Live Server Lite works with all web technologies:- **CSS** files (.css, .scss, .sass, .less)

- **HTML** files (.html, .htm)- **JavaScript** files (.js, .ts, .jsx, .tsx)

- **CSS** files (.css, .scss, .sass, .less)- **Images** (.jpg, .png, .gif, .svg, .webp)

- **JavaScript** files (.js, .ts, .jsx, .tsx)- **Other** web assets

- **Images** (.jpg, .png, .gif, .svg, .webp)

- **Other** web assets (fonts, videos, etc.)## 🔧 Development



## ⚙️ Configuration### Prerequisites



Live Server Lite runs on **port 5500** by default and serves files from your workspace root directory. The extension automatically:- Node.js (v16 or higher)

- npm or yarn

- Ignores `node_modules`, `.git`, and `dist` folders for file watching- Visual Studio Code

- Injects WebSocket client code for live reload

- Opens your default browser automatically### Building from Source

- Provides user-friendly error messages

```bash

## 🔧 Development# Clone the repository

git clone <repository-url>

### Prerequisitescd live-server-lite

- Node.js (v16 or higher)

- npm or yarn# Install dependencies

- Visual Studio Code ^1.104.0npm install



### Building from Source# Compile the extension

npm run compile

```bash

# Clone the repository# Run tests

git clone https://github.com/Nishikanta12/live-server-lite.gitnpm test

cd live-server-lite

# Package the extension

# Install dependenciesnpm run package

npm install```



# Compile the extension### Running in Development

npm run compile

1. Open the project in VS Code

# Package the extension2. Press `F5` to open a new Extension Development Host window

npm run package3. Test the extension in the new window

```

## 🤝 Contributing

### Running in Development

1. Open the project in VS CodeContributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

2. Press `F5` to open a new Extension Development Host window

3. Test the extension in the new window### Development Setup



## 🤝 Contributing1. Fork the repository

2. Clone your fork locally

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.3. Install dependencies: `npm install`

4. Make your changes

### Development Setup5. Test your changes

1. Fork the repository6. Submit a pull request

2. Clone your fork locally

3. Install dependencies: `npm install`## 📋 Requirements

4. Make your changes

5. Test your changes with `F5` (Extension Development Host)- Visual Studio Code ^1.74.0

6. Submit a pull request- Node.js environment for development



## 📋 Requirements## 🐛 Known Issues



- **Visual Studio Code** ^1.104.0- None currently reported

- **Node.js** environment for development

- An open workspace/folder in VS Code## 📝 Release Notes



## 🐛 Known Issues### 0.0.2



- Server runs on a fixed port (5500) - port customization coming in future versions- Fixed command registration issues

- Currently serves from workspace root only- Added proper start/stop server functionality  

- Enhanced error handling and user feedback

## 📝 Release Notes- Improved extension robustness

- Updated comprehensive documentation

### 0.0.3 (Latest)

- ✨ **NEW**: Right-click context menu for HTML files### 0.0.1

- ✨ **NEW**: Status bar integration with "Go Live" button

- ✨ **NEW**: Smart file opening - opens specific HTML files- Initial release

- 🔧 **Improved**: Better error handling and user feedback- Basic live server functionality

- 🔧 **Improved**: Enhanced WebSocket live reload functionality- Start/Stop commands

- 📚 **Updated**: Comprehensive documentation- Auto-reload on file changes



### 0.0.2## 📄 License

- Fixed command registration issues

- Added proper start/stop server functionality  This project is licensed under the MIT License - see the LICENSE file for details.

- Enhanced error handling and user feedback

- Improved extension robustness## 🙋‍♂️ Support



### 0.0.1If you encounter any issues or have questions:

- Initial release

- Basic live server functionality1. Check the [Known Issues](#-known-issues) section

- Start/Stop commands2. Search existing issues in the repository

- Auto-reload on file changes3. Create a new issue with detailed information about your problem



## 📄 License## 🌟 Feedback



This project is licensed under the MIT License - see the LICENSE file for details.Your feedback is valuable! If you enjoy using Live Server Lite, please:



## 🙋‍♂️ Support- ⭐ Star the repository

- 📝 Leave a review on the VS Code Marketplace

If you encounter any issues or have questions:- 🐛 Report bugs or suggest features



1. Check the [Known Issues](#-known-issues) section---

2. Search existing issues in the [GitHub repository](https://github.com/Nishikanta12/live-server-lite)

3. Create a new issue with detailed information about your problem**Enjoy coding with Live Server Lite!** 🎉ver Lite

A lightweight live server for VS Code.

## 🌟 Feedback

## Features

Your feedback is valuable! If you enjoy using Live Server Lite, please:* Auto-reload browser on file save

* Simple start/stop commands

- ⭐ Star the repository on GitHub

- 📝 Leave a review on the VS Code Marketplace## Usage

- 🐛 Report bugs or suggest features through GitHub issues1. Install the extension.

2. Run “Live Server Lite: Start Server” from the Command Palette.

## 👨‍💻 Author

Created by **Nishikanta Ray**
- GitHub: [@NishikantaRay](https://github.com/NishikantaRay)

---

**Enjoy coding with Live Server Lite!** 🎉

*Making web development faster, one reload at a time.*# Live-Server-Lite
