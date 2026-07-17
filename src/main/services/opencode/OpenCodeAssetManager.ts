import { ASSET_PARENT_REL, OPENCODE_WSL_CLI_TEST } from '../../../shared/agents/opencode/constants';
import { MarkdownAssetManager } from '../common/assets/MarkdownAssetManager';
import { WslDetector } from '../common/wsl/WslDetector';

export class OpenCodeAssetManager extends MarkdownAssetManager {
    constructor(detector: WslDetector) {
        super(detector, {
            id: 'opencode',
            wslTest: OPENCODE_WSL_CLI_TEST,
            parents: ASSET_PARENT_REL,
            agentLayout: 'file',
        });
    }
}
