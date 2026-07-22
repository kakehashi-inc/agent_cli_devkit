import type { AssetEntry } from '@shared/agents/types';

/** 検索時に大文字小文字と全角半角の違いを吸収する。 */
export function normalizeSearchText(value: string): string {
    return value.normalize('NFKC').toLowerCase();
}

/**
 * 空白区切りの全検索語が、名前または説明のどちらか一方にすべて含まれる項目を返す。
 * 検索語の順序は問わず、空の検索では元の一覧をそのまま返す。
 */
export function filterAssetEntries(entries: AssetEntry[], query: string): AssetEntry[] {
    const terms = normalizeSearchText(query).trim().split(/\s+/).filter(Boolean);
    if (terms.length === 0) {
        return entries;
    }

    return entries.filter(entry => {
        const name = normalizeSearchText(entry.frontmatter?.name ?? entry.name ?? '');
        const description = normalizeSearchText(entry.frontmatter?.description ?? '');
        return terms.every(term => name.includes(term)) || terms.every(term => description.includes(term));
    });
}
