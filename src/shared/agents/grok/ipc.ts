// Grok 系 IPC API（window.agentCliDevkit.grok）の型定義
import type {
    AssetKind,
    AssetListReport,
    AssetOpResult,
    CleanupEnvReport,
    CleanupSelection,
    GrokEnvironment,
    GrokMcpEnvInfo,
    MCPServers,
    OtherCleanupReport,
    OtherCleanupSelection,
    SettingsReadResult,
    SettingsValues,
    SettingsWriteResult,
} from './types';

export type GrokIpcApi = {
    // Grok MCP 管理
    mcp: {
        getEnvironments(): Promise<GrokMcpEnvInfo[]>;
        getMCPServers(env: GrokEnvironment): Promise<MCPServers>;
        enableMCPServer(env: GrokEnvironment, serverName: string): Promise<MCPServers>;
        disableMCPServer(env: GrokEnvironment, serverName: string): Promise<MCPServers>;
        reorderMCPServers(env: GrokEnvironment, serverNames: string[]): Promise<MCPServers>;
        reorderDisabledMCPServers(env: GrokEnvironment, serverNames: string[]): Promise<MCPServers>;
    };
    // Grok Agent・Skill 管理
    asset: {
        getEnvironments(): Promise<{ env: GrokEnvironment; label: string }[]>;
        list(env: GrokEnvironment, kind: AssetKind): Promise<AssetListReport>;
        download(env: GrokEnvironment, kind: AssetKind, relPaths: string[]): Promise<AssetOpResult>;
        inspectUpload(env: GrokEnvironment, kind: AssetKind): Promise<AssetOpResult>;
        upload(env: GrokEnvironment, kind: AssetKind, zipPath: string, overwrite: boolean): Promise<AssetOpResult>;
        uploadMd(env: GrokEnvironment, kind: AssetKind, mdPath: string, overwrite: boolean): Promise<AssetOpResult>;
        deleteSelected(env: GrokEnvironment, kind: AssetKind, relPaths: string[]): Promise<AssetOpResult>;
        isGitAvailable(): Promise<boolean>;
        listOfficialSkills(): Promise<AssetOpResult>;
        importOfficialSkills(env: GrokEnvironment, relPaths: string[]): Promise<AssetOpResult>;
    };
    // Grok クリーンアップ
    cleanup: {
        getEnvironments(): Promise<{ env: GrokEnvironment; label: string }[]>;
        scan(env: GrokEnvironment): Promise<CleanupEnvReport>;
        delete(env: GrokEnvironment, selection: CleanupSelection): Promise<CleanupEnvReport>;
        getOtherEnvironments(): Promise<{ env: GrokEnvironment; label: string }[]>;
        scanOther(env: GrokEnvironment): Promise<OtherCleanupReport>;
        deleteOther(env: GrokEnvironment, selection: OtherCleanupSelection): Promise<OtherCleanupReport>;
    };
    // Grok 設定（~/.grok/config.toml）
    config: {
        getEnvironments(): Promise<{ env: GrokEnvironment; label: string }[]>;
        read(env: GrokEnvironment): Promise<SettingsReadResult>;
        write(env: GrokEnvironment, values: SettingsValues): Promise<SettingsWriteResult>;
        writeRaw(env: GrokEnvironment, rawToml: string): Promise<SettingsWriteResult>;
    };
};
