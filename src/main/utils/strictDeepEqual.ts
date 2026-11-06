/**
 * TOML や JSON のパース結果を厳密に比較する。宣言順は問わない。
 * - オブジェクト: キー集合と各値。空のオブジェクトも 1 つの値として区別する
 * - 配列: 長さと各要素（順序込み）
 * - number と bigint: 別の型として区別し、丸めない。NaN は NaN と等しく、+0 と -0 は区別する
 * - Date: 時刻と文字列表現（TomlDate のローカル日付やオフセットの違いを含む）
 */
export function strictDeepEqual(a: unknown, b: unknown): boolean {
    if (Object.is(a, b)) return true;
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
    if (a instanceof Date || b instanceof Date) {
        return a instanceof Date && b instanceof Date && sameDate(a, b);
    }
    if (Array.isArray(a) || Array.isArray(b)) {
        if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
        return a.every((item, index) => strictDeepEqual(item, b[index]));
    }
    if (!isPlainObject(a) || !isPlainObject(b)) return false;
    const aKeys = Object.keys(a);
    if (aKeys.length !== Object.keys(b).length) return false;
    return aKeys.every(key => Object.hasOwn(b, key) && strictDeepEqual(a[key], b[key]));
}

function isPlainObject(value: object): value is Record<string, unknown> {
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

function sameDate(a: Date, b: Date): boolean {
    const aTime = a.getTime();
    const bTime = b.getTime();
    if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
        return Number.isNaN(aTime) && Number.isNaN(bTime);
    }
    return aTime === bTime && a.toISOString() === b.toISOString();
}
