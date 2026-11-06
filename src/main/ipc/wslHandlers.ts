import { ipcMain } from 'electron';
import { AGY_WSL_CLI_TEST } from '../../shared/agents/agy/constants';
import { CLAUDE_WSL_CLI_TEST } from '../../shared/agents/claude/constants';
import { CODEX_WSL_CLI_TEST } from '../../shared/agents/codex/constants';
import { GROK_WSL_CLI_TEST } from '../../shared/agents/grok/constants';
import { OPENCODE_WSL_CLI_TEST } from '../../shared/agents/opencode/constants';
import { WSL_CHANNELS } from '../../shared/constants';
import type { WslDetector } from '../services/common/wsl/WslDetector';

const AGENT_TESTS = [
    CLAUDE_WSL_CLI_TEST,
    CODEX_WSL_CLI_TEST,
    AGY_WSL_CLI_TEST,
    GROK_WSL_CLI_TEST,
    OPENCODE_WSL_CLI_TEST,
];

/** WSL の IPC ハンドラを登録する。 */
export function registerWslHandlers(detector: WslDetector): void {
    ipcMain.handle(WSL_CHANNELS.GET_MISSING_COMMANDS, () => detector.getMissingCommands(AGENT_TESTS));
}
