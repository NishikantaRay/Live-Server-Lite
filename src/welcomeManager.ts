import * as vscode from 'vscode';

export interface QuickStartStep {
    title: string;
    description: string;
    command?: string;
    icon: string;
}

export class WelcomeManager {
    private context: vscode.ExtensionContext | undefined;

    constructor(context?: vscode.ExtensionContext) {
        this.context = context;
    }

    /**
     * Check if this is a first-time user
     */
    async isFirstTimeUser(): Promise<boolean> {
        const config = vscode.workspace.getConfiguration('liveServerLite');
        const hasShownWelcome = this.context?.globalState.get<boolean>('hasShownWelcome', false) || false;
        const showOnStartup = config.get<boolean>('welcome.showOnStartup', true);
        
        return showOnStartup && !hasShownWelcome;
    }

    /**
     * Show welcome notification to new users
     */
    async showWelcomeNotification(): Promise<boolean> {
        try {
            if (!await this.isFirstTimeUser()) {
                return false;
            }

            const selection = await vscode.window.showInformationMessage(
                '🎉 Welcome to Live Server Lite! Get started with live reload web development.',
                'Quick Start',
                'Create Sample HTML',
                'Dismiss'
            );

            if (selection === 'Quick Start') {
                await this.showQuickStartGuide();
            } else if (selection === 'Create Sample HTML') {
                await vscode.commands.executeCommand('liveServerLite.createSampleProject');
            }

            // Mark as shown
            await this.context?.globalState.update('hasShownWelcome', true);
            
            return true;
        } catch (error) {
            console.error('Error showing welcome notification:', error);
            return false;
        }
    }

    /**
     * Show quick start guide
     */
    async showQuickStartGuide(): Promise<void> {
        const steps = this.getQuickStartGuide();
        
        const stepItems = steps.map((step, index) => ({
            label: `${step.icon} ${step.title}`,
            detail: step.description,
            command: step.command,
            index
        }));

        const selected = await vscode.window.showQuickPick(stepItems, {
            placeHolder: 'Choose a quick start action',
            matchOnDetail: true
        });

        if (selected && selected.command) {
            await vscode.commands.executeCommand(selected.command);
        }
    }

    /**
     * Get quick start guide steps
     */
    getQuickStartGuide(): QuickStartStep[] {
        return [
            {
                title: 'Create Sample HTML',
                description: 'Generate a sample HTML file to get started quickly',
                command: 'liveServerLite.createSampleProject',
                icon: '📄'
            },
            {
                title: 'Start Live Server',
                description: 'Launch live server with auto-reload',
                command: 'liveServerLite.start',
                icon: '🚀'
            },
            {
                title: 'Choose Browser',
                description: 'Select your preferred browser (Chrome, Firefox, Brave, etc.)',
                command: 'liveServerLite.selectBrowser',
                icon: '🌐'
            },
            {
                title: 'Enable HTTPS',
                description: 'Start secure HTTPS server with auto-generated certificates',
                command: 'liveServerLite.startHttps',
                icon: '🔒'
            },
            {
                title: 'Performance Report',
                description: 'View performance metrics and optimization tips',
                command: 'liveServerLite.showPerformanceReport',
                icon: '📊'
            },
            {
                title: 'Configure Settings',
                description: 'Customize Live Server Lite settings',
                command: 'workbench.action.openSettings',
                icon: '⚙️'
            }
        ];
    }

    /**
     * Create a sample project
     */
    async createSampleProject(): Promise<void> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('Please open a folder first');
                return;
            }

            const sampleHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Live Server Lite - Welcome</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.1);
            padding: 40px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        h1 {
            text-align: center;
            margin-bottom: 30px;
            font-size: 2.5em;
        }
        .feature {
            background: rgba(255, 255, 255, 0.05);
            padding: 20px;
            margin: 20px 0;
            border-radius: 10px;
            border-left: 4px solid #00ff88;
        }
        .live-indicator {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #00ff88;
            color: #000;
            padding: 10px 20px;
            border-radius: 20px;
            font-weight: bold;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.7; }
            100% { opacity: 1; }
        }
    </style>
