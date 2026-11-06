import { CLAUDE_CODE_CONFIG_FILENAME, CLAUDE_CODE_LEGACY_CONFIG_REL } from '../../../shared/agents/claude/constants';
import { fileError } from '../common/fs/configFile';
import type { HomeFs } from '../common/wsl/HomeFs';

/**
 * Claude Code の全体設定ファイル（ホーム相対パス）を CLI と同じ規則で選ぶ。
 * ~/.claude/.config.json が通常のファイルで、サイズが 0 より大きいか、書き込み可能で ~/.claude.json が無ければ
 * ~/.claude/.config.json を、それ以外は ~/.claude.json を返す。判定に必要な情報を取得できなければ read-failed を投げる。
 */
export async function resolveClaudeGlobalConfigRel(fs: HomeFs): Promise<string> {
    const legacy = await fs.statFile(CLAUDE_CODE_LEGACY_CONFIG_REL);
    if (legacy.kind === 'error') throw fileError('read-failed', CLAUDE_CODE_LEGACY_CONFIG_REL, legacy.code);
    if (legacy.kind !== 'file') return CLAUDE_CODE_CONFIG_FILENAME;
    if (legacy.size > 0) return CLAUDE_CODE_LEGACY_CONFIG_REL;
    if (!legacy.writable) return CLAUDE_CODE_CONFIG_FILENAME;
    return (await fs.exists(CLAUDE_CODE_CONFIG_FILENAME)) ? CLAUDE_CODE_CONFIG_FILENAME : CLAUDE_CODE_LEGACY_CONFIG_REL;
}
