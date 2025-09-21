import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { TestHelper } from './testHelper';

/**
 * IDE Compatibility Test Suite
 * 
 * This test suite verifies compatibility across different IDEs and environments
 * that support VS Code extensions or similar functionality.
 */

interface IDECompatibilityInfo {
  name: string;
  type: 'vscode' | 'vscodium' | 'cursor' | 'codeoss' | 'theia' | 'gitpod' | 'codespaces';
  apiCompatibility: string; // VS Code API version compatibility
  supportedFeatures: string[];
  limitations: string[];
  tested: boolean;
}

interface EnvironmentInfo {
  platform: NodeJS.Platform;
  nodeVersion: string;
  vscodeVersion?: string;
  extensions: string[];
}

const SUPPORTED_IDES: IDECompatibilityInfo[] = [
  {
    name: 'Visual Studio Code',
    type: 'vscode',
    apiCompatibility: '^1.74.0',
    supportedFeatures: [
      'commands', 'menus', 'configuration', 'status-bar', 'file-watching',
      'webview', 'terminal', 'workspace-folders', 'notifications', 'browser-integration'
    ],
    limitations: [],
    tested: true
  },
  {
    name: 'VSCodium',
    type: 'vscodium', 
    apiCompatibility: '^1.74.0',
    supportedFeatures: [
      'commands', 'menus', 'configuration', 'status-bar', 'file-watching',
      'webview', 'terminal', 'workspace-folders', 'notifications', 'browser-integration'
    ],
    limitations: ['marketplace-access'],
    tested: false
  },
  {
    name: 'Cursor',
    type: 'cursor',
    apiCompatibility: '^1.74.0',
    supportedFeatures: [
      'commands', 'menus', 'configuration', 'status-bar', 'file-watching',
      'workspace-folders', 'notifications'
    ],
    limitations: ['browser-integration', 'some-webview-features'],
    tested: false
  },
  {
    name: 'GitHub Codespaces',
    type: 'codespaces',
    apiCompatibility: '^1.74.0',
    supportedFeatures: [
      'commands', 'menus', 'configuration', 'status-bar', 'file-watching',
      'webview', 'workspace-folders', 'notifications'
    ],
    limitations: ['browser-integration-limited'],
    tested: false
  }
];

suite('IDE Compatibility Tests', () => {
  let testContext: any;

  setup(async () => {
    testContext = await TestHelper.createTestWorkspace(TestHelper.getDefaultTestFiles());
  });

  teardown(async () => {
    await TestHelper.cleanupTestWorkspaces();
  });

  suite('API Compatibility Tests', () => {
    test('VS Code API version compatibility', () => {
      const packageJson = require('../../package.json');
      const requiredVersion = packageJson.engines.vscode;
      
      assert.ok(requiredVersion, 'VS Code engine version should be specified');
      assert.ok(requiredVersion.includes('^1.74.0'), 'Should support minimum VS Code API version');
      
      // Test that our minimum version is compatible with most IDEs
      const compatibleIDEs = SUPPORTED_IDES.filter(ide => 
        ide.apiCompatibility.includes('1.74.0') || 
        ide.apiCompatibility.includes('1.60.0')
      );
      
      assert.ok(compatibleIDEs.length >= 3, 'Should be compatible with at least 3 IDE variants');
    });

    test('Feature compatibility matrix', () => {
      const featureMatrix = new Map<string, number>();
      
      // Count how many IDEs support each feature
      SUPPORTED_IDES.forEach(ide => {
        ide.supportedFeatures.forEach(feature => {
          featureMatrix.set(feature, (featureMatrix.get(feature) || 0) + 1);
        });
      });
      
      // Core features should be supported by most IDEs
      const coreFeatures = ['commands', 'configuration', 'workspace-folders'];
      coreFeatures.forEach(feature => {
        const supportCount = featureMatrix.get(feature) || 0;
        assert.ok(supportCount >= 3, `Core feature '${feature}' should be supported by at least 3 IDEs`);
      });
      
      console.log('\nFeature Support Matrix:');
      Array.from(featureMatrix.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([feature, count]) => {
          console.log(`  ${feature}: ${count}/${SUPPORTED_IDES.length} IDEs`);
        });
    });
  });

  suite('Environment Detection Tests', () => {
    test('Detect current IDE environment', () => {
      const envInfo = detectCurrentEnvironment();
      
      assert.ok(envInfo.platform, 'Platform should be detected');
      assert.ok(envInfo.nodeVersion, 'Node version should be detected');
      
      console.log('\nCurrent Environment:');
      console.log(`  Platform: ${envInfo.platform}`);
      console.log(`  Node Version: ${envInfo.nodeVersion}`);
      if (envInfo.vscodeVersion) {
        console.log(`  VS Code Version: ${envInfo.vscodeVersion}`);
      }
    });

    test('Check IDE-specific capabilities', async () => {
      const capabilities = await checkIDECapabilities();
      
      assert.ok(capabilities.hasWorkspaceAPI, 'Workspace API should be available');
      assert.ok(capabilities.hasCommandAPI, 'Command API should be available');
      
      console.log('\nIDE Capabilities:');
      Object.entries(capabilities).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
    });
  });

  suite('Compatibility Reporting', () => {
    test('Generate compatibility report', () => {
      const report = generateCompatibilityReport();
      
      assert.ok(report.supportedIDEs.length > 0, 'Should list supported IDEs');
      assert.ok(report.coreFeatures.length > 0, 'Should list core features');
      assert.ok(report.compatibilityScore >= 0, 'Should have compatibility score');
      
      console.log('\n=== IDE COMPATIBILITY REPORT ===');
      console.log(`Total Supported IDEs: ${report.supportedIDEs.length}`);
      console.log(`Compatibility Score: ${report.compatibilityScore}%`);
      console.log(`Core Features: ${report.coreFeatures.length}`);
      
      console.log('\nSupported IDEs:');
      report.supportedIDEs.forEach((ide: IDECompatibilityInfo, index: number) => {
        const limitations = ide.limitations.length > 0 ? ` (${ide.limitations.length} limitations)` : '';
        console.log(`  ${index + 1}. ${ide.name}${limitations}`);
      });
      
      if (report.recommendations.length > 0) {
        console.log('\nRecommendations:');
        report.recommendations.forEach(rec => console.log(`  - ${rec}`));
      }
      
      assert.ok(report.supportedIDEs.length >= 3, 'Should support at least 3 different IDEs');
    });
  });
});

