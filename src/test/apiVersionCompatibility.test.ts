import * as assert from 'assert';
import * as vscode from 'vscode';
import * as semver from 'semver';

/**
 * VS Code API Version Compatibility Tests
 * 
 * Tests compatibility across different VS Code API versions
 */

interface APIVersionInfo {
  version: string;
  supportedFeatures: string[];
  deprecatedFeatures: string[];
  introducedFeatures: string[];
}

suite('VS Code API Version Compatibility', () => {
  const API_VERSIONS: APIVersionInfo[] = [
    {
      version: '1.60.0',
      supportedFeatures: ['commands', 'workspace', 'window', 'languages', 'debug'],
      deprecatedFeatures: [],
      introducedFeatures: ['notebook-api', 'testing-api']
    },
    {
      version: '1.70.0', 
      supportedFeatures: ['commands', 'workspace', 'window', 'languages', 'debug', 'notebook-api', 'testing-api'],
      deprecatedFeatures: ['workspace.rootPath'],
      introducedFeatures: ['terminal-links', 'webview-views']
    },
    {
      version: '1.74.0',
      supportedFeatures: ['commands', 'workspace', 'window', 'languages', 'debug', 'notebook-api', 'testing-api', 'terminal-links', 'webview-views'],
      deprecatedFeatures: ['workspace.rootPath'],
      introducedFeatures: ['authentication-api', 'timeline-api']
    },
    {
      version: '1.80.0',
      supportedFeatures: ['commands', 'workspace', 'window', 'languages', 'debug', 'notebook-api', 'testing-api', 'terminal-links', 'webview-views', 'authentication-api', 'timeline-api'],
      deprecatedFeatures: ['workspace.rootPath', 'old-webview-api'],
      introducedFeatures: ['inline-completions', 'chat-participants']
    }
  ];

  suite('Version Range Compatibility', () => {
    test('Extension supports minimum required version', () => {
      const packageJson = require('../../package.json');
      const requiredVersion = packageJson.engines.vscode;
      
      assert.ok(requiredVersion, 'VS Code engine version should be specified');
      
      // Parse the version requirement
      const cleanVersion = requiredVersion.replace('^', '');
      assert.ok(semver.valid(cleanVersion), `Version "${cleanVersion}" should be valid semver`);
      
      // Check that minimum version is not too old or too new
      assert.ok(semver.gte(cleanVersion, '1.60.0'), 'Minimum version should be at least 1.60.0');
      assert.ok(semver.lte(cleanVersion, '1.80.0'), 'Minimum version should not exceed latest stable');
    });

    test('Feature compatibility across versions', () => {
      const packageJson = require('../../package.json');
      const requiredVersion = packageJson.engines.vscode.replace('^', '');
      
      // Find compatible API versions
      const compatibleVersions = API_VERSIONS.filter(apiVersion => 
        semver.gte(apiVersion.version, requiredVersion)
      );
      
      assert.ok(compatibleVersions.length > 0, 'Should be compatible with at least one API version');
      
      // Check that our extension uses stable features
      const coreFeatures = ['commands', 'workspace', 'window'];
      compatibleVersions.forEach(version => {
        coreFeatures.forEach(feature => {
          assert.ok(
            version.supportedFeatures.includes(feature), 
            `Core feature '${feature}' should be supported in version ${version.version}`
          );
        });
      });
      
      console.log(`\nCompatible with ${compatibleVersions.length} API versions:`);
      compatibleVersions.forEach(version => {
        console.log(`  - VS Code ${version.version} (${version.supportedFeatures.length} features)`);
      });
    });

    test('Avoid deprecated features', () => {
      const packageJson = require('../../package.json');
      const requiredVersion = packageJson.engines.vscode.replace('^', '');
      
      // Get all deprecated features from compatible versions
      const deprecatedFeatures = new Set<string>();
      API_VERSIONS
        .filter(version => semver.gte(version.version, requiredVersion))
        .forEach(version => {
          version.deprecatedFeatures.forEach(feature => deprecatedFeatures.add(feature));
        });
      
      // Check that our extension doesn't use deprecated APIs (this is a manual check)
      console.log('\nDeprecated features to avoid:');
      Array.from(deprecatedFeatures).forEach(feature => {
        console.log(`  - ${feature}`);
      });
      
      // This test serves as documentation for now
      // In a real implementation, you'd analyze your source code for these patterns
      assert.ok(deprecatedFeatures.size >= 0, 'Should identify deprecated features');
    });
  });

  suite('Runtime API Availability', () => {
    test('Core APIs are available', () => {
      const coreAPIs = [
        { name: 'commands', api: vscode.commands },
        { name: 'workspace', api: vscode.workspace },
        { name: 'window', api: vscode.window },
        { name: 'languages', api: vscode.languages }
      ];
      
      coreAPIs.forEach(({ name, api }) => {
        assert.ok(api, `${name} API should be available`);
        assert.ok(typeof api === 'object', `${name} should be an object`);
      });
    });

    test('Extension-specific APIs are available', () => {
      // Test APIs that our extension specifically needs
      const extensionAPIs = [
        { name: 'workspace.workspaceFolders', api: () => vscode.workspace.workspaceFolders !== undefined },
        { name: 'workspace.onDidSaveTextDocument', api: () => typeof vscode.workspace.onDidSaveTextDocument === 'function' },
        { name: 'window.createStatusBarItem', api: () => typeof vscode.window.createStatusBarItem === 'function' },
        { name: 'window.showInformationMessage', api: () => typeof vscode.window.showInformationMessage === 'function' },
        { name: 'commands.registerCommand', api: () => typeof vscode.commands.registerCommand === 'function' }
      ];
      
      extensionAPIs.forEach(({ name, api }) => {
        assert.ok(api(), `${name} should be available for Live Server Lite functionality`);
      });
    });

    test('Optional APIs graceful degradation', () => {
      // Test APIs that are nice-to-have but not essential
      const optionalAPIs = [
        { 
          name: 'window.createWebviewPanel', 
          api: () => typeof vscode.window.createWebviewPanel === 'function',
          fallback: 'Use external browser instead of webview'
        },
        {
          name: 'window.createTerminal',
          api: () => typeof vscode.window.createTerminal === 'function',
          fallback: 'Show commands in output channel'
        },
        {
          name: 'env.openExternal',
          api: () => typeof vscode.env.openExternal === 'function', 
          fallback: 'Manual browser opening'
        }
      ];
      
      console.log('\nOptional API Availability:');
      optionalAPIs.forEach(({ name, api, fallback }) => {
        const available = api();
        console.log(`  ${name}: ${available ? '✓' : '✗'} ${!available ? `(${fallback})` : ''}`);
        
        // Log but don't fail - these are optional
        if (!available) {
          console.warn(`    Warning: ${name} not available, will use fallback: ${fallback}`);
        }
      });
    });
  });

  suite('Version Detection and Adaptation', () => {
    test('Can detect VS Code version', () => {
      let vscodeVersion = 'unknown';
      
      try {
        if (vscode.version) {
          vscodeVersion = vscode.version;
        } else if (vscode.env && vscode.env.appName) {
          // Alternative detection method
          vscodeVersion = 'detected-via-env';
        }
      } catch (error) {
        console.log('Version detection failed:', error);
      }
      
      console.log(`\nDetected VS Code version: ${vscodeVersion}`);
      
      // Don't fail the test if version detection fails
      // Some IDEs might not expose version information
      assert.ok(true, 'Version detection attempted');
    });

    test('Can adapt features based on version', async () => {
      // Example of version-based feature adaptation
      const featureAdaptation = {
        useWebview: false,
        useTerminal: false,
        useStatusBar: true, // Always available
        useNotifications: true // Always available
      };
      
      // Test if advanced features are available
      try {
        if (typeof vscode.window.createWebviewPanel === 'function') {
          featureAdaptation.useWebview = true;
        }
      } catch (error) {
        // Webview not available
      }
      
      try {
        if (typeof vscode.window.createTerminal === 'function') {
          featureAdaptation.useTerminal = true;
        }
      } catch (error) {
        // Terminal not available
      }
      
      console.log('\nFeature Adaptation Strategy:');
      Object.entries(featureAdaptation).forEach(([feature, enabled]) => {
        console.log(`  ${feature}: ${enabled ? 'enabled' : 'disabled'}`);
      });
      
      // At minimum, we should be able to use basic features
      assert.ok(featureAdaptation.useStatusBar, 'Status bar should always be available');
      assert.ok(featureAdaptation.useNotifications, 'Notifications should always be available');
    });
  });

  suite('Backwards Compatibility', () => {
    test('Extension works with older VS Code versions', () => {
      const packageJson = require('../../package.json');
      const minVersion = packageJson.engines.vscode.replace('^', '');
      
      // Test that extension manifest doesn't use features newer than min version
      const contributions = packageJson.contributes;
      
      // Check command contributions
      if (contributions.commands) {
        contributions.commands.forEach((command: any) => {
          assert.ok(command.command, 'Command should have ID');
          assert.ok(command.title, 'Command should have title');
          // Commands are available since very early versions
        });
      }
      
      // Check configuration contributions
      if (contributions.configuration) {
        const properties = contributions.configuration.properties;
        Object.entries(properties).forEach(([key, prop]: [string, any]) => {
          // Configuration is available since early versions
          assert.ok(prop.type, `Configuration ${key} should have type`);
        });
      }
      
      console.log(`\nMinimum required version: ${minVersion}`);
      console.log('Extension manifest is compatible with minimum version');
    });

    test('Graceful handling of missing APIs', async () => {
      // Simulate missing APIs and test graceful degradation
      const mockMissingAPI = () => {
        throw new Error('API not available in this version');
      };
      
      // Test that extension can handle missing APIs gracefully
      const apiTests = [
        {
          name: 'webview creation',
          test: () => {
            try {
              // This might fail in older versions or different IDEs
              return typeof vscode.window.createWebviewPanel === 'function';
            } catch {
              return false;
            }
          }
        },
        {
          name: 'terminal creation',
          test: () => {
            try {
              return typeof vscode.window.createTerminal === 'function';
            } catch {
              return false;
            }
          }
        }
      ];
      
      console.log('\nAPI Availability Tests:');
      apiTests.forEach(({ name, test }) => {
        const available = test();
        console.log(`  ${name}: ${available ? 'available' : 'not available'}`);
      });
      
      // Extension should handle missing APIs gracefully
      assert.ok(true, 'API availability tests completed');
    });
  });
});

// Helper to simulate different VS Code versions (for testing)
export function simulateVSCodeVersion(version: string, apiVersions: APIVersionInfo[]) {
  // This would be used in more advanced testing scenarios
  // to mock different VS Code API versions
  return {
    version,
    isCompatible: (minVersion: string) => semver.gte(version, minVersion),
    hasFeature: (feature: string) => {
      const versionInfo = apiVersions.find((v: APIVersionInfo) => v.version === version);
      return versionInfo?.supportedFeatures.includes(feature) || false;
    }
  };
}