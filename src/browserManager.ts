import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import { spawn } from 'child_process';
import { BrowserConfig } from './types';

export class BrowserManager {
  private predefinedBrowsers: BrowserConfig[] = [
    {
      name: 'Chrome',
      command: this.getChromeCommand(),
      args: ['--new-tab'],
      platforms: ['win32', 'darwin', 'linux']
    },
    {
      name: 'Firefox',
      command: this.getFirefoxCommand(),
      args: ['-new-tab'],
      platforms: ['win32', 'darwin', 'linux']
    },
    {
      name: 'Safari',
      command: '/Applications/Safari.app/Contents/MacOS/Safari',
      args: [],
      platforms: ['darwin']
    },
    {
      name: 'Edge',
      command: this.getEdgeCommand(),
      args: ['--new-tab'],
      platforms: ['win32', 'darwin', 'linux']
    }
  ];

  /**
   * Open URL in the specified browser or system default
   */
  async openBrowser(url: string, browserPath?: string, browserArgs: string[] = []): Promise<void> {
    try {
      if (browserPath && browserPath !== 'default') {
        // Use custom browser path
        await this.openWithCustomBrowser(url, browserPath, browserArgs);
      } else {
        // Use system default or try predefined browsers
        await this.openWithDefaultBrowser(url);
      }
    } catch (error) {
      console.error('Failed to open browser:', error);
      throw error;
    }
  }

  /**
   * Get available browsers for the current platform
   */
  getAvailableBrowsers(): BrowserConfig[] {
    const currentPlatform = os.platform() as 'win32' | 'darwin' | 'linux';
    return this.predefinedBrowsers.filter(browser => 
      browser.platforms.includes(currentPlatform)
    );
  }

  /**
   * Detect installed browsers on the system
   */
  async detectInstalledBrowsers(): Promise<BrowserConfig[]> {
    const availableBrowsers = this.getAvailableBrowsers();
    const installedBrowsers: BrowserConfig[] = [];

    for (const browser of availableBrowsers) {
      if (await this.isBrowserInstalled(browser.command)) {
        installedBrowsers.push(browser);
      }
    }

    return installedBrowsers;
  }

  /**
   * Show browser selection quick pick
   */
  async showBrowserSelection(): Promise<string | undefined> {
    const installedBrowsers = await this.detectInstalledBrowsers();
    
    const quickPickItems = [
      { label: 'System Default', detail: 'Use system default browser', value: 'default' },
      ...installedBrowsers.map(browser => ({
        label: browser.name,
        detail: browser.command,
        value: browser.command
      })),
      { label: 'Custom Path...', detail: 'Specify custom browser executable', value: 'custom' }
    ];

    const selected = await vscode.window.showQuickPick(quickPickItems, {
      placeHolder: 'Select browser to open Live Server',
      matchOnDetail: true
    });

    if (selected?.value === 'custom') {
      const customPath = await vscode.window.showInputBox({
        prompt: 'Enter path to browser executable',
        placeHolder: 'e.g., /usr/bin/google-chrome',
        validateInput: (value) => {
          if (!value || value.trim() === '') {
            return 'Please enter a valid path';
          }
          return null;
        }
      });
      return customPath;
    }

    return selected?.value;
  }

  /**
   * Open URL with custom browser executable
   */
  private async openWithCustomBrowser(url: string, browserPath: string, args: string[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      const allArgs = [...args, url];
      const browserProcess = spawn(browserPath, allArgs, {
        detached: true,
        stdio: 'ignore'
      });

      browserProcess.unref();

      browserProcess.on('error', (error) => {
        reject(new Error(`Failed to open browser at ${browserPath}: ${error.message}`));
      });

      // Give it a moment to start, then resolve
      setTimeout(() => {
        resolve();
      }, 500);
    });
  }

  /**
   * Open URL with system default browser
   */
  private async openWithDefaultBrowser(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let command: string;
      let args: string[];

      const platform = os.platform();
      switch (platform) {
        case 'darwin':
          command = 'open';
          args = [url];
          break;
        case 'win32':
          command = 'cmd';
          args = ['/c', 'start', '""', url];
          break;
        default: // linux and others
          command = 'xdg-open';
          args = [url];
          break;
      }

      const browserProcess = spawn(command, args, {
        detached: true,
        stdio: 'ignore'
      });

      browserProcess.unref();

      browserProcess.on('error', (error) => {
        reject(new Error(`Failed to open default browser: ${error.message}`));
      });

      // Give it a moment to start, then resolve
      setTimeout(() => {
        resolve();
      }, 500);
    });
  }

  /**
   * Check if a browser is installed by trying to execute it
   */
  private async isBrowserInstalled(command: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const testProcess = spawn(command, ['--version'], {
          stdio: 'ignore'
        });

        testProcess.on('error', () => {
          resolve(false);
        });

        testProcess.on('close', (code) => {
          resolve(code === 0);
        });

        // Timeout after 2 seconds
        setTimeout(() => {
          testProcess.kill();
          resolve(false);
        }, 2000);

      } catch (error) {
        resolve(false);
      }
    });
  }

  /**
   * Get Chrome command for the current platform
   */
  private getChromeCommand(): string {
    const platform = os.platform();
    switch (platform) {
      case 'darwin':
        return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
      case 'win32':
        return path.join(
          process.env['PROGRAMFILES'] || 'C:\\Program Files',
          'Google\\Chrome\\Application\\chrome.exe'
        );
      default: // linux
        return 'google-chrome';
    }
  }

  /**
   * Get Firefox command for the current platform
   */
  private getFirefoxCommand(): string {
    const platform = os.platform();
    switch (platform) {
      case 'darwin':
        return '/Applications/Firefox.app/Contents/MacOS/firefox';
      case 'win32':
        return path.join(
          process.env['PROGRAMFILES'] || 'C:\\Program Files',
          'Mozilla Firefox\\firefox.exe'
        );
      default: // linux
        return 'firefox';
    }
  }

  /**
   * Get Edge command for the current platform
   */
  private getEdgeCommand(): string {
    const platform = os.platform();
    switch (platform) {
      case 'darwin':
        return '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
      case 'win32':
        return path.join(
          process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)',
          'Microsoft\\Edge\\Application\\msedge.exe'
        );
      default: // linux
        return 'microsoft-edge';
    }
  }
}