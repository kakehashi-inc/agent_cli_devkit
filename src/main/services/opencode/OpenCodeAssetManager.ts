import { ASSET_PARENT_REL, OPENCODE_WSL_CLI_TEST } from '../../../shared/agents/opencode/constants';
import type {
    AssetEntry,
    AssetKind,
    AssetListReport,
    OpenCodeEnvironment,
} from '../../../shared/agents/opencode/types';
import type { AgentCliRunner } from '../common/cli/AgentCliRunner';
import { MarkdownAssetManager } from '../common/assets/MarkdownAssetManager';
import { WslDetector } from '../common/wsl/WslDetector';
import { openCodeCliAvailable } from './openCodeCli';
import { summarizeAgentPermissions } from './openCodeAgentPermissions';

/**
 * OpenCode のエージェント（agents/*.md）とスキル（skills/<name>/SKILL.md）を管理する。
 * エージェントの permissions は規則の並びのため、一覧用に「action:resource=effect」の 1 行へまとめる。
 */
export class OpenCodeAssetManager extends MarkdownAssetManager {
    constructor(detector: WslDetector, runner: AgentCliRunner) {
        super(detector, {
            id: 'opencode',
            wslTest: OPENCODE_WSL_CLI_TEST,
            nativeAvailable: () => openCodeCliAvailable(runner, { kind: 'native' }),
            parents: ASSET_PARENT_REL,
            agentLayout: 'file',
        });
    }

    async list(env: OpenCodeEnvironment, kind: AssetKind): Promise<AssetListReport> {
        const report = await super.list(env, kind);
        if (kind !== 'agents') return report;
        return { ...report, entries: report.entries.map(entry => this.withPermissionSummary(entry)) };
    }

    private withPermissionSummary(entry: AssetEntry): AssetEntry {
        if (entry.frontmatterRaw === null || entry.frontmatter.permissions !== '') return entry;
        const summary = summarizeAgentPermissions(entry.frontmatterRaw);
        return summary ? { ...entry, frontmatter: { ...entry.frontmatter, permissions: summary } } : entry;
    }
}
