import type {
    AgentEnvironment,
    AssetKind,
    AssetListReport,
    AssetOpResult,
    CleanupEnvReport,
    CleanupSelection,
    McpEnvInfo,
    MCPServers,
    SettingsReadResult,
    SettingsValues,
    SettingsWriteResult,
} from '@shared/agents/types';

export interface McpApi {
    getEnvironments(): Promise<McpEnvInfo[]>;
    getMCPServers(env: AgentEnvironment): Promise<MCPServers>;
    enableMCPServer(env: AgentEnvironment, name: string): Promise<MCPServers>;
    disableMCPServer(env: AgentEnvironment, name: string): Promise<MCPServers>;
    reorderMCPServers(env: AgentEnvironment, names: string[]): Promise<MCPServers>;
    reorderDisabledMCPServers(env: AgentEnvironment, names: string[]): Promise<MCPServers>;
}

export interface AssetApi {
    getEnvironments(): Promise<{ env: AgentEnvironment; label: string }[]>;
    list(env: AgentEnvironment, kind: AssetKind): Promise<AssetListReport>;
    readEntry(env: AgentEnvironment, kind: AssetKind, relPath: string): Promise<AssetOpResult>;
    revealEntry(env: AgentEnvironment, kind: AssetKind, relPath: string): Promise<AssetOpResult>;
    download(env: AgentEnvironment, kind: AssetKind, relPaths: string[]): Promise<AssetOpResult>;
    inspectUpload(env: AgentEnvironment, kind: AssetKind): Promise<AssetOpResult>;
    upload(env: AgentEnvironment, kind: AssetKind, path: string, overwrite: boolean): Promise<AssetOpResult>;
    uploadFile(env: AgentEnvironment, kind: AssetKind, path: string, overwrite: boolean): Promise<AssetOpResult>;
    deleteSelected(env: AgentEnvironment, kind: AssetKind, relPaths: string[]): Promise<AssetOpResult>;
}

export interface CleanupApi {
    getEnvironments(): Promise<{ env: AgentEnvironment; label: string }[]>;
    scan(env: AgentEnvironment): Promise<CleanupEnvReport>;
    delete(env: AgentEnvironment, selection: CleanupSelection): Promise<CleanupEnvReport>;
}

export interface SettingsApi {
    getEnvironments(): Promise<{ env: AgentEnvironment; label: string }[]>;
    read(env: AgentEnvironment): Promise<SettingsReadResult>;
    write(env: AgentEnvironment, values: SettingsValues): Promise<SettingsWriteResult>;
    writeRaw(env: AgentEnvironment, raw: string): Promise<SettingsWriteResult>;
}

export type Notify = (message: string, severity: 'success' | 'error' | 'warning') => void;
