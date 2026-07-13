// Grok 系 API（window.agentCliDevkit.grok）の preload ブリッジ。
// sandbox を無効化しているため、shared の定数・型を直接 import できる。
import { ipcRenderer } from 'electron';
import {
    GROK_ASSET_CHANNELS,
    GROK_CLEANUP_CHANNELS,
    GROK_CONFIG_CHANNELS,
    GROK_MCP_CHANNELS,
    GROK_PLUGIN_CHANNELS,
} from '../../shared/agents/grok/constants';
import type {
    AssetKind,
    CleanupSelection,
    GrokEnvironment,
    OtherCleanupSelection,
    SettingsValues,
} from '../../shared/agents/grok/types';
import type { GrokIpcApi } from '../../shared/agents/grok/ipc';

export const grokApi: GrokIpcApi = {
    mcp: {
        getEnvironments: () => ipcRenderer.invoke(GROK_MCP_CHANNELS.GET_ENVIRONMENTS),
        getMCPServers: (env: GrokEnvironment) => ipcRenderer.invoke(GROK_MCP_CHANNELS.GET_MCP_SERVERS, env),
        enableMCPServer: (env: GrokEnvironment, serverName: string) =>
            ipcRenderer.invoke(GROK_MCP_CHANNELS.ENABLE, env, serverName),
        disableMCPServer: (env: GrokEnvironment, serverName: string) =>
            ipcRenderer.invoke(GROK_MCP_CHANNELS.DISABLE, env, serverName),
        reorderMCPServers: (env: GrokEnvironment, serverNames: string[]) =>
            ipcRenderer.invoke(GROK_MCP_CHANNELS.REORDER, env, serverNames),
        reorderDisabledMCPServers: (env: GrokEnvironment, serverNames: string[]) =>
            ipcRenderer.invoke(GROK_MCP_CHANNELS.REORDER_DISABLED, env, serverNames),
    },
    asset: {
        getEnvironments: () => ipcRenderer.invoke(GROK_ASSET_CHANNELS.GET_ENVIRONMENTS),
        list: (env: GrokEnvironment, kind: AssetKind) => ipcRenderer.invoke(GROK_ASSET_CHANNELS.LIST, env, kind),
        readEntry: (env: GrokEnvironment, kind: AssetKind, relPath: string) =>
            ipcRenderer.invoke(GROK_ASSET_CHANNELS.READ_ENTRY, env, kind, relPath),
        download: (env: GrokEnvironment, kind: AssetKind, relPaths: string[]) =>
            ipcRenderer.invoke(GROK_ASSET_CHANNELS.DOWNLOAD, env, kind, relPaths),
        inspectUpload: (env: GrokEnvironment, kind: AssetKind) =>
            ipcRenderer.invoke(GROK_ASSET_CHANNELS.INSPECT_UPLOAD, env, kind),
        upload: (env: GrokEnvironment, kind: AssetKind, zipPath: string, overwrite: boolean) =>
            ipcRenderer.invoke(GROK_ASSET_CHANNELS.UPLOAD, env, kind, zipPath, overwrite),
        uploadMd: (env: GrokEnvironment, kind: AssetKind, mdPath: string, overwrite: boolean) =>
            ipcRenderer.invoke(GROK_ASSET_CHANNELS.UPLOAD_MD, env, kind, mdPath, overwrite),
        deleteSelected: (env: GrokEnvironment, kind: AssetKind, relPaths: string[]) =>
            ipcRenderer.invoke(GROK_ASSET_CHANNELS.DELETE, env, kind, relPaths),
        isGitAvailable: () => ipcRenderer.invoke(GROK_ASSET_CHANNELS.IS_GIT_AVAILABLE),
        listOfficialSkills: () => ipcRenderer.invoke(GROK_ASSET_CHANNELS.LIST_OFFICIAL_SKILLS),
        importOfficialSkills: (env: GrokEnvironment, relPaths: string[]) =>
            ipcRenderer.invoke(GROK_ASSET_CHANNELS.IMPORT_OFFICIAL_SKILLS, env, relPaths),
    },
    cleanup: {
        getEnvironments: () => ipcRenderer.invoke(GROK_CLEANUP_CHANNELS.GET_ENVIRONMENTS),
        scan: (env: GrokEnvironment) => ipcRenderer.invoke(GROK_CLEANUP_CHANNELS.SCAN, env),
        delete: (env: GrokEnvironment, selection: CleanupSelection) =>
            ipcRenderer.invoke(GROK_CLEANUP_CHANNELS.DELETE, env, selection),
        getOtherEnvironments: () => ipcRenderer.invoke(GROK_CLEANUP_CHANNELS.GET_OTHER_ENVIRONMENTS),
        scanOther: (env: GrokEnvironment) => ipcRenderer.invoke(GROK_CLEANUP_CHANNELS.SCAN_OTHER, env),
        deleteOther: (env: GrokEnvironment, selection: OtherCleanupSelection) =>
            ipcRenderer.invoke(GROK_CLEANUP_CHANNELS.DELETE_OTHER, env, selection),
    },
    config: {
        getEnvironments: () => ipcRenderer.invoke(GROK_CONFIG_CHANNELS.GET_ENVIRONMENTS),
        read: (env: GrokEnvironment) => ipcRenderer.invoke(GROK_CONFIG_CHANNELS.READ, env),
        write: (env: GrokEnvironment, values: SettingsValues) =>
            ipcRenderer.invoke(GROK_CONFIG_CHANNELS.WRITE, env, values),
        writeRaw: (env: GrokEnvironment, rawToml: string) =>
            ipcRenderer.invoke(GROK_CONFIG_CHANNELS.WRITE_RAW, env, rawToml),
    },
    plugin: {
        getEnvironments: () => ipcRenderer.invoke(GROK_PLUGIN_CHANNELS.GET_ENVIRONMENTS),
        list: (env: GrokEnvironment) => ipcRenderer.invoke(GROK_PLUGIN_CHANNELS.LIST, env),
        catalog: (env: GrokEnvironment) => ipcRenderer.invoke(GROK_PLUGIN_CHANNELS.CATALOG, env),
        install: (env: GrokEnvironment, id: string) => ipcRenderer.invoke(GROK_PLUGIN_CHANNELS.INSTALL, env, id),
        installFromSource: (env: GrokEnvironment, source: string) =>
            ipcRenderer.invoke(GROK_PLUGIN_CHANNELS.INSTALL_FROM_SOURCE, env, source),
        uninstall: (env: GrokEnvironment, id: string) => ipcRenderer.invoke(GROK_PLUGIN_CHANNELS.UNINSTALL, env, id),
        setEnabled: (env: GrokEnvironment, id: string, enabled: boolean) =>
            ipcRenderer.invoke(GROK_PLUGIN_CHANNELS.SET_ENABLED, env, id, enabled),
        addMarketplace: (env: GrokEnvironment, source: string) =>
            ipcRenderer.invoke(GROK_PLUGIN_CHANNELS.ADD_MARKETPLACE, env, source),
        removeMarketplace: (env: GrokEnvironment, name: string) =>
            ipcRenderer.invoke(GROK_PLUGIN_CHANNELS.REMOVE_MARKETPLACE, env, name),
    },
};
