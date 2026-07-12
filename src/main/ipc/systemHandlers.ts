import { ipcMain, nativeTheme, app } from 'electron';

export function registerSystemHandlers(): void {
    // OS のテーマ設定を取得
    ipcMain.handle('system:get-theme', () => {
        return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
    });

    // OS の言語設定を取得
    ipcMain.handle('system:get-locale', () => {
        return app.getLocale();
    });

    // アプリバージョンを取得
    ipcMain.handle('system:get-version', () => {
        return app.getVersion();
    });
}
