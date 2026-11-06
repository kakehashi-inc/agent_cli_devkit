/**
 * `~/.codex/config.toml` や `~/.grok/config.toml` のスカラー設定と MCP サーバブロックを編集するユーティリティ。
 *
 * 設計方針:
 * - TOML 全体を再シリアライズしない。文の走査で求めた範囲だけを差し替え/挿入/削除することで、対象外の
 *   セクション・コメント・整形・引用符（Windows パスの `"C:\\..."` など）を完全に保持する。
 * - 読み取り（値の取得・一覧）は parseToml を使う。2^53 を超える整数があっても読み取れる。
 *
 * 用語:
 * - サーバブロック: `[mcp_servers.<name>]` とそのサブテーブル（`[mcp_servers.<name>.env]`、配列テーブルを含む）の
 *   見出しと本文。直上に連続するコメント行を含み、最後の文の行末で終わる（次の見出しに接するコメントは含まない）。
 */

import { MCPServerConfig } from '../../shared/agents/types';
import { strictDeepEqual } from './strictDeepEqual';
import {
    appendTomlBlock,
    detectTomlEol,
    isTomlTable,
    parseToml,
    readTomlTable,
    removeTomlTables,
    setTomlValue,
    TomlEditError,
} from './tomlSubtree';
import { scanTomlStatements } from './tomlStatements';

function serverPath(name: string): string[] {
    return ['mcp_servers', name];
}

/**
 * `mcp_servers` テーブルを読み、各サーバの config を返す（表示用）。
 * parse に失敗した場合や mcp_servers が無い場合は空オブジェクト。
 */
export function parseMcpServers(tomlText: string): Record<string, MCPServerConfig> {
    let data: unknown;
    try {
        data = parseToml(tomlText);
    } catch {
        return {};
    }
    if (!data || typeof data !== 'object') {
        return {};
    }
    const servers = (data as Record<string, unknown>).mcp_servers;
    if (!servers || typeof servers !== 'object' || Array.isArray(servers)) {
        return {};
    }
    const result: Record<string, MCPServerConfig> = {};
    for (const [name, cfg] of Object.entries(servers as Record<string, unknown>)) {
        if (cfg && typeof cfg === 'object' && !Array.isArray(cfg)) {
            result[name] = cfg as MCPServerConfig;
        }
    }
    return result;
}

/**
 * `mcp_servers` 直下のサーバ名を最初に現れた順に返す（並べ替え用）。
 * 見出し、ドット記法、インラインテーブルのどの形で書かれていても数える。走査できなければ空配列。
 */
export function listServerNames(tomlText: string): string[] {
    let statements: { path: string[]; at: number }[];
    try {
        const { headers, assignments } = scanTomlStatements(tomlText);
        statements = [
            ...headers.map(header => ({ path: header.path, at: header.start })),
            ...assignments.map(assignment => ({ path: assignment.path, at: assignment.valueStart })),
        ].sort((a, b) => a.at - b.at);
    } catch {
        return [];
    }
    const names = new Set<string>();
    for (const { path } of statements) {
        if (path.length >= 2 && path[0] === 'mcp_servers') {
            names.add(path[1]);
        }
    }
    return [...names];
}

/**
 * サーバブロックを 1 つ切り出し、残りテキストと共に返す。見つからなければ null。
 * block はファイル上の複数の場所に分かれたサブテーブルも含み、残りテキストのスコープ外の文はバイト単位で変わらない。
 * 切り出しと残りは parse して元の内容と照合する。安全に切り出せない形や照合の失敗は TomlEditError を投げる。
 */
export function extractServerBlock(tomlText: string, name: string): { block: string; rest: string } | null {
    const path = serverPath(name);
    const { present, fragment } = readTomlTable(tomlText, path);
    if (!present) {
        return null;
    }
    return { block: fragment.replace(/\s+$/, ''), rest: removeTomlTables(tomlText, [path]) };
}

