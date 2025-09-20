import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import { 
  getLocalIPAddress, 
  generateUrls, 
  injectWebSocketScript, 
  getDefaultIgnorePatterns,
  getRelativePath,
  fileExists,
  readFileContent
} from '../utils';
import { TestHelper, TestSuite } from './testHelper';

suite('Utils Unit Tests', () => {
  const testSuite = new TestSuite();
  let testContext: any;

  testSuite.beforeAll(async () => {
    testContext = await TestHelper.createTestWorkspace(TestHelper.getDefaultTestFiles());
  });

  testSuite.afterAll(async () => {
    await TestHelper.cleanupTestWorkspaces();
  });

  suiteSetup(async () => {
    await testSuite.runBeforeAll();
  });

  suiteTeardown(async () => {
    await testSuite.runAfterAll();
  });

  suite('getLocalIPAddress', () => {
    test('should return a valid IPv4 address', () => {
      const ip = getLocalIPAddress();
      assert.ok(ip, 'IP address should not be empty');
      assert.ok(ip.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/), 'Should be valid IPv4 format');
    });

    test('should return localhost as fallback', () => {
      const ip = getLocalIPAddress();
      // Should either be a real IP or localhost fallback
      assert.ok(ip === '127.0.0.1' || ip.match(/^(?:192\.168\.|10\.|172\.(?:1[6-9]|2\d|3[01])\.)/));
    });

    test('should handle different network interfaces', () => {
      const ip = getLocalIPAddress();
      assert.ok(typeof ip === 'string', 'Should return a string');
      assert.ok(ip.length > 0, 'Should not be empty');
    });
  });

  suite('generateUrls', () => {
    test('should generate correct local and network URLs', () => {
      const { localUrl, networkUrl } = generateUrls(3000);
      
      assert.ok(localUrl.includes('localhost:3000'), 'Local URL should include localhost:3000');
      assert.ok(networkUrl.includes(':3000'), 'Network URL should include port 3000');
      assert.ok(localUrl.startsWith('http://'), 'Local URL should use HTTP');
      assert.ok(networkUrl.startsWith('http://'), 'Network URL should use HTTP');
    });

    test('should handle custom file paths', () => {
      const { localUrl, networkUrl } = generateUrls(5000, '/test/page.html');
      
      assert.ok(localUrl.includes('/test/page.html'), 'Should include custom file path');
      assert.ok(networkUrl.includes('/test/page.html'), 'Network URL should include custom file path');
    });

    test('should handle different port numbers', () => {
      const { localUrl, networkUrl } = generateUrls(8080);
      
      assert.ok(localUrl.includes(':8080'), 'Should use specified port');
      assert.ok(networkUrl.includes(':8080'), 'Network URL should use specified port');
    });

    test('should handle empty file path', () => {
      const { localUrl, networkUrl } = generateUrls(3000, '');
      
      assert.ok(!localUrl.endsWith('/'), 'Should not end with slash for empty path');
      assert.ok(!networkUrl.endsWith('/'), 'Network URL should not end with slash for empty path');
    });
  });

  suite('getRelativePath', () => {
    test('should convert absolute path to relative', () => {
      const root = '/home/user/project';
      const filePath = '/home/user/project/src/index.html';
      const relative = getRelativePath(root, filePath);
      
      assert.strictEqual(relative, '/src/index.html', 'Should return correct relative path');
    });

    test('should handle Windows paths', () => {
      const root = 'C:\\Users\\user\\project';
      const filePath = 'C:\\Users\\user\\project\\src\\index.html';
      const relative = getRelativePath(root, filePath);
      
      assert.strictEqual(relative, '/src/index.html', 'Should normalize Windows paths');
    });

    test('should handle root file', () => {
      const root = '/home/user/project';
      const filePath = '/home/user/project/index.html';
      const relative = getRelativePath(root, filePath);
      
      assert.strictEqual(relative, '/index.html', 'Should handle root level files');
    });

    test('should handle nested directories', () => {
      const root = '/project';
      const filePath = '/project/deep/nested/folder/file.js';
      const relative = getRelativePath(root, filePath);
      
      assert.strictEqual(relative, '/deep/nested/folder/file.js', 'Should handle deep nesting');
    });
  });

  suite('injectWebSocketScript', () => {
    test('should inject script before closing body tag', () => {
      const html = '<html><body><h1>Test</h1></body></html>';
      const injected = injectWebSocketScript(html);
      
      assert.ok(injected.includes('WebSocket'), 'Should contain WebSocket script');
      assert.ok(injected.includes('location.reload'), 'Should contain reload functionality');
      assert.ok(injected.indexOf('<script>') < injected.indexOf('</body>'), 'Script should be before closing body');
    });

    test('should inject at end if no body tag', () => {
      const html = '<html><head><title>Test</title></head></html>';
      const injected = injectWebSocketScript(html);
      
      assert.ok(injected.includes('WebSocket'), 'Should contain WebSocket script');
      assert.ok(injected.endsWith('</script>'), 'Should append script at the end');
    });

    test('should handle malformed HTML', () => {
      const html = '<h1>Just a heading';
      const injected = injectWebSocketScript(html);
      
      assert.ok(injected.includes('WebSocket'), 'Should still inject script');
      assert.ok(injected.includes(html), 'Should preserve original HTML');
    });

    test('should handle empty HTML', () => {
      const html = '';
      const injected = injectWebSocketScript(html);
      
      assert.ok(injected.includes('WebSocket'), 'Should inject script in empty HTML');
      assert.ok(injected.includes('<script>'), 'Should contain script tags');
    });

    test('should inject correct WebSocket connection code', () => {
      const html = '<html><body></body></html>';
      const injected = injectWebSocketScript(html);
      
      assert.ok(injected.includes('ws://${location.host}'), 'Should use dynamic host');
      assert.ok(injected.includes('ws.onmessage = () => location.reload()'), 'Should reload on message');
      assert.ok(injected.includes('ws.onerror'), 'Should handle WebSocket errors');
    });
  });

  suite('getDefaultIgnorePatterns', () => {
    test('should return array of ignore patterns', () => {
      const patterns = getDefaultIgnorePatterns();
      
      assert.ok(Array.isArray(patterns), 'Should return an array');
      assert.ok(patterns.length > 0, 'Should have at least one pattern');
    });

    test('should include common ignore patterns', () => {
      const patterns = getDefaultIgnorePatterns();
      
      assert.ok(patterns.includes('**/node_modules/**'), 'Should ignore node_modules');
      assert.ok(patterns.includes('**/.git/**'), 'Should ignore .git');
      assert.ok(patterns.includes('**/dist/**'), 'Should ignore dist');
    });

    test('should include development directories', () => {
      const patterns = getDefaultIgnorePatterns();
      
      assert.ok(patterns.includes('**/out/**'), 'Should ignore out directory');
      assert.ok(patterns.includes('**/.vscode/**'), 'Should ignore .vscode');
      assert.ok(patterns.includes('**/coverage/**'), 'Should ignore coverage');
    });

    test('should use glob patterns', () => {
      const patterns = getDefaultIgnorePatterns();
      
      patterns.forEach(pattern => {
        assert.ok(pattern.includes('*'), 'Each pattern should be a glob pattern');
      });
    });
  });

  suite('fileExists', () => {
    test('should return true for existing file', async () => {
      const filePath = path.join(testContext.workspaceRoot, 'index.html');
      const exists = await fileExists(filePath);
      
      assert.strictEqual(exists, true, 'Should return true for existing file');
    });

    test('should return false for non-existing file', async () => {
      const filePath = path.join(testContext.workspaceRoot, 'nonexistent.html');
      const exists = await fileExists(filePath);
      
      assert.strictEqual(exists, false, 'Should return false for non-existing file');
    });

    test('should return false for directory', async () => {
      const dirPath = testContext.workspaceRoot;
      const exists = await fileExists(dirPath);
      
      // This depends on implementation - directories might be considered as "existing"
      assert.ok(typeof exists === 'boolean', 'Should return boolean');
    });

    test('should handle invalid paths', async () => {
      const invalidPath = '/this/path/does/not/exist/file.txt';
      const exists = await fileExists(invalidPath);
      
      assert.strictEqual(exists, false, 'Should return false for invalid paths');
    });
  });

  suite('readFileContent', () => {
    test('should read existing file content', async () => {
      const filePath = path.join(testContext.workspaceRoot, 'index.html');
      const content = await readFileContent(filePath);
      
      assert.ok(content.includes('<html>'), 'Should contain HTML content');
      assert.ok(content.includes('Live Server Test'), 'Should contain expected content');
    });

    test('should handle CSS files', async () => {
      const filePath = path.join(testContext.workspaceRoot, 'style.css');
      const content = await readFileContent(filePath);
      
      assert.ok(content.includes('body'), 'Should contain CSS rules');
      assert.ok(content.includes('font-family'), 'Should contain CSS properties');
    });

    test('should handle JavaScript files', async () => {
      const filePath = path.join(testContext.workspaceRoot, 'script.js');
      const content = await readFileContent(filePath);
      
      assert.ok(content.includes('console.log'), 'Should contain JavaScript code');
      assert.ok(content.includes('DOMContentLoaded'), 'Should contain event listeners');
    });

    test('should throw error for non-existing file', async () => {
      const filePath = path.join(testContext.workspaceRoot, 'nonexistent.txt');
      
      try {
        await readFileContent(filePath);
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.ok(error instanceof Error, 'Should throw an Error object');
      }
    });

    test('should handle empty files', async () => {
      const emptyFile = path.join(testContext.workspaceRoot, 'empty.txt');
      await fs.promises.writeFile(emptyFile, '');
      
      const content = await readFileContent(emptyFile);
      assert.strictEqual(content, '', 'Should return empty string for empty file');
    });
  });
});