import { BrowserWindow } from 'electron';
import { WslDetector } from '../../services/common/wsl/WslDetector';
import { CodexMcpManager } from '../../services/codex/CodexMcpManager';
import { CodexAssetManager } from '../../services/codex/CodexAssetManager';
import { CodexCleanupManager } from '../../services/codex/CodexCleanupManager';
import { CodexConfigManager } from '../../services/codex/CodexConfigManager';
import { registerCodexMcpHandlers } from './codexMcpHandlers';
import { registerCodexAssetHandlers } from './codexAssetHandlers';
import { registerCodexCleanupHandlers } from './codexCleanupHandlers';
import { registerCodexConfigHandlers } from './codexConfigHandlers';

/**
 * Codex 系の IPC ハンドラを一括登録する。
 * WSL 検出器は全 agent で共有するため呼び出し側から受け取る。
 */
export function registerCodexIpcHandlers(detector: WslDetector, getMainWindow: () => BrowserWindow | null): void {
    registerCodexMcpHandlers(new CodexMcpManager(detector));
    registerCodexAssetHandlers(new CodexAssetManager(detector), getMainWindow);
    registerCodexCleanupHandlers(new CodexCleanupManager(detector));
    registerCodexConfigHandlers(new CodexConfigManager(detector));
}
