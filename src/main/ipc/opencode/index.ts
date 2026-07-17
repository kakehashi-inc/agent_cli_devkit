import { BrowserWindow, ipcMain } from 'electron';
import {
    OPENCODE_ASSET_CHANNELS,
    OPENCODE_CLEANUP_CHANNELS,
    OPENCODE_MCP_CHANNELS,
    OPENCODE_PLUGIN_CHANNELS,
    OPENCODE_SETTINGS_CHANNELS,
} from '../../../shared/agents/opencode/constants';
import type {
    AssetKind,
    CleanupSelection,
    OpenCodeEnvironment,
    SettingsValues,
} from '../../../shared/agents/opencode/types';
import { AgentCliRunner } from '../../services/common/cli/AgentCliRunner';
import { WslDetector } from '../../services/common/wsl/WslDetector';
import { OpenCodeAssetManager } from '../../services/opencode/OpenCodeAssetManager';
import { OpenCodeCleanupManager } from '../../services/opencode/OpenCodeCleanupManager';
import { OpenCodeMcpManager } from '../../services/opencode/OpenCodeMcpManager';
import { OpenCodePluginManager } from '../../services/opencode/OpenCodePluginManager';
import { OpenCodeSettingsManager } from '../../services/opencode/OpenCodeSettingsManager';

