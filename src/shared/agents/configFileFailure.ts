// ============================================================
// 設定ファイルの操作の失敗の種類と、例外のメッセージの形
// ------------------------------------------------------------
// IPC の例外はメッセージしか届かないので、種類・対象・詳細をメッセージの中に決まった形で載せる。
// ============================================================

export const CONFIG_FILE_FAILURES = [
    // ファイルを読めない（権限、リンク切れ、UTF-8 ではない内容など）。
    'read-failed',
    // 読めたが形式を解釈できない。
    'invalid-file',
    // 書き込みに失敗した。
    'write-failed',
    // 読んだ後に内容が変わった。
    'conflict',
    // 安全に編集できない形か、編集結果の検証に失敗した。
    'edit-failed',
    // ファイル上の形を保ったまま移動できない項目。
    'read-only-entry',
    // 移動先に同じ名前の別の定義がある。
    'already-defined',
    // 対象の項目がない。
    'entry-not-found',
] as const;

export type ConfigFileFailure = (typeof CONFIG_FILE_FAILURES)[number];

export interface ParsedConfigFileFailure {
    failure: ConfigFileFailure;
    target: string;
    detail: string;
}

// メッセージの中で対象と詳細を分ける文字列。パスにもパーサーのメッセージにも含まれない形にする。
const DETAIL_SEPARATOR = ' :: ';

const FAILURE_PATTERN = new RegExp(
    `\\[(${CONFIG_FILE_FAILURES.join('|')})\\] ([\\s\\S]+?)(?:${DETAIL_SEPARATOR}([\\s\\S]*))?$`
);

/** 失敗を例外のメッセージの形にする。target はファイルの表示パスか項目の名前。 */
export function formatConfigFileFailure(failure: ConfigFileFailure, target: string, detail?: string): string {
    return `[${failure}] ${target}${detail ? `${DETAIL_SEPARATOR}${detail}` : ''}`;
}

/** メッセージの中の失敗の記述を解釈する。IPC が前に付ける文字列は読み飛ばす。記述がなければ null。 */
export function parseConfigFileFailure(message: string): ParsedConfigFileFailure | null {
    const match = FAILURE_PATTERN.exec(message);
    if (!match) return null;
    return { failure: match[1] as ConfigFileFailure, target: match[2], detail: match[3] ?? '' };
}

// ============================================================
// 失敗の詳細のコード
// ------------------------------------------------------------
// ファイルの本文を含まないよう、例外のメッセージの代わりにコードと位置だけを画面へ渡す。
// ============================================================

/** 設定ファイルを解釈できなかった理由のコード。 */
export type ConfigParseCode = 'json-syntax' | 'json-root' | 'toml-syntax';

/** 失敗の詳細のコード。 */
export type ConfigDetailCode = ConfigParseCode | 'dangling-link' | 'not-utf8' | 'edit-rejected' | 'plugins-not-array';

/** 失敗の詳細。位置はすべて 1 始まりで、分かるものだけを持つ。position はテキストの先頭からの文字数。 */
export interface ConfigDetail<C extends string = ConfigDetailCode> {
    code: C;
    line?: number;
    column?: number;
    position?: number;
}

// コードで表した詳細の先頭の目印。OS のエラーコードや項目の名前と区別する。
const DETAIL_CODE_PREFIX = 'code=';
const DETAIL_LOCATION_KEYS = ['line', 'column', 'position'] as const;

/** 詳細を例外のメッセージに載せる文字列にする。 */
export function formatConfigDetail(detail: ConfigDetail): string {
    const location = DETAIL_LOCATION_KEYS.flatMap(key => (detail[key] === undefined ? [] : [`${key}=${detail[key]}`]));
    return [`${DETAIL_CODE_PREFIX}${detail.code}`, ...location].join(';');
}

/** formatConfigDetail の文字列を解釈する。コードで表した詳細でなければ null。 */
export function parseConfigDetail(text: string): ConfigDetail<string> | null {
    if (!text.startsWith(DETAIL_CODE_PREFIX)) return null;
    const [head, ...rest] = text.split(';');
    const detail: ConfigDetail<string> = { code: head.slice(DETAIL_CODE_PREFIX.length) };
    for (const item of rest) {
        const [key, value] = item.split('=');
        if ((DETAIL_LOCATION_KEYS as readonly string[]).includes(key) && /^\d+$/.test(value ?? '')) {
            detail[key as (typeof DETAIL_LOCATION_KEYS)[number]] = Number(value);
        }
    }
    return detail;
}
