import type {
    AgyEnvironment,
    AgyMcpEnvInfo,
    AssetKind,
    AssetListReport,
    AssetOpResult,
    CleanupEnvReport,
    CleanupSelection,
    MCPServers,
    PluginCatalogReport,
    PluginEnvReport,
    PluginOpResult,
    SettingsReadResult,
    SettingsValues,
    SettingsWriteResult,
} from './types';

export interface AgyIpcApi {
    mcp: {
        getEnvironments(): Promise<AgyMcpEnvInfo[]>;
        getMCPServers(env: AgyEnvironment): Promise<MCPServers>;
        enableMCPServer(env: AgyEnvironment, serverName: string): Promise<MCPServers>;
        disableMCPServer(env: AgyEnvironment, serverName: string): Promise<MCPServers>;
        reorderMCPServers(env: AgyEnvironment, serverNames: string[]): Promise<MCPServers>;
        reorderDisabledMCPServers(env: AgyEnvironment, serverNames: string[]): Promise<MCPServers>;
    };
    asset: {
        getEnvironments(): Promise<{ env: AgyEnvironment; label: string }[]>;
        list(env: AgyEnvironment, kind: AssetKind): Promise<AssetListReport>;
        readEntry(env: AgyEnvironment, kind: AssetKind, relPath: string): Promise<AssetOpResult>;
        revealEntry(env: AgyEnvironment, kind: AssetKind, relPath: string): Promise<AssetOpResult>;
        download(env: AgyEnvironment, kind: AssetKind, relPaths: string[]): Promise<AssetOpResult>;
        inspectUpload(env: AgyEnvironment, kind: AssetKind): Promise<AssetOpResult>;
        upload(env: AgyEnvironment, kind: AssetKind, zipPath: string, overwrite: boolean): Promise<AssetOpResult>;
        uploadFile(env: AgyEnvironment, kind: AssetKind, filePath: string, overwrite: boolean): Promise<AssetOpResult>;
        deleteSelected(env: AgyEnvironment, kind: AssetKind, relPaths: string[]): Promise<AssetOpResult>;
    };
    cleanup: {
        getEnvironments(): Promise<{ env: AgyEnvironment; label: string }[]>;
        scan(env: AgyEnvironment): Promise<CleanupEnvReport>;
        delete(env: AgyEnvironment, selection: CleanupSelection): Promise<CleanupEnvReport>;
    };
    settings: {
        getEnvironments(): Promise<{ env: AgyEnvironment; label: string }[]>;
        read(env: AgyEnvironment): Promise<SettingsReadResult>;
        write(env: AgyEnvironment, values: SettingsValues): Promise<SettingsWriteResult>;
        writeRaw(env: AgyEnvironment, raw: string): Promise<SettingsWriteResult>;
    };
    plugin: {
        getEnvironments(): Promise<{ env: AgyEnvironment; label: string }[]>;
        list(env: AgyEnvironment): Promise<PluginEnvReport>;
        catalog(env: AgyEnvironment): Promise<PluginCatalogReport>;
        install(env: AgyEnvironment, id: string): Promise<PluginOpResult>;
        installFromSource(env: AgyEnvironment, source: string): Promise<PluginOpResult>;
        uninstall(env: AgyEnvironment, id: string): Promise<PluginOpResult>;
        setEnabled(env: AgyEnvironment, id: string, enabled: boolean): Promise<PluginOpResult>;
        addMarketplace(env: AgyEnvironment, source: string): Promise<PluginOpResult>;
        removeMarketplace(env: AgyEnvironment, name: string): Promise<PluginOpResult>;
    };
}
