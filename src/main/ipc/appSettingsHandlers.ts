import { ipcMain } from 'electron';
import { promises as fs } from 'fs';
import path from 'path';
import { APP_SETTINGS_CHANNELS, APP_SETTINGS_FILENAME, getAppRootDir } from '../../shared/constants';
import type { AppSettingsData } from '../../shared/types';

function settingsPath(): string {
    return path.join(getAppRootDir(), APP_SETTINGS_FILENAME);
}

async function readSettings(): Promise<AppSettingsData> {
    try {
        const raw = await fs.readFile(settingsPath(), 'utf-8');
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed as AppSettingsData;
        }
        return {};
    } catch {
        // ファイル未作成・破損時は未保存として扱う（呼び出し側が OS 設定へフォールバックする）
        return {};
    }
}

/**
 * アプリ設定（テーマ / 言語 / ダッシュボード展開状態）の読み書き。
 * 保存先は仕様どおり ~/.agent_cli_devkit/settings.json とする。
 */
export function registerAppSettingsHandlers(): void {
    ipcMain.handle(APP_SETTINGS_CHANNELS.READ, () => readSettings());

    // 部分更新: 既存内容へマージして書き戻す
    ipcMain.handle(APP_SETTINGS_CHANNELS.WRITE, async (_, patch: AppSettingsData) => {
        const next = { ...(await readSettings()), ...patch };
        await fs.mkdir(getAppRootDir(), { recursive: true });
        await fs.writeFile(settingsPath(), `${JSON.stringify(next, null, 4)}\n`, 'utf-8');
    });
}
