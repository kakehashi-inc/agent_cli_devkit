// Codex 系 API（window.agentCliDevkit.codex）の preload ブリッジ。
// sandbox を無効化しているため、shared の定数・型を直接 import できる。
import { ipcRenderer } from 'electron';
import {
    CODEX_ASSET_CHANNELS,
    CODEX_CLEANUP_CHANNELS,
    CODEX_CONFIG_CHANNELS,
    CODEX_MCP_CHANNELS,
    CODEX_PLUGIN_CHANNELS,
} from '../../shared/agents/codex/constants';
import type {
    AssetKind,
    CleanupSelection,
    CodexEnvironment,
    OtherCleanupSelection,
    SettingsValues,
} from '../../shared/agents/codex/types';
import type { CodexIpcApi } from '../../shared/agents/codex/ipc';

export const codexApi: CodexIpcApi = {
    mcp: {
        getEnvironments: () => ipcRenderer.invoke(CODEX_MCP_CHANNELS.GET_ENVIRONMENTS),
        getMCPServers: (env: CodexEnvironment) => ipcRenderer.invoke(CODEX_MCP_CHANNELS.GET_MCP_SERVERS, env),
        enableMCPServer: (env: CodexEnvironment, serverName: string) =>
            ipcRenderer.invoke(CODEX_MCP_CHANNELS.ENABLE, env, serverName),
        disableMCPServer: (env: CodexEnvironment, serverName: string) =>
            ipcRenderer.invoke(CODEX_MCP_CHANNELS.DISABLE, env, serverName),
        reorderMCPServers: (env: CodexEnvironment, serverNames: string[]) =>
            ipcRenderer.invoke(CODEX_MCP_CHANNELS.REORDER, env, serverNames),
        reorderDisabledMCPServers: (env: CodexEnvironment, serverNames: string[]) =>
            ipcRenderer.invoke(CODEX_MCP_CHANNELS.REORDER_DISABLED, env, serverNames),
    },
    asset: {
        getEnvironments: () => ipcRenderer.invoke(CODEX_ASSET_CHANNELS.GET_ENVIRONMENTS),
        list: (env: CodexEnvironment, kind: AssetKind) => ipcRenderer.invoke(CODEX_ASSET_CHANNELS.LIST, env, kind),
        readEntry: (env: CodexEnvironment, kind: AssetKind, relPath: string) =>
            ipcRenderer.invoke(CODEX_ASSET_CHANNELS.READ_ENTRY, env, kind, relPath),
        revealEntry: (env: CodexEnvironment, kind: AssetKind, relPath: string) =>
            ipcRenderer.invoke(CODEX_ASSET_CHANNELS.REVEAL_ENTRY, env, kind, relPath),
        download: (env: CodexEnvironment, kind: AssetKind, relPaths: string[]) =>
            ipcRenderer.invoke(CODEX_ASSET_CHANNELS.DOWNLOAD, env, kind, relPaths),
        inspectUpload: (env: CodexEnvironment, kind: AssetKind) =>
            ipcRenderer.invoke(CODEX_ASSET_CHANNELS.INSPECT_UPLOAD, env, kind),
        upload: (env: CodexEnvironment, kind: AssetKind, zipPath: string, overwrite: boolean) =>
            ipcRenderer.invoke(CODEX_ASSET_CHANNELS.UPLOAD, env, kind, zipPath, overwrite),
        uploadFile: (env: CodexEnvironment, kind: AssetKind, filePath: string, overwrite: boolean) =>
            ipcRenderer.invoke(CODEX_ASSET_CHANNELS.UPLOAD_FILE, env, kind, filePath, overwrite),
        deleteSelected: (env: CodexEnvironment, kind: AssetKind, relPaths: string[]) =>
            ipcRenderer.invoke(CODEX_ASSET_CHANNELS.DELETE, env, kind, relPaths),
        isGitAvailable: () => ipcRenderer.invoke(CODEX_ASSET_CHANNELS.IS_GIT_AVAILABLE),
        listOfficialSkills: () => ipcRenderer.invoke(CODEX_ASSET_CHANNELS.LIST_OFFICIAL_SKILLS),
        importOfficialSkills: (env: CodexEnvironment, relPaths: string[]) =>
            ipcRenderer.invoke(CODEX_ASSET_CHANNELS.IMPORT_OFFICIAL_SKILLS, env, relPaths),
    },
    cleanup: {
        getEnvironments: () => ipcRenderer.invoke(CODEX_CLEANUP_CHANNELS.GET_ENVIRONMENTS),
        scan: (env: CodexEnvironment) => ipcRenderer.invoke(CODEX_CLEANUP_CHANNELS.SCAN, env),
        delete: (env: CodexEnvironment, selection: CleanupSelection) =>
            ipcRenderer.invoke(CODEX_CLEANUP_CHANNELS.DELETE, env, selection),
        getOtherEnvironments: () => ipcRenderer.invoke(CODEX_CLEANUP_CHANNELS.GET_OTHER_ENVIRONMENTS),
        scanOther: (env: CodexEnvironment) => ipcRenderer.invoke(CODEX_CLEANUP_CHANNELS.SCAN_OTHER, env),
        deleteOther: (env: CodexEnvironment, selection: OtherCleanupSelection) =>
            ipcRenderer.invoke(CODEX_CLEANUP_CHANNELS.DELETE_OTHER, env, selection),
    },
    config: {
        getEnvironments: () => ipcRenderer.invoke(CODEX_CONFIG_CHANNELS.GET_ENVIRONMENTS),
        read: (env: CodexEnvironment) => ipcRenderer.invoke(CODEX_CONFIG_CHANNELS.READ, env),
        write: (env: CodexEnvironment, values: SettingsValues) =>
            ipcRenderer.invoke(CODEX_CONFIG_CHANNELS.WRITE, env, values),
        writeRaw: (env: CodexEnvironment, rawToml: string) =>
            ipcRenderer.invoke(CODEX_CONFIG_CHANNELS.WRITE_RAW, env, rawToml),
    },
    plugin: {
        getEnvironments: () => ipcRenderer.invoke(CODEX_PLUGIN_CHANNELS.GET_ENVIRONMENTS),
        list: (env: CodexEnvironment) => ipcRenderer.invoke(CODEX_PLUGIN_CHANNELS.LIST, env),
        catalog: (env: CodexEnvironment) => ipcRenderer.invoke(CODEX_PLUGIN_CHANNELS.CATALOG, env),
        install: (env: CodexEnvironment, id: string) => ipcRenderer.invoke(CODEX_PLUGIN_CHANNELS.INSTALL, env, id),
        uninstall: (env: CodexEnvironment, id: string) => ipcRenderer.invoke(CODEX_PLUGIN_CHANNELS.UNINSTALL, env, id),
        setEnabled: (env: CodexEnvironment, id: string, enabled: boolean) =>
            ipcRenderer.invoke(CODEX_PLUGIN_CHANNELS.SET_ENABLED, env, id, enabled),
        addMarketplace: (env: CodexEnvironment, source: string) =>
            ipcRenderer.invoke(CODEX_PLUGIN_CHANNELS.ADD_MARKETPLACE, env, source),
        removeMarketplace: (env: CodexEnvironment, name: string) =>
            ipcRenderer.invoke(CODEX_PLUGIN_CHANNELS.REMOVE_MARKETPLACE, env, name),
    },
};
