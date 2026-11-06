import { CODEX_CONFIG_REL, CODEX_DISABLED_MCP_REL, CODEX_WSL_CLI_TEST } from '../../../shared/agents/codex/constants';
import { TomlMcpManager } from '../common/toml/TomlMcpManager';
import { WslDetector } from '../common/wsl/WslDetector';

/**
 * Codex CLI（~/.codex/config.toml）の MCP サーバーを管理する。
 * 無効化したサーバーは ~/.codex/config-disabled-mcp.toml へブロックごと退避する。
 */
export class CodexMcpManager extends TomlMcpManager {
    constructor(detector: WslDetector) {
        super(detector, {
            configRel: CODEX_CONFIG_REL,
            disabledRel: CODEX_DISABLED_MCP_REL,
            wslTest: CODEX_WSL_CLI_TEST,
        });
    }
}
