import * as assert from 'assert';
import * as vscode from 'vscode';
import { ServerManager } from '../serverManager';
import { FileWatcher } from '../fileWatcher';
import { StatusBar } from '../statusBar';
import { getLocalIPAddress, generateUrls, injectWebSocketScript, getDefaultIgnorePatterns } from '../utils';

// Import all test suites
import './utils.test';
import './fileWatcher.test';
import './serverManager.test';
import './integration.test';
import './edgeCases.test';
import './ideCompatibility.test';
import './apiVersionCompatibility.test';
import './marketplaceCompatibility.test';
import './crossPlatformCompatibility.test';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});

	suite('Utils Tests', () => {
		test('getLocalIPAddress returns valid IP', () => {
			const ip = getLocalIPAddress();
			assert.ok(ip);
			assert.ok(ip.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/));
		});

		test('generateUrls creates correct URLs', () => {
			const { localUrl, networkUrl } = generateUrls(3000, '/test.html');
			assert.ok(localUrl.includes('localhost:3000/test.html'));
			assert.ok(networkUrl.includes(':3000/test.html'));
		});

		test('injectWebSocketScript adds script to HTML', () => {
			const html = '<html><body><h1>Test</h1></body></html>';
			const injected = injectWebSocketScript(html);
			assert.ok(injected.includes('WebSocket'));
			assert.ok(injected.includes('ws://'));
		});

		test('getDefaultIgnorePatterns returns array', () => {
			const patterns = getDefaultIgnorePatterns();
			assert.ok(Array.isArray(patterns));
			assert.ok(patterns.length > 0);
			assert.ok(patterns.includes('**/node_modules/**'));
		});
	});

	suite('ServerManager Tests', () => {
		let serverManager: ServerManager;

		setup(() => {
			serverManager = new ServerManager();
		});

		teardown(() => {
			if (serverManager && serverManager.isRunning()) {
				serverManager.dispose();
			}
		});

		test('ServerManager initializes correctly', () => {
			assert.ok(serverManager);
			assert.strictEqual(serverManager.isRunning(), false);
			assert.strictEqual(serverManager.getServerInfo(), null);
		});

		test('ServerManager can start and stop without workspace (should fail)', async () => {
			// This should fail since there's no workspace folder
			try {
				await serverManager.start();
				assert.fail('Should have thrown an error');
			} catch (error) {
				assert.ok(error instanceof Error);
				assert.ok(error.message.includes('No workspace folder'));
			}
		});
	});

	suite('FileWatcher Tests', () => {
		let fileWatcher: FileWatcher;

		setup(() => {
			fileWatcher = new FileWatcher();
		});

		teardown(() => {
			if (fileWatcher && fileWatcher.isWatching()) {
				fileWatcher.stop();
			}
		});

		test('FileWatcher initializes correctly', () => {
			assert.ok(fileWatcher);
			assert.strictEqual(fileWatcher.isWatching(), false);
			assert.strictEqual(fileWatcher.getWatchedPaths().length, 0);
		});
	});

	suite('StatusBar Tests', () => {
		let statusBar: StatusBar;

		setup(() => {
			statusBar = new StatusBar();
		});

		teardown(() => {
			if (statusBar) {
				statusBar.dispose();
			}
		});

		test('StatusBar initializes correctly', () => {
			assert.ok(statusBar);
			assert.ok(statusBar.getItem());
		});

		test('StatusBar updates correctly', () => {
			const mockServerInfo = {
				port: 3000,
				localUrl: 'http://localhost:3000',
				networkUrl: 'http://192.168.1.1:3000',
				isRunning: true
			};

			statusBar.create();
			statusBar.updateToRunning(mockServerInfo);
			assert.ok(statusBar.getItem().text.includes('Stop'));

			statusBar.updateToStopped();
			assert.ok(statusBar.getItem().text.includes('Go Live'));

			statusBar.updateToError({
				code: 'TEST_ERROR',
				message: 'Test error',
				timestamp: new Date()
			});
			assert.ok(statusBar.getItem().text.includes('Error'));
		});
	});
});