/** source のテーブルを target へ再帰的に重ねる。同じキーの値が衝突すれば false を返す。 */
function mergeInto(target: Record<string, unknown>, source: Record<string, unknown>): boolean {
    return Object.entries(source).every(([key, value]) => {
        if (!Object.hasOwn(target, key)) {
            target[key] = value;
            return true;
        }
        const existing = target[key];
        return isTomlTable(existing) && isTomlTable(value) && mergeInto(existing, value);
    });
}

/**
 * サーバブロックを末尾に追記する（前に空行 1 つ、末尾に改行 1 つを付ける）。
 * ブロックの改行コードだけをファイルに合わせ、既存のテキストは変更しない。
 * 結果は parse して「既存の内容 + ブロックの内容」と照合する。既存のテキストが読めない場合、同じサーバが既にある
 * 場合、照合の失敗は TomlEditError を投げる。
 */
export function insertServerBlock(tomlText: string, block: string): string {
    const eol = detectTomlEol(tomlText || block);
    const normalizedBlock = block.trim().replace(/\r?\n/g, eol);
    if (normalizedBlock.length === 0) {
        return tomlText.trim().length > 0 ? tomlText.replace(/\s+$/, '') + eol : '';
    }
    const next = appendTomlBlock(tomlText, normalizedBlock + eol, eol);
    let matches = false;
    try {
        const expected = parseToml(tomlText);
        matches = mergeInto(expected, parseToml(normalizedBlock)) && strictDeepEqual(parseToml(next), expected);
    } catch (error) {
        throw new TomlEditError('verify-failed', `the server block cannot be added: ${String(error)}`);
    }
    if (!matches) {
        throw new TomlEditError('verify-failed', 'the server block conflicts with the existing TOML');
    }
    return next;
}

/** 値の中の文字列の改行コードを LF に揃えたコピーを返す。 */
function withLfStrings(value: unknown): unknown {
    if (typeof value === 'string') {
        return value.replace(/\r\n/g, '\n');
    }
    if (Array.isArray(value)) {
        return value.map(withLfStrings);
    }
    if (typeof value !== 'object' || value === null || value instanceof Date) {
        return value;
    }
    const copy: Record<string, unknown> = Object.create(null);
    for (const [key, item] of Object.entries(value)) {
        copy[key] = withLfStrings(item);
    }
    return copy;
}

/**
 * サーバを見出しのブロックのまま別のファイルへ移せるか。
 * 親の本文に書かれた形（インラインテーブル、ドット記法）と、安全に切り出せない形は移せない。
 */
export function isServerBlockMovable(tomlText: string, name: string): boolean {
    const path = serverPath(name);
    try {
        const { present, normalized } = readTomlTable(tomlText, path);
        if (!present || normalized) {
            return false;
        }
        removeTomlTables(tomlText, [path]);
        return true;
    } catch (error) {
        if (error instanceof TomlEditError) {
            return false;
        }
        throw error;
    }
}

/**
 * from のサーバブロックを to へ移した 2 つのテキストを返す。ファイルには書かない。サーバが無ければ null。
 * 移動先に同じ内容の定義があれば移動先を変えず、別の内容の定義があれば already-defined の TomlEditError を投げる。
 * 結果は parse して、移動元からサーバが消えたことと、移動先の定義が元の定義（文字列の改行コードを除く）と一致することを
 * 確かめる。一致しなければ verify-failed の TomlEditError を投げる。
 */
export function moveServerBlock(from: string, to: string, name: string): { from: string; to: string } | null {
    const extracted = extractServerBlock(from, name);
    if (!extracted) {
        return null;
    }
    const definition = withLfStrings(parseMcpServers(from)[name]);
    const current = parseMcpServers(to)[name] as MCPServerConfig | undefined;
    if (current && !strictDeepEqual(withLfStrings(current), definition)) {
        throw new TomlEditError('already-defined', `${name} is already defined with other values`);
    }
    const nextTo = current ? to : insertServerBlock(to, extracted.block);
    const moved = parseMcpServers(nextTo)[name] as MCPServerConfig | undefined;
    if (!moved || !strictDeepEqual(withLfStrings(moved), definition) || parseMcpServers(extracted.rest)[name]) {
        throw new TomlEditError('verify-failed', `the moved definition of ${name} does not match the original`);
    }
    return { from: extracted.rest, to: nextTo };
}

