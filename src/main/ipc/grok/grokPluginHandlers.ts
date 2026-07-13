import { ipcMain } from 'electron';
import { GROK_PLUGIN_CHANNELS } from '../../../shared/agents/grok/constants';
import { GrokEnvironment } from '../../../shared/agents/grok/types';
import { GrokPluginManager } from '../../services/grok/GrokPluginManager';

/**
 * Grok プラグイン管理の IPC ハンドラを登録する。
 */
export function registerGrokPluginHandlers(manager: GrokPluginManager): void {
    // 環境一覧（native + Grok 入り WSL distro）を取得
    ipcMain.handle(GROK_PLUGIN_CHANNELS.GET_ENVIRONMENTS, () => {
        return manager.getEnvironments();
    });

    // インストール済みプラグインとマーケットプレイスの一覧
    ipcMain.handle(GROK_PLUGIN_CHANNELS.LIST, (_, env: GrokEnvironment) => {
        return manager.list(env);
    });

    // マーケットプレイスのカタログ（インストール可能なプラグイン一覧）
    ipcMain.handle(GROK_PLUGIN_CHANNELS.CATALOG, (_, env: GrokEnvironment) => {
        return manager.catalog(env);
    });

    // マーケットプレイスからのインストール（id = "<plugin>@<qualifier>"）
    ipcMain.handle(GROK_PLUGIN_CHANNELS.INSTALL, (_, env: GrokEnvironment, id: string) => {
        return manager.install(env, id);
    });

    // 個別リポジトリ / ローカルパスからの直接インストール
    ipcMain.handle(GROK_PLUGIN_CHANNELS.INSTALL_FROM_SOURCE, (_, env: GrokEnvironment, source: string) => {
        return manager.installFromSource(env, source);
    });

    // プラグインのアンインストール
    ipcMain.handle(GROK_PLUGIN_CHANNELS.UNINSTALL, (_, env: GrokEnvironment, id: string) => {
        return manager.uninstall(env, id);
    });

    // プラグインの有効/無効切り替え
    ipcMain.handle(GROK_PLUGIN_CHANNELS.SET_ENABLED, (_, env: GrokEnvironment, id: string, enabled: boolean) => {
        return manager.setEnabled(env, id, enabled);
    });

    // マーケットプレイスソースの追加
    ipcMain.handle(GROK_PLUGIN_CHANNELS.ADD_MARKETPLACE, (_, env: GrokEnvironment, source: string) => {
        return manager.addMarketplace(env, source);
    });

    // マーケットプレイスソースの削除
    ipcMain.handle(GROK_PLUGIN_CHANNELS.REMOVE_MARKETPLACE, (_, env: GrokEnvironment, name: string) => {
        return manager.removeMarketplace(env, name);
    });
}
