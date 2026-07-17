import { AGY_DISABLED_MCP_REL, AGY_MCP_CONFIG_REL, AGY_WSL_CLI_TEST } from '../../../shared/agents/agy/constants';
import { JsonMcpManager } from '../common/json/JsonMcpManager';
import { WslDetector } from '../common/wsl/WslDetector';

/**
 * Antigravity CLI（Gemini 共有 ~/.gemini/config/mcp_config.json）の MCP サーバーを管理する。
 * 無効化したサーバーは mcp_config_disabled.json へエントリごと退避する。
 */
export class AgyMcpManager extends JsonMcpManager {
    constructor(detector: WslDetector) {
        super(detector, {
            configRel: AGY_MCP_CONFIG_REL,
            disabledRel: AGY_DISABLED_MCP_REL,
            rootKey: 'mcpServers',
            wslTest: AGY_WSL_CLI_TEST,
        });
    }
}