</head>
<body>
    <div class="live-indicator">🔴 LIVE</div>
    
    <div class="container">
        <h1>🚀 Welcome to Live Server Lite!</h1>
        
        <div class="feature">
            <h3>✨ Live Reload</h3>
            <p>Edit this file and save it - the page will automatically reload!</p>
        </div>
        
        <div class="feature">
            <h3>🌐 Multi-Browser Support</h3>
            <p>Works with Chrome, Firefox, Safari, Edge, and Brave browsers.</p>
        </div>
        
        <div class="feature">
            <h3>🔒 HTTPS Support</h3>
            <p>Start secure HTTPS server with auto-generated certificates.</p>
        </div>
        
        <div class="feature">
            <h3>📊 Performance Monitoring</h3>
            <p>Track memory usage and optimize your development workflow.</p>
        </div>
        
        <p style="text-align: center; margin-top: 40px;">
            <strong>Right-click this file and select "Open with Live Server" to get started!</strong>
        </p>
    </div>

    <script>
        console.log('🎉 Live Server Lite is running!');
        console.log('Edit this file and save to see live reload in action.');
        
        // Update timestamp to show live reload
        setInterval(() => {
            console.log('Live reload active:', new Date().toLocaleTimeString());
        }, 5000);
    </script>
</body>
</html>`;

            const indexPath = vscode.Uri.joinPath(workspaceFolder.uri, 'index.html');
            await vscode.workspace.fs.writeFile(indexPath, Buffer.from(sampleHtml, 'utf8'));
            
            // Open the file
            const document = await vscode.workspace.openTextDocument(indexPath);
            await vscode.window.showTextDocument(document);
            
            vscode.window.showInformationMessage('Sample HTML file created! Right-click and select "Open with Live Server" to start.');
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to create sample project: ${errorMessage}`);
        }
    }

    /**
     * Dismiss welcome for this session
     */
    async dismissWelcome(): Promise<void> {
        await this.context?.globalState.update('hasShownWelcome', true);
    }

    /**
     * Reset welcome state (for testing)
     */
    async resetWelcome(): Promise<void> {
        await this.context?.globalState.update('hasShownWelcome', false);
    }

    /**
     * Show help and tips
     */
    async showHelp(): Promise<void> {
        const helpItems = [
            {
                label: '📖 Quick Start Guide',
                detail: 'Learn how to use Live Server Lite',
                action: 'guide'
            },
            {
                label: '🔧 Configuration Help',
                detail: 'Configure settings for your workflow',
                action: 'config'
            },
            {
                label: '🐛 Troubleshooting',
                detail: 'Common issues and solutions',
                action: 'troubleshoot'
            },
            {
                label: '📚 Documentation',
                detail: 'Full documentation and examples',
                action: 'docs'
            }
        ];

        const selected = await vscode.window.showQuickPick(helpItems, {
            placeHolder: 'What do you need help with?'
        });

        if (!selected) return;

        switch (selected.action) {
            case 'guide':
                await this.showQuickStartGuide();
                break;
            case 'config':
                await vscode.commands.executeCommand('workbench.action.openSettings', 'liveServerLite');
                break;
            case 'troubleshoot':
                await this.showTroubleshootingTips();
                break;
            case 'docs':
                await vscode.env.openExternal(vscode.Uri.parse('https://github.com/NishikantaRay/Live-Server-Lite#readme'));
                break;
        }
    }

    /**
     * Show troubleshooting tips
     */
    private async showTroubleshootingTips(): Promise<void> {
        const tips = [
            '🔌 Port Issues: Try different ports (3000, 3001, 5000, 8000)',
            '🌐 Browser Not Opening: Check browser path in settings',
            '🔄 Live Reload Not Working: Ensure HTML file has <script> tag injection',
            '🔒 HTTPS Issues: Accept self-signed certificate warnings',
            '📁 File Access: Ensure VS Code has file system permissions',
            '🚀 Performance: Enable large project optimizations in settings'
        ];

        const tipMessage = tips.join('\n• ');
        
        const selection = await vscode.window.showInformationMessage(
            `Live Server Lite Troubleshooting Tips:\n\n• ${tipMessage}`,
            'Open Settings',
            'Create Issue'
        );

        if (selection === 'Open Settings') {
            await vscode.commands.executeCommand('workbench.action.openSettings', 'liveServerLite');
        } else if (selection === 'Create Issue') {
            await vscode.env.openExternal(vscode.Uri.parse('https://github.com/NishikantaRay/Live-Server-Lite/issues/new'));
        }
    }

    /**
     * Dispose of resources
     */
    dispose(): void {
        // Clean up any resources if needed
    }
}