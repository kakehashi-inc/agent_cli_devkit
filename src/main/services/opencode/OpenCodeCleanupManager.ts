import { CLEANUP_CANDIDATES, OPENCODE_WSL_CLI_TEST } from '../../../shared/agents/opencode/constants';
import { AgentCleanupManager } from '../common/cleanup/AgentCleanupManager';
import type { AgentCliRunner } from '../common/cli/AgentCliRunner';
import { WslDetector } from '../common/wsl/WslDetector';
import { openCodeCliAvailable } from './openCodeCli';
import { OpenCodeSessionCleanup } from './OpenCodeSessionCleanup';

export class OpenCodeCleanupManager extends AgentCleanupManager {
    constructor(detector: WslDetector, runner: AgentCliRunner) {
        super(detector, {
            baseRel: '',
            wslTest: OPENCODE_WSL_CLI_TEST,
            nativeAvailable: () => openCodeCliAvailable(runner, { kind: 'native' }),
            wslAvailable: env => openCodeCliAvailable(runner, env),
            candidates: CLEANUP_CANDIDATES,
            handlers: { sessions: new OpenCodeSessionCleanup(runner, detector) },
        });
    }
}
