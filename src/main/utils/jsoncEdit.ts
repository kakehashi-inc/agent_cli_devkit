/**
 * JSONC の読み取りと、プロパティ単位の差分編集。
 * 全体を再シリアライズせず、対象の値やプロパティの文字列だけを置換または切り取る。対象外のコメント、整形、
 * キーの順序、2^53 を超える数値はバイト単位で保たれる。
 * 同じキーが複数あるときは JSON.parse と同じく最後のものを有効な値として扱う。
 */

import type { ConfigDetail, ConfigParseCode } from '../../shared/agents/configFileFailure';
import { deepEqualLoose, deleteNestedValue, getNestedValue, setNestedValue, withoutEmptyObjects } from './nestedValue';

export type JsonObject = Record<string, unknown>;

/** ルートがオブジェクトでないテキストを解釈したときの例外のメッセージ。 */
export const JSON_ROOT_ERROR = 'JSON root must be an object';

/** 移動先に同じキーの別の値がある。 */
export class JsoncConflictError extends Error {
    constructor(key: string) {
        super(key);
        this.name = 'JsoncConflictError';
    }
}

/** path の位置にある値の読み取り結果。 */
export interface JsoncScope {
    present: boolean;
    /** 値の原文。継続行は値の行のインデントを除き、改行コードはファイルのまま。値が無ければ空文字。 */
    rawText: string;
    /** 値を解釈した結果。値が無ければ undefined。 */
    value: unknown;
}

type Eol = '\n' | '\r\n';

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

/** JSONC を解釈する。先頭の UTF-8 BOM は読み飛ばす。厳密な JSON は除去の走査をせずに解釈する。 */
export function parseJsonc(text: string): unknown {
    const body = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
    try {
        return JSON.parse(body);
    } catch {
        return JSON.parse(stripTrailingCommas(stripComments(body)));
    }
}

export function parseJsoncObject(text: string): JsonObject {
    const parsed = parseJsonc(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error(JSON_ROOT_ERROR);
    }
    return parsed as JsonObject;
}

/**
 * JSON の解釈の例外を、コードと位置にする。例外のメッセージはファイル本文の抜粋を含むので、位置だけを読み取る。
 * text を渡すと、例外に行と桁が無いときに position から求める。
 */
