/**
 * JSONC の読み取りとトップレベルプロパティの差分編集。
 * OpenCode は opencode.json でコメントと末尾カンマを許可するため、JSON.stringify による
 * 全体再生成を避け、対象プロパティの値だけを置換する。
 */

export type JsonObject = Record<string, unknown>;

function stripComments(text: string): string {
    let result = '';
    let inString = false;
    let escaped = false;
    for (let i = 0; i < text.length; i += 1) {
        const ch = text[i];
        const next = text[i + 1];
        if (inString) {
            result += ch;
            if (escaped) escaped = false;
            else if (ch === '\\') escaped = true;
            else if (ch === '"') inString = false;
            continue;
        }
        if (ch === '"') {
            inString = true;
            result += ch;
            continue;
        }
        if (ch === '/' && next === '/') {
            result += '  ';
            i += 2;
            while (i < text.length && text[i] !== '\n' && text[i] !== '\r') {
                result += ' ';
                i += 1;
            }
            if (i < text.length) result += text[i];
            continue;
        }
        if (ch === '/' && next === '*') {
            result += '  ';
            i += 2;
            while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) {
                result += text[i] === '\n' || text[i] === '\r' ? text[i] : ' ';
                i += 1;
            }
            if (i < text.length) {
                result += '  ';
                i += 1;
            }
            continue;
        }
        result += ch;
    }
    return result;
}

function stripTrailingCommas(text: string): string {
    let result = '';
    let inString = false;
    let escaped = false;
    for (let i = 0; i < text.length; i += 1) {
        const ch = text[i];
        if (inString) {
            result += ch;
            if (escaped) escaped = false;
            else if (ch === '\\') escaped = true;
            else if (ch === '"') inString = false;
            continue;
        }
        if (ch === '"') {
            inString = true;
            result += ch;
            continue;
        }
        if (ch === ',') {
            let j = i + 1;
            while (j < text.length && /\s/.test(text[j])) j += 1;
            if (text[j] === '}' || text[j] === ']') continue;
        }
        result += ch;
    }
    return result;
}

export function parseJsonc(text: string): unknown {
    const normalized = stripTrailingCommas(stripComments(text));
    return JSON.parse(normalized);
}

export function parseJsoncObject(text: string): JsonObject {
    const parsed = parseJsonc(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('JSON root must be an object');
    }
    return parsed as JsonObject;
}

interface PropertyRange {
    key: string;
    keyStart: number;
    valueStart: number;
    valueEnd: number;
    commaAfter: number | null;
}

interface ObjectScan {
    open: number;
    close: number;
    properties: PropertyRange[];
}

function skipTrivia(text: string, start: number): number {
    let i = start;
    while (i < text.length) {
        if (/\s/.test(text[i])) {
            i += 1;
            continue;
        }
        if (text[i] === '/' && text[i + 1] === '/') {
            i += 2;
            while (i < text.length && text[i] !== '\n' && text[i] !== '\r') i += 1;
            continue;
        }
        if (text[i] === '/' && text[i + 1] === '*') {
            i += 2;
            while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i += 1;
            i = Math.min(text.length, i + 2);
            continue;
        }
        break;
    }
    return i;
}

function readStringEnd(text: string, start: number): number {
    let escaped = false;
    for (let i = start + 1; i < text.length; i += 1) {
        const ch = text[i];
        if (escaped) escaped = false;
        else if (ch === '\\') escaped = true;
        else if (ch === '"') return i + 1;
    }
    throw new Error('Unterminated JSON string');
}

function readValueEnd(text: string, start: number): number {
    let inString = false;
    let escaped = false;
    let lineComment = false;
    let blockComment = false;
    let depth = 0;
    let lastSignificant = start;
    for (let i = start; i < text.length; i += 1) {
        const ch = text[i];
        const next = text[i + 1];
        if (lineComment) {
            if (ch === '\n' || ch === '\r') lineComment = false;
            continue;
        }
        if (blockComment) {
            if (ch === '*' && next === '/') {
                blockComment = false;
                i += 1;
            }
            continue;
        }
        if (inString) {
            if (escaped) escaped = false;
            else if (ch === '\\') escaped = true;
            else if (ch === '"') inString = false;
            lastSignificant = i + 1;
            continue;
        }
        if (ch === '"') {
            inString = true;
            lastSignificant = i + 1;
            continue;
        }
        if (ch === '/' && next === '/') {
            lineComment = true;
            i += 1;
            continue;
        }
        if (ch === '/' && next === '*') {
            blockComment = true;
            i += 1;
            continue;
        }
        if (ch === '{' || ch === '[') depth += 1;
        else if (ch === '}' || ch === ']') {
            if (depth === 0) return lastSignificant;
            depth -= 1;
        } else if (ch === ',' && depth === 0) {
            return lastSignificant;
        }
        if (!/\s/.test(ch)) lastSignificant = i + 1;
    }
    return lastSignificant;
}

