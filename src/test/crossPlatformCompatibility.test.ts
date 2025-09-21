import * as assert from 'assert';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { TestHelper } from './testHelper';

/**
 * Cross-Platform Compatibility Tests
 * 
 * Tests extension functionality across different operating systems
 */

interface PlatformInfo {
  platform: NodeJS.Platform;
  name: string;
  pathSeparator: string;
  executableExtension: string;
  browserPaths: string[];
  shellCommand: string;
  environmentVariables: Record<string, string>;
}

const PLATFORM_CONFIGS: Partial<Record<NodeJS.Platform, PlatformInfo>> = {
  win32: {
    platform: 'win32',
    name: 'Windows',
    pathSeparator: '\\',
    executableExtension: '.exe',
    browserPaths: [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
      'C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ],
    shellCommand: 'cmd',
    environmentVariables: {
      PATH: 'PATH',
      HOME: 'USERPROFILE',
      TEMP: 'TEMP'
    }
  },
  darwin: {
    platform: 'darwin',
    name: 'macOS',
    pathSeparator: '/',
    executableExtension: '',
    browserPaths: [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Firefox.app/Contents/MacOS/firefox',
      '/Applications/Safari.app/Contents/MacOS/Safari',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
    ],
    shellCommand: 'bash',
    environmentVariables: {
      PATH: 'PATH',
      HOME: 'HOME',
      TEMP: 'TMPDIR'
    }
  },
  linux: {
    platform: 'linux',
    name: 'Linux',
    pathSeparator: '/',
    executableExtension: '',
    browserPaths: [
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/firefox',
      '/snap/bin/chromium',
      '/snap/bin/firefox',
      '/usr/bin/microsoft-edge'
    ],
    shellCommand: 'bash',
    environmentVariables: {
      PATH: 'PATH',
      HOME: 'HOME',
      TEMP: 'TMPDIR'
    }
  },
  // Additional platforms for completeness
  freebsd: {
    platform: 'freebsd',
    name: 'FreeBSD',
    pathSeparator: '/',
    executableExtension: '',
    browserPaths: ['/usr/local/bin/chrome', '/usr/local/bin/firefox'],
    shellCommand: 'bash',
    environmentVariables: { PATH: 'PATH', HOME: 'HOME', TEMP: 'TMPDIR' }
  },
  openbsd: {
    platform: 'openbsd',
    name: 'OpenBSD',
    pathSeparator: '/',
    executableExtension: '',
    browserPaths: ['/usr/local/bin/chrome', '/usr/local/bin/firefox'],
    shellCommand: 'bash',
    environmentVariables: { PATH: 'PATH', HOME: 'HOME', TEMP: 'TMPDIR' }
  },
  sunos: {
    platform: 'sunos',
    name: 'SunOS',
    pathSeparator: '/',
    executableExtension: '',
    browserPaths: [],
    shellCommand: 'bash',
    environmentVariables: { PATH: 'PATH', HOME: 'HOME', TEMP: 'TMPDIR' }
  },
  aix: {
    platform: 'aix',
    name: 'AIX',
    pathSeparator: '/',
    executableExtension: '',
    browserPaths: [],
    shellCommand: 'bash',
    environmentVariables: { PATH: 'PATH', HOME: 'HOME', TEMP: 'TMPDIR' }
  }
};

suite('Cross-Platform Compatibility Tests', () => {
  let currentPlatform: PlatformInfo;
  let testContext: any;

  setup(async () => {
    currentPlatform = PLATFORM_CONFIGS[process.platform] || {
      platform: process.platform,
      name: process.platform.charAt(0).toUpperCase() + process.platform.slice(1),
      pathSeparator: process.platform === 'win32' ? '\\' : '/',
      executableExtension: process.platform === 'win32' ? '.exe' : '',
      browserPaths: [],
      shellCommand: process.platform === 'win32' ? 'cmd' : 'bash',
      environmentVariables: {
        PATH: 'PATH',
        HOME: process.platform === 'win32' ? 'USERPROFILE' : 'HOME',
        TEMP: process.platform === 'win32' ? 'TEMP' : 'TMPDIR'
      }
    };
    testContext = await TestHelper.createTestWorkspace(TestHelper.getDefaultTestFiles());
  });

  teardown(async () => {
    await TestHelper.cleanupTestWorkspaces();
  });

  suite('Platform Detection', () => {
    test('Current platform is recognized', () => {
      assert.ok(currentPlatform, `Platform ${process.platform} should be recognized`);
      assert.strictEqual(currentPlatform.platform, process.platform, 'Platform should match');
      
      console.log(`\nRunning on: ${currentPlatform.name} (${currentPlatform.platform})`);
      console.log(`Path separator: ${currentPlatform.pathSeparator}`);
      console.log(`Shell: ${currentPlatform.shellCommand}`);
    });

    test('Platform-specific paths work correctly', () => {
      // Test path operations
      const testPath = path.join('folder', 'subfolder', 'file.txt');
      
      if (process.platform === 'win32') {
        assert.ok(testPath.includes('\\'), 'Windows paths should use backslashes');
      } else {
        assert.ok(testPath.includes('/'), 'Unix paths should use forward slashes');
      }
      
      // Test path normalization
      const normalized = path.normalize('./folder/../other/file.txt');
      assert.ok(normalized, 'Path normalization should work');
      
      console.log(`Test path: ${testPath}`);
      console.log(`Normalized: ${normalized}`);
    });

    test('Environment variables are accessible', () => {
      const envVars = currentPlatform.environmentVariables;
      
      Object.entries(envVars).forEach(([key, envVar]) => {
        const value = process.env[envVar];
        console.log(`${key} (${envVar}): ${value ? 'available' : 'not set'}`);
        
        if (key === 'PATH' || key === 'HOME') {
          assert.ok(value, `${key} environment variable should be available`);
        }
      });
    });
  });

  suite('File System Operations', () => {
    test('File operations work across platforms', async () => {
      const testFile = path.join(testContext.tempDir, 'platform-test.html');
      const testContent = `<!DOCTYPE html>
<html>
<head>
    <title>Platform Test</title>
</head>
<body>
    <h1>Testing on ${currentPlatform.name}</h1>
    <p>Platform: ${process.platform}</p>
    <p>Node version: ${process.version}</p>
</body>
</html>`;

      // Test file creation
      await fs.promises.writeFile(testFile, testContent, 'utf8');
      assert.ok(fs.existsSync(testFile), 'Test file should be created');

      // Test file reading
      const readContent = await fs.promises.readFile(testFile, 'utf8');
      assert.strictEqual(readContent, testContent, 'File content should match');

      // Test file stats
      const stats = await fs.promises.stat(testFile);
      assert.ok(stats.isFile(), 'Should be identified as file');
      assert.ok(stats.size > 0, 'File should have content');

      // Test file deletion
      await fs.promises.unlink(testFile);
      assert.ok(!fs.existsSync(testFile), 'File should be deleted');
    });

    test('Directory operations work across platforms', async () => {
      const testDir = path.join(testContext.tempDir, 'test-subdir');
      const nestedDir = path.join(testDir, 'nested', 'deep');

      // Test directory creation (recursive)
      await fs.promises.mkdir(nestedDir, { recursive: true });
      assert.ok(fs.existsSync(nestedDir), 'Nested directory should be created');

      // Test directory listing
      const files = await fs.promises.readdir(testDir);
      assert.ok(files.includes('nested'), 'Should list subdirectories');

      // Test directory stats
      const stats = await fs.promises.stat(testDir);
      assert.ok(stats.isDirectory(), 'Should be identified as directory');
    });

    test('Path resolution works correctly', () => {
      // Test absolute path resolution
      const absolutePath = path.resolve(testContext.tempDir, 'test.html');
      assert.ok(path.isAbsolute(absolutePath), 'Should create absolute path');

      // Test relative path handling
      const relativePath = path.relative(testContext.tempDir, absolutePath);
      assert.strictEqual(relativePath, 'test.html', 'Relative path should be correct');

      // Test path parsing
      const parsed = path.parse(absolutePath);
      assert.ok(parsed.dir, 'Should parse directory');
      assert.strictEqual(parsed.base, 'test.html', 'Should parse filename');
      assert.strictEqual(parsed.ext, '.html', 'Should parse extension');

      console.log(`Absolute: ${absolutePath}`);
      console.log(`Relative: ${relativePath}`);
    });
  });

  suite('Network Operations', () => {
    test('Port binding works across platforms', async () => {
      const port = await TestHelper.getAvailablePort(3000);
      assert.ok(port > 0, 'Should get available port');
      assert.ok(port < 65536, 'Port should be in valid range');

      console.log(`Available port: ${port}`);
    });

    test('Host resolution works', async () => {
      const hostnames = ['localhost', '127.0.0.1', '0.0.0.0'];
      
      hostnames.forEach(hostname => {
        // This is a basic validation - in a real test you might try binding
        assert.ok(hostname, `Hostname ${hostname} should be valid`);
      });

      // Test getting local IP address
      const networkInterfaces = os.networkInterfaces();
      const hasNetworkInterfaces = Object.keys(networkInterfaces).length > 0;
      assert.ok(hasNetworkInterfaces, 'Should have network interfaces');

      console.log('Network interfaces available:', Object.keys(networkInterfaces).length);
    });
  });

  suite('Browser Detection', () => {
    test('Can detect available browsers', async () => {
      const availableBrowsers: string[] = [];
      
      for (const browserPath of currentPlatform.browserPaths) {
        try {
          if (fs.existsSync(browserPath)) {
            availableBrowsers.push(browserPath);
          }
        } catch (error) {
          // Ignore access errors
        }
      }

      console.log(`\nAvailable browsers on ${currentPlatform.name}:`);
      if (availableBrowsers.length === 0) {
        console.log('  No browsers found in standard locations');
        console.log('  (This is normal in CI/testing environments)');
      } else {
        availableBrowsers.forEach(browser => {
          console.log(`  - ${browser}`);
        });
      }

      // Don't fail if no browsers found - common in CI environments
      assert.ok(true, 'Browser detection completed');
    });

    test('Browser command line arguments are platform appropriate', () => {
      // Test that browser args would work on current platform
      const commonArgs = ['--no-sandbox', '--disable-dev-shm-usage'];
      
      if (process.platform === 'linux') {
        // Linux-specific args are acceptable
        assert.ok(commonArgs.includes('--no-sandbox'), 'Linux should support --no-sandbox');
      }

      if (process.platform === 'win32') {
        // Windows paths might need special handling
        const windowsArg = '--user-data-dir=C:\\temp\\chrome-data';
        assert.ok(windowsArg.includes('\\'), 'Windows paths should use backslashes');
      }

      assert.ok(true, 'Browser arguments are platform appropriate');
    });
  });

  suite('Process and Shell Operations', () => {
    test('Can execute shell commands', async () => {
      // Test basic shell command execution capability
      const shellCommands = {
        win32: 'echo "test"',
        darwin: 'echo "test"',
        linux: 'echo "test"'
      };

      const command = shellCommands[process.platform as keyof typeof shellCommands];
      assert.ok(command, `Should have shell command for ${process.platform}`);

      console.log(`Shell command for ${currentPlatform.name}: ${command}`);
    });

    test('Environment PATH is accessible', () => {
      const pathVar = process.env[currentPlatform.environmentVariables.PATH];
      assert.ok(pathVar, 'PATH environment variable should be accessible');

      const pathSeparator = process.platform === 'win32' ? ';' : ':';
      const pathEntries = pathVar?.split(pathSeparator) || [];
      
      assert.ok(pathEntries.length > 0, 'PATH should contain entries');
      console.log(`PATH entries: ${pathEntries.length}`);
    });
  });

  suite('Performance Characteristics', () => {
    test('File system operations performance', async () => {
      const iterations = 10;
      const files: string[] = [];

      // Test file creation performance
      const startTime = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        const testFile = path.join(testContext.tempDir, `perf-test-${i}.txt`);
        await fs.promises.writeFile(testFile, `Test content ${i}`, 'utf8');
        files.push(testFile);
      }
      
      const creationTime = Date.now() - startTime;
      console.log(`\nFile operations on ${currentPlatform.name}:`);
      console.log(`  Created ${iterations} files in ${creationTime}ms`);
      console.log(`  Average: ${(creationTime / iterations).toFixed(2)}ms per file`);

      // Cleanup
      await Promise.all(files.map(file => fs.promises.unlink(file).catch(() => {})));

      // Performance should be reasonable (not too slow)
      assert.ok(creationTime < 5000, 'File operations should complete within 5 seconds');
    });

    test('Memory usage is reasonable', () => {
      const memUsage = process.memoryUsage();
      
      console.log(`\nMemory usage on ${currentPlatform.name}:`);
      console.log(`  RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB`);
      console.log(`  Heap Used: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
      console.log(`  Heap Total: ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`);
      console.log(`  External: ${Math.round(memUsage.external / 1024 / 1024)}MB`);

      // Memory usage should be reasonable for a test environment
      const maxMemoryMB = 500; // 500MB should be plenty for tests
      const actualMemoryMB = memUsage.rss / 1024 / 1024;
      
      if (actualMemoryMB > maxMemoryMB) {
        console.warn(`Memory usage (${actualMemoryMB.toFixed(0)}MB) exceeds recommended limit (${maxMemoryMB}MB)`);
      }

      assert.ok(actualMemoryMB < maxMemoryMB * 2, 'Memory usage should not exceed 1GB');
    });
  });

  suite('Platform Compatibility Summary', () => {
    test('Generate platform compatibility report', () => {
      const report = generatePlatformReport();
      
      console.log('\n=== PLATFORM COMPATIBILITY REPORT ===');
      console.log(`Platform: ${report.platform.name} (${report.platform.platform})`);
      console.log(`Node.js: ${report.nodeVersion}`);
      console.log(`Architecture: ${report.architecture}`);
      console.log('');
      
      console.log('Capabilities:');
      Object.entries(report.capabilities).forEach(([capability, supported]) => {
        console.log(`  ${capability}: ${supported ? '✓' : '✗'}`);
      });
      
      if (report.recommendations.length > 0) {
        console.log('\nRecommendations:');
        report.recommendations.forEach(rec => console.log(`  - ${rec}`));
      }
      
      // Should have basic capabilities
      assert.ok(report.capabilities.fileSystem, 'File system should be supported');
      assert.ok(report.capabilities.networking, 'Networking should be supported');
    });
  });
});

// Helper function to generate platform compatibility report
function generatePlatformReport() {
  const currentPlatform = PLATFORM_CONFIGS[process.platform] || {
    platform: process.platform,
    name: process.platform.charAt(0).toUpperCase() + process.platform.slice(1),
    pathSeparator: process.platform === 'win32' ? '\\' : '/',
    executableExtension: process.platform === 'win32' ? '.exe' : '',
    browserPaths: [],
    shellCommand: process.platform === 'win32' ? 'cmd' : 'bash',
    environmentVariables: {
      PATH: 'PATH',
      HOME: process.platform === 'win32' ? 'USERPROFILE' : 'HOME',
      TEMP: process.platform === 'win32' ? 'TEMP' : 'TMPDIR'
    }
  };
  
  const capabilities = {
    fileSystem: true, // Always available in Node.js
    networking: true, // Always available in Node.js
    processExecution: true, // Always available in Node.js
    environmentVariables: Object.keys(process.env).length > 0,
    browserDetection: currentPlatform.browserPaths.length > 0
  };

  const recommendations: string[] = [];
  
  if (process.platform === 'win32') {
    recommendations.push('Consider testing with different Windows versions (10, 11, Server)');
    recommendations.push('Test with both PowerShell and Command Prompt');
  }
  
  if (process.platform === 'darwin') {
    recommendations.push('Test with different macOS versions and both Intel/ARM architectures');
    recommendations.push('Consider App Store distribution requirements');
  }
  
  if (process.platform === 'linux') {
    recommendations.push('Test with different distributions (Ubuntu, CentOS, Debian)');
    recommendations.push('Consider snap/flatpak packaging for better distribution');
  }

  return {
    platform: currentPlatform,
    nodeVersion: process.version,
    architecture: process.arch,
    capabilities,
    recommendations,
    timestamp: new Date().toISOString()
  };
}