import { ipcRenderer } from 'electron';
import {
    AGY_ASSET_CHANNELS,
    AGY_CLEANUP_CHANNELS,
    AGY_MCP_CHANNELS,
    AGY_PLUGIN_CHANNELS,
    AGY_SETTINGS_CHANNELS,
} from '../../shared/agents/agy/constants';
import type { AgyIpcApi } from '../../shared/agents/agy/ipc';
import type { AgyEnvironment, AssetKind, CleanupSelection, SettingsValues } from '../../shared/agents/agy/types';

export const agyApi: AgyIpcApi = {
    mcp: {
        getEnvironments: () => ipcRenderer.invoke(AGY_MCP_CHANNELS.GET_ENVIRONMENTS),
        getMCPServers: env => ipcRenderer.invoke(AGY_MCP_CHANNELS.GET_MCP_SERVERS, env),
        enableMCPServer: (env, name) => ipcRenderer.invoke(AGY_MCP_CHANNELS.ENABLE, env, name),
        disableMCPServer: (env, name) => ipcRenderer.invoke(AGY_MCP_CHANNELS.DISABLE, env, name),
        reorderMCPServers: (env, names) => ipcRenderer.invoke(AGY_MCP_CHANNELS.REORDER, env, names),
        reorderDisabledMCPServers: (env, names) => ipcRenderer.invoke(AGY_MCP_CHANNELS.REORDER_DISABLED, env, names),
    },
    asset: {
        getEnvironments: () => ipcRenderer.invoke(AGY_ASSET_CHANNELS.GET_ENVIRONMENTS),
        list: (env: AgyEnvironment, kind: AssetKind) => ipcRenderer.invoke(AGY_ASSET_CHANNELS.LIST, env, kind),
        readEntry: (env, kind, rel) => ipcRenderer.invoke(AGY_ASSET_CHANNELS.READ_ENTRY, env, kind, rel),
        revealEntry: (env, kind, rel) => ipcRenderer.invoke(AGY_ASSET_CHANNELS.REVEAL_ENTRY, env, kind, rel),
        download: (env, kind, rels) => ipcRenderer.invoke(AGY_ASSET_CHANNELS.DOWNLOAD, env, kind, rels),
        inspectUpload: (env, kind) => ipcRenderer.invoke(AGY_ASSET_CHANNELS.INSPECT_UPLOAD, env, kind),
        upload: (env, kind, path, overwrite) =>
            ipcRenderer.invoke(AGY_ASSET_CHANNELS.UPLOAD, env, kind, path, overwrite),
        uploadFile: (env, kind, path, overwrite) =>
            ipcRenderer.invoke(AGY_ASSET_CHANNELS.UPLOAD_FILE, env, kind, path, overwrite),
        deleteSelected: (env, kind, rels) => ipcRenderer.invoke(AGY_ASSET_CHANNELS.DELETE, env, kind, rels),
    },
    cleanup: {
        getEnvironments: () => ipcRenderer.invoke(AGY_CLEANUP_CHANNELS.GET_ENVIRONMENTS),
        scan: env => ipcRenderer.invoke(AGY_CLEANUP_CHANNELS.SCAN, env),
        delete: (env: AgyEnvironment, selection: CleanupSelection) =>
            ipcRenderer.invoke(AGY_CLEANUP_CHANNELS.DELETE, env, selection),
    },
    settings: {
        getEnvironments: () => ipcRenderer.invoke(AGY_SETTINGS_CHANNELS.GET_ENVIRONMENTS),
        read: env => ipcRenderer.invoke(AGY_SETTINGS_CHANNELS.READ, env),
        write: (env: AgyEnvironment, values: SettingsValues) =>
            ipcRenderer.invoke(AGY_SETTINGS_CHANNELS.WRITE, env, values),
        writeRaw: (env, raw) => ipcRenderer.invoke(AGY_SETTINGS_CHANNELS.WRITE_RAW, env, raw),
    },
    plugin: {
        getEnvironments: () => ipcRenderer.invoke(AGY_PLUGIN_CHANNELS.GET_ENVIRONMENTS),
        list: env => ipcRenderer.invoke(AGY_PLUGIN_CHANNELS.LIST, env),
        catalog: env => ipcRenderer.invoke(AGY_PLUGIN_CHANNELS.CATALOG, env),
        install: (env, id) => ipcRenderer.invoke(AGY_PLUGIN_CHANNELS.INSTALL, env, id),
        installFromSource: (env, source) => ipcRenderer.invoke(AGY_PLUGIN_CHANNELS.INSTALL_SOURCE, env, source),
        uninstall: (env, id) => ipcRenderer.invoke(AGY_PLUGIN_CHANNELS.UNINSTALL, env, id),
        setEnabled: (env, id, enabled) => ipcRenderer.invoke(AGY_PLUGIN_CHANNELS.SET_ENABLED, env, id, enabled),
        addMarketplace: (env, source) => ipcRenderer.invoke(AGY_PLUGIN_CHANNELS.ADD_MARKETPLACE, env, source),
        removeMarketplace: (env, name) => ipcRenderer.invoke(AGY_PLUGIN_CHANNELS.REMOVE_MARKETPLACE, env, name),
    },
};
