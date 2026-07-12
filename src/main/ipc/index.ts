import { BrowserWindow } from 'electron';
import { WslDetector } from '../services/common/wsl/WslDetector';
import { registerClaudeIpcHandlers } from './claude/index';
import { registerCodexIpcHandlers } from './codex/index';
import { registerSystemHandlers } from './systemHandlers';
import { registerWindowHandlers } from './windowHandlers';
import { registerUpdaterIpcHandlers } from './updater';

/**
 * アプリケーション固有の IPC ハンドラを登録する。
 * WSL 検出器を 1 つ生成し、各 agent のサービスへ注入して共有する。
 * agent を追加する場合は ipc/<agent>/index.ts を作成し、ここに 1 行追加する。
 */
export function registerIpcHandlers(getMainWindow: () => BrowserWindow | null) {
    const detector = new WslDetector();

    // ===== agent 別 IPC ハンドラ =====
    registerClaudeIpcHandlers(detector, getMainWindow);
    registerCodexIpcHandlers(detector, getMainWindow);

    // ===== アプリ共通 IPC ハンドラ =====
    registerSystemHandlers();
    registerWindowHandlers();

    // 自動アップデート関連の IPC ハンドラ
    registerUpdaterIpcHandlers();
}
