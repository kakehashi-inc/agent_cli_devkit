import { ipcMain } from 'electron';
import { CODEX_PLUGIN_CHANNELS } from '../../../shared/agents/codex/constants';
import { CodexEnvironment } from '../../../shared/agents/codex/types';
import { CodexPluginManager } from '../../services/codex/CodexPluginManager';

/**
 * Codex プラグイン管理の IPC ハンドラを登録する。
 */
export function registerCodexPluginHandlers(manager: CodexPluginManager): void {
    // 環境一覧（native + Codex 入り WSL distro）を取得
    ipcMain.handle(CODEX_PLUGIN_CHANNELS.GET_ENVIRONMENTS, () => {
        return manager.getEnvironments();
    });

    // インストール済みプラグインとマーケットプレイスの一覧
    ipcMain.handle(CODEX_PLUGIN_CHANNELS.LIST, (_, env: CodexEnvironment) => {
        return manager.list(env);
    });

    // マーケットプレイスのカタログ（インストール可能なプラグイン一覧）
    ipcMain.handle(CODEX_PLUGIN_CHANNELS.CATALOG, (_, env: CodexEnvironment) => {
        return manager.catalog(env);
    });

    // プラグインのインストール
    ipcMain.handle(CODEX_PLUGIN_CHANNELS.INSTALL, (_, env: CodexEnvironment, id: string) => {
        return manager.install(env, id);
    });

    // プラグインのアンインストール
    ipcMain.handle(CODEX_PLUGIN_CHANNELS.UNINSTALL, (_, env: CodexEnvironment, id: string) => {
        return manager.uninstall(env, id);
    });

    // プラグインの有効/無効切り替え（config.toml の直接編集）
    ipcMain.handle(CODEX_PLUGIN_CHANNELS.SET_ENABLED, (_, env: CodexEnvironment, id: string, enabled: boolean) => {
        return manager.setEnabled(env, id, enabled);
    });

    // マーケットプレイスの追加
    ipcMain.handle(CODEX_PLUGIN_CHANNELS.ADD_MARKETPLACE, (_, env: CodexEnvironment, source: string) => {
        return manager.addMarketplace(env, source);
    });

    // マーケットプレイスの削除
    ipcMain.handle(CODEX_PLUGIN_CHANNELS.REMOVE_MARKETPLACE, (_, env: CodexEnvironment, name: string) => {
        return manager.removeMarketplace(env, name);
    });
}
