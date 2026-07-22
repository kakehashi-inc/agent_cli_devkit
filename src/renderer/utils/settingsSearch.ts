import type { SettingsFieldSpec } from '@shared/agents/types';
import { normalizeSearchText } from './assetSearch';

/**
 * 空白区切りの全検索語が、設定キー（key / path）・表示名・説明のいずれか一方に
 * すべて含まれる項目を返す。検索語の順序は問わず、空の検索では元の一覧をそのまま返す。
 * 表示名・説明は i18n 解決済みの文字列を resolver で受け取る。
 */
export function filterSettingsFields(
    fields: SettingsFieldSpec[],
    query: string,
    resolveLabel: (field: SettingsFieldSpec) => string,
    resolveDesc: (field: SettingsFieldSpec) => string
): SettingsFieldSpec[] {
    const terms = normalizeSearchText(query).trim().split(/\s+/).filter(Boolean);
    if (terms.length === 0) {
        return fields;
    }

    return fields.filter(field => {
        const targets = [
            normalizeSearchText(`${field.key} ${field.path}`),
            normalizeSearchText(resolveLabel(field)),
            normalizeSearchText(resolveDesc(field)),
        ];
        return targets.some(target => terms.every(term => target.includes(term)));
    });
}
