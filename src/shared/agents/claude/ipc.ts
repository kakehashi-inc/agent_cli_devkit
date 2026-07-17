// Claude 系 IPC API（window.agentCliDevkit.claude）の型定義
import type {
    AssetKind,
    AssetListReport,
    AssetOpResult,
    ClaudeCodeEnvInfo,
    ClaudeDesktopInfo,
    ClaudeEnvironment,
    CleanupEnvReport,
    CleanupSelection,
    MCPServers,
    OtherCleanupReport,
    OtherCleanupSelection,
    PluginCatalogReport,
    PluginEnvReport,
    PluginOpResult,
    SettingsReadResult,
    SettingsValues,
    SettingsWriteResult,
} from './types';

export type ClaudeIpcApi = {
    // Claude Desktop MCP 管理
    desktop: {
        getInfo(): Promise<ClaudeDesktopInfo>;
        getMCPServers(): Promise<MCPServers>;
        enableMCPServer(serverName: string): Promise<MCPServers>;
        disableMCPServer(serverName: string): Promise<MCPServers>;
        reorderMCPServers(serverNames: string[]): Promise<MCPServers>;
        reorderDisabledMCPServers(serverNames: string[]): Promise<MCPServers>;
        restart(): Promise<void>;
    };
    // Claude Code (CLI) MCP 管理
    code: {
        getEnvironments(): Promise<ClaudeCodeEnvInfo[]>;
        getMCPServers(env: ClaudeEnvironment): Promise<MCPServers>;
        enableMCPServer(env: ClaudeEnvironment, serverName: string): Promise<MCPServers>;
        disableMCPServer(env: ClaudeEnvironment, serverName: string): Promise<MCPServers>;
        reorderMCPServers(env: ClaudeEnvironment, serverNames: string[]): Promise<MCPServers>;
        reorderDisabledMCPServers(env: ClaudeEnvironment, serverNames: string[]): Promise<MCPServers>;
    };
    // Claude Code クリーンアップ
    cleanup: {
        getEnvironments(): Promise<{ env: ClaudeEnvironment; label: string }[]>;
        scan(env: ClaudeEnvironment): Promise<CleanupEnvReport>;
        delete(env: ClaudeEnvironment, selection: CleanupSelection): Promise<CleanupEnvReport>;
        getOtherEnvironments(): Promise<{ env: ClaudeEnvironment; label: string }[]>;
        scanOther(env: ClaudeEnvironment): Promise<OtherCleanupReport>;
        deleteOther(env: ClaudeEnvironment, selection: OtherCleanupSelection): Promise<OtherCleanupReport>;
    };
    // Claude Code Agent・Skill 管理
    asset: {
        getEnvironments(): Promise<{ env: ClaudeEnvironment; label: string }[]>;
        list(env: ClaudeEnvironment, kind: AssetKind): Promise<AssetListReport>;
        readEntry(env: ClaudeEnvironment, kind: AssetKind, relPath: string): Promise<AssetOpResult>;
        revealEntry(env: ClaudeEnvironment, kind: AssetKind, relPath: string): Promise<AssetOpResult>;
        download(env: ClaudeEnvironment, kind: AssetKind, relPaths: string[]): Promise<AssetOpResult>;
        inspectUpload(env: ClaudeEnvironment, kind: AssetKind): Promise<AssetOpResult>;
        upload(env: ClaudeEnvironment, kind: AssetKind, zipPath: string, overwrite: boolean): Promise<AssetOpResult>;
        uploadMd(env: ClaudeEnvironment, kind: AssetKind, mdPath: string, overwrite: boolean): Promise<AssetOpResult>;
        deleteSelected(env: ClaudeEnvironment, kind: AssetKind, relPaths: string[]): Promise<AssetOpResult>;
        isGitAvailable(): Promise<boolean>;
        listOfficialSkills(): Promise<AssetOpResult>;
        importOfficialSkills(env: ClaudeEnvironment, relPaths: string[]): Promise<AssetOpResult>;
    };
    // Claude Code 設定（~/.claude/settings.json）
    settings: {
        getEnvironments(): Promise<{ env: ClaudeEnvironment; label: string }[]>;
        read(env: ClaudeEnvironment): Promise<SettingsReadResult>;
        write(env: ClaudeEnvironment, values: SettingsValues): Promise<SettingsWriteResult>;
        writeRaw(env: ClaudeEnvironment, rawJson: string): Promise<SettingsWriteResult>;
    };
    // Claude Code プラグイン管理
    plugin: {
        getEnvironments(): Promise<{ env: ClaudeEnvironment; label: string }[]>;
        list(env: ClaudeEnvironment): Promise<PluginEnvReport>;
        catalog(env: ClaudeEnvironment): Promise<PluginCatalogReport>;
        install(env: ClaudeEnvironment, id: string): Promise<PluginOpResult>;
        uninstall(env: ClaudeEnvironment, id: string): Promise<PluginOpResult>;
        setEnabled(env: ClaudeEnvironment, id: string, enabled: boolean): Promise<PluginOpResult>;
        addMarketplace(env: ClaudeEnvironment, source: string): Promise<PluginOpResult>;
        removeMarketplace(env: ClaudeEnvironment, name: string): Promise<PluginOpResult>;
    };
};
