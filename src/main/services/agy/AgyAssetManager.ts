import {
    AGY_AGENTS_REL,
    AGY_CONFIG_SKILLS_REL,
    AGY_SHARED_SKILLS_REL,
    AGY_SKILLS_REL,
    AGY_WSL_CLI_TEST,
} from '../../../shared/agents/agy/constants';
import { MarkdownAssetManager, type DirectoryLayout } from '../common/assets/MarkdownAssetManager';
import { WslDetector } from '../common/wsl/WslDetector';

// スキルはフォルダーの直下の SKILL.md だけを読む（CLI は各フォルダーを 1 階層だけ探す）。
const SKILL_LAYOUT: DirectoryLayout = { layout: 'directory', entryFile: 'SKILL.md', maxLevels: 1 };

// config/skills は App と CLI で共有する読み取り元で、他の 2 つが優先される。他の 2 つの間の優先関係は公式に示されていない。
const SKILL_RANK_CLI = 2;
const SKILL_RANK_CONFIG = 1;

/**
 * Agy CLI のエージェントとスキルを管理する。
 * - エージェントは agents/<name>.md と agents/<name>/agent.md の両方を読む。新規の配置は <name>/agent.md。
 * - スキルは CLI が読む 3 つのルートを読み、由来と同じ名前の優先関係を行に示す。新規の配置は antigravity-cli/skills。
 */
export class AgyAssetManager extends MarkdownAssetManager {
    constructor(detector: WslDetector) {
        super(detector, {
            id: 'agy',
            wslTest: AGY_WSL_CLI_TEST,
            roots: {
                agents: [
                    {
                        rel: AGY_AGENTS_REL,
                        scan: { layout: 'directory', entryFile: 'agent.md', maxLevels: 1, rootFiles: true },
                    },
                ],
                skills: [
                    { rel: AGY_SKILLS_REL, origin: 'cli', rank: SKILL_RANK_CLI, scan: SKILL_LAYOUT },
                    { rel: AGY_SHARED_SKILLS_REL, origin: 'shared', rank: SKILL_RANK_CLI, scan: SKILL_LAYOUT },
                    { rel: AGY_CONFIG_SKILLS_REL, origin: 'config', rank: SKILL_RANK_CONFIG, scan: SKILL_LAYOUT },
                ],
            },
        });
    }
}
