import * as vscode from 'vscode';

export class PreviewManager {
    private panel?: vscode.WebviewPanel;
    private currentUrl = '';

    /**
     * Open (or reuse) the in-editor preview panel for the given URL.
     */
    openPreview(url: string): void {
        this.currentUrl = url;

        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.Beside);
            this.updateContent(url);
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            'liveServerPreview',
            'Live Preview',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        this.updateContent(url);

        this.panel.onDidDispose(() => {
            this.panel = undefined;
        });
    }

    /**
     * Refresh the preview to a new URL (e.g. after server restart).
     */
    updateUrl(url: string): void {
        if (this.panel && this.currentUrl !== url) {
            this.currentUrl = url;
            this.updateContent(url);
        }
    }

    isOpen(): boolean {
        return !!this.panel;
    }

    private updateContent(url: string): void {
        if (!this.panel) {
            return;
        }
        this.panel.title = 'Live Preview';
        this.panel.webview.html = this.buildHtml(url);
    }

    private buildHtml(url: string): string {
        const escaped = url.replace(/"/g, '&quot;');
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';
             frame-src http://localhost:* https://localhost:* http://127.0.0.1:* https://127.0.0.1:*;">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      display: flex; flex-direction: column; height: 100vh;
      background: #1e1e1e;
      font-family: var(--vscode-font-family, system-ui, sans-serif);
      font-size: 12px;
    }
    .toolbar {
      display: flex; align-items: center; gap: 6px;
      padding: 5px 8px; background: #252526;
      border-bottom: 1px solid #3c3c3c; flex-shrink: 0;
    }
    .url-display {
      flex: 1; background: #3c3c3c; color: #cccccc;
      padding: 3px 8px; border-radius: 3px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      user-select: all; cursor: text;
    }
    button {
      background: #0e639c; color: #ffffff; border: none;
      padding: 3px 10px; border-radius: 3px; cursor: pointer;
      white-space: nowrap;
    }
    button:hover { background: #1177bb; }
    iframe {
      flex: 1; border: none; background: #ffffff;
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <span class="url-display" title="${escaped}">${escaped}</span>
    <button onclick="refresh()">&#8635; Refresh</button>
  </div>
  <iframe id="preview" src="${escaped}"
    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-top-navigation">
  </iframe>
  <script>
    function refresh() {
      const f = document.getElementById('preview');
      f.src = f.src;
    }
  </script>
</body>
</html>`;
    }

    dispose(): void {
        this.panel?.dispose();
    }
}
