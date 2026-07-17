import {
    OPENCODE_CONFIG_REL,
    OPENCODE_DISABLED_MCP_REL,
    OPENCODE_WSL_CLI_TEST,
} from '../../../shared/agents/opencode/constants';
import { JsonMcpManager } from '../common/json/JsonMcpManager';
import { WslDetector } from '../common/wsl/WslDetector';

/**
 * OpenCode（~/.config/opencode/opencode.json の mcp キー）の MCP サーバーを管理する。
 * 無効化したサーバーは opencode-disabled-mcp.json へエントリごと退避する。
 */
export class OpenCodeMcpManager extends JsonMcpManager {
    constructor(detector: WslDetector) {
        super(detector, {
            configRel: OPENCODE_CONFIG_REL,
            disabledRel: OPENCODE_DISABLED_MCP_REL,
            rootKey: 'mcp',
            wslTest: OPENCODE_WSL_CLI_TEST,
        });
    }
}
