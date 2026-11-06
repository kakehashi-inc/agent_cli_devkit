import { BrowserWindow } from 'electron';
import { AgentCliRunner } from '../../services/common/cli/AgentCliRunner';
import { WslDetector } from '../../services/common/wsl/WslDetector';
import { CodexMcpManager } from '../../services/codex/CodexMcpManager';
import { CodexAssetManager } from '../../services/codex/CodexAssetManager';
import { CodexCleanupManager } from '../../services/codex/CodexCleanupManager';
import { CodexConfigManager } from '../../services/codex/CodexConfigManager';
import { CodexPluginManager } from '../../services/codex/CodexPluginManager';
import { registerCodexMcpHandlers } from './codexMcpHandlers';
import { registerCodexAssetHandlers } from './codexAssetHandlers';
import { registerCodexCleanupHandlers } from './codexCleanupHandlers';
import { registerCodexConfigHandlers } from './codexConfigHandlers';
import { registerCodexPluginHandlers } from './codexPluginHandlers';
import { profileChannels } from '../../../shared/agents/profile/channels';
import { CODEX_PROFILE_SPEC } from '../../../shared/agents/codex/profileTabs';
import { ProfileManager } from '../../services/common/profile/ProfileManager';
import { registerProfileHandlers } from '../common/profileHandlers';

/**
 * Codex 系の IPC ハンドラを一括登録する。
 * WSL 検出器と CLI 実行基盤は全 agent で共有するため呼び出し側から受け取る。
 */
export function registerCodexIpcHandlers(
    detector: WslDetector,
    cliRunner: AgentCliRunner,
    getMainWindow: () => BrowserWindow | null
): void {
    registerCodexMcpHandlers(new CodexMcpManager(detector));
    registerCodexAssetHandlers(new CodexAssetManager(detector), getMainWindow);
    registerCodexCleanupHandlers(new CodexCleanupManager(detector));
    registerCodexConfigHandlers(new CodexConfigManager(detector));
    registerCodexPluginHandlers(new CodexPluginManager(detector, cliRunner));
    registerProfileHandlers(profileChannels('codex'), new ProfileManager(detector, CODEX_PROFILE_SPEC), getMainWindow);
}
