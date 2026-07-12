import path from 'path';
import { app, BrowserWindow } from 'electron';
import { setupConsoleBridge, setMainWindow } from './utils/console-bridge';
import { registerIpcHandlers } from './ipc/index';
import { initializeUpdater, scheduleStartupCheck, isInstallingUpdate } from './services/updater';

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
const gotTheLock = app.requestSingleInstanceLock();

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 400,
        frame: false,
        webPreferences: {
            preload: path.join(__dirname, '../preload/index.js'),
            contextIsolation: true,
            nodeIntegration: false,
            // preload を agent 別ファイル（preload/agents/*.js）に分割して require するため
            // sandbox を無効化する。contextIsolation は有効のまま維持する。
            sandbox: false,
        },
        show: false,
    });

    // コンソールブリッジ用にメインウィンドウを設定
    setMainWindow(mainWindow);

    if (isDev) {
        mainWindow.loadURL('http://localhost:3001');
        // 開発時はDevToolsを自動で開く
        try {
            mainWindow.webContents.openDevTools({ mode: 'detach' });
        } catch {
            // DevToolsのオープンに失敗した場合は無視
        }
        // メニューなしでDevToolsを切り替えるためのキーボードショートカット
        mainWindow.webContents.on('before-input-event', (event, input) => {
            const isToggleCombo =
                (input.key?.toLowerCase?.() === 'i' && (input.control || input.meta) && input.shift) ||
                input.key === 'F12';
            if (isToggleCombo) {
                event.preventDefault();
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.toggleDevTools();
                }
            }
        });
    } else {
        mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    mainWindow.on('ready-to-show', () => mainWindow?.show());
    mainWindow.on('closed', () => {
        setMainWindow(null);
        mainWindow = null;
    });

    // ウィンドウの読み込み完了 + 数秒後にバックグラウンドでアップデートを 1 回チェック
    // (起動が遅くてもウィンドウが表示されてから走るよう did-finish-load にフックする)
    scheduleStartupCheck(mainWindow);
}

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        } else {
            createWindow();
        }
    });

    app.whenReady().then(async () => {
        // コンソールブリッジをセットアップしてメインプロセスのログをDevToolsに送信
        setupConsoleBridge();

        // electron-updater のイベントを登録 (本番ビルド時のみ動作)
        initializeUpdater();

        // アプリケーション固有のIPCハンドラを登録（system:* / window:* / updater:* / 各 agent）
        registerIpcHandlers(() => mainWindow);

        createWindow();
    });

    app.on('window-all-closed', () => {
        // 更新インストール中は終了・再起動を更新器に委ねるため、ここでの app.quit() を抑止する。
        // (先に app.quit() を走らせると macOS で更新器のステージング/再起動と競合し更新に失敗し得る)
        if (isInstallingUpdate()) return;
        app.quit();
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
}
