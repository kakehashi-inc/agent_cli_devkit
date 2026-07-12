// Codex 系 IPC API（window.agentCliDevkit.codex）の型定義
import type {
    AssetKind,
    AssetListReport,
    AssetOpResult,
    CleanupEnvReport,
    CleanupSelection,
    CodexEnvironment,
    CodexMcpEnvInfo,
    MCPServers,
    OtherCleanupReport,
    OtherCleanupSelection,
    SettingsReadResult,
    SettingsValues,
    SettingsWriteResult,
} from './types';

export type CodexIpcApi = {
    // Codex MCP 管理
    mcp: {
        getEnvironments(): Promise<CodexMcpEnvInfo[]>;
        getMCPServers(env: CodexEnvironment): Promise<MCPServers>;
        enableMCPServer(env: CodexEnvironment, serverName: string): Promise<MCPServers>;
        disableMCPServer(env: CodexEnvironment, serverName: string): Promise<MCPServers>;
        reorderMCPServers(env: CodexEnvironment, serverNames: string[]): Promise<MCPServers>;
        reorderDisabledMCPServers(env: CodexEnvironment, serverNames: string[]): Promise<MCPServers>;
    };
    // Codex Agent・Skill 管理
    asset: {
        getEnvironments(): Promise<{ env: CodexEnvironment; label: string }[]>;
        list(env: CodexEnvironment, kind: AssetKind): Promise<AssetListReport>;
        readEntry(env: CodexEnvironment, kind: AssetKind, relPath: string): Promise<AssetOpResult>;
        download(env: CodexEnvironment, kind: AssetKind, relPaths: string[]): Promise<AssetOpResult>;
        inspectUpload(env: CodexEnvironment, kind: AssetKind): Promise<AssetOpResult>;
        upload(env: CodexEnvironment, kind: AssetKind, zipPath: string, overwrite: boolean): Promise<AssetOpResult>;
        uploadFile(
            env: CodexEnvironment,
            kind: AssetKind,
            filePath: string,
            overwrite: boolean
        ): Promise<AssetOpResult>;
        deleteSelected(env: CodexEnvironment, kind: AssetKind, relPaths: string[]): Promise<AssetOpResult>;
        isGitAvailable(): Promise<boolean>;
        listOfficialSkills(): Promise<AssetOpResult>;
        importOfficialSkills(env: CodexEnvironment, relPaths: string[]): Promise<AssetOpResult>;
    };
    // Codex クリーンアップ
    cleanup: {
        getEnvironments(): Promise<{ env: CodexEnvironment; label: string }[]>;
        scan(env: CodexEnvironment): Promise<CleanupEnvReport>;
        delete(env: CodexEnvironment, selection: CleanupSelection): Promise<CleanupEnvReport>;
        getOtherEnvironments(): Promise<{ env: CodexEnvironment; label: string }[]>;
        scanOther(env: CodexEnvironment): Promise<OtherCleanupReport>;
        deleteOther(env: CodexEnvironment, selection: OtherCleanupSelection): Promise<OtherCleanupReport>;
    };
    // Codex 設定（~/.codex/config.toml）
    config: {
        getEnvironments(): Promise<{ env: CodexEnvironment; label: string }[]>;
        read(env: CodexEnvironment): Promise<SettingsReadResult>;
        write(env: CodexEnvironment, values: SettingsValues): Promise<SettingsWriteResult>;
        writeRaw(env: CodexEnvironment, rawToml: string): Promise<SettingsWriteResult>;
    };
};