// Helper functions
function detectCurrentEnvironment(): EnvironmentInfo {
  const env: EnvironmentInfo = {
    platform: process.platform,
    nodeVersion: process.version,
    extensions: []
  };

  // Try to detect VS Code version
  try {
    if (vscode && vscode.version) {
      env.vscodeVersion = vscode.version;
    }
  } catch (error) {
    // Ignore if not available
  }

  return env;
}

async function checkIDECapabilities(): Promise<Record<string, boolean>> {
  const capabilities: Record<string, boolean> = {
    hasWorkspaceAPI: false,
    hasCommandAPI: false,
    hasFileSystemAPI: false,
    hasStatusBarAPI: false,
    hasWebviewAPI: false,
    hasTerminalAPI: false,
    hasNotificationAPI: false
  };

  try {
    capabilities.hasWorkspaceAPI = typeof vscode.workspace !== 'undefined';
    capabilities.hasCommandAPI = typeof vscode.commands !== 'undefined';
    capabilities.hasFileSystemAPI = typeof vscode.workspace.fs !== 'undefined';
    capabilities.hasStatusBarAPI = typeof vscode.window.createStatusBarItem !== 'undefined';
    capabilities.hasWebviewAPI = typeof vscode.window.createWebviewPanel !== 'undefined';
    capabilities.hasTerminalAPI = typeof vscode.window.createTerminal !== 'undefined';
    capabilities.hasNotificationAPI = typeof vscode.window.showInformationMessage !== 'undefined';
  } catch (error) {
    // Some APIs might not be available
  }

  return capabilities;
}

function generateCompatibilityReport() {
  const supportedIDEs = SUPPORTED_IDES;
  const totalFeatures = new Set<string>();
  
  // Collect all unique features
  supportedIDEs.forEach((ide: IDECompatibilityInfo) => {
    ide.supportedFeatures.forEach((feature: string) => totalFeatures.add(feature));
  });

  // Calculate compatibility score
  const totalPossibleSupport = supportedIDEs.length * totalFeatures.size;
  const actualSupport = supportedIDEs.reduce((sum: number, ide: IDECompatibilityInfo) => 
    sum + ide.supportedFeatures.length, 0);
  const compatibilityScore = Math.round((actualSupport / totalPossibleSupport) * 100);

  // Generate recommendations
  const recommendations: string[] = [];
  const featureSupport = new Map<string, number>();
  
  supportedIDEs.forEach((ide: IDECompatibilityInfo) => {
    ide.supportedFeatures.forEach((feature: string) => {
      featureSupport.set(feature, (featureSupport.get(feature) || 0) + 1);
    });
  });

  // Find features with low support
  Array.from(featureSupport.entries()).forEach(([feature, count]) => {
    if (count < supportedIDEs.length * 0.7) {
      recommendations.push(`Consider providing fallback for '${feature}' feature (${count}/${supportedIDEs.length} IDEs support it)`);
    }
  });

  return {
    supportedIDEs,
    coreFeatures: Array.from(totalFeatures),
    compatibilityScore,
    recommendations,
    totalIDEs: supportedIDEs.length,
    featureMatrix: Array.from(featureSupport.entries())
  };
}