/** openIndex（`{` の位置）から 1 つのオブジェクトを走査する。 */
function scanObjectAt(text: string, openIndex: number): ObjectScan {
    if (text[openIndex] !== '{') throw new Error('Expected JSON object');
    let i = openIndex + 1;
    const properties: PropertyRange[] = [];
    while (i < text.length) {
        i = skipTrivia(text, i);
        if (text[i] === '}') return { open: openIndex, close: i, properties };
        if (text[i] !== '"') throw new Error('Invalid JSON object property');
        const keyStart = i;
        const keyEnd = readStringEnd(text, i);
        const key = JSON.parse(text.slice(i, keyEnd)) as string;
        i = skipTrivia(text, keyEnd);
        if (text[i] !== ':') throw new Error('Missing JSON property colon');
        const valueStart = skipTrivia(text, i + 1);
        const valueEnd = readValueEnd(text, valueStart);
        i = skipTrivia(text, valueEnd);
        const commaAfter = text[i] === ',' ? i : null;
        properties.push({ key, keyStart, valueStart, valueEnd, commaAfter });
        if (commaAfter !== null) {
            i += 1;
            continue;
        }
        i = skipTrivia(text, i);
        if (text[i] === '}') return { open: openIndex, close: i, properties };
        throw new Error('Invalid JSON object separator');
    }
    throw new Error('Unterminated JSON object');
}

function scanRootObject(text: string): ObjectScan {
    const open = skipTrivia(text, 0);
    if (text[open] !== '{') throw new Error('JSON root must be an object');
    return scanObjectAt(text, open);
}

/** pos を含む行の行頭インデント（空白のみ）。行頭〜pos に空白以外があれば空文字。 */
function lineIndentAt(text: string, pos: number): string {
    const lineStart = text.lastIndexOf('\n', pos - 1) + 1;
    const head = text.slice(lineStart, pos);
    const match = head.match(/^[ \t]*/);
    return match && match[0].length === head.length ? match[0] : '';
}

/** pos を含む行の行頭の空白プレフィックス（pos の手前に空白以外があってもよい）。 */
function lineLeadingWhitespace(text: string, pos: number): string {
    const lineStart = text.lastIndexOf('\n', pos - 1) + 1;
    return text.slice(lineStart).match(/^[ \t]*/)?.[0] ?? '';
}

function formattedValue(value: unknown, indent: string): string {
    const json = JSON.stringify(value, null, 2);
    return json.replace(/\n/g, `\n${indent}`);
}

/** path の親オブジェクトまで辿り、親 scan と（あれば）末端プロパティを返す。辿れなければ null。 */
function resolveParent(text: string, path: string[]): { scan: ObjectScan; prop?: PropertyRange } | null {
    let scan = scanRootObject(text);
    for (let i = 0; i < path.length - 1; i += 1) {
        const prop = scan.properties.find(item => item.key === path[i]);
        if (!prop || text[prop.valueStart] !== '{') return null;
        scan = scanObjectAt(text, prop.valueStart);
    }
    return { scan, prop: scan.properties.find(item => item.key === path[path.length - 1]) };
}

/** scan 対象オブジェクトへ新しいプロパティを追加する（複数行なら改行整形、1 行 JSON ならインライン）。 */
function insertProperty(text: string, scan: ObjectScan, key: string, value: unknown): string {
    const parentIndent = lineLeadingWhitespace(text, scan.open);
    const indent =
        scan.properties.length > 0 ? lineIndentAt(text, scan.properties[0].keyStart) : `${parentIndent}  `;
    const entry = `${indent}${JSON.stringify(key)}: ${formattedValue(value, indent)}`;

    if (scan.properties.length === 0) {
        // 空オブジェクト。close 直前の空白を除いて改行区切りで挿入する（コメントは保持）。
        const before = text.slice(0, scan.close).replace(/\s+$/, '');
        return `${before}\n${entry}\n${parentIndent}${text.slice(scan.close)}`;
    }

    const last = scan.properties[scan.properties.length - 1];
    const separator = last.commaAfter === null ? ',' : '';
    const between = text.slice(last.valueEnd, scan.close);
    const tail = between.match(/\n[ \t]*$/);
    if (tail && tail.index !== undefined) {
        // between 末尾の「改行 + close 用インデント」の手前（行末コメント等）を保持して挿入する。
        const keep = between.slice(0, tail.index);
        return `${text.slice(0, last.valueEnd)}${separator}${keep}\n${entry}${between.slice(tail.index)}${text.slice(scan.close)}`;
    }
    // 1 行形式（{"a": 1}）はインラインで続ける。
    return `${text.slice(0, scan.close)}${separator} ${JSON.stringify(key)}: ${formattedValue(value, '')}${text.slice(scan.close)}`;
}