export function registerOpenCodeIpcHandlers(
    detector: WslDetector,
    runner: AgentCliRunner,
    getMainWindow: () => BrowserWindow | null
): void {
    const mcp = new OpenCodeMcpManager(detector);
    ipcMain.handle(OPENCODE_MCP_CHANNELS.GET_ENVIRONMENTS, () => mcp.getEnvironments());
    ipcMain.handle(OPENCODE_MCP_CHANNELS.GET_MCP_SERVERS, (_, env: OpenCodeEnvironment) => mcp.getMCPServers(env));
    ipcMain.handle(OPENCODE_MCP_CHANNELS.ENABLE, (_, env: OpenCodeEnvironment, name: string) =>
        mcp.enableMCPServer(env, name)
    );
    ipcMain.handle(OPENCODE_MCP_CHANNELS.DISABLE, (_, env: OpenCodeEnvironment, name: string) =>
        mcp.disableMCPServer(env, name)
    );
    ipcMain.handle(OPENCODE_MCP_CHANNELS.REORDER, (_, env: OpenCodeEnvironment, names: string[]) =>
        mcp.reorderMCPServers(env, names)
    );
    ipcMain.handle(OPENCODE_MCP_CHANNELS.REORDER_DISABLED, (_, env: OpenCodeEnvironment, names: string[]) =>
        mcp.reorderDisabledMCPServers(env, names)
    );

    const asset = new OpenCodeAssetManager(detector);
    ipcMain.handle(OPENCODE_ASSET_CHANNELS.GET_ENVIRONMENTS, () => asset.getEnvironments());
    ipcMain.handle(OPENCODE_ASSET_CHANNELS.LIST, (_, env: OpenCodeEnvironment, kind: AssetKind) =>
        asset.list(env, kind)
    );
    ipcMain.handle(OPENCODE_ASSET_CHANNELS.READ_ENTRY, (_, env: OpenCodeEnvironment, kind: AssetKind, rel: string) =>
        asset.readEntry(env, kind, rel)
    );
    ipcMain.handle(OPENCODE_ASSET_CHANNELS.REVEAL_ENTRY, (_, env: OpenCodeEnvironment, kind: AssetKind, rel: string) =>
        asset.revealEntry(env, kind, rel)
    );
    ipcMain.handle(OPENCODE_ASSET_CHANNELS.DOWNLOAD, (_, env: OpenCodeEnvironment, kind: AssetKind, rels: string[]) =>
        asset.download(env, kind, rels, getMainWindow())
    );
    ipcMain.handle(OPENCODE_ASSET_CHANNELS.INSPECT_UPLOAD, (_, env: OpenCodeEnvironment, kind: AssetKind) =>
        asset.inspectUpload(env, kind, getMainWindow())
    );
    ipcMain.handle(
        OPENCODE_ASSET_CHANNELS.UPLOAD,
        (_, env: OpenCodeEnvironment, kind: AssetKind, path: string, overwrite: boolean) =>
            asset.upload(env, kind, path, overwrite)
    );
    ipcMain.handle(
        OPENCODE_ASSET_CHANNELS.UPLOAD_FILE,
        (_, env: OpenCodeEnvironment, kind: AssetKind, path: string, overwrite: boolean) =>
            asset.uploadFile(env, kind, path, overwrite)
    );
    ipcMain.handle(OPENCODE_ASSET_CHANNELS.DELETE, (_, env: OpenCodeEnvironment, kind: AssetKind, rels: string[]) =>
        asset.deleteSelected(env, kind, rels)
    );

    const cleanup = new OpenCodeCleanupManager(detector);
    ipcMain.handle(OPENCODE_CLEANUP_CHANNELS.GET_ENVIRONMENTS, () => cleanup.getEnvironments());
    ipcMain.handle(OPENCODE_CLEANUP_CHANNELS.SCAN, (_, env: OpenCodeEnvironment) => cleanup.scan(env));
    ipcMain.handle(OPENCODE_CLEANUP_CHANNELS.DELETE, (_, env: OpenCodeEnvironment, selection: CleanupSelection) =>
        cleanup.deleteSelected(env, selection)
    );

    const settings = new OpenCodeSettingsManager(detector);
    ipcMain.handle(OPENCODE_SETTINGS_CHANNELS.GET_ENVIRONMENTS, () => settings.getEnvironments());
    ipcMain.handle(OPENCODE_SETTINGS_CHANNELS.READ, (_, env: OpenCodeEnvironment) => settings.read(env));
    ipcMain.handle(OPENCODE_SETTINGS_CHANNELS.WRITE, (_, env: OpenCodeEnvironment, values: SettingsValues) =>
        settings.write(env, values)
    );
    ipcMain.handle(OPENCODE_SETTINGS_CHANNELS.WRITE_RAW, (_, env: OpenCodeEnvironment, raw: string) =>
        settings.writeRaw(env, raw)
    );

    const plugin = new OpenCodePluginManager(detector, runner);
    ipcMain.handle(OPENCODE_PLUGIN_CHANNELS.GET_ENVIRONMENTS, () => plugin.getEnvironments());
    ipcMain.handle(OPENCODE_PLUGIN_CHANNELS.LIST, (_, env: OpenCodeEnvironment) => plugin.list(env));
    ipcMain.handle(OPENCODE_PLUGIN_CHANNELS.CATALOG, (_, env: OpenCodeEnvironment) => plugin.catalog(env));
    ipcMain.handle(OPENCODE_PLUGIN_CHANNELS.INSTALL, (_, env: OpenCodeEnvironment, id: string) =>
        plugin.install(env, id)
    );
    ipcMain.handle(OPENCODE_PLUGIN_CHANNELS.INSTALL_SOURCE, (_, env: OpenCodeEnvironment, source: string) =>
        plugin.installFromSource(env, source)
    );
    ipcMain.handle(OPENCODE_PLUGIN_CHANNELS.UNINSTALL, (_, env: OpenCodeEnvironment, id: string) =>
        plugin.uninstall(env, id)
    );
    ipcMain.handle(OPENCODE_PLUGIN_CHANNELS.SET_ENABLED, (_, env: OpenCodeEnvironment, id: string, enabled: boolean) =>
        plugin.setEnabled(env, id, enabled)
    );
    ipcMain.handle(OPENCODE_PLUGIN_CHANNELS.ADD_MARKETPLACE, (_, env: OpenCodeEnvironment, source: string) =>
        plugin.addMarketplace(env, source)
    );
    ipcMain.handle(OPENCODE_PLUGIN_CHANNELS.REMOVE_MARKETPLACE, (_, env: OpenCodeEnvironment, name: string) =>
        plugin.removeMarketplace(env, name)
    );
}
