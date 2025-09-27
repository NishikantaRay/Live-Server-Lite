# 🚨 Live Server Lite - Memory Optimization Guide

## ✅ Smart Memory Monitoring (v1.1.0)

**NEW**: Live Server Lite now only shows memory warnings when you're actively using the server! 

### 🧠 Intelligent Warning System:
- **Only warns when server is running** - No annoying warnings when idle
- **Grace period**: Waits 30 seconds after server start before monitoring
- **Smart throttling**: Maximum 3 warnings per session with 5-minute cooldowns
- **Auto-reset**: Warning system resets when memory returns to normal
- **Higher threshold**: Default raised to 500MB (was 200MB)

## Previous Issue: High Memory Usage (1371.8MB)

High memory usage was caused by:
- Extensive file watching in large projects
- Multiple test files and build artifacts
- Performance monitoring overhead during development
- Accumulated WebSocket connections

## ⚡ Immediate Solutions

### 1. Restart Extension (Fastest Fix)
```
Press Ctrl+Shift+P / Cmd+Shift+P
Type: "Developer: Reload Window"
Press Enter
```
This completely clears extension memory.

### 2. Stop Live Server
```
Click status bar "Stop Live Server" button
OR
Command Palette → "Live Server Lite: Stop Server"
```

### 3. Apply Memory Optimization Settings

Add to your VS Code `settings.json`:

```json
{
  "liveServerLite.performance.monitoring": true,
  "liveServerLite.performance.memoryThreshold": 100,
  "liveServerLite.performance.optimizeForLargeProjects": true,
  
  "liveServerLite.watcher.batchEvents": true,
  "liveServerLite.watcher.batchDelay": 500,
  "liveServerLite.watcher.largeProjectOptimization": true,
  "liveServerLite.watcher.useNativeWatcher": true,
  
  "liveServerLite.ignoreFiles": [
    "node_modules/**",
    ".git/**",
    "dist/**", 
    "build/**",
    "out/**",
    ".next/**",
    ".nuxt/**",
    "coverage/**",
    "**/*.log",
    "**/cache/**",
    "**/tmp/**",
    "**/temp/**",
    "**/.vscode/**",
    "**/.idea/**"
  ],
  
  "liveServerLite.debounceDelay": 1000,
  "liveServerLite.notifications.enabled": false,
  "liveServerLite.https": false
}
```

## 📊 Root Cause Analysis

The high memory usage is likely from:

1. **Large Project File Watching**: The extension is watching too many files
2. **Test Artifact Accumulation**: Build files, logs, and test output consuming memory
3. **Performance Monitoring Overhead**: Real-time memory tracking uses memory itself
4. **Multiple Server Instances**: Possible multiple server instances running

## 🔧 Long-term Prevention

### 1. Clean Project Structure
```bash
# Remove build artifacts
rm -rf node_modules/.cache
rm -rf dist/
rm -rf out/
rm *.vsix (keep only latest)
```

### 2. Optimize File Watching
- Enable large project optimization (default in v1.1.0)
- Use aggressive ignore patterns
- Increase batch delay to reduce processing frequency

### 3. Monitor Memory Usage
```
Command: "Live Server Lite: Show Performance Report"
```
This shows real-time memory usage and recommendations.

## 📈 Expected Results

After applying fixes:
- Memory usage should drop to < 200MB
- File watching should be more efficient
- Server performance should improve
- No more memory warnings

## 🆘 If Issues Persist

1. **Check for Memory Leaks**: Run performance report before/after server operations
2. **Reduce Project Size**: Temporarily exclude large directories
3. **Use HTTP Instead of HTTPS**: HTTPS uses more memory for SSL processing
4. **Report Issue**: If memory usage remains high, create GitHub issue with details

---

**Status**: This high memory usage is not normal for typical Live Server Lite usage. The optimization settings above should resolve it immediately.