import { OPENCODE_CONFIG_CANDIDATES_REL } from '../../../shared/agents/opencode/constants';
import type { HomeFs } from '../common/wsl/HomeFs';

/** 相対パスのファイル名の部分。 */
export function fileNameOf(rel: string): string {
    return rel.slice(rel.lastIndexOf('/') + 1);
}

/** ファイル名に対応する候補の相対パス。候補に無ければ undefined。 */
export function candidateRelOf(fileName: unknown): string | undefined {
    return OPENCODE_CONFIG_CANDIDATES_REL.find(rel => fileNameOf(rel) === fileName);
}

/**
 * 新しく追加する内容の書き込み先の OpenCode グローバル設定ファイル（ホーム相対パス）を返す。
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
