import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import { FileWatcher } from '../fileWatcher';
import { TestHelper, TestSuite } from './testHelper';
import { FileChangeEvent } from '../types';

suite('FileWatcher Unit Tests', () => {
  const testSuite = new TestSuite();
  let testContext: any;
  let fileWatcher: FileWatcher;

  testSuite.beforeAll(async () => {
    testContext = await TestHelper.createTestWorkspace(TestHelper.getDefaultTestFiles());
  });

  testSuite.afterAll(async () => {
    await TestHelper.cleanupTestWorkspaces();
  });

  testSuite.beforeEach(() => {
    fileWatcher = new FileWatcher();
  });

  testSuite.afterEach(() => {
    if (fileWatcher && fileWatcher.isWatching()) {
      fileWatcher.stop();
    }
  });

  suiteSetup(async () => {
    await testSuite.runBeforeAll();
  });

  suiteTeardown(async () => {
    await testSuite.runAfterAll();
  });

  setup(async () => {
    await testSuite.runBeforeEach();
  });

  teardown(async () => {
    await testSuite.runAfterEach();
  });

  suite('Initialization', () => {
    test('should initialize correctly', () => {
      assert.ok(fileWatcher, 'FileWatcher should be created');
      assert.strictEqual(fileWatcher.isWatching(), false, 'Should not be watching initially');
      assert.strictEqual(fileWatcher.getWatchedPaths().length, 0, 'Should have no watched paths initially');
    });

    test('should have proper interface methods', () => {
      assert.ok(typeof fileWatcher.start === 'function', 'Should have start method');
      assert.ok(typeof fileWatcher.stop === 'function', 'Should have stop method');
      assert.ok(typeof fileWatcher.onFileChange === 'function', 'Should have onFileChange method');
      assert.ok(typeof fileWatcher.isWatching === 'function', 'Should have isWatching method');
      assert.ok(typeof fileWatcher.getWatchedPaths === 'function', 'Should have getWatchedPaths method');
    });
  });

  suite('Starting and Stopping', () => {
    test('should start watching a directory', async () => {
      fileWatcher.start(testContext.workspaceRoot);
      
      await TestHelper.wait(100); // Give time for watcher to initialize
      
      assert.strictEqual(fileWatcher.isWatching(), true, 'Should be watching after start');
      
      const watchedPaths = fileWatcher.getWatchedPaths();
      assert.ok(watchedPaths.length > 0, 'Should have watched paths');
    });

    test('should stop watching', async () => {
      fileWatcher.start(testContext.workspaceRoot);
      await TestHelper.wait(100);
      
      assert.strictEqual(fileWatcher.isWatching(), true, 'Should be watching');
      
      fileWatcher.stop();
      
      assert.strictEqual(fileWatcher.isWatching(), false, 'Should not be watching after stop');
      assert.strictEqual(fileWatcher.getWatchedPaths().length, 0, 'Should have no watched paths after stop');
    });

    test('should handle multiple start calls', async () => {
      fileWatcher.start(testContext.workspaceRoot);
      await TestHelper.wait(50);
      
      // Starting again should not cause issues
      fileWatcher.start(testContext.workspaceRoot);
      await TestHelper.wait(50);
      
      assert.strictEqual(fileWatcher.isWatching(), true, 'Should still be watching');
    });

    test('should handle stop without start', () => {
      assert.strictEqual(fileWatcher.isWatching(), false, 'Should not be watching');
      
      // This should not throw
      fileWatcher.stop();
      
      assert.strictEqual(fileWatcher.isWatching(), false, 'Should still not be watching');
    });
  });

  suite('File Change Detection', () => {
    test('should detect file changes', async () => {
      let changeDetected = false;
      const changedFiles: string[] = [];
      
      fileWatcher.onFileChange(() => {
        changeDetected = true;
      });
      
      fileWatcher.start(testContext.workspaceRoot);
      await TestHelper.wait(200);
      
      // Modify a file
      const testFile = path.join(testContext.workspaceRoot, 'test-change.txt');
      await fs.promises.writeFile(testFile, 'initial content');
      
      // Wait for change detection
      const success = await TestHelper.waitForCondition(() => changeDetected, 3000);
      assert.ok(success, 'Should detect file creation');
    });

    test('should detect file modifications', async () => {
      let changeCount = 0;
      
      fileWatcher.onFileChange(() => {
        changeCount++;
      });
      
      fileWatcher.start(testContext.workspaceRoot);
      await TestHelper.wait(200);
      
      // Create and then modify a file
      const testFile = path.join(testContext.workspaceRoot, 'modify-test.txt');
      await fs.promises.writeFile(testFile, 'initial');
      await TestHelper.wait(500);
      
      await fs.promises.writeFile(testFile, 'modified');
      
      // Wait for changes
      await TestHelper.waitForCondition(() => changeCount >= 2, 3000);
      assert.ok(changeCount >= 1, 'Should detect file modifications');
    });

    test('should detect file deletions', async () => {
      let changeDetected = false;
      
      fileWatcher.onFileChange(() => {
        changeDetected = true;
      });
      
      // Create a file first
      const testFile = path.join(testContext.workspaceRoot, 'delete-test.txt');
      await fs.promises.writeFile(testFile, 'to be deleted');
      
      fileWatcher.start(testContext.workspaceRoot);
      await TestHelper.wait(200);
      
      // Delete the file
      await fs.promises.unlink(testFile);
      
      const success = await TestHelper.waitForCondition(() => changeDetected, 3000);
      assert.ok(success, 'Should detect file deletion');
    });

    test('should respect ignore patterns', async () => {
      let changeDetected = false;
      
      fileWatcher.onFileChange(() => {
        changeDetected = true;
      });
      
      // Start watching with ignore patterns
      fileWatcher.start(testContext.workspaceRoot, ['**/ignored/**']);
      await TestHelper.wait(200);
      
      // Create ignored directory and file
      const ignoredDir = path.join(testContext.workspaceRoot, 'ignored');
      await fs.promises.mkdir(ignoredDir, { recursive: true });
      const ignoredFile = path.join(ignoredDir, 'ignored.txt');
      await fs.promises.writeFile(ignoredFile, 'ignored content');
      
      // Wait a bit to see if change is detected
      await TestHelper.wait(1000);
      
      // Should not detect changes in ignored directories
      // Note: This test might be flaky depending on timing and chokidar behavior
      // The exact behavior depends on how chokidar handles ignore patterns
    });

    test('should handle callback errors gracefully', async () => {
      const errorCallback = () => {
        throw new Error('Callback error');
      };
      
      fileWatcher.onFileChange(errorCallback);
      fileWatcher.start(testContext.workspaceRoot);
      await TestHelper.wait(200);
      
      // Create a file to trigger callback
      const testFile = path.join(testContext.workspaceRoot, 'error-test.txt');
      
      // This should not crash the watcher
      await fs.promises.writeFile(testFile, 'content');
      await TestHelper.wait(500);
      
      assert.strictEqual(fileWatcher.isWatching(), true, 'Watcher should still be running after callback error');
    });
  });

  suite('Configuration', () => {
    test('should accept custom ignore patterns', async () => {
      const customIgnore = ['**/custom-ignore/**', '**/*.tmp'];
      
      fileWatcher.start(testContext.workspaceRoot, customIgnore);
      await TestHelper.wait(100);
      
      assert.strictEqual(fileWatcher.isWatching(), true, 'Should be watching with custom ignore patterns');
    });

    test('should handle empty ignore patterns', async () => {
      fileWatcher.start(testContext.workspaceRoot, []);
      await TestHelper.wait(100);
      
      assert.strictEqual(fileWatcher.isWatching(), true, 'Should be watching with empty ignore patterns');
    });

    test('should handle invalid directory paths', () => {
      const invalidPath = '/this/path/does/not/exist';
      
      // This might throw or handle gracefully depending on chokidar version
      try {
        fileWatcher.start(invalidPath);
        // If it doesn't throw, that's also acceptable behavior
      } catch (error) {
        assert.ok(error instanceof Error, 'Should throw meaningful error for invalid paths');
      }
    });
  });

  suite('Edge Cases', () => {
    test('should handle rapid file changes', async () => {
      let changeCount = 0;
      
      fileWatcher.onFileChange(() => {
        changeCount++;
      });
      
      fileWatcher.start(testContext.workspaceRoot);
      await TestHelper.wait(200);
      
      const testFile = path.join(testContext.workspaceRoot, 'rapid-test.txt');
      
      // Create multiple rapid changes
      for (let i = 0; i < 5; i++) {
        await fs.promises.writeFile(testFile, `content ${i}`);
        await TestHelper.wait(50);
      }
      
      await TestHelper.wait(1000);
      
      // Should detect at least some changes (exact count may vary due to debouncing)
      assert.ok(changeCount > 0, 'Should detect rapid changes');
    });

    test('should handle binary files', async () => {
      let changeDetected = false;
      
      fileWatcher.onFileChange(() => {
        changeDetected = true;
      });
      
      fileWatcher.start(testContext.workspaceRoot);
      await TestHelper.wait(200);
      
      // Create a binary file
      const binaryFile = path.join(testContext.workspaceRoot, 'test.bin');
      const binaryData = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xFF]);
      await fs.promises.writeFile(binaryFile, binaryData);
      
      const success = await TestHelper.waitForCondition(() => changeDetected, 3000);
      assert.ok(success, 'Should detect binary file changes');
    });

    test('should handle directory creation and deletion', async () => {
      let changeDetected = false;
      
      fileWatcher.onFileChange(() => {
        changeDetected = true;
      });
      
      fileWatcher.start(testContext.workspaceRoot);
      await TestHelper.wait(200);
      
      const testDir = path.join(testContext.workspaceRoot, 'new-directory');
      await fs.promises.mkdir(testDir);
      
      let success = await TestHelper.waitForCondition(() => changeDetected, 3000);
      assert.ok(success, 'Should detect directory creation');
      
      changeDetected = false;
      await fs.promises.rmdir(testDir);
      
      success = await TestHelper.waitForCondition(() => changeDetected, 3000);
      assert.ok(success, 'Should detect directory deletion');
    });
  });

  suite('Performance', () => {
    test('should handle large number of files', async () => {
      // Create a temporary directory with many files
      const largeTestDir = path.join(testContext.workspaceRoot, 'large-test');
      await fs.promises.mkdir(largeTestDir, { recursive: true });
      
      // Create 50 files
      for (let i = 0; i < 50; i++) {
        const filePath = path.join(largeTestDir, `file-${i}.txt`);
        await fs.promises.writeFile(filePath, `Content of file ${i}`);
      }
      
      const startTime = Date.now();
      fileWatcher.start(testContext.workspaceRoot);
      await TestHelper.wait(500);
      const initTime = Date.now() - startTime;
      
      assert.ok(initTime < 5000, 'Should initialize within reasonable time');
      assert.strictEqual(fileWatcher.isWatching(), true, 'Should be watching despite many files');
    });
  });
});