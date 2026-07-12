// Claude 系 API（window.agentCliDevkit.claude）の preload ブリッジ。
// sandbox を無効化しているため、shared の定数・型を直接 import できる。
import { ipcRenderer } from 'electron';
import {
    CLAUDE_ASSET_CHANNELS,
    CLAUDE_CLEANUP_CHANNELS,
    CLAUDE_CODE_CHANNELS,
    CLAUDE_DESKTOP_CHANNELS,
    CLAUDE_SETTINGS_CHANNELS,
} from '../../shared/agents/claude/constants';
import type {
    AssetKind,
    ClaudeEnvironment,
    CleanupSelection,
    OtherCleanupSelection,
    SettingsValues,
} from '../../shared/agents/claude/types';
import type { ClaudeIpcApi } from '../../shared/agents/claude/ipc';

export const claudeApi: ClaudeIpcApi = {
    desktop: {
        getInfo: () => ipcRenderer.invoke(CLAUDE_DESKTOP_CHANNELS.GET_INFO),
        getMCPServers: () => ipcRenderer.invoke(CLAUDE_DESKTOP_CHANNELS.GET_MCP_SERVERS),
        enableMCPServer: (serverName: string) => ipcRenderer.invoke(CLAUDE_DESKTOP_CHANNELS.ENABLE, serverName),
        disableMCPServer: (serverName: string) => ipcRenderer.invoke(CLAUDE_DESKTOP_CHANNELS.DISABLE, serverName),
        reorderMCPServers: (serverNames: string[]) => ipcRenderer.invoke(CLAUDE_DESKTOP_CHANNELS.REORDER, serverNames),
        reorderDisabledMCPServers: (serverNames: string[]) =>
            ipcRenderer.invoke(CLAUDE_DESKTOP_CHANNELS.REORDER_DISABLED, serverNames),
        restart: () => ipcRenderer.invoke(CLAUDE_DESKTOP_CHANNELS.RESTART),
    },
    code: {
        getEnvironments: () => ipcRenderer.invoke(CLAUDE_CODE_CHANNELS.GET_ENVIRONMENTS),
        getMCPServers: (env: ClaudeEnvironment) => ipcRenderer.invoke(CLAUDE_CODE_CHANNELS.GET_MCP_SERVERS, env),
        enableMCPServer: (env: ClaudeEnvironment, serverName: string) =>
            ipcRenderer.invoke(CLAUDE_CODE_CHANNELS.ENABLE, env, serverName),
        disableMCPServer: (env: ClaudeEnvironment, serverName: string) =>
            ipcRenderer.invoke(CLAUDE_CODE_CHANNELS.DISABLE, env, serverName),
        reorderMCPServers: (env: ClaudeEnvironment, serverNames: string[]) =>
            ipcRenderer.invoke(CLAUDE_CODE_CHANNELS.REORDER, env, serverNames),
        reorderDisabledMCPServers: (env: ClaudeEnvironment, serverNames: string[]) =>
            ipcRenderer.invoke(CLAUDE_CODE_CHANNELS.REORDER_DISABLED, env, serverNames),
    },
    cleanup: {
        getEnvironments: () => ipcRenderer.invoke(CLAUDE_CLEANUP_CHANNELS.GET_ENVIRONMENTS),
        scan: (env: ClaudeEnvironment) => ipcRenderer.invoke(CLAUDE_CLEANUP_CHANNELS.SCAN, env),
        delete: (env: ClaudeEnvironment, selection: CleanupSelection) =>
            ipcRenderer.invoke(CLAUDE_CLEANUP_CHANNELS.DELETE, env, selection),
        getOtherEnvironments: () => ipcRenderer.invoke(CLAUDE_CLEANUP_CHANNELS.GET_OTHER_ENVIRONMENTS),
        scanOther: (env: ClaudeEnvironment) => ipcRenderer.invoke(CLAUDE_CLEANUP_CHANNELS.SCAN_OTHER, env),
        deleteOther: (env: ClaudeEnvironment, selection: OtherCleanupSelection) =>
            ipcRenderer.invoke(CLAUDE_CLEANUP_CHANNELS.DELETE_OTHER, env, selection),
    },
    asset: {
        getEnvironments: () => ipcRenderer.invoke(CLAUDE_ASSET_CHANNELS.GET_ENVIRONMENTS),
        list: (env: ClaudeEnvironment, kind: AssetKind) => ipcRenderer.invoke(CLAUDE_ASSET_CHANNELS.LIST, env, kind),
        readEntry: (env: ClaudeEnvironment, kind: AssetKind, relPath: string) =>
            ipcRenderer.invoke(CLAUDE_ASSET_CHANNELS.READ_ENTRY, env, kind, relPath),
        download: (env: ClaudeEnvironment, kind: AssetKind, relPaths: string[]) =>
            ipcRenderer.invoke(CLAUDE_ASSET_CHANNELS.DOWNLOAD, env, kind, relPaths),
        inspectUpload: (env: ClaudeEnvironment, kind: AssetKind) =>
            ipcRenderer.invoke(CLAUDE_ASSET_CHANNELS.INSPECT_UPLOAD, env, kind),
        upload: (env: ClaudeEnvironment, kind: AssetKind, zipPath: string, overwrite: boolean) =>
            ipcRenderer.invoke(CLAUDE_ASSET_CHANNELS.UPLOAD, env, kind, zipPath, overwrite),
        uploadMd: (env: ClaudeEnvironment, kind: AssetKind, mdPath: string, overwrite: boolean) =>
            ipcRenderer.invoke(CLAUDE_ASSET_CHANNELS.UPLOAD_MD, env, kind, mdPath, overwrite),
        deleteSelected: (env: ClaudeEnvironment, kind: AssetKind, relPaths: string[]) =>
            ipcRenderer.invoke(CLAUDE_ASSET_CHANNELS.DELETE, env, kind, relPaths),
        isGitAvailable: () => ipcRenderer.invoke(CLAUDE_ASSET_CHANNELS.IS_GIT_AVAILABLE),
        listOfficialSkills: () => ipcRenderer.invoke(CLAUDE_ASSET_CHANNELS.LIST_OFFICIAL_SKILLS),
        importOfficialSkills: (env: ClaudeEnvironment, relPaths: string[]) =>
            ipcRenderer.invoke(CLAUDE_ASSET_CHANNELS.IMPORT_OFFICIAL_SKILLS, env, relPaths),
    },
    settings: {
        getEnvironments: () => ipcRenderer.invoke(CLAUDE_SETTINGS_CHANNELS.GET_ENVIRONMENTS),
        read: (env: ClaudeEnvironment) => ipcRenderer.invoke(CLAUDE_SETTINGS_CHANNELS.READ, env),
        write: (env: ClaudeEnvironment, values: SettingsValues) =>
            ipcRenderer.invoke(CLAUDE_SETTINGS_CHANNELS.WRITE, env, values),
        writeRaw: (env: ClaudeEnvironment, rawJson: string) =>
            ipcRenderer.invoke(CLAUDE_SETTINGS_CHANNELS.WRITE_RAW, env, rawJson),
    },
};
