import os from 'os';
import path from 'path';

// アプリケーションのディレクトリ名
export const APP_DIR_NAME = '.agent_cli_devkit';

// ホームディレクトリを取得
export function getHomeDir(): string {
    return os.homedir();
}

// アプリルートディレクトリを取得
export function getAppRootDir(): string {
    return path.join(getHomeDir(), APP_DIR_NAME);
}

// ============================================================
// アプリ共通 IPC チャンネル（agent 非依存）
// agent 固有のチャンネルは shared/agents/<agent>/constants.ts に定義する。
// ============================================================

// ウィンドウ制御用
export const WINDOW_CHANNELS = {
    MINIMIZE: 'window:minimize',
    MAXIMIZE: 'window:maximize',
    CLOSE: 'window:close',
    IS_MAXIMIZED: 'window:is-maximized',
} as const;

// アプリ設定（~/.agent_cli_devkit/settings.json）用
export const APP_SETTINGS_FILENAME = 'settings.json';
export const APP_SETTINGS_CHANNELS = {
    READ: 'app-settings:read',
    WRITE: 'app-settings:write',
} as const;

// システム情報用
export const SYSTEM_CHANNELS = {
    GET_THEME: 'system:get-theme',
    GET_LOCALE: 'system:get-locale',
    GET_VERSION: 'system:get-version',
    OPEN_EXTERNAL: 'system:open-external',
} as const;

// 自動アップデート用
export const UPDATER_CHANNELS = {
    CHECK: 'updater:check',
    DOWNLOAD: 'updater:download',
    QUIT_AND_INSTALL: 'updater:quit-and-install',
    GET_STATE: 'updater:get-state',
    STATE_CHANGED: 'updater:state-changed',
} as const;
