import { GROK_CONFIG_REL, GROK_DISABLED_MCP_REL, GROK_WSL_CLI_TEST } from '../../../shared/agents/grok/constants';
import { TomlMcpManager } from '../common/toml/TomlMcpManager';
import { WslDetector } from '../common/wsl/WslDetector';

/**
 * Grok CLI（~/.grok/config.toml）の MCP サーバーを管理する。
 * 無効化したサーバーは ~/.grok/config-disabled-mcp.toml へブロックごと退避する。
 */
export class GrokMcpManager extends TomlMcpManager {
    constructor(detector: WslDetector) {
        super(detector, {
            configRel: GROK_CONFIG_REL,
            disabledRel: GROK_DISABLED_MCP_REL,
            wslTest: GROK_WSL_CLI_TEST,
        });
    }
}
