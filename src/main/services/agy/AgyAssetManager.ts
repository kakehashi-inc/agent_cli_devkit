import { ASSET_PARENT_REL, AGY_WSL_CLI_TEST } from '../../../shared/agents/agy/constants';
import { MarkdownAssetManager } from '../common/assets/MarkdownAssetManager';
import { WslDetector } from '../common/wsl/WslDetector';

export class AgyAssetManager extends MarkdownAssetManager {
    constructor(detector: WslDetector) {
        super(detector, {
            id: 'agy',
            wslTest: AGY_WSL_CLI_TEST,
            parents: ASSET_PARENT_REL,
            agentLayout: 'directory',
            agentEntryFile: 'agent.md',
        });
    }
}
