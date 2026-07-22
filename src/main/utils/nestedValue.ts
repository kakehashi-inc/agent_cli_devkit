/**
 * ネストしたプレーンオブジェクトの値操作と、設定書き込みの検証に使う deep 比較。
 *
 * 設定保存の安全弁として「編集後テキストの parse 結果」と「編集前 parse 結果へ意図した変更を
 * 適用した期待モデル」を deepEqualLoose で突き合わせ、一致した場合のみファイルへ書き込む。
 */

/** ドット区切り path（配列）で値を取得する。途中がオブジェクトでなければ undefined。 */
export function getNestedValue(obj: Record<string, unknown>, path: string[]): unknown {
    let current: unknown = obj;
    for (const segment of path) {
        if (!current || typeof current !== 'object' || Array.isArray(current)) {
            return undefined;
        }
        current = (current as Record<string, unknown>)[segment];
    }
    return current;
}

/** ドット区切り path（配列）へ値を設定する。中間オブジェクトは必要に応じて作成する（非オブジェクト値は置き換え）。 */
export function setNestedValue(obj: Record<string, unknown>, path: string[], value: unknown): void {
    let current = obj;
    for (const segment of path.slice(0, -1)) {
        const next = current[segment];
        if (next && typeof next === 'object' && !Array.isArray(next)) {
            current = next as Record<string, unknown>;
        } else {
            const created: Record<string, unknown> = {};
            current[segment] = created;
            current = created;
        }
    }
    current[path[path.length - 1]] = value;
}

/**
 * ドット区切り path（配列）のキーを削除する。
 * cleanupEmptyParents=true なら、空になった中間オブジェクトも葉側から取り除く。
 * （JSON はキーごと削除、TOML はテーブル見出しが残るため false を渡す。）
 */
export function deleteNestedValue(obj: Record<string, unknown>, path: string[], cleanupEmptyParents: boolean): void {
    const chain: { parent: Record<string, unknown>; key: string }[] = [];
    let current = obj;
    for (const segment of path.slice(0, -1)) {
        const next = current[segment];
        if (!next || typeof next !== 'object' || Array.isArray(next)) {
            return; // 中間が存在しなければ削除対象も存在しない
        }
        chain.push({ parent: current, key: segment });
        current = next as Record<string, unknown>;
    }
    delete current[path[path.length - 1]];
    if (!cleanupEmptyParents) {
        return;
    }
    for (let i = chain.length - 1; i >= 0; i -= 1) {
        const child = chain[i].parent[chain[i].key] as Record<string, unknown>;
        if (Object.keys(child).length > 0) {
            break;
        }
        delete chain[i].parent[chain[i].key];
    }
}

/**
 * 空オブジェクトプロパティを再帰的に取り除いた正規化コピーを返す（検証用）。
 * テキスト編集側は「コメントの残る空オブジェクト」を保持し、期待モデル側は親ごと削除する、
 * といった差異を吸収する。空オブジェクトは設定のセマンティクスに影響しないため無視してよい。
 * 配列はそのまま返す（設定編集は配列に触れない）。
 */
export function withoutEmptyObjects(value: unknown): unknown {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) return value;
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
        const normalized = withoutEmptyObjects(item);
        if (
            normalized &&
            typeof normalized === 'object' &&
            !Array.isArray(normalized) &&
            (Object.getPrototypeOf(normalized) === Object.prototype ||
                Object.getPrototypeOf(normalized) === null) &&
            Object.keys(normalized).length === 0
        ) {
            continue;
        }
        result[key] = normalized;
    }
    return result;
}

/**
 * 順序非依存の deep 比較。設定書き込み検証用。
 * - オブジェクト: キー集合の一致 + 各値の再帰比較（宣言順は問わない）
 * - 配列: 長さと各要素（順序込み）
 * - bigint / number は数値として同一視（smol-toml は整数を bigint で返すため）
 * - プレーンオブジェクト以外のインスタンス（TomlDate 等）は文字列表現で比較
 */
export function deepEqualLoose(a: unknown, b: unknown): boolean {
    if (Object.is(a, b)) return true;
    if (typeof a === 'number' && typeof b === 'number') return a === b; // +0 と -0 は同一視
    if (typeof a === 'bigint' || typeof b === 'bigint') {
        const aNum = typeof a === 'bigint' ? Number(a) : a;
        const bNum = typeof b === 'bigint' ? Number(b) : b;
        return typeof aNum === 'number' && typeof bNum === 'number' && aNum === bNum;
    }
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
    if (Array.isArray(a) || Array.isArray(b)) {
        if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
        return a.every((item, index) => deepEqualLoose(item, b[index]));
    }
    const aPlain = Object.getPrototypeOf(a) === Object.prototype || Object.getPrototypeOf(a) === null;
    const bPlain = Object.getPrototypeOf(b) === Object.prototype || Object.getPrototypeOf(b) === null;
    if (!aPlain || !bPlain) {
        return String(a) === String(b);
    }
    const aKeys = Object.keys(a as Record<string, unknown>);
    const bKeys = Object.keys(b as Record<string, unknown>);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every(
        key =>
            Object.prototype.hasOwnProperty.call(b, key) &&
            deepEqualLoose((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
    );
}
