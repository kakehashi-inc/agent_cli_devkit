// プラグイン管理画面（agent 非依存の共通 UI）が使う API アダプタ型。
// 各 agent の薄いラッパー画面が preload の <agent>.plugin をそのまま渡す。
import type {
    AgentEnvironment,
    PluginCatalogReport,
    PluginEnvReport,
    PluginOpResult,
} from '@shared/agents/types';

export interface PluginManagerApi {
    getEnvironments(): Promise<{ env: AgentEnvironment; label: string }[]>;
    list(env: AgentEnvironment): Promise<PluginEnvReport>;
    catalog(env: AgentEnvironment): Promise<PluginCatalogReport>;
    install(env: AgentEnvironment, id: string): Promise<PluginOpResult>;
    // 個別リポジトリ / ローカルパスからの直接インストール（capabilities.directInstall=true の agent のみ）
    installFromSource?(env: AgentEnvironment, source: string): Promise<PluginOpResult>;
    uninstall(env: AgentEnvironment, id: string): Promise<PluginOpResult>;
    setEnabled(env: AgentEnvironment, id: string, enabled: boolean): Promise<PluginOpResult>;
    addMarketplace(env: AgentEnvironment, source: string): Promise<PluginOpResult>;
    removeMarketplace(env: AgentEnvironment, name: string): Promise<PluginOpResult>;
}

export type PluginNotify = (message: string, severity: 'success' | 'error' | 'warning') => void;
