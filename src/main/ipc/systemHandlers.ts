import { ipcMain, nativeTheme, app, shell } from 'electron';

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

    // URL を OS 既定の外部ブラウザで開く。http/https のみ許可する
    // （file: や実行ファイルパスなどを renderer から開かせない）。
    ipcMain.handle('system:open-external', async (_, url: string) => {
        let parsed: URL;
        try {
            parsed = new URL(url);
        } catch {
            return false;
        }
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
            return false;
        }
        await shell.openExternal(parsed.toString());
        return true;
    });
}
