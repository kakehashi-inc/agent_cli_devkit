import { ipcMain } from 'electron';
import { CLAUDE_SETTINGS_CHANNELS } from '../../../shared/agents/claude/constants';
import { ClaudeEnvironment, SettingsValues } from '../../../shared/agents/claude/types';
import { ClaudeSettingsManager } from '../../services/claude/ClaudeSettingsManager';

/**
 * Claude Code 設定（~/.claude/settings.json）管理の IPC ハンドラを登録する。
 */
export function registerClaudeSettingsHandlers(manager: ClaudeSettingsManager): void {
    // 環境一覧（native + Claude 入り WSL distro）を取得
    ipcMain.handle(CLAUDE_SETTINGS_CHANNELS.GET_ENVIRONMENTS, (_, refresh: unknown) => {
        return manager.getEnvironments(refresh === true);
    });

    // 指定環境の settings.json を読み、登録項目の値を返す
    ipcMain.handle(CLAUDE_SETTINGS_CHANNELS.READ, (_, env: ClaudeEnvironment) => {
        return manager.read(env);
    });

    // 直接編集のために settings.json の全文を返す
    ipcMain.handle(CLAUDE_SETTINGS_CHANNELS.READ_RAW, (_, env: ClaudeEnvironment) => {
        return manager.readRaw(env);
    });

    // テーブル編集の保存（登録項目だけを差分マージ。読み込んだ時点の値と比べる）
    ipcMain.handle(
        CLAUDE_SETTINGS_CHANNELS.WRITE,
        (_, env: ClaudeEnvironment, values: SettingsValues, base: SettingsValues) => {
            return manager.write(env, values, base);
        }
    );

    // 直接編集の保存（開いた時点からの変更と構文を確かめて書き込み）
    ipcMain.handle(
        CLAUDE_SETTINGS_CHANNELS.WRITE_RAW,
        (_, env: ClaudeEnvironment, rawJson: string, baseRevision: string) => {
            return manager.writeRaw(env, rawJson, baseRevision);
        }
    );
}
