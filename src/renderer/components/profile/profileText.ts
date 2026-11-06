// プロファイル設定の結果のコードを文言にする。
import type { ProfileFileData, ProfileWriteResult } from '@shared/agents/profile/types';

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** `<コード>` または `<コード>:<引数>` の形の警告を文言にする。未知のコードはそのまま返す。 */
export function warningText(t: Translate, warning: string): string {
    const colon = warning.indexOf(':');
    const code = colon === -1 ? warning : warning.slice(0, colon);
    const arg = colon === -1 ? '' : warning.slice(colon + 1);
    return t(`common.profile.warning.${code}`, { arg, defaultValue: warning });
}

/** 失敗のコードと付加情報を文言にする。付加情報はカンマ区切りの警告の形か、エラーコード。 */
export function failureText(t: Translate, message: string | undefined, detail?: string): string {
    const base = t(`common.profile.error.${message ?? 'operation-failed'}`, {
        defaultValue: t('common.profile.error.operation-failed'),
    });
    if (!detail) return base;
    return `${base} ${detail
        .split(',')
        .map(item => warningText(t, item))
        .join(' / ')}`;
}

/** 保存の失敗の結果を文言にする。 */
export function writeFailureText(t: Translate, result: Extract<ProfileWriteResult, { ok: false }>): string {
    return failureText(t, result.message, 'detail' in result ? result.detail : undefined);
}

/** 読み取り結果が編集できない状態なら理由の文言を返す。編集できれば null。 */
export function unreadableText(t: Translate, data: ProfileFileData): string | null {
    switch (data.state) {
        case 'not-utf8':
            return t('common.profile.error.not-utf8');
        case 'dangling-link':
            return t('common.profile.error.dangling-link');
        case 'error':
            return failureText(t, 'read-failed', data.code);
        default:
            return null;
    }
}

/** 相対パスのファイル名の部分。 */
export function baseNameOf(rel: string): string {
    return rel.slice(rel.lastIndexOf('/') + 1);
}
