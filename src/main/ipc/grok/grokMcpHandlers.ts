import { ipcMain } from 'electron';
import { GROK_MCP_CHANNELS } from '../../../shared/agents/grok/constants';
import { GrokEnvironment } from '../../../shared/agents/grok/types';
import { GrokMcpManager } from '../../services/grok/GrokMcpManager';

export function registerGrokMcpHandlers(manager: GrokMcpManager): void {
    ipcMain.handle(GROK_MCP_CHANNELS.GET_ENVIRONMENTS, () => {
        return manager.getEnvironments();
    });

    ipcMain.handle(GROK_MCP_CHANNELS.GET_MCP_SERVERS, (_, env: GrokEnvironment) => {
        return manager.getMCPServers(env);
    });

    ipcMain.handle(GROK_MCP_CHANNELS.DISABLE, (_, env: GrokEnvironment, serverName: string) => {
        return manager.disableMCPServer(env, serverName);
    });

    ipcMain.handle(GROK_MCP_CHANNELS.ENABLE, (_, env: GrokEnvironment, serverName: string) => {
        return manager.enableMCPServer(env, serverName);
    });

    ipcMain.handle(GROK_MCP_CHANNELS.REORDER, (_, env: GrokEnvironment, serverNames: string[]) => {
        return manager.reorderMCPServers(env, serverNames);
    });

    ipcMain.handle(GROK_MCP_CHANNELS.REORDER_DISABLED, (_, env: GrokEnvironment, serverNames: string[]) => {
        return manager.reorderDisabledMCPServers(env, serverNames);
    });
}
