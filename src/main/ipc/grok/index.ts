import { BrowserWindow } from 'electron';
import { AgentCliRunner } from '../../services/common/cli/AgentCliRunner';
import { WslDetector } from '../../services/common/wsl/WslDetector';
import { GrokMcpManager } from '../../services/grok/GrokMcpManager';
import { GrokAssetManager } from '../../services/grok/GrokAssetManager';
import { GrokCleanupManager } from '../../services/grok/GrokCleanupManager';
import { GrokConfigManager } from '../../services/grok/GrokConfigManager';
import { GrokPluginManager } from '../../services/grok/GrokPluginManager';
import { registerGrokMcpHandlers } from './grokMcpHandlers';
import { registerGrokAssetHandlers } from './grokAssetHandlers';
import { registerGrokCleanupHandlers } from './grokCleanupHandlers';
import { registerGrokConfigHandlers } from './grokConfigHandlers';
import { registerGrokPluginHandlers } from './grokPluginHandlers';

/**
 * Grok 系の IPC ハンドラを一括登録する。
 * WSL 検出器と CLI 実行基盤は全 agent で共有するため呼び出し側から受け取る。
 */
export function registerGrokIpcHandlers(
    detector: WslDetector,
    cliRunner: AgentCliRunner,
    getMainWindow: () => BrowserWindow | null
): void {
    registerGrokMcpHandlers(new GrokMcpManager(detector));
    registerGrokAssetHandlers(new GrokAssetManager(detector), getMainWindow);
    registerGrokCleanupHandlers(new GrokCleanupManager(detector));
    registerGrokConfigHandlers(new GrokConfigManager(detector));
    registerGrokPluginHandlers(new GrokPluginManager(detector, cliRunner));
}
