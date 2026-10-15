// プラグイン操作の結果メッセージを画面表示用に整える（agent 非依存）。

// main 側が失敗理由として返す機械コード。画面では pluginManager.errorCode.<コード> の文言に置き換える。
const MESSAGE_CODES = [
    'not-found',
    'invalid-plugin-source',
    'cli-unavailable',
    'already-exists',
    'source-overlaps',
    'unavailable',
    'invalid-id',
    'unsupported',
    'invalid-disabled-file',
    'read-only',
    'in-use',
    'move-in-use',
    'needs-reconfirm',
    'invalid-argument-percent',
];

// 画面に出す CLI の出力のうち、先頭と末尾に残す文字数。超えた分は中略して、その旨を添える。
// CLI は失敗の理由を最後に出すことが多いため、末尾を多めに残す。
const HEAD_CHARS = 1000;
const TAIL_CHARS = 3000;

/** index が UTF-16 のサロゲートペアの間（上位と下位の間）にあるか。 */
function splitsSurrogatePair(text: string, index: number): boolean {
    const before = text.charCodeAt(index - 1);
    const after = text.charCodeAt(index);
    return before >= 0xd800 && before <= 0xdbff && after >= 0xdc00 && after <= 0xdfff;
}

/**
 * 操作結果のメッセージを表示用の文字列にする。既知の機械コードは文言に置き換え、
 * それ以外（CLI の出力など）はそのまま返す。長い出力は先頭と末尾を残して中略する（サロゲートペアは分けない）。
 */
export function formatPluginMessage(
    t: (key: string, options?: Record<string, unknown>) => string,
    message: string | null | undefined
): string {
    const text = (message ?? '').trim();
    if (MESSAGE_CODES.includes(text)) {
        return t(`pluginManager.errorCode.${text}`);
    }
    if (text.length <= HEAD_CHARS + TAIL_CHARS) {
        return text;
    }
    let headEnd = HEAD_CHARS;
    if (splitsSurrogatePair(text, headEnd)) headEnd -= 1;
    let tailStart = text.length - TAIL_CHARS;
    if (splitsSurrogatePair(text, tailStart)) tailStart += 1;
    const omitted = tailStart - headEnd;
    return `${text.slice(0, headEnd)}\n${t('pluginManager.outputTruncated', { count: omitted })}\n${text.slice(tailStart)}`;
}
