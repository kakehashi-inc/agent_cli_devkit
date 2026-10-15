import { OPENCODE_CLI_COMMAND } from '../../../shared/agents/opencode/constants';
import type { OpenCodeEnvironment } from '../../../shared/agents/opencode/types';
import type { AgentCliRunner } from '../common/cli/AgentCliRunner';

/** 環境に OpenCode 2 のコマンド（opencode2）があるか。PATH の解決だけで調べ、CLI 本体は実行しない。 */
export function openCodeCliAvailable(runner: AgentCliRunner, env: OpenCodeEnvironment): Promise<boolean> {
    return runner.resolveCli(env, OPENCODE_CLI_COMMAND);
}
