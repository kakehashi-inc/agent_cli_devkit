// ============================================================
// 設定項目の値の検証（agent 非依存）
// ============================================================
import type { SettingsFieldSpec, SettingsFieldValue, SettingsValues } from './types';

// 保存できない値の理由。format=形式に合わない（pattern に一致しない文字列、数値として読めない値、
// 整数だけを受け付ける項目の小数）、range=受け付ける範囲（min / max）の外。
export type SettingsValueProblem = 'format' | 'range';

/**
 * 設定項目の値が registry の制約を満たさない理由を返す（満たす場合と未設定は null）。
 * - pattern を持つ項目: 形式に一致しない文字列は format。
 * - number 項目: 有限でない数値（NaN・無限大）と、integer の項目の整数でない数値は format。
 *   min より小さい数値（exclusiveMin なら min 以下）と max より大きい数値は range。
 */
export function settingsValueProblem(field: SettingsFieldSpec, value: SettingsFieldValue): SettingsValueProblem | null {
    if (field.pattern !== undefined && typeof value === 'string' && !new RegExp(field.pattern, 'u').test(value)) {
        return 'format';
    }
    if (field.type !== 'number' || typeof value !== 'number') {
        return null;
    }
    if (!Number.isFinite(value) || (field.integer === true && !Number.isInteger(value))) {
        return 'format';
    }
    if (field.min !== undefined && (field.exclusiveMin === true ? value <= field.min : value < field.min)) {
        return 'range';
    }
    if (field.max !== undefined && value > field.max) {
        return 'range';
    }
    return null;
}

/** values に含まれる項目のうち、保存できない値を持つ最初の項目とその理由。無ければ undefined。 */
export function findInvalidSettingsValue(
    fields: SettingsFieldSpec[],
    values: SettingsValues
): { field: SettingsFieldSpec; problem: SettingsValueProblem } | undefined {
    for (const field of fields) {
        if (!Object.prototype.hasOwnProperty.call(values, field.key)) continue;
        const problem = settingsValueProblem(field, values[field.key]);
        if (problem !== null) return { field, problem };
    }
    return undefined;
}
