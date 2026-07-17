import type {
    AssetKind,
    AssetListReport,
    AssetOpResult,
    CleanupEnvReport,
    CleanupSelection,
    MCPServers,
    OpenCodeEnvironment,
    OpenCodeMcpEnvInfo,
    PluginCatalogReport,
    PluginEnvReport,
    PluginOpResult,
    SettingsReadResult,
    SettingsValues,
    SettingsWriteResult,
} from './types';

export interface OpenCodeIpcApi {
    mcp: {
        getEnvironments(): Promise<OpenCodeMcpEnvInfo[]>;
        getMCPServers(env: OpenCodeEnvironment): Promise<MCPServers>;
        enableMCPServer(env: OpenCodeEnvironment, serverName: string): Promise<MCPServers>;
        disableMCPServer(env: OpenCodeEnvironment, serverName: string): Promise<MCPServers>;
        reorderMCPServers(env: OpenCodeEnvironment, serverNames: string[]): Promise<MCPServers>;
        reorderDisabledMCPServers(env: OpenCodeEnvironment, serverNames: string[]): Promise<MCPServers>;
    };
    asset: {
        getEnvironments(): Promise<{ env: OpenCodeEnvironment; label: string }[]>;
        list(env: OpenCodeEnvironment, kind: AssetKind): Promise<AssetListReport>;
        readEntry(env: OpenCodeEnvironment, kind: AssetKind, relPath: string): Promise<AssetOpResult>;
        revealEntry(env: OpenCodeEnvironment, kind: AssetKind, relPath: string): Promise<AssetOpResult>;
        download(env: OpenCodeEnvironment, kind: AssetKind, relPaths: string[]): Promise<AssetOpResult>;
        inspectUpload(env: OpenCodeEnvironment, kind: AssetKind): Promise<AssetOpResult>;
        upload(env: OpenCodeEnvironment, kind: AssetKind, zipPath: string, overwrite: boolean): Promise<AssetOpResult>;
        uploadFile(
            env: OpenCodeEnvironment,
            kind: AssetKind,
            filePath: string,
            overwrite: boolean
        ): Promise<AssetOpResult>;
        deleteSelected(env: OpenCodeEnvironment, kind: AssetKind, relPaths: string[]): Promise<AssetOpResult>;
    };
    cleanup: {
        getEnvironments(): Promise<{ env: OpenCodeEnvironment; label: string }[]>;
        scan(env: OpenCodeEnvironment): Promise<CleanupEnvReport>;
        delete(env: OpenCodeEnvironment, selection: CleanupSelection): Promise<CleanupEnvReport>;
    };
    settings: {
        getEnvironments(): Promise<{ env: OpenCodeEnvironment; label: string }[]>;
        read(env: OpenCodeEnvironment): Promise<SettingsReadResult>;
        write(env: OpenCodeEnvironment, values: SettingsValues): Promise<SettingsWriteResult>;
        writeRaw(env: OpenCodeEnvironment, raw: string): Promise<SettingsWriteResult>;
    };
    plugin: {
        getEnvironments(): Promise<{ env: OpenCodeEnvironment; label: string }[]>;
        list(env: OpenCodeEnvironment): Promise<PluginEnvReport>;
        catalog(env: OpenCodeEnvironment): Promise<PluginCatalogReport>;
        install(env: OpenCodeEnvironment, id: string): Promise<PluginOpResult>;
        installFromSource(env: OpenCodeEnvironment, source: string): Promise<PluginOpResult>;
        uninstall(env: OpenCodeEnvironment, id: string): Promise<PluginOpResult>;
        setEnabled(env: OpenCodeEnvironment, id: string, enabled: boolean): Promise<PluginOpResult>;
        addMarketplace(env: OpenCodeEnvironment, source: string): Promise<PluginOpResult>;
        removeMarketplace(env: OpenCodeEnvironment, name: string): Promise<PluginOpResult>;
    };
}
