// プラグイン管理画面（agent 非依存の共通 UI）が使う API アダプタ型。
// 各 agent の薄いラッパー画面が preload の <agent>.plugin をそのまま渡す。
import type { AgentEnvironment, PluginCatalogReport, PluginEnvReport, PluginOpResult } from '@shared/agents/types';

export interface PluginManagerApi {
    // refresh=true は、検出結果のキャッシュを破棄して検出し直す要求（キャッシュを持たない agent は無視する）。
    getEnvironments(refresh?: boolean): Promise<{ env: AgentEnvironment; label: string }[]>;
    list(env: AgentEnvironment): Promise<PluginEnvReport>;
    catalog(env: AgentEnvironment): Promise<PluginCatalogReport>;
    install(env: AgentEnvironment, id: string): Promise<PluginOpResult>;
    // 個別リポジトリ / ローカルパスからの直接インストール（capabilities.directInstall=true の agent のみ）
    installFromSource?(env: AgentEnvironment, source: string): Promise<PluginOpResult>;
    // confirmedNames は一緒に削除されることを利用者が確認した、同じリポジトリの他のプラグイン名（使わない agent は無視する）
    uninstall(env: AgentEnvironment, id: string, confirmedNames?: string[]): Promise<PluginOpResult>;
    setEnabled(env: AgentEnvironment, id: string, enabled: boolean): Promise<PluginOpResult>;
    addMarketplace(env: AgentEnvironment, source: string): Promise<PluginOpResult>;
    removeMarketplace(env: AgentEnvironment, name: string): Promise<PluginOpResult>;
}

export type PluginNotify = (message: string, severity: 'success' | 'error' | 'warning') => void;
