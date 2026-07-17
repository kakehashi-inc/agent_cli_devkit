import { AGY_CLI_DIR, AGY_WSL_CLI_TEST, CLEANUP_CANDIDATES } from '../../../shared/agents/agy/constants';
import { AgentCleanupManager } from '../common/cleanup/AgentCleanupManager';
import { WslDetector } from '../common/wsl/WslDetector';

export class AgyCleanupManager extends AgentCleanupManager {
    constructor(detector: WslDetector) {
        super(detector, { baseRel: AGY_CLI_DIR, wslTest: AGY_WSL_CLI_TEST, candidates: CLEANUP_CANDIDATES });
    }
}
