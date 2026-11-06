import {
    OPENCODE_AGENTS_REL,
    OPENCODE_LEGACY_AGENT_REL,
    OPENCODE_LEGACY_MODE_REL,
    OPENCODE_LEGACY_MODES_REL,
    OPENCODE_SKILLS_REL,
    OPENCODE_WSL_CLI_TEST,
} from '../../../shared/agents/opencode/constants';
import type {
    AssetEntry,
    AssetKind,
    AssetListReport,
    OpenCodeEnvironment,
} from '../../../shared/agents/opencode/types';
import type { AgentCliRunner } from '../common/cli/AgentCliRunner';
import { RECURSIVE_ASSET_MAX_DEPTH } from '../common/assets/assetScan';
import { MarkdownAssetManager } from '../common/assets/MarkdownAssetManager';
import { WslDetector } from '../common/wsl/WslDetector';
import { openCodeCliAvailable } from './openCodeCli';
import { summarizeAgentPermissions } from './openCodeAgentPermissions';

// OpenCode がスキルを探すフォルダーの階層の上限（CLI の MAX_DEPTH。ルートを 0 として 6 階層目のフォルダーまで読む）。
const SKILL_SCAN_MAX_LEVELS = 6;

// mode/ と modes/ のエージェントの mode は、CLI が primary に固定する。
const PRIMARY_MODE = { mode: 'primary' };

// 同じ名前の定義の読み込み順（agent、agents、mode、modes）。後のものがフィールド単位で上書きする。
const AGENT_RANK = { agent: 1, agents: 2, mode: 3, modes: 4 };

/**
 * OpenCode のエージェントとスキルを管理する。
 * - エージェントは agents/（書き込み先、再帰）に加え、CLI が読む agent/（再帰）、mode/ と modes/（直下のみ）を由来付きで読む。
 * - スキルは skills/ 配下の SKILL.md を持つフォルダー（ネストを含む）と skills/<name>.md を読む。新規の配置は 1 階層。
 *   SKILL.md のあるフォルダーの下は読まない。'.' で始まるフォルダーは読み込まれない行として出す。
 * エージェントの permissions は規則の並びのため、一覧用に「action:resource=effect」の 1 行へまとめる。
 */
export class OpenCodeAssetManager extends MarkdownAssetManager {
    constructor(detector: WslDetector, runner: AgentCliRunner) {
        super(detector, {
            id: 'opencode',
            wslTest: OPENCODE_WSL_CLI_TEST,
            nativeAvailable: () => openCodeCliAvailable(runner, { kind: 'native' }),
            wslAvailable: env => openCodeCliAvailable(runner, env),
            roots: {
                agents: [
                    {
                        rel: OPENCODE_AGENTS_REL,
                        origin: 'agents',
                        hideOrigin: true,
                        rank: AGENT_RANK.agents,
                        scan: { layout: 'file', maxDepth: RECURSIVE_ASSET_MAX_DEPTH },
                    },
                    {
                        rel: OPENCODE_LEGACY_AGENT_REL,
                        origin: 'agent',
                        rank: AGENT_RANK.agent,
                        scan: { layout: 'file', maxDepth: RECURSIVE_ASSET_MAX_DEPTH },
                    },
                    {
                        rel: OPENCODE_LEGACY_MODE_REL,
                        origin: 'mode',
                        rank: AGENT_RANK.mode,
                        scan: { layout: 'file', maxDepth: 0, fixedFields: PRIMARY_MODE },
                    },
                    {
                        rel: OPENCODE_LEGACY_MODES_REL,
                        origin: 'modes',
                        rank: AGENT_RANK.modes,
                        scan: { layout: 'file', maxDepth: 0, fixedFields: PRIMARY_MODE },
                    },
                ],
                skills: [
                    {
                        rel: OPENCODE_SKILLS_REL,
                        scan: {
                            layout: 'directory',
                            entryFile: 'SKILL.md',
                            maxLevels: SKILL_SCAN_MAX_LEVELS,
                            rootFiles: true,
                            hiddenNotLoaded: true,
                        },
                    },
                ],
            },
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
