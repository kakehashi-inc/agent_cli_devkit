import { BrowserWindow } from 'electron';
import { WslDetector } from '../../services/common/wsl/WslDetector';
import { ClaudeDesktopManager } from '../../services/claude/ClaudeDesktopManager';
import { ClaudeCodeManager } from '../../services/claude/ClaudeCodeManager';
import { ClaudeCleanupManager } from '../../services/claude/ClaudeCleanupManager';
import { ClaudeAssetManager } from '../../services/claude/ClaudeAssetManager';
import { ClaudeSettingsManager } from '../../services/claude/ClaudeSettingsManager';
import { registerClaudeDesktopHandlers } from './claudeDesktopHandlers';
import { registerClaudeCodeHandlers } from './claudeCodeHandlers';
import { registerClaudeCleanupHandlers } from './claudeCleanupHandlers';
import { registerClaudeAssetHandlers } from './claudeAssetHandlers';
import { registerClaudeSettingsHandlers } from './claudeSettingsHandlers';

/**
 * Claude 系の IPC ハンドラを一括登録する。
 * WSL 検出器は全 agent で共有するため呼び出し側から受け取る。
 */
export function registerClaudeIpcHandlers(detector: WslDetector, getMainWindow: () => BrowserWindow | null): void {
    registerClaudeDesktopHandlers(new ClaudeDesktopManager());
    registerClaudeCodeHandlers(new ClaudeCodeManager(detector));
    registerClaudeCleanupHandlers(new ClaudeCleanupManager(detector));
    registerClaudeAssetHandlers(new ClaudeAssetManager(detector), getMainWindow);
    registerClaudeSettingsHandlers(new ClaudeSettingsManager(detector));
}
