import { BrowserWindow } from 'electron';
import { AgentCliRunner } from '../services/common/cli/AgentCliRunner';
import { WslDetector } from '../services/common/wsl/WslDetector';
import { registerAgyIpcHandlers } from './agy/index';
import { registerClaudeIpcHandlers } from './claude/index';
import { registerCodexIpcHandlers } from './codex/index';
import { registerGrokIpcHandlers } from './grok/index';
import { registerOpenCodeIpcHandlers } from './opencode/index';
import { registerSystemHandlers } from './systemHandlers';
import { registerWindowHandlers } from './windowHandlers';
import { registerUpdaterIpcHandlers } from './updater';

/**
 * アプリケーション固有の IPC ハンドラを登録する。
 * WSL 検出器と CLI 実行基盤を 1 つずつ生成し、各 agent のサービスへ注入して共有する。
 * agent を追加する場合は ipc/<agent>/index.ts を作成し、ここに 1 行追加する。
 */
export function registerIpcHandlers(getMainWindow: () => BrowserWindow | null) {
    const detector = new WslDetector();
    const cliRunner = new AgentCliRunner();

    // ===== agent 別 IPC ハンドラ =====
    registerClaudeIpcHandlers(detector, cliRunner, getMainWindow);
    registerCodexIpcHandlers(detector, cliRunner, getMainWindow);
    registerAgyIpcHandlers(detector, cliRunner, getMainWindow);
    registerGrokIpcHandlers(detector, cliRunner, getMainWindow);
    registerOpenCodeIpcHandlers(detector, cliRunner, getMainWindow);

    // ===== アプリ共通 IPC ハンドラ =====
    registerSystemHandlers();
    registerWindowHandlers();

    // 自動アップデート関連の IPC ハンドラ
    registerUpdaterIpcHandlers();
}
