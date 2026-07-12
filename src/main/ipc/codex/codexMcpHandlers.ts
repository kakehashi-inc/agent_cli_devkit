import { ipcMain } from 'electron';
import { CODEX_MCP_CHANNELS } from '../../../shared/agents/codex/constants';
import { CodexEnvironment } from '../../../shared/agents/codex/types';
import { CodexMcpManager } from '../../services/codex/CodexMcpManager';

export function registerCodexMcpHandlers(manager: CodexMcpManager): void {
    ipcMain.handle(CODEX_MCP_CHANNELS.GET_ENVIRONMENTS, () => {
        return manager.getEnvironments();
    });

    ipcMain.handle(CODEX_MCP_CHANNELS.GET_MCP_SERVERS, (_, env: CodexEnvironment) => {
        return manager.getMCPServers(env);
    });

    ipcMain.handle(CODEX_MCP_CHANNELS.DISABLE, (_, env: CodexEnvironment, serverName: string) => {
        return manager.disableMCPServer(env, serverName);
    });

    ipcMain.handle(CODEX_MCP_CHANNELS.ENABLE, (_, env: CodexEnvironment, serverName: string) => {
        return manager.enableMCPServer(env, serverName);
    });

    ipcMain.handle(CODEX_MCP_CHANNELS.REORDER, (_, env: CodexEnvironment, serverNames: string[]) => {
        return manager.reorderMCPServers(env, serverNames);
    });

    ipcMain.handle(CODEX_MCP_CHANNELS.REORDER_DISABLED, (_, env: CodexEnvironment, serverNames: string[]) => {
        return manager.reorderDisabledMCPServers(env, serverNames);
    });
}
