import { parseConfigDetail, parseConfigFileFailure, type ConfigDetail } from '@shared/agents/configFileFailure';

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** 失敗の詳細（コードと位置）を文言にする。 */
export function configDetailMessage(t: Translate, detail: ConfigDetail<string>): string {
    const base = t(`common.configDetail.code.${detail.code}`, { defaultValue: detail.code });
    const { line, column, position } = detail;
    if (line !== undefined && column !== undefined) {
        return t('common.configDetail.lineColumn', { base, line, column });
    }
    if (line !== undefined) return t('common.configDetail.line', { base, line });
    if (position !== undefined) return t('common.configDetail.position', { base, position });
    return base;
}

/** main から届いた詳細の文字列を文言にする。コードで表した詳細でなければ（OS のエラーコード、項目の名前）そのまま返す。 */
export function configDetailText(t: Translate, detail: string): string {
    const parsed = parseConfigDetail(detail);
    return parsed ? configDetailMessage(t, parsed) : detail;
}

/** メッセージの中の設定ファイルの失敗の記述を文言にする。記述がなければ null。 */
export function configFileFailureText(t: Translate, message: string): string | null {
    const parsed = parseConfigFileFailure(message);
    if (!parsed) return null;
    const detail = parsed.detail.length > 0 ? ` (${configDetailText(t, parsed.detail)})` : '';
    return t(`common.configFileFailure.${parsed.failure}`, { target: parsed.target, detail });
}

/** 操作の例外を画面に出す文言にする。設定ファイルの失敗は文言へ置き換え、それ以外はメッセージをそのまま使う。 */
export function operationErrorText(t: Translate, error: unknown): string {
    if (!(error instanceof Error)) return t('common.error');
    return configFileFailureText(t, error.message) ?? error.message;
}