/**
 * 各サーバブロックを order 順に並べ替えて返す（mcp_servers 以外の領域は保持）。
 * すべてのサーバブロックを取り除いた残りテキストの末尾へ、order 順に再配置する。順序が変わらなければ入力をそのまま返す。
 * order に無いサーバは元の順序で末尾に付け直す（データを失わない）。
 * 移動できない形（isServerBlockMovable が false）のサーバはその場に残す。
 * 結果は parse して元の内容（文字列の改行コードを除く）と照合し、一致しなければ TomlEditError を投げる。
 */
export function reorderServerBlocks(tomlText: string, order: string[]): string {
    const blocks = new Map<string, string>();
    for (const name of listServerNames(tomlText)) {
        if (isServerBlockMovable(tomlText, name)) {
            blocks.set(name, readTomlTable(tomlText, serverPath(name)).fragment);
        }
    }
    if (blocks.size === 0) {
        return tomlText;
    }

    const finalOrder = [...new Set([...order.filter(name => blocks.has(name)), ...blocks.keys()])];
    if (finalOrder.every((name, index) => name === [...blocks.keys()][index])) {
        return tomlText;
    }
    let result = removeTomlTables(tomlText, [...blocks.keys()].map(serverPath));
    for (const name of finalOrder) {
        result = insertServerBlock(result, blocks.get(name) as string);
    }
    if (!strictDeepEqual(withLfStrings(parseToml(result)), withLfStrings(parseToml(tomlText)))) {
        throw new TomlEditError('verify-failed', 'the reordered TOML does not match the original values');
    }
    return result;
}

// ============================================================
// スカラー設定（root 直下キー / ネストキー）
// ============================================================

/** ドット区切りキーの現在値を取得する（string/number/boolean 以外・未設定は undefined）。 */
export function getScalar(tomlText: string, dottedKey: string): string | number | boolean | undefined {
    let data: unknown;
    try {
        data = parseToml(tomlText);
    } catch {
        return undefined;
    }
    let cur: unknown = data;
    for (const part of dottedKey.split('.')) {
        if (cur && typeof cur === 'object' && !Array.isArray(cur) && part in (cur as Record<string, unknown>)) {
            cur = (cur as Record<string, unknown>)[part];
        } else {
            return undefined;
        }
    }
    if (typeof cur === 'string' || typeof cur === 'boolean') {
        return cur;
    }
    if (typeof cur === 'number') {
        return cur;
    }
    if (typeof cur === 'bigint') {
        return Number(cur);
    }
    return undefined;
}

/**
 * ドット区切りキーへ値を設定する。既存の代入は値の範囲だけを差し替え、キーの表記と行末コメントは残す。
 * - root 直下キー: 最初のセクション見出しより前で更新/挿入。
 * - ネストキー: 該当テーブル内（親がドット記法ならその直後）で更新/挿入。テーブルが無ければ末尾に見出しごと追加。
 * インラインテーブルの内側など安全に編集できない形と、検証を通らない編集（2^53 を超える整数を number へ丸めた値で
 * 置き換えるなど）は、テキストを変更せずに返す。
 */
export function setScalar(tomlText: string, dottedKey: string, value: string | number | boolean): string {
    try {
        return setTomlValue(tomlText, dottedKey.split('.'), value);
    } catch (error) {
        if (error instanceof TomlEditError) {
            return tomlText;
        }
        throw error;
    }
}

/**
 * ドット区切りキーの代入を削除する。複数行の値も行ごと削除し、空になったテーブル見出しは残す。
 * 見つからなければ変更なし。テーブルの形で書かれた値や、インラインテーブルの内側など安全に編集できない形も変更しない。
 */
export function deleteScalar(tomlText: string, dottedKey: string): string {
    try {
        return setTomlValue(tomlText, dottedKey.split('.'), null);
    } catch (error) {
        if (error instanceof TomlEditError) {
            return tomlText;
        }
        throw error;
    }
}
