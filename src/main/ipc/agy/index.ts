import { BrowserWindow, ipcMain } from 'electron';
import {
    AGY_ASSET_CHANNELS,
    AGY_CLEANUP_CHANNELS,
    AGY_MCP_CHANNELS,
    AGY_PLUGIN_CHANNELS,
    AGY_SETTINGS_CHANNELS,
} from '../../../shared/agents/agy/constants';
import type { AgyEnvironment, AssetKind, CleanupSelection, SettingsValues } from '../../../shared/agents/agy/types';
import { AgyAssetManager } from '../../services/agy/AgyAssetManager';
import { AgyCleanupManager } from '../../services/agy/AgyCleanupManager';
import { AgyMcpManager } from '../../services/agy/AgyMcpManager';
import { AgyPluginManager } from '../../services/agy/AgyPluginManager';
import { AgySettingsManager } from '../../services/agy/AgySettingsManager';
import { AgentCliRunner } from '../../services/common/cli/AgentCliRunner';
import { WslDetector } from '../../services/common/wsl/WslDetector';

export function registerAgyIpcHandlers(
    detector: WslDetector,
    runner: AgentCliRunner,
    getMainWindow: () => BrowserWindow | null
): void {
    const mcp = new AgyMcpManager(detector);
    ipcMain.handle(AGY_MCP_CHANNELS.GET_ENVIRONMENTS, () => mcp.getEnvironments());
    ipcMain.handle(AGY_MCP_CHANNELS.GET_MCP_SERVERS, (_, env: AgyEnvironment) => mcp.getMCPServers(env));
    ipcMain.handle(AGY_MCP_CHANNELS.ENABLE, (_, env: AgyEnvironment, name: string) => mcp.enableMCPServer(env, name));
    ipcMain.handle(AGY_MCP_CHANNELS.DISABLE, (_, env: AgyEnvironment, name: string) => mcp.disableMCPServer(env, name));
    ipcMain.handle(AGY_MCP_CHANNELS.REORDER, (_, env: AgyEnvironment, names: string[]) =>
        mcp.reorderMCPServers(env, names)
    );
    ipcMain.handle(AGY_MCP_CHANNELS.REORDER_DISABLED, (_, env: AgyEnvironment, names: string[]) =>
        mcp.reorderDisabledMCPServers(env, names)
    );

    const asset = new AgyAssetManager(detector);
    ipcMain.handle(AGY_ASSET_CHANNELS.GET_ENVIRONMENTS, () => asset.getEnvironments());
    ipcMain.handle(AGY_ASSET_CHANNELS.LIST, (_, env: AgyEnvironment, kind: AssetKind) => asset.list(env, kind));
    ipcMain.handle(AGY_ASSET_CHANNELS.READ_ENTRY, (_, env: AgyEnvironment, kind: AssetKind, rel: string) =>
        asset.readEntry(env, kind, rel)
    );
    ipcMain.handle(AGY_ASSET_CHANNELS.REVEAL_ENTRY, (_, env: AgyEnvironment, kind: AssetKind, rel: string) =>
        asset.revealEntry(env, kind, rel)
    );
    ipcMain.handle(AGY_ASSET_CHANNELS.DOWNLOAD, (_, env: AgyEnvironment, kind: AssetKind, rels: string[]) =>
        asset.download(env, kind, rels, getMainWindow())
    );
    ipcMain.handle(AGY_ASSET_CHANNELS.INSPECT_UPLOAD, (_, env: AgyEnvironment, kind: AssetKind) =>
        asset.inspectUpload(env, kind, getMainWindow())
    );
    ipcMain.handle(
        AGY_ASSET_CHANNELS.UPLOAD,
        (_, env: AgyEnvironment, kind: AssetKind, path: string, overwrite: boolean) =>
            asset.upload(env, kind, path, overwrite)
    );
    ipcMain.handle(
        AGY_ASSET_CHANNELS.UPLOAD_FILE,
        (_, env: AgyEnvironment, kind: AssetKind, path: string, overwrite: boolean) =>
            asset.uploadFile(env, kind, path, overwrite)
    );
    ipcMain.handle(AGY_ASSET_CHANNELS.DELETE, (_, env: AgyEnvironment, kind: AssetKind, rels: string[]) =>
        asset.deleteSelected(env, kind, rels)
    );

    const cleanup = new AgyCleanupManager(detector);
    ipcMain.handle(AGY_CLEANUP_CHANNELS.GET_ENVIRONMENTS, () => cleanup.getEnvironments());
    ipcMain.handle(AGY_CLEANUP_CHANNELS.SCAN, (_, env: AgyEnvironment) => cleanup.scan(env));
    ipcMain.handle(AGY_CLEANUP_CHANNELS.DELETE, (_, env: AgyEnvironment, selection: CleanupSelection) =>
        cleanup.deleteSelected(env, selection)
    );

    const settings = new AgySettingsManager(detector);
    ipcMain.handle(AGY_SETTINGS_CHANNELS.GET_ENVIRONMENTS, () => settings.getEnvironments());
    ipcMain.handle(AGY_SETTINGS_CHANNELS.READ, (_, env: AgyEnvironment) => settings.read(env));
    ipcMain.handle(AGY_SETTINGS_CHANNELS.WRITE, (_, env: AgyEnvironment, values: SettingsValues) =>
        settings.write(env, values)
    );
    ipcMain.handle(AGY_SETTINGS_CHANNELS.WRITE_RAW, (_, env: AgyEnvironment, raw: string) =>
        settings.writeRaw(env, raw)
    );

    const plugin = new AgyPluginManager(detector, runner);
    ipcMain.handle(AGY_PLUGIN_CHANNELS.GET_ENVIRONMENTS, () => plugin.getEnvironments());
    ipcMain.handle(AGY_PLUGIN_CHANNELS.LIST, (_, env: AgyEnvironment) => plugin.list(env));
    ipcMain.handle(AGY_PLUGIN_CHANNELS.CATALOG, (_, env: AgyEnvironment) => plugin.catalog(env));
    ipcMain.handle(AGY_PLUGIN_CHANNELS.INSTALL, (_, env: AgyEnvironment, id: string) => plugin.install(env, id));
    ipcMain.handle(AGY_PLUGIN_CHANNELS.INSTALL_SOURCE, (_, env: AgyEnvironment, source: string) =>
        plugin.installFromSource(env, source)
    );
    ipcMain.handle(AGY_PLUGIN_CHANNELS.UNINSTALL, (_, env: AgyEnvironment, id: string) => plugin.uninstall(env, id));
    ipcMain.handle(AGY_PLUGIN_CHANNELS.SET_ENABLED, (_, env: AgyEnvironment, id: string, enabled: boolean) =>
        plugin.setEnabled(env, id, enabled)
    );
    ipcMain.handle(AGY_PLUGIN_CHANNELS.ADD_MARKETPLACE, (_, env: AgyEnvironment, source: string) =>
        plugin.addMarketplace(env, source)
    );
    ipcMain.handle(AGY_PLUGIN_CHANNELS.REMOVE_MARKETPLACE, (_, env: AgyEnvironment, name: string) =>
        plugin.removeMarketplace(env, name)
    );
}
