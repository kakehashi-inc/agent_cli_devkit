import type { AssetKind } from '../../../../shared/agents/types';

// 既定ファイル名に含めるエントリ名の最大長（長すぎる名前でパスが伸びるのを防ぐ）。
const MAX_ENTRY_NAME_LENGTH = 60;

// Windows でファイル名に使えない文字。含まれていたら '_' へ置き換える。
const INVALID_FILENAME_CHARS = /[<>:"/\\|?*]/g;

/**
 * ダウンロード ZIP の既定ファイル名を組み立てる。
 *
 * 形式は `<kind>_<agent>[-<distro>][_<エントリ名>].zip`。
 * 種別（skills / agents）を先頭に置き、ファイル一覧で種別ごとにまとまるようにする。
 * エントリ名は選択が 1 件のときだけ末尾に付ける。
 *
 * 例:
 * - skills_claude.zip                     （スキルを複数選択）
 * - skills_claude_my-skill.zip            （スキルを 1 件選択）
 * - agents_grok-Ubuntu-24.04_agent-a.zip  （WSL のエージェントを 1 件選択）
 */
export function assetArchiveFileName(params: {
    kind: AssetKind;
    agentId: string;
    distro?: string;
    relPaths: string[];
}): string {
    const distroSuffix = params.distro ? `-${params.distro}` : '';
    const entrySuffix = singleEntryName(params.relPaths);
    return `${params.kind}_${params.agentId}${distroSuffix}${entrySuffix ? `_${entrySuffix}` : ''}.zip`;
}

/**
 * 選択が 1 件のときだけ、そのエントリ名を返す（0 件・複数件は空文字）。
 * 名前は relPath の末尾セグメントから拡張子（.md / .toml など）を除いたもの。
 * ファイル名に使えない文字は '_' へ置き換え、末尾のドット・空白は取り除く。
 */
function singleEntryName(relPaths: string[]): string {
    if (relPaths.length !== 1) {
        return '';
    }
    const last = relPaths[0].replace(/\\/g, '/').split('/').filter(Boolean).pop() ?? '';
    const name = last.replace(/\.[^.]+$/, '');
    return name
        .replace(INVALID_FILENAME_CHARS, '_')
        .trim()
        .replace(/[.\s]+$/, '')
        .slice(0, MAX_ENTRY_NAME_LENGTH);
}