/** scan 対象オブジェクトからプロパティを取り除く（行ごと削除・行末コメント保持）。 */
function removeProperty(text: string, scan: ObjectScan, item: PropertyRange): string {
    const lineStart = text.lastIndexOf('\n', item.keyStart - 1) + 1;
    const ownLine = text.slice(lineStart, item.keyStart).trim() === '';

    if (item.commaAfter !== null) {
        let start = item.keyStart;
        let end = item.commaAfter + 1;
        if (ownLine) {
            // カンマの後が行末なら、行ごと削除する。
            let p = end;
            while (p < text.length && (text[p] === ' ' || text[p] === '\t')) p += 1;
            if (text[p] === '\r') p += 1;
            if (text[p] === '\n') {
                start = lineStart;
                end = p + 1;
            }
        }
        return `${text.slice(0, start)}${text.slice(end)}`;
    }

    const index = scan.properties.indexOf(item);
    if (index > 0) {
        const previous = scan.properties[index - 1];
        if (previous.commaAfter !== null) {
            // previous のカンマだけ除き、カンマ〜行頭の間（行末コメント等）は保持して行ごと削除する。
            const start = ownLine && lineStart > 0 ? lineStart - 1 : item.keyStart;
            const adjusted = start > 0 && text[start - 1] === '\r' && text[start] === '\n' ? start - 1 : start;
            const keepFrom = ownLine ? adjusted : item.keyStart;
            return `${text.slice(0, previous.commaAfter)}${text.slice(previous.commaAfter + 1, keepFrom)}${text.slice(item.valueEnd)}`;
        }
    }
    // 唯一のプロパティ。行ごと削除して空オブジェクトへ戻す。
    let start = item.keyStart;
    if (ownLine && lineStart > 0) {
        start = text[lineStart - 2] === '\r' ? lineStart - 2 : lineStart - 1;
    }
    return `${text.slice(0, start)}${text.slice(item.valueEnd)}`;
}

/**
 * ドット区切り path（配列）へ値を設定する。既存コメント・整形・他キーの文字列は保持する。
 * 中間オブジェクトは必要に応じて作成し、途中に非オブジェクト値があればネスト値ごと置き換える。
 */
export function setJsoncProperty(text: string, path: string[], value: unknown): string {
    if (path.length === 0) throw new Error('Empty property path');
    const source = text.trim().length === 0 ? '{}\n' : text;
    let scan = scanRootObject(source);
    let depth = 0;
    // 既存の中間オブジェクトを辿れるところまで辿る。
    while (depth < path.length - 1) {
        const prop = scan.properties.find(item => item.key === path[depth]);
        if (!prop || source[prop.valueStart] !== '{') break;
        scan = scanObjectAt(source, prop.valueStart);
        depth += 1;
    }
    const key = path[depth];
    const rest = path.slice(depth + 1);
    const finalValue = rest.reduceRight<unknown>((acc, segment) => ({ [segment]: acc }), value);
    const existing = scan.properties.find(item => item.key === key);
    if (existing) {
        const indent = lineIndentAt(source, existing.keyStart);
        return `${source.slice(0, existing.valueStart)}${formattedValue(finalValue, indent)}${source.slice(existing.valueEnd)}`;
    }
    return insertProperty(source, scan, key, finalValue);
}

/**
 * ドット区切り path（配列）のキーを削除する。存在しなければ入力をそのまま返す。
 * 削除で親オブジェクトが空（コメントも無し）になったら親キーも連鎖的に削除する。
 */
export function deleteJsoncProperty(text: string, path: string[]): string {
    if (path.length === 0) throw new Error('Empty property path');
    let resolved: { scan: ObjectScan; prop?: PropertyRange } | null;
    try {
        resolved = resolveParent(text, path);
    } catch {
        return text;
    }
    if (!resolved?.prop) return text;
    const removed = removeProperty(text, resolved.scan, resolved.prop);
    if (path.length > 1) {
        const parentPath = path.slice(0, -1);
        const parent = resolveParent(removed, parentPath);
        if (parent?.prop && removed[parent.prop.valueStart] === '{') {
            const parentScan = scanObjectAt(removed, parent.prop.valueStart);
            if (
                parentScan.properties.length === 0 &&
                removed.slice(parentScan.open + 1, parentScan.close).trim() === ''
            ) {
                return deleteJsoncProperty(removed, parentPath);
            }
        }
    }
    return removed;
}

/** トップレベルキーを設定する。既存コメントと他キーの文字列は保持する。 */
export function setTopLevelJsoncProperty(text: string, key: string, value: unknown): string {
    return setJsoncProperty(text, [key], value);
}

/** トップレベルキーを削除する。存在しない場合は入力をそのまま返す。 */
export function deleteTopLevelJsoncProperty(text: string, key: string): string {
    return deleteJsoncProperty(text, [key]);
}
