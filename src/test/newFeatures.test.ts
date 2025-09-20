import * as assert from 'assert';
import { BrowserManager } from '../browserManager';
import { NotificationManager } from '../notificationManager';

suite('New Features Tests', () => {
  suite('BrowserManager', () => {
    let browserManager: BrowserManager;

    setup(() => {
      browserManager = new BrowserManager();
    });

    test('should initialize correctly', () => {
      assert.ok(browserManager);
    });

    test('should return available browsers for current platform', () => {
      const browsers = browserManager.getAvailableBrowsers();
      assert.ok(Array.isArray(browsers));
      assert.ok(browsers.length > 0);
      
      // Should include at least one browser for the current platform
      browsers.forEach(browser => {
        assert.ok(browser.name);
        assert.ok(browser.command);
        assert.ok(Array.isArray(browser.args));
        assert.ok(Array.isArray(browser.platforms));
      });
    });

    test('should detect installed browsers', async () => {
      const browsers = await browserManager.detectInstalledBrowsers();
      assert.ok(Array.isArray(browsers));
      // May be empty if no browsers are installed, but should be an array
    });
  });

  suite('NotificationManager', () => {
    let notificationManager: NotificationManager;

    setup(() => {
      notificationManager = new NotificationManager();
    });

    test('should initialize correctly', () => {
      assert.ok(notificationManager);
    });

    test('should initialize with options', () => {
      const options = {
        enabled: true,
        showInStatusBar: true
      };
      
      notificationManager.initialize(options);
      assert.strictEqual(notificationManager.isNotificationsEnabled(), true);
    });

    test('should toggle enabled state', () => {
      notificationManager.setEnabled(false);
      assert.strictEqual(notificationManager.isNotificationsEnabled(), false);
      
      notificationManager.setEnabled(true);
      assert.strictEqual(notificationManager.isNotificationsEnabled(), true);
    });

    test('should not show notifications when disabled', async () => {
      notificationManager.setEnabled(false);
      
      // These should not throw errors even when disabled
      const result1 = await notificationManager.showServerStarted(3000, 'http://localhost:3000');
      const result2 = await notificationManager.showServerStopped(3000);
      const result3 = await notificationManager.showPortInUse(3000, 3001);
      
      // All should be undefined since notifications are disabled
      assert.strictEqual(result1, undefined);
      assert.strictEqual(result2, undefined);
      assert.strictEqual(result3, undefined);
    });
  });
});