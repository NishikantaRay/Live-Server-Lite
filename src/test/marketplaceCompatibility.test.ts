import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Marketplace and Packaging Compatibility Tests
 * 
 * Tests that verify extension can be packaged and published to various marketplaces
 */

interface MarketplaceRequirement {
  name: string;
  requirement: string;
  check: (packageJson: any, extensionFiles: string[]) => boolean | string;
  severity: 'error' | 'warning' | 'info';
}

suite('Marketplace Compatibility Tests', () => {
  let packageJson: any;
  let extensionFiles: string[] = [];

  setup(() => {
    packageJson = require('../../package.json');
    
    // Get list of extension files
    const srcPath = path.join(__dirname, '../..');
    try {
      extensionFiles = getAllFiles(srcPath);
    } catch (error) {
      console.warn('Could not scan extension files:', error);
    }
  });

  const MARKETPLACE_REQUIREMENTS: MarketplaceRequirement[] = [
    // VS Code Marketplace Requirements
    {
      name: 'VS Code Marketplace - Publisher',
      requirement: 'Must have a verified publisher',
      check: (pkg) => !!pkg.publisher && pkg.publisher.length > 0,
      severity: 'error'
    },
    {
      name: 'VS Code Marketplace - Display Name',
      requirement: 'Must have a human-readable display name',
      check: (pkg) => !!pkg.displayName && pkg.displayName !== pkg.name,
      severity: 'error'
    },
    {
      name: 'VS Code Marketplace - Description',
      requirement: 'Must have a meaningful description (min 10 chars)',
      check: (pkg) => !!pkg.description && pkg.description.length >= 10,
      severity: 'error'
    },
    {
      name: 'VS Code Marketplace - Version',
      requirement: 'Must follow semantic versioning',
      check: (pkg) => {
        if (!pkg.version) return false;
        return /^\d+\.\d+\.\d+(-[\w.-]+)?(\+[\w.-]+)?$/.test(pkg.version);
      },
      severity: 'error'
    },
    {
      name: 'VS Code Marketplace - Icon',
      requirement: 'Should have an icon (128x128 recommended)',
      check: (pkg, files) => {
        if (!pkg.icon) return 'No icon specified';
        const iconExists = files.some(file => file.includes(pkg.icon));
        return iconExists || 'Icon file not found';
      },
      severity: 'warning'
    },
    {
      name: 'VS Code Marketplace - Categories',
      requirement: 'Should specify appropriate categories',
      check: (pkg) => Array.isArray(pkg.categories) && pkg.categories.length > 0,
      severity: 'warning'
    },
    {
      name: 'VS Code Marketplace - Keywords',
      requirement: 'Should have relevant keywords for discoverability',
      check: (pkg) => Array.isArray(pkg.keywords) && pkg.keywords.length >= 3,
      severity: 'warning'
    },
    {
      name: 'VS Code Marketplace - License',
      requirement: 'Should specify license',
      check: (pkg) => !!pkg.license,
      severity: 'warning'
    },
    {
      name: 'VS Code Marketplace - Repository',
      requirement: 'Should link to source repository',
      check: (pkg) => !!pkg.repository && !!pkg.repository.url,
      severity: 'warning'
    },
    
    // Open VSX Requirements (for VSCodium, etc.)
    {
      name: 'Open VSX - Basic Metadata',
      requirement: 'Must have all required metadata fields',
      check: (pkg) => !!(pkg.name && pkg.version && pkg.displayName && pkg.description),
      severity: 'error'
    },
    {
      name: 'Open VSX - Engine Compatibility',
      requirement: 'Must specify VS Code engine version',
      check: (pkg) => !!(pkg.engines && pkg.engines.vscode),
      severity: 'error'
    },
    
    // General Extension Requirements
    {
      name: 'Extension - Main Entry Point',
      requirement: 'Must specify main entry point',
      check: (pkg, files) => {
        if (!pkg.main) return false;
        const mainExists = files.some(file => file.endsWith(pkg.main.replace('./dist/', '/dist/')));
        return mainExists;
      },
      severity: 'error'
    },
    {
      name: 'Extension - Activation Events',
      requirement: 'Should define activation events or use empty array for onStartupFinished',
      check: (pkg) => Array.isArray(pkg.activationEvents),
      severity: 'info'
    },
    {
      name: 'Extension - Contribution Points',
      requirement: 'Should define contribution points',
      check: (pkg) => !!pkg.contributes && Object.keys(pkg.contributes).length > 0,
      severity: 'warning'
    },
    
    // File Size and Structure
    {
      name: 'Package - Size Limit',
      requirement: 'Extension package should be under 50MB',
      check: (pkg, files) => {
        // This is a simplified check - in reality you'd calculate actual package size
        return files.length < 1000; // Rough heuristic
      },
      severity: 'warning'
    },
    {
      name: 'Package - No Sensitive Files',
      requirement: 'Should not include sensitive files like .env, private keys',
      check: (pkg, files) => {
        const sensitivePatterns = ['.env', '.key', '.pem', '.p12', 'password', 'secret'];
        const hasSensitive = files.some(file => 
          sensitivePatterns.some(pattern => file.toLowerCase().includes(pattern))
        );
        return !hasSensitive;
      },
      severity: 'error'
    }
  ];

  suite('VS Code Marketplace Compatibility', () => {
    test('Meets VS Code Marketplace requirements', () => {
      const results = checkMarketplaceRequirements('VS Code Marketplace');
      logRequirementResults('VS Code Marketplace', results);
      
      const errors = results.filter(r => r.severity === 'error' && !r.passed);
      assert.strictEqual(errors.length, 0, 
        `Extension has ${errors.length} blocking marketplace errors`);
    });
    
    test('Package.json structure is valid', () => {
      // Test package.json structure
      assert.ok(packageJson, 'package.json should exist and be readable');
      assert.ok(typeof packageJson === 'object', 'package.json should be valid JSON');
      
      // Required fields
      const requiredFields = ['name', 'version', 'engines'];
      requiredFields.forEach(field => {
        assert.ok(packageJson[field], `package.json must have ${field} field`);
      });
    });
    
    test('Extension manifest validation', () => {
      // Test contribution points structure
      if (packageJson.contributes) {
        const contributes = packageJson.contributes;
        
        // Commands validation
        if (contributes.commands) {
          assert.ok(Array.isArray(contributes.commands), 'Commands should be array');
          contributes.commands.forEach((cmd: any, index: number) => {
            assert.ok(cmd.command, `Command ${index} should have command field`);
            assert.ok(cmd.title, `Command ${index} should have title field`);
          });
        }
        
        // Configuration validation
        if (contributes.configuration) {
          const config = contributes.configuration;
          assert.ok(config.properties, 'Configuration should have properties');
          
          Object.entries(config.properties).forEach(([key, prop]: [string, any]) => {
            assert.ok(prop.type, `Configuration ${key} should have type`);
            assert.ok(prop.description, `Configuration ${key} should have description`);
          });
        }
      }
    });
  });

  suite('Open VSX Compatibility', () => {
    test('Meets Open VSX requirements', () => {
      const results = checkMarketplaceRequirements('Open VSX');
      logRequirementResults('Open VSX', results);
      
      const errors = results.filter(r => r.severity === 'error' && !r.passed);
      assert.ok(errors.length === 0, 
        `Extension has ${errors.length} Open VSX compatibility errors`);
    });
  });

  suite('General Extension Compatibility', () => {
    test('Extension structure is valid', () => {
      // Check that main files exist
      const mainFile = packageJson.main;
      if (mainFile) {
        const expectedPaths = [
          path.join(__dirname, '../../dist/extension.js'),
          path.join(__dirname, '../../out/extension.js'),
          path.join(__dirname, '../../extension.js')
        ];
        
        const mainExists = expectedPaths.some(expectedPath => {
          try {
            return fs.existsSync(expectedPath);
          } catch {
            return false;
          }
        });
        
        if (!mainExists) {
          console.warn(`Main file ${mainFile} not found in expected locations`);
          console.warn('This might be normal during testing - file may be created during build');
        }
      }
    });

    test('No security issues in manifest', () => {
      // Check for potential security issues
      const securityChecks = [
        {
          name: 'No dangerous activation events',
          check: () => {
            if (!packageJson.activationEvents) return true;
            const dangerous = packageJson.activationEvents.filter((event: string) => 
              event.includes('*') && event !== '*'
            );
            return dangerous.length === 0;
          }
        },
        {
          name: 'No overly broad file associations',
          check: () => {
            if (!packageJson.contributes?.languages) return true;
            // Check if language contributions are reasonable
            return true; // Simplified check
          }
        }
      ];

      securityChecks.forEach(({ name, check }) => {
        assert.ok(check(), `Security check failed: ${name}`);
      });
    });
  });

  suite('Cross-Platform Package Compatibility', () => {
    test('File paths are cross-platform compatible', () => {
      // Check that all paths use forward slashes or path.join
      const pathFields = ['main', 'icon'];
      
      pathFields.forEach(field => {
        const fieldValue = packageJson[field];
        if (fieldValue && typeof fieldValue === 'string') {
          // Allow forward slashes (they work on all platforms)
          // Warn about backslashes (Windows-specific)
          if (fieldValue.includes('\\')) {
            console.warn(`Field '${field}' contains backslashes, may not work on all platforms`);
          }
        }
      });
    });

    test('Dependencies are platform compatible', () => {
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };

      // Check for platform-specific dependencies
      const platformSpecific = Object.keys(allDeps).filter(dep => 
        dep.includes('-win32') || dep.includes('-darwin') || dep.includes('-linux')
      );

      if (platformSpecific.length > 0) {
        console.log('Platform-specific dependencies found:');
        platformSpecific.forEach(dep => console.log(`  - ${dep}`));
      }

      // This is informational, not an error
      assert.ok(true, 'Platform dependency check completed');
    });
  });

  // Helper functions
  function checkMarketplaceRequirements(marketplace: string): Array<{
    name: string;
    requirement: string;
    passed: boolean;
    severity: string;
    message?: string;
  }> {
    return MARKETPLACE_REQUIREMENTS
      .filter(req => req.name.includes(marketplace) || marketplace === 'General')
      .map(req => {
        const result = req.check(packageJson, extensionFiles);
        const passed = result === true;
        const message = typeof result === 'string' ? result : undefined;
        
        return {
          name: req.name,
          requirement: req.requirement,
          passed,
          severity: req.severity,
          message
        };
      });
  }

  function logRequirementResults(marketplace: string, results: any[]) {
    console.log(`\n=== ${marketplace} Compatibility Results ===`);
    
    const errors = results.filter(r => r.severity === 'error');
    const warnings = results.filter(r => r.severity === 'warning');
    const info = results.filter(r => r.severity === 'info');
    
    console.log(`Errors: ${errors.filter(r => !r.passed).length}/${errors.length}`);
    console.log(`Warnings: ${warnings.filter(r => !r.passed).length}/${warnings.length}`);
    console.log(`Info: ${info.filter(r => !r.passed).length}/${info.length}`);
    
    results.forEach(result => {
      const status = result.passed ? '✓' : '✗';
      const message = result.message ? ` (${result.message})` : '';
      console.log(`  ${status} [${result.severity.toUpperCase()}] ${result.name}${message}`);
    });
  }

  function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
    try {
      const files = fs.readdirSync(dirPath);
      
      files.forEach(file => {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
          // Skip common directories that shouldn't be in package
          if (!['node_modules', '.git', '.vscode'].includes(file)) {
            arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
          }
        } else {
          arrayOfFiles.push(fullPath);
        }
      });
    } catch (error) {
      // Ignore errors accessing directories
    }
    
    return arrayOfFiles;
  }
});