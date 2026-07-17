import { CLEANUP_CANDIDATES, OPENCODE_WSL_CLI_TEST } from '../../../shared/agents/opencode/constants';
import { AgentCleanupManager } from '../common/cleanup/AgentCleanupManager';
import { WslDetector } from '../common/wsl/WslDetector';

export class OpenCodeCleanupManager extends AgentCleanupManager {
    constructor(detector: WslDetector) {
        super(detector, { baseRel: '', wslTest: OPENCODE_WSL_CLI_TEST, candidates: CLEANUP_CANDIDATES });
    }
}
