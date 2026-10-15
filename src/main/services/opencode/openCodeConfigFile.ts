import { OPENCODE_CONFIG_CANDIDATES_REL } from '../../../shared/agents/opencode/constants';
import type { HomeFs } from '../common/wsl/HomeFs';

/**
 * 編集対象の OpenCode グローバル設定ファイル（ホーム相対パス）を返す。
 * opencode.json / opencode.jsonc のうち存在する最初のファイルを選び、どちらも無ければ opencode.json を返す。
 */
export async function resolveOpenCodeConfigRel(fs: HomeFs): Promise<string> {
    for (const rel of OPENCODE_CONFIG_CANDIDATES_REL) {
        if (await fs.exists(rel)) return rel;
    }
    return OPENCODE_CONFIG_CANDIDATES_REL[0];
}

/**
 * 設定画面で表示・編集する OpenCode グローバル設定ファイル（ホーム相対パス）を返す。
 * opencode.json / opencode.jsonc のうち存在する最後のファイル（両方あれば、OpenCode が値を優先し設定の更新も
 * 書き込む opencode.jsonc）を選び、どちらも無ければ opencode.json を返す。
 */
export async function resolveOpenCodeSettingsRel(fs: HomeFs): Promise<string> {
    for (const rel of [...OPENCODE_CONFIG_CANDIDATES_REL].reverse()) {
        if (await fs.exists(rel)) return rel;
    }
    return OPENCODE_CONFIG_CANDIDATES_REL[0];
}
