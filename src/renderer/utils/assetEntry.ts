import type { AssetEntry } from '@shared/agents/types';

/** チェックボックスで選択できる行か。 */
export function canSelectAsset(entry: AssetEntry): boolean {
    return entry.status !== 'refused-name';
}

/** ダウンロードできる行か。 */
export function canDownloadAsset(entry: AssetEntry): boolean {
    return entry.status === undefined || entry.status === 'no-entry-file';
}

/** 削除できる行か。途中のフォルダーがリンクの行は、リンク先の実体を消さないよう削除できない。 */
export function canDeleteAsset(entry: AssetEntry): boolean {
    return entry.status !== 'refused-name' && entry.link !== 'via';
}

/**
 * deleting の行を削除すると一緒に消える、entries の中の定義の行を返す。
 * 途中にリンクがある行は、リンクを外しても実体がリンク先に残るので含めない。
 */
export function nestedAssetsOf(deleting: readonly AssetEntry[], entries: readonly AssetEntry[]): AssetEntry[] {
    return entries.filter(
        entry =>
            canDownloadAsset(entry) &&
            entry.link !== 'via' &&
            deleting.some(item => entry.relPath.startsWith(`${item.relPath}/`))
    );
}

/** 内容を参照できる行か。 */
export function canViewAsset(entry: AssetEntry): boolean {
    return entry.status === undefined;
}

/** ファイルマネージャーで表示できる行か。 */
export function canRevealAsset(entry: AssetEntry): boolean {
    return entry.status !== 'refused-name' && entry.status !== 'dangling-link';
}
