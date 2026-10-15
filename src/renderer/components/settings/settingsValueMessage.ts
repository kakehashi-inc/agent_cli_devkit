// 保存できない設定値を知らせる文言を組み立てる（agent 非依存）。
import type { SettingsValueProblem } from '@shared/agents/settingsValue';
import type { SettingsFieldSpec } from '@shared/agents/types';

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** number 項目が受け付ける範囲の表記（例: 「0 より大きく 1 以下」）。min / max が無ければ空文字列。 */
function rangeText(t: Translate, field: SettingsFieldSpec): string {
    const { min, max } = field;
    const exclusive = field.exclusiveMin === true;
    if (min !== undefined && max !== undefined) {
        return t(exclusive ? 'common.settingsRange.minExclusiveMax' : 'common.settingsRange.minMax', { min, max });
    }
    if (min !== undefined) {
        return t(exclusive ? 'common.settingsRange.minExclusive' : 'common.settingsRange.min', { min });
    }
    if (max !== undefined) {
        return t('common.settingsRange.max', { max });
    }
    return '';
}

/**
 * 保存前の確認で見つかった、保存できない値の文言を返す。
 * label は項目の表示名。範囲の外なら受け付ける範囲を、数値項目の形式の誤りなら数値（整数）を求める旨を示す。
 */
export function settingsValueProblemMessage(
    t: Translate,
    field: SettingsFieldSpec,
    problem: SettingsValueProblem,
    label: string
): string {
    if (problem === 'range') {
        return t('common.settingsValueOutOfRange', { field: label, range: rangeText(t, field) });
    }
    if (field.type === 'number') {
        return t(field.integer ? 'common.settingsValueNotInteger' : 'common.settingsValueNotNumber', { field: label });
    }
    return t('common.settingsInvalidValue', { field: label });
}
