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

function scanRootObject(text: string): ObjectScan {
    let i = skipTrivia(text, 0);
    if (text[i] !== '{') throw new Error('JSON root must be an object');
    i += 1;
    const properties: PropertyRange[] = [];
    while (i < text.length) {
        i = skipTrivia(text, i);
        if (text[i] === '}') return { close: i, properties };
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
        if (text[i] === '}') return { close: i, properties };
        throw new Error('Invalid JSON object separator');
    }
    throw new Error('Unterminated JSON object');
}

function formattedValue(value: unknown, indent: string): string {
    const json = JSON.stringify(value, null, 2);
    return json.replace(/\n/g, `\n${indent}`);
}

/** トップレベルキーを設定する。既存コメントと他キーの文字列は保持する。 */
export function setTopLevelJsoncProperty(text: string, key: string, value: unknown): string {
    const source = text.trim().length === 0 ? '{}\n' : text;
    const scan = scanRootObject(source);
    const existing = scan.properties.find(item => item.key === key);
    if (existing) {
        const lineStart = source.lastIndexOf('\n', existing.keyStart - 1) + 1;
        const indent = source.slice(lineStart, existing.keyStart).match(/^\s*/)?.[0] ?? '  ';
        return `${source.slice(0, existing.valueStart)}${formattedValue(value, indent)}${source.slice(existing.valueEnd)}`;
    }

    const indent =
        scan.properties.length > 0
            ? source.slice(source.lastIndexOf('\n', scan.properties[0].keyStart - 1) + 1, scan.properties[0].keyStart)
            : '  ';
    const entry = `${indent}${JSON.stringify(key)}: ${formattedValue(value, indent)}`;
    if (scan.properties.length === 0) {
        return `${source.slice(0, scan.close)}\n${entry}\n${source.slice(scan.close)}`;
    }

    const last = scan.properties[scan.properties.length - 1];
    const separator = last.commaAfter === null ? ',' : '';
    return `${source.slice(0, last.valueEnd)}${separator}${source.slice(last.valueEnd, scan.close)}\n${entry}\n${source.slice(scan.close)}`;
}

/** トップレベルキーを削除する。存在しない場合は入力をそのまま返す。 */
export function deleteTopLevelJsoncProperty(text: string, key: string): string {
    const scan = scanRootObject(text);
    const index = scan.properties.findIndex(item => item.key === key);
    if (index < 0) return text;
    const item = scan.properties[index];
    if (item.commaAfter !== null) {
        return `${text.slice(0, item.keyStart)}${text.slice(item.commaAfter + 1)}`;
    }
    if (index > 0) {
        const previous = scan.properties[index - 1];
        if (previous.commaAfter !== null) {
            return `${text.slice(0, previous.commaAfter)}${text.slice(item.valueEnd)}`;
        }
    }
    return `${text.slice(0, item.keyStart)}${text.slice(item.valueEnd)}`;
}
