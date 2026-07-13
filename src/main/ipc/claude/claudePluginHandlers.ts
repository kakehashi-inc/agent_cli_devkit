import { ipcMain } from 'electron';
import { CLAUDE_PLUGIN_CHANNELS } from '../../../shared/agents/claude/constants';
import { ClaudeEnvironment } from '../../../shared/agents/claude/types';
import { ClaudePluginManager } from '../../services/claude/ClaudePluginManager';

/**
 * Claude Code プラグイン管理の IPC ハンドラを登録する。
 */
export function registerClaudePluginHandlers(manager: ClaudePluginManager): void {
    // 環境一覧（native + Claude 入り WSL distro）を取得
    ipcMain.handle(CLAUDE_PLUGIN_CHANNELS.GET_ENVIRONMENTS, () => {
        return manager.getEnvironments();
    });

    // インストール済みプラグインとマーケットプレイスの一覧
    ipcMain.handle(CLAUDE_PLUGIN_CHANNELS.LIST, (_, env: ClaudeEnvironment) => {
        return manager.list(env);
    });

    // マーケットプレイスのカタログ（インストール可能なプラグイン一覧）
    ipcMain.handle(CLAUDE_PLUGIN_CHANNELS.CATALOG, (_, env: ClaudeEnvironment) => {
        return manager.catalog(env);
    });

    // プラグインのインストール（user スコープ）
    ipcMain.handle(CLAUDE_PLUGIN_CHANNELS.INSTALL, (_, env: ClaudeEnvironment, id: string) => {
        return manager.install(env, id);
    });

    // プラグインのアンインストール
    ipcMain.handle(CLAUDE_PLUGIN_CHANNELS.UNINSTALL, (_, env: ClaudeEnvironment, id: string) => {
        return manager.uninstall(env, id);
    });

    // プラグインの有効/無効切り替え
    ipcMain.handle(CLAUDE_PLUGIN_CHANNELS.SET_ENABLED, (_, env: ClaudeEnvironment, id: string, enabled: boolean) => {
        return manager.setEnabled(env, id, enabled);
    });

    // マーケットプレイスの追加
    ipcMain.handle(CLAUDE_PLUGIN_CHANNELS.ADD_MARKETPLACE, (_, env: ClaudeEnvironment, source: string) => {
        return manager.addMarketplace(env, source);
    });

    // マーケットプレイスの削除
    ipcMain.handle(CLAUDE_PLUGIN_CHANNELS.REMOVE_MARKETPLACE, (_, env: ClaudeEnvironment, name: string) => {
        return manager.removeMarketplace(env, name);
    });
}
