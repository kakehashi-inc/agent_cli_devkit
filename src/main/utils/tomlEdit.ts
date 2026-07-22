/**
 * `~/.codex/config.toml` を行スライスで編集するユーティリティ。
 *
 * 設計方針:
 * - TOML 全体を再シリアライズしない。対象の行だけを差し替え/挿入/削除することで、対象外の
 *   セクション・コメント・整形・引用符（Windows パスの `"C:\\..."` など）を完全に保持する。
 * - 読み取り（値の取得・一覧）にのみ smol-toml の parse を使う。書き込みは常に行スライス。
 *
 * 用語:
 * - サーバブロック: `[mcp_servers.<name>]` 見出し行から、次に現れる「その サーバの
 *   サブテーブル（`[mcp_servers.<name>.env]` 等）ではないトップレベル見出し」または EOF まで
 *   の連続行。サブテーブルは同一ブロックに含める。
 */

import { parse } from 'smol-toml';
import { MCPServerConfig } from '../../shared/agents/types';

/** 改行コードを検出する（CRLF が 1 つでもあれば CRLF 扱い）。 */
function detectEol(text: string): '\r' | '' {
    return /\r\n/.test(text) ? '\r' : '';
}

/** 行末の \r を除去する。 */
function stripCr(line: string): string {
    return line.replace(/\r$/, '');
}

/**
 * TOML のドット区切りキー文字列（見出し内・キー行）をセグメントへ分解する。
 * bare / basic-quoted("...") / literal-quoted('...') を扱う。
 */
function parseDottedKey(s: string): string[] {
    const parts: string[] = [];
    let i = 0;
    while (i < s.length) {
        while (i < s.length && /\s/.test(s[i])) {
            i++;
        }
        if (i >= s.length) {
            break;
        }
        let seg = '';
        const ch = s[i];
        if (ch === '"' || ch === "'") {
            const quote = ch;
            i++;
            while (i < s.length && s[i] !== quote) {
                if (quote === '"' && s[i] === '\\' && i + 1 < s.length) {
                    seg += s[i + 1];
                    i += 2;
                } else {
                    seg += s[i];
                    i++;
                }
            }
            i++; // 閉じ引用符
        } else {
            while (i < s.length && s[i] !== '.' && !/\s/.test(s[i])) {
                seg += s[i];
                i++;
            }
        }
        parts.push(seg);
        while (i < s.length && /\s/.test(s[i])) {
            i++;
        }
        if (i < s.length && s[i] === '.') {
            i++;
        }
    }
    return parts;
}

/** 行が標準テーブル見出し（`[a.b]`）ならセグメント配列を、そうでなければ null を返す。 */
function tableHeaderPath(line: string): string[] | null {
    const t = stripCr(line).trim();
    if (!t.startsWith('[') || t.startsWith('[[')) {
        return null;
    }
    if (!t.endsWith(']')) {
        return null;
    }
    const inner = t.slice(1, -1).trim();
    if (inner.length === 0) {
        return null;
    }
    return parseDottedKey(inner);
}

/** 行が何らかのセクション見出し（`[` で始まる）か。 */
function isSectionBoundary(line: string): boolean {
    return stripCr(line).trim().startsWith('[');
}

/** テーブルパスがサーバ <name> 本体もしくはそのサブテーブルか。 */
function belongsToServer(path: string[], name: string): boolean {
    return path.length >= 2 && path[0] === 'mcp_servers' && path[1] === name;
}

/**
 * `mcp_servers` テーブルを読み、各サーバの config を返す（表示用）。
 * parse に失敗した場合や mcp_servers が無い場合は空オブジェクト。
 */
