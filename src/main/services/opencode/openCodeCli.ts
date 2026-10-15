import { OPENCODE_CLI_COMMAND } from '../../../shared/agents/opencode/constants';
import type { OpenCodeEnvironment } from '../../../shared/agents/opencode/types';
import type { AgentCliRunner } from '../common/cli/AgentCliRunner';

const OPENCODE_2_VERSION = /^(?:opencode\s+)?v?2\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/i;

/** Check for OpenCode 2 using the cached result of opencode --version in the selected environment. */
export async function openCodeCliAvailable(runner: AgentCliRunner, env: OpenCodeEnvironment): Promise<boolean> {
    const { available, version } = await runner.checkCli(env, OPENCODE_CLI_COMMAND);
    return available && version !== null && OPENCODE_2_VERSION.test(version);
}