export function jsonSyntaxProblem(error: unknown, text?: string): ConfigDetail<ConfigParseCode> {
    const message = error instanceof Error ? error.message : String(error);
    if (message === JSON_ROOT_ERROR) return { code: 'json-root' };
    const located = /\(line (\d+) column (\d+)\)/.exec(message);
    const offset = /at position (\d+)/.exec(message)?.[1];
    const position = offset === undefined ? {} : { position: Number(offset) + 1 };
    if (located) return { code: 'json-syntax', line: Number(located[1]), column: Number(located[2]), ...position };
    if (offset === undefined || text === undefined) return { code: 'json-syntax', ...position };
    const lines = text.slice(0, Number(offset)).split('\n');
    return { code: 'json-syntax', line: lines.length, column: lines[lines.length - 1].length + 1, ...position };
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

/** pos を含む行の行頭インデント（空白のみ）。行頭から pos までに空白以外があれば空文字。 */
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

/** text で多数を占める改行コードを返す。改行が無いか同数なら LF。 */
function detectEol(text: string): Eol {
    const crlf = text.match(/\r\n/g)?.length ?? 0;
    const lf = (text.match(/\n/g)?.length ?? 0) - crlf;
    return crlf > lf ? '\r\n' : '\n';
}

function formattedValue(value: unknown, indent: string, eol: Eol): string {
    const json = JSON.stringify(value, null, 2);
    return json.replace(/\n/g, `${eol}${indent}`);
}

/** 継続行の行頭から indent を除く。indent で始まらない行と改行コードはそのまま残す。 */
function dedentLines(raw: string, indent: string): string {
    if (indent === '') return raw;
    return raw.replace(
        /(\r\n?|\n)([ \t]*)/g,
        (_match, lineBreak: string, blanks: string) =>
            `${lineBreak}${blanks.startsWith(indent) ? blanks.slice(indent.length) : blanks}`
    );
}

/** 改行を eol に揃え、空でない継続行へ indent を付ける。 */
function indentLines(raw: string, indent: string, eol: Eol): string {
    return raw
        .split(/\r\n?|\n/)
        .map((line, index) => (index === 0 || line === '' ? line : `${indent}${line}`))
        .join(eol);
}

/** 前後の空白と改行コードの違いを除いた比較用の文字列を返す。 */
function comparableRaw(raw: string): string {
    return raw.trim().replace(/\r\n?/g, '\n');
}

/** 値テキストの末尾で閉じていないコメントの種類を返す。 */
function openCommentAtEnd(valueText: string): 'line' | 'block' | null {
    // コメントの内側にある番兵の x は空白に置き換わる。`*/` で閉じるのはブロックコメントだけ。
    const probe = stripComments(`${valueText}*/x`);
    if (!probe.endsWith('x')) return 'line';
    return probe.endsWith('*/x') ? null : 'block';
}

/** valueText が閉じていない行コメントで終わり、following が同じ行に続くなら改行を補う。 */
function closeLineComment(valueText: string, following: string, indent: string, eol: Eol): string {
    if (openCommentAtEnd(valueText) !== 'line' || /^[ \t]*[\r\n]/.test(following)) return valueText;
    return `${valueText}${eol}${indent}`;
}

/** raw を rest のキーで順に包んだ値テキストを返す。継続行には indent を付ける。 */
function renderNestedRaw(raw: string, rest: string[], indent: string, eol: Eol): string {
    if (rest.length === 0) return indentLines(raw, indent, eol);
    const inner = `${indent}  `;
    return `{${eol}${inner}${JSON.stringify(rest[0])}: ${renderNestedRaw(raw, rest.slice(1), inner, eol)}${eol}${indent}}`;
}

/** 空白だけのテキストを空オブジェクトの文書に置き換える。BOM と改行コードは保つ。 */
function withRootObject(text: string): string {
    if (text.trim().length > 0) return text;
    const bom = text.charCodeAt(0) === 0xfeff ? '\uFEFF' : '';
    return `${bom}{}${detectEol(text)}`;
}

/** key のプロパティを返す。重複時は最後のものを返す。 */
function findProperty(scan: ObjectScan, key: string): PropertyRange | undefined {
    for (let i = scan.properties.length - 1; i >= 0; i -= 1) {
        if (scan.properties[i].key === key) return scan.properties[i];
    }
    return undefined;
}

/** path の親オブジェクトまで辿り、親 scan と（あれば）末端プロパティを返す。辿れなければ null。 */
function resolveParent(text: string, path: string[]): { scan: ObjectScan; prop?: PropertyRange } | null {
    let scan = scanRootObject(text);
    for (let i = 0; i < path.length - 1; i += 1) {
        const prop = findProperty(scan, path[i]);
        if (!prop || text[prop.valueStart] !== '{') return null;
        scan = scanObjectAt(text, prop.valueStart);
    }
    return { scan, prop: findProperty(scan, path[path.length - 1]) };
}

/**
 * scan 対象オブジェクトへ新しいプロパティを追加する（複数行なら改行整形、1 行 JSON ならインライン）。
 * render は継続行のインデントを受け取り、値のテキストを返す。
 */
function insertProperty(
    text: string,
    scan: ObjectScan,
    key: string,
    eol: Eol,
    render: (indent: string) => string
): string {
    const parentIndent = lineLeadingWhitespace(text, scan.open);
    const indent = scan.properties.length > 0 ? lineIndentAt(text, scan.properties[0].keyStart) : `${parentIndent}  `;
    const entry = `${indent}${JSON.stringify(key)}: ${render(indent)}`;

    if (scan.properties.length === 0) {
        // 空オブジェクト。close 直前の空白を除いて改行区切りで挿入する（コメントは保持）。
        const before = text.slice(0, scan.close).trimEnd();
        return `${before}${eol}${entry}${eol}${parentIndent}${text.slice(scan.close)}`;
    }

    const last = scan.properties[scan.properties.length - 1];
    const separator = last.commaAfter === null ? ',' : '';
    const between = text.slice(last.valueEnd, scan.close);
    const tail = between.match(/\r?\n[ \t]*$/);
    if (tail && tail.index !== undefined) {
        // between 末尾の「改行 + close 用インデント」の手前（行末コメント等）を保持して挿入する。
        const keep = between.slice(0, tail.index);
        return `${text.slice(0, last.valueEnd)}${separator}${keep}${eol}${entry}${between.slice(tail.index)}${text.slice(scan.close)}`;
    }
    // 1 行形式（{"a": 1}）はインラインで続ける。
    const following = text.slice(scan.close);
    const inlineValue = closeLineComment(render(''), following, '', eol);
    return `${text.slice(0, scan.close)}${separator} ${JSON.stringify(key)}: ${inlineValue}${following}`;
}

/** start 以降の空白とタブを読み飛ばした位置を返す。 */
function skipBlanks(text: string, start: number): number {
    let i = start;
    while (text[i] === ' ' || text[i] === '\t') i += 1;
    return i;
}

/** start 以降の改行を含む空白を読み飛ばした位置を返す。 */
function skipWhitespace(text: string, start: number): number {
    let i = start;
    while (i < text.length && /\s/.test(text[i])) i += 1;
    return i;
}

/** pos にある改行の文字数を返す。改行でなければ 0。 */
function eolLengthAt(text: string, pos: number): number {
    if (text[pos] === '\n') return 1;
    return text[pos] === '\r' && text[pos + 1] === '\n' ? 2 : 0;
}

/**
 * scan 対象オブジェクトからプロパティの文字列だけを切り取る。
 * 行全体を占めるプロパティは行ごと切り取り、それ以外は隣り合う空白までを切り取る。
 * 後続のプロパティが無ければ直前のプロパティのカンマも除く。コメントを含む他の文字列は残す。
 */
function removeProperty(text: string, scan: ObjectScan, item: PropertyRange): string {
    const afterBlanks = skipBlanks(text, item.commaAfter !== null ? item.commaAfter + 1 : item.valueEnd);
    const eolLength = eolLengthAt(text, afterBlanks);
    const lineStart = text.lastIndexOf('\n', item.keyStart - 1) + 1;
    const wholeLine = eolLength > 0 && text.slice(lineStart, item.keyStart).trim() === '';
    const wholeLineEnd = afterBlanks + eolLength;

    const index = scan.properties.indexOf(item);
    const previousComma = item.commaAfter === null && index > 0 ? scan.properties[index - 1].commaAfter : null;
    if (previousComma === null) {
        if (wholeLine) return `${text.slice(0, lineStart)}${text.slice(wholeLineEnd)}`;
        // キーの前に文字がある行で行末まで占めるなら、次の要素をこの位置へ詰める。
        const end = eolLength > 0 ? skipWhitespace(text, afterBlanks) : afterBlanks;
        return `${text.slice(0, item.keyStart)}${text.slice(end)}`;
    }
    if (!wholeLine && text.slice(previousComma + 1, item.keyStart).trim() === '') {
        return `${text.slice(0, previousComma)}${text.slice(item.valueEnd)}`;
    }
    // カンマとの間にコメントがある。カンマとプロパティだけを切り取り、コメントと改行は残す。
    const start = wholeLine ? lineStart : item.keyStart;
    const end = wholeLine ? wholeLineEnd : afterBlanks;
    return `${text.slice(0, previousComma)}${text.slice(previousComma + 1, start)}${text.slice(end)}`;
}

/** path のキーを重複も含めて切り取る。cascade なら空（コメントも無し）になった親キーも切り取る。 */
function removeAtPath(text: string, path: string[], cascade: boolean): string {
    let result = text;
    let resolved = resolveParent(result, path);
    while (resolved?.prop) {
        result = removeProperty(result, resolved.scan, resolved.prop);
        resolved = resolveParent(result, path);
    }
    if (result === text || !cascade || path.length === 1) return result;
    const parentPath = path.slice(0, -1);
    const parent = resolveParent(result, parentPath)?.prop;
    if (parent && result[parent.valueStart] === '{') {
        const parentScan = scanObjectAt(result, parent.valueStart);
        if (parentScan.properties.length === 0 && result.slice(parentScan.open + 1, parentScan.close).trim() === '') {
            return removeAtPath(result, parentPath, true);
        }
    }
    return result;
}

/**
 * path（キーの配列）の値を読み取る。キーや中間オブジェクトが無ければ present: false を返す。
 * 空白だけのテキストは空のオブジェクトとして扱い、不正な JSONC とオブジェクト以外のルートは例外を投げる。
 */
export function readJsoncScope(text: string, path: string[]): JsoncScope {
    if (path.length === 0) throw new Error('Empty property path');
    const absent: JsoncScope = { present: false, rawText: '', value: undefined };
    if (text.trim().length === 0) return absent;
    parseJsonc(text);
    const prop = resolveParent(text, path)?.prop;
    if (!prop) return absent;
    const raw = text.slice(prop.valueStart, prop.valueEnd);
    return {
        present: true,
        rawText: dedentLines(raw, lineLeadingWhitespace(text, prop.valueStart)),
        value: parseJsonc(raw),
    };
}

/**
 * path（キーの配列）の値を生テキストで置き換える。キーが無ければ追加し、無い中間オブジェクトは作成する。
 * rawValueText は単一の値で、コメントを含められる。改行はファイルの改行コードに揃え、継続行へ値の行のインデントを付ける。
 * 置き換える値の外側の文字列は変えない。改行コードと前後の空白を除いて現在の値と同じなら入力をそのまま返す。
 * text や rawValueText が不正なとき、中間の値がオブジェクトでないときは例外を投げる。
 */
export function setJsoncRaw(text: string, path: string[], rawValueText: string): string {
    if (path.length === 0) throw new Error('Empty property path');
    const raw = rawValueText.trim();
    parseJsonc(raw);
    if (openCommentAtEnd(raw) === 'block') throw new Error('Unterminated block comment');
    const source = withRootObject(text);
    parseJsonc(source);
    const eol = detectEol(source);

    let scan = scanRootObject(source);
    let depth = 0;
    while (depth < path.length - 1) {
        const parent = findProperty(scan, path[depth]);
        if (!parent) break;
        if (source[parent.valueStart] !== '{') throw new Error('Intermediate JSON value is not an object');
        scan = scanObjectAt(source, parent.valueStart);
        depth += 1;
    }

    let result: string;
    const existing = findProperty(scan, path[depth]);
    if (existing) {
        const indent = lineLeadingWhitespace(source, existing.valueStart);
        const current = dedentLines(source.slice(existing.valueStart, existing.valueEnd), indent);
        if (comparableRaw(current) === comparableRaw(raw)) return text;
        const following = source.slice(existing.valueEnd);
        const body = closeLineComment(indentLines(raw, indent, eol), following, indent, eol);
        result = `${source.slice(0, existing.valueStart)}${body}${following}`;
    } else {
        const rest = path.slice(depth + 1);
        result = insertProperty(source, scan, path[depth], eol, indent => renderNestedRaw(raw, rest, indent, eol));
    }
    parseJsonc(result);
    return result;
}

/**
 * path（キーの配列）のプロパティの文字列だけを切り取る。キーが無ければ入力をそのまま返す。
 * cascade が false なら最後のキーを切り取った親は空オブジェクトのまま残り、true なら親キーも切り取る。
 * 不正な JSONC とオブジェクト以外のルートは例外を投げる。
 */
export function removeJsoncProperty(text: string, path: string[], opts: { cascade: boolean }): string {
    if (path.length === 0) throw new Error('Empty property path');
    if (text.trim().length === 0) return text;
    parseJsonc(text);
    const result = removeAtPath(text, path, opts.cascade);
    parseJsonc(result);
    return result;
}

/** 空白だけのテキストを空のオブジェクトとして解釈する。 */
function parseJsoncOrEmpty(text: string): JsonObject {
    return text.trim().length === 0 ? {} : parseJsoncObject(text);
}

/**
 * from の fromPath の値を原文のまま to の toPath へ移した 2 つのテキストを返す。値が無ければ null。
 * 値の中のコメントと 2^53 を超える数値はそのまま移る。cascade は移動元で空になった親キーの扱い（removeJsoncProperty と同じ）。
 * 移動先に同じ値があれば移動先を変えず、別の値があれば JsoncConflictError を投げる。
 * 結果は parse して「移動元から値を除いた内容」と「移動先に値を加えた内容」に一致することを確かめ、一致しなければ例外を投げる。
 */
export function moveJsoncValue(
    from: string,
    to: string,
    fromPath: string[],
    toPath: string[],
    opts: { cascade: boolean }
): { from: string; to: string } | null {
    const scope = readJsoncScope(from, fromPath);
    if (!scope.present) return null;
    const existing = readJsoncScope(to, toPath);
    if (existing.present && !deepEqualLoose(existing.value, scope.value)) {
        throw new JsoncConflictError(toPath[toPath.length - 1]);
    }
    const nextTo = existing.present ? to : setJsoncRaw(to, toPath, scope.rawText);
    const nextFrom = removeJsoncProperty(from, fromPath, opts);

    const expectedFrom = parseJsoncOrEmpty(from);
    deleteNestedValue(expectedFrom, fromPath, opts.cascade);
    const expectedTo = parseJsoncOrEmpty(to);
    setNestedValue(expectedTo, toPath, scope.value);
    const movedValue = getNestedValue(parseJsoncOrEmpty(nextTo), toPath);
    if (
        !deepEqualLoose(movedValue, scope.value) ||
        !deepEqualLoose(parseJsoncOrEmpty(nextTo), expectedTo) ||
        !deepEqualLoose(withoutEmptyObjects(parseJsoncOrEmpty(nextFrom)), withoutEmptyObjects(expectedFrom))
    ) {
        throw new Error('The moved JSON value does not match the expected content');
    }
    return { from: nextFrom, to: nextTo };
}

/** path の位置にある配列の読み取り結果。 */
export interface JsoncArrayScope {
    present: boolean;
    /** 値が配列か。値が無いときと配列以外のときは false。 */
    isArray: boolean;
    /** 要素の並び。rawText は要素の原文で、継続行は値の行のインデントを除く。 */
    elements: { rawText: string; value: unknown }[];
}

/** 配列へ挿入する要素。index は挿入前の配列の位置で、rawText は単一の値の原文。 */
export interface JsoncArrayInsert {
    index: number;
    rawText: string;
}

/** openIndex（`[` の位置）から 1 つの配列を走査する。要素の範囲をプロパティの範囲と同じ形で返す。 */
function scanArrayAt(text: string, openIndex: number): ObjectScan {
    if (text[openIndex] !== '[') throw new Error('Expected JSON array');
    let i = openIndex + 1;
    const properties: PropertyRange[] = [];
    while (i < text.length) {
        i = skipTrivia(text, i);
        if (text[i] === ']') return { open: openIndex, close: i, properties };
        const valueStart = i;
        const valueEnd = readValueEnd(text, valueStart);
        i = skipTrivia(text, valueEnd);
        const commaAfter = text[i] === ',' ? i : null;
        properties.push({ key: '', keyStart: valueStart, valueStart, valueEnd, commaAfter });
        if (commaAfter !== null) {
            i += 1;
            continue;
        }
        if (text[i] === ']') return { open: openIndex, close: i, properties };
        throw new Error('Invalid JSON array separator');
    }
    throw new Error('Unterminated JSON array');
}

/** path の値が配列ならその走査結果を返す。値が無ければ null を返し、配列以外なら例外を投げる。 */
function resolveArray(text: string, path: string[]): ObjectScan | null {
    const prop = resolveParent(text, path)?.prop;
    if (!prop) return null;
    if (text[prop.valueStart] !== '[') throw new Error('The JSON value is not an array');
    return scanArrayAt(text, prop.valueStart);
}

/** テキストのコメントを出現順に返す。 */
function commentsOf(text: string): string[] {
    const comments: string[] = [];
    let i = 0;
    while (i < text.length) {
        if (text[i] === '"') {
            i = readStringEnd(text, i);
            continue;
        }
        if (text[i] === '/' && text[i + 1] === '/') {
            let end = i + 2;
            while (end < text.length && text[end] !== '\n' && text[end] !== '\r') end += 1;
            comments.push(text.slice(i, end).trimEnd());
            i = end;
            continue;
        }
        if (text[i] === '/' && text[i + 1] === '*') {
            const close = text.indexOf('*/', i + 2);
            const end = close === -1 ? text.length : close + 2;
            comments.push(text.slice(i, end));
            i = end;
            continue;
        }
        i += 1;
    }
    return comments;
}

/**
 * 配列の編集の結果を確かめる。配列が expected と一致し、配列の外の内容が変わらず、kept のコメントがすべて残っていなければ例外を投げる。
 * expected が空なら、配列のキーが無くなっていてもよい。
 */
function assertArrayEdit(before: string, after: string, path: string[], expected: unknown[], kept: string): void {
    const parsedBefore = parseJsoncOrEmpty(before);
    const parsedAfter = parseJsoncOrEmpty(after);
    const value = getNestedValue(parsedAfter, path);
    const matched = value === undefined ? expected.length === 0 : deepEqualLoose(value, expected);
    deleteNestedValue(parsedBefore, path, false);
    deleteNestedValue(parsedAfter, path, false);
    if (!matched || !deepEqualLoose(parsedAfter, parsedBefore)) {
        throw new Error('The edited JSON array does not match the expected content');
    }
    const remaining = commentsOf(after);
    for (const comment of commentsOf(kept)) {
        const index = remaining.indexOf(comment);
        if (index === -1) throw new Error('The edit would lose a comment in the JSON file');
        remaining.splice(index, 1);
    }
}

/**
 * path（キーの配列）の配列の要素を原文のまま読み取る。キーや中間オブジェクトが無ければ present: false を返す。
 * 不正な JSONC とオブジェクト以外のルートは例外を投げる。
 */
export function readJsoncArray(text: string, path: string[]): JsoncArrayScope {
    if (path.length === 0) throw new Error('Empty property path');
    if (text.trim().length === 0) return { present: false, isArray: false, elements: [] };
    parseJsonc(text);
    const prop = resolveParent(text, path)?.prop;
    if (!prop) return { present: false, isArray: false, elements: [] };
    if (text[prop.valueStart] !== '[') return { present: true, isArray: false, elements: [] };
    const elements = scanArrayAt(text, prop.valueStart).properties.map(element => {
        const raw = text.slice(element.valueStart, element.valueEnd);
        return {
            rawText: dedentLines(raw, lineLeadingWhitespace(text, element.valueStart)),
            value: parseJsonc(raw),
        };
    });
    return { present: true, isArray: true, elements };
}

/**
 * path の配列から indexes の位置の要素の文字列だけを切り取る。配列の外と、残す要素の原文とコメントはそのまま残す。
 * 要素もコメントも残らなければ配列のキーも切り取る。path が配列でないとき、index が範囲外のときは例外を投げる。
 * 結果は parse して期待する内容と一致し、切り取る要素の外のコメントが残っていることを確かめ、そうでなければ例外を投げる。
 */
export function removeJsoncArrayElements(text: string, path: string[], indexes: readonly number[]): string {
    if (path.length === 0) throw new Error('Empty property path');
    if (indexes.length === 0) return text;
    const scan = resolveArray(text, path);
    if (!scan) throw new Error('The JSON array does not exist');
    const removed = [...new Set(indexes)].sort((a, b) => b - a);
    if (removed.some(index => !scan.properties[index])) throw new Error('JSON array index out of range');
    const current = readJsoncArray(text, path).elements.map(element => element.value);

    let result = text;
    let kept = text;
    for (const index of removed) {
        const fresh = resolveArray(result, path) as ObjectScan;
        result = removeProperty(result, fresh, fresh.properties[index]);
        const { valueStart, valueEnd } = scan.properties[index];
        kept = `${kept.slice(0, valueStart)}${kept.slice(valueEnd)}`;
    }
    const after = resolveArray(result, path) as ObjectScan;
    if (after.properties.length === 0 && result.slice(after.open + 1, after.close).trim() === '') {
        result = removeAtPath(result, path, false);
    }
    assertArrayEdit(
        text,
        result,
        path,
        current.filter((_, index) => !removed.includes(index)),
        kept
    );
    return result;
}

/** 1 つの要素を、走査済みの配列の index の位置へ周囲の書式に合わせて挿入する。 */
function insertArrayElement(text: string, scan: ObjectScan, index: number, raw: string, eol: Eol): string {
    const elements = scan.properties;
    const baseIndent = lineLeadingWhitespace(text, scan.open);
    const closeLineStart = text.lastIndexOf('\n', scan.close - 1) + 1;
    const closeOnOwnLine = closeLineStart > scan.open && text.slice(closeLineStart, scan.close).trim() === '';

    if (index < elements.length) {
        const target = elements[index];
        const lineStart = text.lastIndexOf('\n', target.keyStart - 1) + 1;
        // 要素の前に同じ行のコメントしかなければ、その行の前へ新しい行を挿入してコメントを要素に付けたままにする。
        if (lineStart > scan.open && skipTrivia(text, lineStart) === target.keyStart) {
            const indent = lineLeadingWhitespace(text, target.keyStart);
            const line = `${indent}${indentLines(raw, indent, eol)},${eol}`;
            return `${text.slice(0, lineStart)}${line}${text.slice(lineStart)}`;
        }
        const indent = lineLeadingWhitespace(text, target.keyStart);
        return `${text.slice(0, target.keyStart)}${indentLines(raw, indent, eol)}, ${text.slice(target.keyStart)}`;
    }

    const memberIndent = `${baseIndent}  `;
    if (elements.length === 0) {
        if (text.slice(scan.open + 1, scan.close).trim() === '') {
            if (!text.includes('\n')) return `${text.slice(0, scan.open + 1)}${raw}${text.slice(scan.close)}`;
            const body = indentLines(raw, memberIndent, eol);
            return `${text.slice(0, scan.open + 1)}${eol}${memberIndent}${body}${eol}${baseIndent}${text.slice(scan.close)}`;
        }
        if (closeOnOwnLine) {
            const line = `${memberIndent}${indentLines(raw, memberIndent, eol)}${eol}`;
            return `${text.slice(0, closeLineStart)}${line}${text.slice(closeLineStart)}`;
        }
        return `${text.slice(0, scan.close)}${indentLines(raw, baseIndent, eol)} ${text.slice(scan.close)}`;
    }

    const last = elements[elements.length - 1];
    const hadTrailingComma = last.commaAfter !== null;
    const trailing = hadTrailingComma ? ',' : '';
    const withComma = hadTrailingComma ? text : `${text.slice(0, last.valueEnd)},${text.slice(last.valueEnd)}`;
    if (closeOnOwnLine) {
        const lastLineStart = text.lastIndexOf('\n', last.keyStart - 1) + 1;
        const lastOwnLine = lastLineStart > scan.open && text.slice(lastLineStart, last.keyStart).trim() === '';
        const indent = lastOwnLine ? text.slice(lastLineStart, last.keyStart) : memberIndent;
        const at = closeLineStart + (hadTrailingComma ? 0 : 1);
        const line = `${indent}${indentLines(raw, indent, eol)}${trailing}${eol}`;
        return `${withComma.slice(0, at)}${line}${withComma.slice(at)}`;
    }
    const at = (last.commaAfter ?? last.valueEnd) + 1;
    const indent = lineLeadingWhitespace(text, last.keyStart);
    return `${withComma.slice(0, at)} ${indentLines(raw, indent, eol)}${trailing}${withComma.slice(at)}`;
}

/**
 * path の配列へ要素を原文のまま挿入する。配列の外と既存の要素の原文とコメントはそのまま残す。同じ index の要素は渡した順に並ぶ。
 * キーが無ければ配列を作る。path が配列でないとき、index が範囲外のとき、rawText が単一の値でないときは例外を投げる。
 * 結果は parse して期待する内容と一致し、コメントが残っていることを確かめ、そうでなければ例外を投げる。
 */
export function insertJsoncArrayElements(text: string, path: string[], inserts: readonly JsoncArrayInsert[]): string {
    if (path.length === 0) throw new Error('Empty property path');
    if (inserts.length === 0) return text;
    const source = withRootObject(text);
    const raws = inserts.map(item => item.rawText.trim());
    for (const raw of raws) {
        parseJsonc(raw);
        if (openCommentAtEnd(raw) !== null) throw new Error('A JSON array element must not end with a comment');
    }
    const current = readJsoncArray(source, path);
    if (current.present && !current.isArray) throw new Error('The JSON value is not an array');
    const length = current.elements.length;
    if (inserts.some(item => item.index < 0 || item.index > length)) throw new Error('JSON array index out of range');

    const expected: unknown[] = [];
    for (let at = 0; at <= length; at += 1) {
        raws.forEach((raw, position) => {
            if (inserts[position].index === at) expected.push(parseJsonc(raw));
        });
        if (at < length) expected.push(current.elements[at].value);
    }

    let result: string;
    if (current.present) {
        const eol = detectEol(source);
        result = source;
        // 後ろの位置から順に挿入する。同じ位置は後の要素から挿入して、渡した順に並べる。
        const order = inserts.map((item, position) => ({ index: item.index, raw: raws[position], position }));
        order.sort((a, b) => b.index - a.index || b.position - a.position);
        for (const item of order) {
            result = insertArrayElement(result, resolveArray(result, path) as ObjectScan, item.index, item.raw, eol);
        }
    } else {
        const body = raws.map(raw => `  ${indentLines(raw, '  ', '\n')}`).join(',\n');
        result = setJsoncRaw(source, path, `[\n${body}\n]`);
    }
    assertArrayEdit(source, result, path, expected, source);
    return result;
}

/** 配列の要素も辿る値の位置。文字列はオブジェクトのキー、数値は配列の位置。 */
export type JsoncValuePath = readonly (string | number)[];

/** path の値の範囲を返す。辿れなければ null。 */
function locateValueAt(text: string, path: JsoncValuePath): { start: number; end: number } | null {
    let start = skipTrivia(text, 0);
    let end = readValueEnd(text, start);
    for (const segment of path) {
        const item =
            typeof segment === 'string'
                ? text[start] === '{'
                    ? findProperty(scanObjectAt(text, start), segment)
                    : undefined
                : text[start] === '['
                  ? scanArrayAt(text, start).properties[segment]
                  : undefined;
        if (!item) return null;
        start = item.valueStart;
        end = item.valueEnd;
    }
    return { start, end };
}

/** path の配列の走査結果を返す。配列でなければ例外を投げる。 */
function arrayScanAt(text: string, path: JsoncValuePath): ObjectScan {
    const range = locateValueAt(text, path);
    if (!range || text[range.start] !== '[') throw new Error('The JSON value is not an array');
    return scanArrayAt(text, range.start);
}

/**
 * path の値を原文で置き換える。値の外側の文字列は変えない。継続行へ値の行のインデントを付け、改行はファイルに揃える。
 * 値が無いときと、rawText が単一の値でないときは例外を投げる。
 */
export function replaceJsoncValueAt(text: string, path: JsoncValuePath, rawText: string): string {
    const range = locateValueAt(text, path);
    if (!range) throw new Error('The JSON value does not exist');
    const raw = rawText.trim();
    parseJsonc(raw);
    const eol = detectEol(text);
    const indent = lineLeadingWhitespace(text, range.start);
    const following = text.slice(range.end);
    const body = closeLineComment(indentLines(raw, indent, eol), following, indent, eol);
    const result = `${text.slice(0, range.start)}${body}${following}`;
    parseJsonc(result);
    return result;
}

/** path の配列の index の要素の文字列だけを切り取る。配列のキーは残す。index が範囲外なら例外を投げる。 */
export function removeJsoncElementAt(text: string, path: JsoncValuePath, index: number): string {
    const scan = arrayScanAt(text, path);
    const item = scan.properties[index];
    if (!item) throw new Error('JSON array index out of range');
    const result = removeProperty(text, scan, item);
    parseJsonc(result);
    return result;
}

/** path の配列の index の位置へ要素を原文のまま挿入する。index が範囲外なら例外を投げる。 */
export function insertJsoncElementAt(text: string, path: JsoncValuePath, index: number, rawText: string): string {
    const scan = arrayScanAt(text, path);
    if (index < 0 || index > scan.properties.length) throw new Error('JSON array index out of range');
    const raw = rawText.trim();
    parseJsonc(raw);
    const result = insertArrayElement(text, scan, index, raw, detectEol(text));
    parseJsonc(result);
    return result;
}

/** path の配列に要素もコメントも無いか。 */
export function isJsoncArrayBlankAt(text: string, path: JsoncValuePath): boolean {
    const scan = arrayScanAt(text, path);
    return scan.properties.length === 0 && text.slice(scan.open + 1, scan.close).trim() === '';
}

/** 2 文字の空白で字下げした raw の行頭の字下げを、文書の最初の字下げされたキーと同じ単位にする。 */
export function reindentJsoncRaw(raw: string, documentText: string): string {
    const unit = /^([ \t]+)"/m.exec(documentText)?.[1] ?? '  ';
    return raw.replace(/^(?: {2})+/gm, run => unit.repeat(run.length / 2));
}

/** 文字列の末尾に閉じていないブロックコメントがなければ、最初の改行の手前までを切り出す。 */
function sameLineTail(region: string): string {
    const lineBreak = region.search(/\r?\n/);
    if (lineBreak === -1) return '';
    const tail = region.slice(0, lineBreak);
    return openCommentAtEnd(tail) === 'block' ? '' : tail;
}

/**
 * path のオブジェクトのプロパティを order の順に並べ替える。order に無いものは元の順で後ろに続く。
 * 値の原文は変えない。プロパティの直前のコメントと同じ行の末尾のコメントは一緒に動く。末尾カンマの有無は保つ。
 * 対象が無いか順序が変わらなければ入力をそのまま返す。同じキーが重複するオブジェクトは例外を投げる。
 * 結果は parse して元の内容と一致することを確かめ、一致しなければ例外を投げる。
 */
export function reorderJsoncProperties(text: string, path: string[], order: string[]): string {
    if (path.length === 0) throw new Error('Empty property path');
    if (text.trim().length === 0) return text;
    const before = parseJsonc(text);
    const prop = resolveParent(text, path)?.prop;
    if (!prop || text[prop.valueStart] !== '{') return text;
    const scan = scanObjectAt(text, prop.valueStart);
    const { properties } = scan;
    if (new Set(properties.map(item => item.key)).size !== properties.length) {
        throw new Error('The JSON object has duplicate keys');
    }
    const rank = (key: string) => {
        const index = order.indexOf(key);
        return index === -1 ? order.length : index;
    };
    const sorted = [...properties].sort((a, b) => rank(a.key) - rank(b.key));
    if (sorted.every((item, index) => item === properties[index])) return text;

    // プロパティごとの断片（前の空白とコメント、本体、同じ行の末尾）と、最後のプロパティの後ろの残りに分ける。
    let cursor = scan.open + 1;
    let rest = '';
    const pieces = new Map<PropertyRange, { lead: string; body: string; tail: string }>();
    const leads: string[] = [];
    properties.forEach((item, index) => {
        const after = item.commaAfter !== null ? item.commaAfter + 1 : item.valueEnd;
        const next = properties[index + 1];
        const region = text.slice(after, next ? next.keyStart : scan.close);
        const tail = sameLineTail(region);
        const lead = text.slice(cursor, item.keyStart);
        leads.push(lead);
        const body = text.slice(item.keyStart, item.commaAfter ?? item.valueEnd);
        pieces.set(item, { lead, body, tail });
        cursor = after + tail.length;
        if (!next) rest = region.slice(tail.length);
    });
    const hadFinalComma = properties[properties.length - 1].commaAfter !== null;
    const body = sorted
        .map((item, index) => {
            const piece = pieces.get(item) as { lead: string; body: string; tail: string };
            // コメントのない空白はその位置の整形を使い、コメントはプロパティと一緒に動かす。
            const lead = piece.lead.trim().length === 0 && leads[index].trim().length === 0 ? leads[index] : piece.lead;
            const comma = index < sorted.length - 1 || hadFinalComma ? ',' : '';
            return `${lead}${piece.body}${comma}${piece.tail}`;
        })
        .join('');
    const result = `${text.slice(0, scan.open + 1)}${body}${rest}${text.slice(scan.close)}`;
    if (!deepEqualLoose(parseJsonc(result), before)) {
        throw new Error('The reordered JSON does not match the original content');
    }
    return result;
}

/**
 * path（キーの配列）へ値を設定する。既存コメント・整形・他キーの文字列は保持し、値の改行はファイルの改行コードに揃える。
 * 中間オブジェクトは必要に応じて作成し、途中に非オブジェクト値があればネスト値ごと置き換える。
 */
export function setJsoncProperty(text: string, path: string[], value: unknown): string {
    if (path.length === 0) throw new Error('Empty property path');
    const source = withRootObject(text);
    const eol = detectEol(source);
    let scan = scanRootObject(source);
    let depth = 0;
    // 既存の中間オブジェクトを辿れるところまで辿る。
    while (depth < path.length - 1) {
        const prop = findProperty(scan, path[depth]);
        if (!prop || source[prop.valueStart] !== '{') break;
        scan = scanObjectAt(source, prop.valueStart);
        depth += 1;
    }
    const key = path[depth];
    const rest = path.slice(depth + 1);
    const finalValue = rest.reduceRight<unknown>((acc, segment) => ({ [segment]: acc }), value);
    const existing = findProperty(scan, key);
    if (existing) {
        const indent = lineIndentAt(source, existing.keyStart);
        return `${source.slice(0, existing.valueStart)}${formattedValue(finalValue, indent, eol)}${source.slice(existing.valueEnd)}`;
    }
    return insertProperty(source, scan, key, eol, indent => formattedValue(finalValue, indent, eol));
}

/**
 * path（キーの配列）のキーを削除する。存在しないか構造を辿れなければ入力をそのまま返す。
 * 削除で親オブジェクトが空（コメントも無し）になったら親キーも連鎖的に削除する。
 */
export function deleteJsoncProperty(text: string, path: string[]): string {
    if (path.length === 0) throw new Error('Empty property path');
    try {
        resolveParent(text, path);
    } catch {
        return text;
    }
    return removeAtPath(text, path, true);
}

/** トップレベルキーを設定する。既存コメントと他キーの文字列は保持する。 */
export function setTopLevelJsoncProperty(text: string, key: string, value: unknown): string {
    return setJsoncProperty(text, [key], value);
}

/** トップレベルキーを削除する。存在しない場合は入力をそのまま返す。 */
export function deleteTopLevelJsoncProperty(text: string, key: string): string {
    return deleteJsoncProperty(text, [key]);
}