export function parseMcpServers(tomlText: string): Record<string, MCPServerConfig> {
    let data: unknown;
    try {
        data = parse(tomlText);
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
 * `[mcp_servers.<name>]`（サブテーブルでない直下）の出現順に name を返す（並べ替え用）。
 */
export function listServerNames(tomlText: string): string[] {
    const names: string[] = [];
    const seen = new Set<string>();
    for (const line of tomlText.split('\n')) {
        const path = tableHeaderPath(line);
        if (path && path.length === 2 && path[0] === 'mcp_servers') {
            const name = path[1];
            if (!seen.has(name)) {
                seen.add(name);
                names.push(name);
            }
        }
    }
    return names;
}

/**
 * `[mcp_servers.<name>]` 行からサーバブロックを 1 つ切り出し、残りテキストと共に返す。
 * ブロックにはサブテーブル（`[mcp_servers.<name>.env]` 等）を含む。見つからなければ null。
 */
export function extractServerBlock(tomlText: string, name: string): { block: string; rest: string } | null {
    const lines = tomlText.split('\n');
    let start = -1;
    for (let i = 0; i < lines.length; i++) {
        const path = tableHeaderPath(lines[i]);
        if (path && path.length === 2 && path[0] === 'mcp_servers' && path[1] === name) {
            start = i;
            break;
        }
    }
    if (start === -1) {
        return null;
    }

    let end = start + 1;
    while (end < lines.length) {
        if (isSectionBoundary(lines[end])) {
            const path = tableHeaderPath(lines[end]);
            if (!path || !belongsToServer(path, name)) {
                break;
            }
        }
        end++;
    }

    const blockLines = lines.slice(start, end);
    const restLines = [...lines.slice(0, start), ...lines.slice(end)];

    const block = blockLines.join('\n').replace(/\s+$/, '');
    let rest = restLines
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/\s+$/, '');
    if (rest.length > 0) {
        rest += '\n';
    }
    return { block, rest };
}

/**
 * サーバブロックを末尾に追記する（前に空行 1 つ、末尾に改行 1 つを付ける）。
 */
export function insertServerBlock(tomlText: string, block: string): string {
    const eol = detectEol(tomlText || block);
    const nl = `${eol}\n`.length === 2 ? '\r\n' : '\n';
    const base = tomlText.replace(/\s+$/, '');
    const trimmedBlock = block.replace(/^\s+/, '').replace(/\s+$/, '');
    if (trimmedBlock.length === 0) {
        return base.length > 0 ? base + nl : '';
    }
    // 改行コードをファイルに合わせて正規化する。
    const normalizedBlock = trimmedBlock.replace(/\r?\n/g, nl);
    if (base.length === 0) {
        return normalizedBlock + nl;
    }
    const normalizedBase = base.replace(/\r?\n/g, nl);
    return normalizedBase + nl + nl + normalizedBlock + nl;
}

/**
 * 各サーバブロックを order 順に並べ替えて返す（mcp_servers 以外の領域は保持）。
 * すべてのサーバブロックを取り除いた残りテキストの末尾へ、order 順に再配置する。
 * order に無いサーバは元の順序で末尾に付け直す（データを失わない）。
 */
export function reorderServerBlocks(tomlText: string, order: string[]): string {
    const lines = tomlText.split('\n');
    const blocks = new Map<string, string>();
    const foundOrder: string[] = [];
    const restLines: string[] = [];

    let i = 0;
    while (i < lines.length) {
        const path = tableHeaderPath(lines[i]);
        if (path && path.length === 2 && path[0] === 'mcp_servers') {
            const name = path[1];
            let end = i + 1;
            while (end < lines.length) {
                if (isSectionBoundary(lines[end])) {
                    const p = tableHeaderPath(lines[end]);
                    if (!p || !belongsToServer(p, name)) {
                        break;
                    }
                }
                end++;
            }
            const block = lines.slice(i, end).join('\n').replace(/\s+$/, '');
            if (!blocks.has(name)) {
                foundOrder.push(name);
            }
            blocks.set(name, block);
            i = end;
        } else {
            restLines.push(lines[i]);
            i++;
        }
    }

    // 並べ替え順: order のうち存在するもの → order に無い残りを元の順序で。
    const finalOrder: string[] = [];
    const used = new Set<string>();
    for (const name of order) {
        if (blocks.has(name) && !used.has(name)) {
            finalOrder.push(name);
            used.add(name);
        }
    }
    for (const name of foundOrder) {
        if (!used.has(name)) {
            finalOrder.push(name);
            used.add(name);
        }
    }

    let result = restLines.join('\n');
    for (const name of finalOrder) {
        result = insertServerBlock(result, blocks.get(name) as string);
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
        data = parse(tomlText);
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

/** JS 値を TOML の値表現へ変換する。 */
function toTomlValue(value: string | number | boolean): string {
    if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
    }
    if (typeof value === 'number') {
        return String(value);
    }
    // string: ダブルクオートで囲み、内部の \ と " をエスケープする。
    const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
    return `"${escaped}"`;
}

/** キー行にマッチする正規表現（先頭の空白を許容、`key =` / `key=`）。 */
function keyAssignRegex(key: string): RegExp {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^\\s*${escapedKey}\\s*=`);
}

/** 文字列リテラル外の最初の `#` の位置（無ければ -1）。 */
function findCommentStart(s: string): number {
    let inBasic = false;
    let inLiteral = false;
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (inBasic) {
            if (ch === '\\') i++;
            else if (ch === '"') inBasic = false;
            continue;
        }
        if (inLiteral) {
            if (ch === "'") inLiteral = false;
            continue;
        }
        if (ch === '"') inBasic = true;
        else if (ch === "'") inLiteral = true;
        else if (ch === '#') return i;
    }
    return -1;
}

/** 既存キー行の値部分だけを差し替える（インデント・キー表記・行末コメントを保持）。 */
function replaceValueInLine(line: string, tomlVal: string, eol: '\r' | ''): string {
    const noCr = stripCr(line);
    const eq = noCr.indexOf('=');
    const head = noCr.slice(0, eq + 1);
    const rest = noCr.slice(eq + 1);
    const commentIdx = findCommentStart(rest);
    const comment = commentIdx >= 0 ? rest.slice(commentIdx).replace(/\s+$/, '') : '';
    return `${head} ${tomlVal}${comment ? ` ${comment}` : ''}${eol}`;
}

/** 最初のセクション見出しの行インデックス（無ければ lines.length）。 */
function firstSectionIndex(lines: string[]): number {
    for (let i = 0; i < lines.length; i++) {
        if (isSectionBoundary(lines[i])) {
            return i;
        }
    }
    return lines.length;
}

/** テーブル見出し（パスが tablePath に一致）の行インデックス。無ければ -1。 */
function findTableIndex(lines: string[], tablePath: string[]): number {
    for (let i = 0; i < lines.length; i++) {
        const path = tableHeaderPath(lines[i]);
        if (path && path.length === tablePath.length && path.every((p, idx) => p === tablePath[idx])) {
            return i;
        }
    }
    return -1;
}

/**
 * ドット区切りキーへ値を設定する。
 * - root 直下キー: 最初のセクション見出しより前で更新/挿入。
 * - ネストキー: 該当テーブル内で更新/挿入。テーブルが無ければ末尾に見出しごと追加。
 */
export function setScalar(tomlText: string, dottedKey: string, value: string | number | boolean): string {
    const eol = detectEol(tomlText);
    const lines = tomlText.length === 0 ? [] : tomlText.split('\n');
    const parts = dottedKey.split('.');
    const tomlVal = toTomlValue(value);

    if (parts.length === 1) {
        return setRootKey(lines, parts[0], tomlVal, eol);
    }

    const tablePath = parts.slice(0, -1);
    const key = parts[parts.length - 1];
    const tableIdx = findTableIndex(lines, tablePath);

    if (tableIdx === -1) {
        // テーブルが無い → 末尾に見出し + キー行を追加する。
        // 末尾の空行を除いてから、区切りの空行・見出し・キー行・末尾改行用の空要素を積む。
        while (lines.length > 0 && stripCr(lines[lines.length - 1]).trim() === '') {
            lines.pop();
        }
        if (lines.length > 0) {
            lines.push(''); // 区切りの空行
        }
        lines.push(`[${tablePath.join('.')}]${eol}`);
        lines.push(`${key} = ${tomlVal}${eol}`);
        lines.push(''); // 末尾改行
        return joinLines(lines);
    }

    // テーブル内でキー行を探す（次のセクション見出し or EOF まで）。
    let sectionEnd = tableIdx + 1;
    while (sectionEnd < lines.length && !isSectionBoundary(lines[sectionEnd])) {
        sectionEnd++;
    }
    const keyRe = keyAssignRegex(key);
    for (let i = tableIdx + 1; i < sectionEnd; i++) {
        if (keyRe.test(stripCr(lines[i]))) {
            lines[i] = replaceValueInLine(lines[i], tomlVal, eol);
            return joinLines(lines);
        }
    }
    // 見つからない → テーブル見出しの直後に挿入する。
    lines.splice(tableIdx + 1, 0, `${key} = ${tomlVal}${eol}`);
    return joinLines(lines);
}

/** root 直下キーを更新/挿入する。 */
function setRootKey(lines: string[], key: string, tomlVal: string, eol: '\r' | ''): string {
    const rootEnd = firstSectionIndex(lines);
    const keyRe = keyAssignRegex(key);
    for (let i = 0; i < rootEnd; i++) {
        if (keyRe.test(stripCr(lines[i]))) {
            lines[i] = replaceValueInLine(lines[i], tomlVal, eol);
            return joinLines(lines);
        }
    }
    // 未存在 → root 領域の末尾（最初のセクション見出しの直前）に挿入する。
    lines.splice(rootEnd, 0, `${key} = ${tomlVal}${eol}`);
    return joinLines(lines);
}

/**
 * ドット区切りキーを削除する。
 * - root 直下キー: root 領域内の該当行を削除。
 * - ネストキー: 該当テーブル内の該当行を削除（空になったテーブル見出しは残す）。
 * 見つからなければ変更なし。
 */
export function deleteScalar(tomlText: string, dottedKey: string): string {
    const lines = tomlText.length === 0 ? [] : tomlText.split('\n');
    const parts = dottedKey.split('.');

    if (parts.length === 1) {
        const rootEnd = firstSectionIndex(lines);
        const keyRe = keyAssignRegex(parts[0]);
        for (let i = 0; i < rootEnd; i++) {
            if (keyRe.test(stripCr(lines[i]))) {
                lines.splice(i, 1);
                return joinLines(lines);
            }
        }
        return tomlText;
    }

    const tablePath = parts.slice(0, -1);
    const key = parts[parts.length - 1];
    const tableIdx = findTableIndex(lines, tablePath);
    if (tableIdx === -1) {
        return tomlText;
    }
    let sectionEnd = tableIdx + 1;
    while (sectionEnd < lines.length && !isSectionBoundary(lines[sectionEnd])) {
        sectionEnd++;
    }
    const keyRe = keyAssignRegex(key);
    for (let i = tableIdx + 1; i < sectionEnd; i++) {
        if (keyRe.test(stripCr(lines[i]))) {
            lines.splice(i, 1);
            return joinLines(lines);
        }
    }
    return tomlText;
}

/** lines を元の改行構造（\n 区切り）で結合する。 */
function joinLines(lines: string[]): string {
    return lines.join('\n');
}
