import { ipcMain } from 'electron';
import { ClaudeDesktopManager } from '../../services/claude/ClaudeDesktopManager';

export function registerClaudeDesktopHandlers(manager: ClaudeDesktopManager): void {
    // Claude Desktop情報を取得
    ipcMain.handle('claude-desktop:get-info', () => {
        return manager.getClaudeDesktopInfo();
    });

    // MCPサーバーリストを取得
    ipcMain.handle('claude-desktop:get-mcp-servers', () => {
        return manager.getMCPServers();
    });

    // MCPサーバーを無効化
    ipcMain.handle('claude-desktop:disable-mcp-server', async (_, serverName: string) => {
        await manager.disableMCPServer(serverName);
        return manager.getMCPServers();
    });

    // MCPサーバーを有効化
    ipcMain.handle('claude-desktop:enable-mcp-server', async (_, serverName: string) => {
        await manager.enableMCPServer(serverName);
        return manager.getMCPServers();
    });

    // MCPサーバーの順序を変更（有効）
    ipcMain.handle('claude-desktop:reorder-mcp-servers', async (_, serverNames: string[]) => {
        await manager.reorderMCPServers(serverNames);
        return manager.getMCPServers();
    });

    // MCPサーバーの順序を変更（無効）
    ipcMain.handle('claude-desktop:reorder-disabled-mcp-servers', async (_, serverNames: string[]) => {
        await manager.reorderDisabledMCPServers(serverNames);
        return manager.getMCPServers();
    });

    // Claude Desktopを再起動
    ipcMain.handle('claude-desktop:restart', async () => {
        await manager.restartClaudeDesktop();
    });
}
