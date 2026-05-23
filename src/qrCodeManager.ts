import * as vscode from 'vscode';
import * as QRCode from 'qrcode';

export class QrCodeManager {
    private panel?: vscode.WebviewPanel;

    async showQrCode(url: string): Promise<void> {
        // Generate QR code as a data URL (PNG base64)
        let dataUrl: string;
        try {
            dataUrl = await QRCode.toDataURL(url, {
                width: 240,
                margin: 2,
                color: { dark: '#000000', light: '#ffffff' }
            });
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to generate QR code: ${err instanceof Error ? err.message : String(err)}`);
            return;
        }

        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.Beside);
            this.panel.webview.html = this.buildHtml(url, dataUrl);
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            'liveServerQrCode',
            'QR Code — Mobile Access',
            vscode.ViewColumn.Beside,
            { enableScripts: false }
        );

        this.panel.webview.html = this.buildHtml(url, dataUrl);

        this.panel.onDidDispose(() => {
            this.panel = undefined;
        });
    }

    private buildHtml(url: string, dataUrl: string): string {
        const escaped = url.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src 'unsafe-inline'; img-src data:;">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      min-height: 100vh; padding: 32px 24px;
      background: #1e1e1e;
      font-family: var(--vscode-font-family, system-ui, sans-serif);
      color: #cccccc;
      text-align: center;
      gap: 16px;
    }
    h2 { font-size: 15px; font-weight: 600; color: #ffffff; }
    .qr-wrapper {
      background: #ffffff; border-radius: 8px; padding: 12px;
      display: inline-block; box-shadow: 0 2px 12px rgba(0,0,0,0.4);
    }
    img { display: block; }
    .url {
      font-size: 13px; color: #9cdcfe; word-break: break-all;
      background: #2d2d2d; padding: 6px 12px; border-radius: 4px;
      max-width: 280px;
    }
    p { font-size: 12px; color: #8a8a8a; max-width: 280px; line-height: 1.5; }
  </style>
</head>
<body>
  <h2>Scan to open on your device</h2>
  <div class="qr-wrapper">
    <img src="${dataUrl}" width="240" height="240" alt="QR code for ${escaped}" />
  </div>
  <div class="url">${escaped}</div>
  <p>Make sure your device is on the same Wi-Fi network as this computer.</p>
</body>
</html>`;
    }

    dispose(): void {
        this.panel?.dispose();
    }
}
