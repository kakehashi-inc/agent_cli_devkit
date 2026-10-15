/**
 * Markdown の YAML frontmatter（先頭の `---` で囲まれたヘッダー部）を読み取る軽量ユーティリティ。
 *
 * SKILL.md などの先頭にある以下の形式を対象とする:
 *   ---
 *   name: foo
 *   description: ...
 *   ---
 *
 * 依存を増やさずテキストベースで処理する（書き戻しは行わない読み取り専用）。
 * トップレベルの `key: value` を対象とし、スカラーは YAML の書式（引用符・エスケープ・複数行・
 * ブロックスカラー）に従って復元する。スカラー項目だけのリスト（ブロック形式・フロー形式）はカンマ区切りの
 * 1 行文字列、1 階層目のマップ値（ブロック形式・フロー形式）は `親キー.子キー` として扱う
 * （一覧表示・参照ダイアログ用途には十分）。引用符の無い `~` / `null` は空文字列として読む。
 * 値中の `:` など YAML として不正でも各 CLI が許容する書き方は、値の一部として寛容に読む。
 * どの行も長さに比例する時間で読む（空白が長く続く行でも処理時間が膨らまない）。
 * 先頭の BOM（U+FEFF）は除いて読む。
 */
import { stripBom } from '../services/common/json/stripBom';

export interface ParsedFrontmatter {
    // `---` の内側そのままの生テキスト（前後の `---` 行は含まない、改行はそのまま）
    raw: string;
    // トップレベルの key: value（value は YAML の書式から復元した文字列）
    fields: Record<string, string>;
}

/**
 * 先頭の frontmatter ブロックを抽出する。frontmatter が無ければ null。
 * - 先頭行が `---`（前後空白許容）で始まり、次の `---` 行までを raw とする。
 */
export function parseFrontmatter(content: string | null): ParsedFrontmatter | null {
    if (!content) {
        return null;
    }
    const lines = stripBom(content).split(/\r?\n/);

    // 先頭の空行をスキップ
    let start = 0;
    while (start < lines.length && lines[start].trim() === '') {
        start++;
    }
    if (start >= lines.length || lines[start].trim() !== '---') {
        return null;
    }

    // 次の `---` を探す
    let end = -1;
    for (let i = start + 1; i < lines.length; i++) {
        if (lines[i].trim() === '---') {
            end = i;
            break;
        }
    }
    if (end === -1) {
        return null;
    }

    const bodyLines = lines.slice(start + 1, end);
    const raw = bodyLines.join('\n');
    const fields = parseScalarFields(bodyLines);
    return { raw, fields };
}

/**
 * YAML テキスト（frontmatter 以外の設定ファイル等）から、parseFrontmatter の fields と同じ規則で
 * トップレベルのスカラーと 1 階層目のマップ値を抽出する。
 */
export function parseYamlScalars(content: string | null): Record<string, string> {
    if (!content) {
        return {};
    }
    return parseScalarFields(stripBom(content).split(/\r?\n/));
}

// ブロックスカラーのヘッダー（`|` / `>` に任意のチョンプ・インデント指示子と行末コメント）。
const BLOCK_HEADER = /^([|>])([1-9][-+]?|[-+][1-9]?)?\s*(#.*)?$/;
// 空白文字（YAML の区切りとして扱う文字）。
const WHITE = /\s/;
// 引用符の無い null の書き方（空文字列として読む）。
const NULL_SCALARS = new Set(['~', 'null', 'Null', 'NULL']);
// フロー形式で値の区切りになる文字（直後に続く `:` をキーと値の区切りとみなす）。
const FLOW_INDICATORS = ',[]{}';
// フロー形式のコレクションを読み進める入れ子の深さ（一覧の値は 2 階層目の種類まで分かれば決まる）。
const FLOW_PARSE_LEVELS = 3;

/** フロー形式の値。スカラーは文字列、コレクションはリストの項目またはマップのキーと値の組。 */
type FlowNode = string | { kind: 'list'; items: FlowNode[] } | { kind: 'map'; entries: [string, FlowNode][] };

/** `key: value` 行の分解結果。key は引用符を含むキーの文字列、rest は区切りの空白を除いた値（行末まで）。 */
interface KeyLine {
    key: string;
    rest: string;
}

/** 行頭の空白数。 */
function indentOf(line: string): number {
    return line.length - line.trimStart().length;
}

/** 空白文字か。範囲外（undefined）は空白ではない。 */
function isWhite(ch: string | undefined): boolean {
    return ch !== undefined && WHITE.test(ch);
}

/** 空行またはコメント行か。 */
function isBlankOrComment(line: string): boolean {
    const trimmed = line.trim();
    return trimmed === '' || trimmed.startsWith('#');
}

/** 前後の空白を除いた行がシーケンスの項目（`-` 単独、または `-` の後に空白が続く）か。 */
function isSequenceItem(trimmed: string): boolean {
    return trimmed === '-' || (trimmed.startsWith('-') && isWhite(trimmed[1]));
}

/** 空行・コメント行を読み飛ばした次の行番号。 */
function nextContentLine(lines: string[], start: number): number {
    let j = start;
    while (j < lines.length && isBlankOrComment(lines[j])) {
        j++;
    }
    return j;
}

/**
 * `key: value` 行を分解する。該当しなければ null。
 * キーは引用符付き、または `:` を含まない文字列（先頭は空白・`#`・`:`・引用符・フロー形式の開き括弧以外。
 * 末尾の空白は除く）。区切りの `:` の後は空白か行末でなければならない。
 */
function matchKeyLine(line: string): KeyLine | null {
    const first = line[0];
    if (first === undefined) {
        return null;
    }
    let keyEnd: number;
    let colon: number;
    if (first === '"' || first === "'") {
        const close = findClosingQuote(line, first, 1);
        if (close < 0) {
            return null;
        }
        keyEnd = close + 1;
        colon = keyEnd;
        while (colon < line.length && isWhite(line[colon])) {
            colon++;
        }
        if (line[colon] !== ':') {
            return null;
        }
    } else {
        if (first === ':' || first === '#' || first === '[' || first === '{' || isWhite(first)) {
            return null;
        }
        colon = line.indexOf(':');
        if (colon < 0) {
            return null;
        }
        keyEnd = colon;
        while (keyEnd > 0 && isWhite(line[keyEnd - 1])) {
            keyEnd--;
        }
    }
    let restStart = colon + 1;
    if (restStart < line.length && !isWhite(line[restStart])) {
        return null;
    }
    while (restStart < line.length && isWhite(line[restStart])) {
        restStart++;
    }
    return { key: line.slice(0, keyEnd), rest: line.slice(restStart) };
}

/**
 * 行配列からトップレベルの `key: value` を抽出する。
 * - スカラー値は YAML の書式に従って文字列へ復元する: プレーン（インデントした継続行は空白で連結）、
 *   ダブルクォート（エスケープを解釈し、行末の `\` で区切った行は改行を除いて連結）、シングルクォート
 *   （`''` を `'` に戻す）、ブロックスカラー（`|` は改行を保持、`>` は折り返しを空白に置換。チョンプ・
 *   インデント指示子に対応）。引用符の値が複数行にまたがる場合も YAML と同じ規則で連結する。
 *   引用符の無い `~` / `null` は空文字列とする。
 * - 値はキーと同じ行のほか、値が空のキーに続くより深いインデントの行から始まってもよい
 *   （その行が引用符・フロー形式・プレーンの値である場合）。
 * - スカラー項目だけのリスト（フロー形式の `[a, b]` と、値が空のキーに続く `- a` 行）は、項目をカンマ区切りの
 *   1 行文字列にまとめる。フロー形式は複数行にまたがってもよい。
 * - マップ（値が空のキーに続く `子キー: 値` 行と、フロー形式の `{ 子キー: 値 }`）は、1 階層目を
 *   `親キー.子キー` として追加する（親キー自体の値は空文字列。2 階層目以降のマップの値は空文字列）。
 * - マップやリストを項目に持つリストは値を空文字列とする。
 * - 値中の `:`（例: `description: Use when: X`）は YAML では不正だが、値の一部として読む。
 */
function parseScalarFields(lines: string[]): Record<string, string> {
    const fields: Record<string, string> = {};
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        // トップレベル以外（インデント行・シーケンス項目）や空行・コメントは読み飛ばす
        if (isBlankOrComment(line) || indentOf(line) > 0 || isSequenceItem(line.trim())) {
            i++;
            continue;
        }
        const m = matchKeyLine(line);
        if (!m) {
            i++;
            continue;
        }
        const key = decodeInlineScalar(m.key);
        const result = readValue(lines, i, m.rest, 0, key, fields);
        fields[key] = result.value;
        i = result.next;
    }
    return fields;
}

/**
 * lines[i] のキーに続く値（同じ行の rest と、それ以降の行）を読み取る。
 * keyIndent はキー行のインデント。parentKey が null 以外なら、マップの子を `親キー.子キー` で fields へ追加する
 * （parentKey が null の値はマップなら空文字列とする）。戻り値の next は値の次の行番号。
 */
function readValue(
    lines: string[],
    i: number,
    rest: string,
    keyIndent: number,
    parentKey: string | null,
    fields: Record<string, string>
): { value: string; next: number } {
    const text = rest.trim();
    if (text === '' || text.startsWith('#')) {
        return readFollowingLines(lines, i + 1, keyIndent, parentKey, fields);
    }
    const header = text.match(BLOCK_HEADER);
    if (header) {
        return readBlockScalar(lines, i + 1, header[1], header[2] ?? '', keyIndent);
    }
    if (text.startsWith('"') || text.startsWith("'")) {
        return readQuoted(lines, i, text, keyIndent);
    }
    if (text.startsWith('[') || text.startsWith('{')) {
        const flow = readFlow(lines, i, text, keyIndent);
        if (flow) {
            return { value: flowValue(flow.node, parentKey, fields), next: flow.next };
        }
    }
    return readPlain(lines, i, stripComment(text), keyIndent);
}

/**
 * 値が空のキーに続く行を読む。
 * - 最初の行がより深いインデントで、シーケンスの項目でもキー行でもなければ、その行から始まる値として読む。
 * - parentKey が null 以外なら、続く子要素（シーケンス・マップ）を読む。
 * - parentKey が null なら、子要素は読み飛ばして空文字列を返す。
 */
function readFollowingLines(
    lines: string[],
    start: number,
    keyIndent: number,
    parentKey: string | null,
    fields: Record<string, string>
): { value: string; next: number } {
    const first = nextContentLine(lines, start);
    if (first < lines.length && indentOf(lines[first]) > keyIndent) {
        const trimmed = lines[first].trim();
        if (!isSequenceItem(trimmed) && matchKeyLine(trimmed) === null) {
            return readValue(lines, first, trimmed, keyIndent, parentKey, fields);
        }
    }
    return parentKey !== null
        ? readChildren(lines, start, keyIndent, parentKey, fields)
        : { value: '', next: skipDeeper(lines, start, keyIndent) };
}

/** keyIndent より深いインデントの行（と空行・コメント）を読み飛ばした次の行番号を返す。 */
function skipDeeper(lines: string[], start: number, keyIndent: number): number {
    let j = start;
    while (j < lines.length && (isBlankOrComment(lines[j]) || indentOf(lines[j]) > keyIndent)) {
        j++;
    }
    return j;
}

/**
 * 値が空のトップレベルキーに続く子要素を読む。
 * - スカラー項目だけのシーケンスはカンマ区切りの文字列を値として返す。
 * - マップの 1 階層目は `親キー.子キー` として fields へ追加し、値は空文字列を返す。
 */
function readChildren(
    lines: string[],
    start: number,
    keyIndent: number,
    parentKey: string,
    fields: Record<string, string>
): { value: string; next: number } {
    const items: string[] = [];
    let scalarOnly = true;
    let childIndent = -1;
    let j = start;
    while (j < lines.length) {
        const line = lines[j];
        if (isBlankOrComment(line)) {
            j++;
            continue;
        }
        const indent = indentOf(line);
        const trimmed = line.trim();
        const isItem = isSequenceItem(trimmed);
        // シーケンスはキーと同じインデントで `- ` を並べる書き方も許容する
        if (indent < keyIndent || (indent === keyIndent && !isItem)) {
            break;
        }
        if (childIndent === -1) {
            childIndent = indent;
        }
        if (indent < childIndent) {
            break;
        }
        if (indent > childIndent) {
            j++;
            continue;
        }
        if (isItem) {
            const item = trimmed.slice(1).trim();
            // マップ（フロー形式・`キー: 値`）とリスト（フロー形式・`- - 項目` の入れ子のシーケンス）は項目にしない
            if (item.startsWith('{') || item.startsWith('[') || isSequenceItem(item) || matchKeyLine(item) !== null) {
                scalarOnly = false;
            } else if (item !== '') {
                const value = decodeInlineValue(item);
                if (value !== '') {
                    items.push(value);
                }
            }
            j++;
            continue;
        }
        scalarOnly = false;
        const m = matchKeyLine(trimmed);
        if (!m) {
            j++;
            continue;
        }
        const child = readValue(lines, j, m.rest, indent, null, fields);
        fields[`${parentKey}.${decodeInlineScalar(m.key)}`] = child.value;
        j = child.next;
    }
    return { value: scalarOnly ? items.join(', ') : '', next: j };
}

/**
 * プレーンスカラーを読む。keyIndent より深いインデントの継続行は空白（空行は改行）で連結する。
 * 1 行だけの `~` / `null` は空文字列とする。
 */
function readPlain(lines: string[], i: number, first: string, keyIndent: number): { value: string; next: number } {
    let value = first;
    let empties = 0;
    let continued = false;
    let j = i + 1;
    while (j < lines.length) {
        const line = lines[j];
        const trimmed = line.trim();
        if (trimmed === '') {
            empties++;
            j++;
            continue;
        }
        if (indentOf(line) <= keyIndent || trimmed.startsWith('#')) {
            break;
        }
        value += empties > 0 ? '\n'.repeat(empties) : ' ';
        value += stripComment(trimmed);
        empties = 0;
        continued = true;
        j++;
    }
    return { value: !continued && NULL_SCALARS.has(value) ? '' : value, next: j };
}

/**
 * ブロックスカラー（`|` リテラル / `>` 折り返し）の本文を読む。
 * 本文のインデントは指示子があればそれ、無ければ最初の非空行から決める。
 * チョンプ指示子: `-` は末尾の改行を除去、`+` は保持、無指定は改行 1 つに揃える。
 */
function readBlockScalar(
    lines: string[],
    start: number,
    style: string,
    indicators: string,
    keyIndent: number
): { value: string; next: number } {
    const explicit = indicators.match(/[1-9]/);
    let contentIndent = explicit ? keyIndent + Number(explicit[0]) : -1;
    const body: string[] = [];
    let j = start;
    for (; j < lines.length; j++) {
        const line = lines[j];
        if (line.trim() === '') {
            body.push('');
            continue;
        }
        const indent = indentOf(line);
        if (contentIndent === -1) {
            if (indent <= keyIndent) {
                break;
            }
            contentIndent = indent;
        }
        if (indent < contentIndent) {
            break;
        }
        body.push(line.slice(contentIndent));
    }
    let end = body.length;
    while (end > 0 && body[end - 1] === '') {
        end--;
    }
    const content = body.slice(0, end);
    let value = style === '|' ? content.join('\n') : foldLines(content);
    if (content.length > 0) {
        if (indicators.includes('+')) {
            value += '\n'.repeat(1 + body.length - end);
        } else if (!indicators.includes('-')) {
            value += '\n';
        }
    }
    return { value, next: j };
}

/**
 * 折り返しブロックスカラーの行を連結する。通常の行どうしの改行は空白、空行は改行として残し、
 * さらにインデントされた行（整形済みテキスト）の前後は改行を保持する。
 */
function foldLines(lines: string[]): string {
    let out = '';
    let started = false;
    let empties = 0;
    let prevMore = false;
    for (const line of lines) {
        if (line === '') {
            empties++;
            continue;
        }
        const more = /^[ \t]/.test(line);
        if (!started) {
            out += '\n'.repeat(empties);
        } else if (more || prevMore) {
            out += '\n'.repeat(empties + 1);
        } else {
            out += empties > 0 ? '\n'.repeat(empties) : ' ';
        }
        out += line;
        started = true;
        empties = 0;
        prevMore = more;
    }
    return out;
}

/**
 * 引用符で始まる値を閉じ引用符まで読む（複数行にまたがってもよい）。
 * 閉じ引用符が無いまま次のキーに達した場合は、その手前までを値とする。
 */
function readQuoted(lines: string[], i: number, text: string, keyIndent: number): { value: string; next: number } {
    const quote = text[0];
    const parts: string[] = [];
    let buffer = text.slice(1);
    let j = i;
    for (;;) {
        const close = findClosingQuote(buffer, quote);
        if (close >= 0) {
            parts.push(buffer.slice(0, close));
            break;
        }
        parts.push(buffer);
        const nextLine = lines[j + 1];
        if (nextLine === undefined || (nextLine.trim() !== '' && indentOf(nextLine) <= keyIndent)) {
            break;
        }
        j++;
        buffer = nextLine;
    }
    const joined = joinQuotedLines(parts, quote === '"');
    return { value: quote === '"' ? unescapeDoubleQuoted(joined) : joined.replace(/''/g, "'"), next: j + 1 };
}

/**
 * 引用符の値の行を YAML の折り返し規則で連結する。行をまたぐ改行は空白、空行は改行とし、
 * 行の境目の空白は除く。ダブルクォートで行末が `\` の行（エスケープした改行）は、`\` を除いて
 * 次の行と空白を挟まずに連結する。
 */
function joinQuotedLines(parts: string[], doubleQuoted: boolean): string {
    let joined = '';
    let empties = 0;
    let escapedBreak = false;
    for (let k = 0; k < parts.length; k++) {
        const first = k === 0;
        const last = k === parts.length - 1;
        let part = first ? parts[k] : trimStartSpaces(parts[k]);
        let escaped = false;
        if (!last) {
            if (doubleQuoted && endsWithEscape(part)) {
                part = part.slice(0, -1);
                escaped = true;
            } else {
                part = trimEndSpaces(part);
            }
        }
        if (!first && !escapedBreak) {
            if (part === '' && !last && !escaped) {
                empties++;
                continue;
            }
            joined += empties > 0 ? '\n'.repeat(empties) : ' ';
            empties = 0;
        }
        joined += part;
        escapedBreak = escaped;
    }
    return joined;
}

/** 先頭のスペース・タブを除く。 */
function trimStartSpaces(text: string): string {
    let start = 0;
    while (start < text.length && (text[start] === ' ' || text[start] === '\t')) {
        start++;
    }
    return text.slice(start);
}

/** 末尾のスペース・タブを除く。 */
function trimEndSpaces(text: string): string {
    let end = text.length;
    while (end > 0 && (text[end - 1] === ' ' || text[end - 1] === '\t')) {
        end--;
    }
    return text.slice(0, end);
}

/** 末尾が `\` によるエスケープ（末尾に連続する `\` が奇数個）か。 */
function endsWithEscape(text: string): boolean {
    let count = 0;
    while (count < text.length && text[text.length - 1 - count] === '\\') {
        count++;
    }
    return count % 2 === 1;
}

/** text の from 以降で、開き引用符 quote に対応する閉じ引用符の位置。無ければ -1。 */
function findClosingQuote(text: string, quote: string, from = 0): number {
    for (let k = from; k < text.length; k++) {
        const ch = text[k];
        if (quote === '"' && ch === '\\') {
            k++;
            continue;
        }
        if (ch === quote) {
            if (quote === "'" && text[k + 1] === "'") {
                k++;
                continue;
            }
            return k;
        }
    }
    return -1;
}

/** 1 行に収まるスカラー（引用符付き、またはプレーン）を文字列に復元する。 */
function decodeInlineScalar(text: string): string {
    const value = text.trim();
    const quote = value[0];
    if (quote === '"' || quote === "'") {
        const close = findClosingQuote(value, quote, 1);
        const content = close >= 0 ? value.slice(1, close) : value.slice(1);
        return quote === '"' ? unescapeDoubleQuoted(content) : content.replace(/''/g, "'");
    }
    return stripComment(value);
}

/** 1 行に収まる値を文字列に復元する。引用符の無い `~` / `null` は空文字列とする。 */
function decodeInlineValue(text: string): string {
    const value = decodeInlineScalar(text);
    const quote = text.trim()[0];
    return quote !== '"' && quote !== "'" && NULL_SCALARS.has(value) ? '' : value;
}

/** フロー形式で、直前の有効な文字 prev の後に現れた引用符を引用の開始とみなすか（値の先頭に限る）。 */
function opensQuote(prev: string): boolean {
    return prev === '' || ',[{:'.includes(prev);
}

/**
 * lines[i] の text（`[` / `{` で始まる値）から、フロー形式のコレクションを閉じ括弧まで読む。
 * 複数行にまたがってよく、続きの行は keyIndent より深いインデントの行か、閉じ括弧（`]` / `}`）で始まる行に限る
 * （行の境目は空白として扱う）。
 * 引用符の外の `#`（直前が空白）から行末まではコメントとして除く。閉じ括弧の後ろにコメント以外が続く場合や、
 * 閉じないまま値の範囲が終わった場合は null を返す。
 */
function readFlow(
    lines: string[],
    i: number,
    text: string,
    keyIndent: number
): { node: FlowNode; next: number } | null {
    const segments: string[] = [];
    let depth = 0;
    let quote = '';
    let prev = '';
    let line = text;
    for (let j = i; ;) {
        let k = 0;
        let end = line.length;
        if (quote) {
            const close = findClosingQuote(line, quote, 0);
            if (close < 0) {
                k = line.length;
            } else {
                k = close + 1;
                prev = quote;
                quote = '';
            }
        }
        for (; k < line.length; k++) {
            const ch = line[k];
            if ((ch === '"' || ch === "'") && opensQuote(prev)) {
                const close = findClosingQuote(line, ch, k + 1);
                if (close < 0) {
                    quote = ch;
                    break;
                }
                k = close;
                prev = ch;
                continue;
            }
            if (ch === '#' && isWhite(line[k - 1])) {
                end = k;
                break;
            }
            if (ch === '[' || ch === '{') {
                depth++;
            } else if (ch === ']' || ch === '}') {
                depth--;
                if (depth === 0) {
                    const tail = line.slice(k + 1).trim();
                    if (tail !== '' && !tail.startsWith('#')) {
                        return null;
                    }
                    segments.push(line.slice(0, k + 1));
                    const flowText = segments.map(segment => segment.trim()).join(' ');
                    return { node: parseFlowNode(flowText, FLOW_PARSE_LEVELS), next: j + 1 };
                }
            }
            if (!isWhite(ch)) {
                prev = ch;
            }
        }
        segments.push(line.slice(0, end));
        j++;
        if (j >= lines.length) {
            return null;
        }
        line = lines[j];
        const trimmed = line.trim();
        if (trimmed !== '' && indentOf(line) <= keyIndent && !trimmed.startsWith(']') && !trimmed.startsWith('}')) {
            return null;
        }
    }
}

/**
 * `[`…`]` / `{`…`}` のテキストをフロー形式の値として読む。
 * levels は読み進める入れ子の深さで、0 ならコレクションの種類だけを返す。
 */
function parseFlowNode(text: string, levels: number): FlowNode {
    const isList = text.startsWith('[');
    if (levels <= 0) {
        return isList ? { kind: 'list', items: [] } : { kind: 'map', entries: [] };
    }
    const closer = isList ? ']' : '}';
    const parts = splitFlowItems(text.slice(1, text.endsWith(closer) ? -1 : undefined));
    if (!isList) {
        return { kind: 'map', entries: parts.map(part => parseFlowPair(part, levels - 1)) };
    }
    return {
        kind: 'list',
        items: parts.map((part): FlowNode => {
            if (part.startsWith('[') || part.startsWith('{')) {
                return parseFlowNode(part, levels - 1);
            }
            // `[a: b]` のようなキーと値の組は 1 組だけのマップとして扱う
            return findMappingColon(part) >= 0
                ? { kind: 'map', entries: [parseFlowPair(part, levels - 1)] }
                : decodeInlineValue(part);
        }),
    };
}

/** フロー形式のマップの 1 項目（`キー: 値`）を読む。値が無ければ空文字列とする。 */
function parseFlowPair(text: string, levels: number): [string, FlowNode] {
    const colon = findMappingColon(text);
    if (colon < 0) {
        return [decodeInlineScalar(text), ''];
    }
    const value = text.slice(colon + 1).trim();
    const node =
        value.startsWith('[') || value.startsWith('{') ? parseFlowNode(value, levels) : decodeInlineValue(value);
    return [decodeInlineScalar(text.slice(0, colon)), node];
}

/** フロー形式のコレクションの中身を、括弧と引用符の外にあるカンマで項目に分ける（空の項目は除く）。 */
function splitFlowItems(inner: string): string[] {
    const items: string[] = [];
    let depth = 0;
    let start = 0;
    let prev = '';
    for (let k = 0; k < inner.length; k++) {
        const ch = inner[k];
        if ((ch === '"' || ch === "'") && opensQuote(prev)) {
            const close = findClosingQuote(inner, ch, k + 1);
            if (close < 0) {
                break;
            }
            k = close;
            prev = ch;
            continue;
        }
        if (ch === '[' || ch === '{') {
            depth++;
        } else if (ch === ']' || ch === '}') {
            depth--;
        } else if (ch === ',' && depth === 0) {
            items.push(inner.slice(start, k).trim());
            start = k + 1;
        }
        if (!isWhite(ch)) {
            prev = ch;
        }
    }
    items.push(inner.slice(start).trim());
    return items.filter(item => item !== '');
}

/**
 * フロー形式の項目で、キーと値を区切る `:` の位置。括弧と引用符の外にあり、後ろが空白・区切り文字・末尾のもの、
 * または引用符で囲んだキーの直後のもの。無ければ -1。
 */
function findMappingColon(text: string): number {
    let depth = 0;
    let prev = '';
    for (let k = 0; k < text.length; k++) {
        const ch = text[k];
        if ((ch === '"' || ch === "'") && opensQuote(prev)) {
            const close = findClosingQuote(text, ch, k + 1);
            if (close < 0) {
                return -1;
            }
            k = close;
            prev = ch;
            continue;
        }
        if (ch === '[' || ch === '{') {
            depth++;
        } else if (ch === ']' || ch === '}') {
            depth--;
        } else if (ch === ':' && depth === 0) {
            const next = text[k + 1];
            if (next === undefined || isWhite(next) || FLOW_INDICATORS.includes(next) || prev === '"' || prev === "'") {
                return k;
            }
        }
        if (!isWhite(ch)) {
            prev = ch;
        }
    }
    return -1;
}

/**
 * フロー形式の値を一覧用の文字列にする。parentKey が null 以外のマップは、1 階層目を `親キー.子キー` として
 * fields へ追加して空文字列を返す。
 */
function flowValue(node: FlowNode, parentKey: string | null, fields: Record<string, string>): string {
    if (typeof node !== 'string' && node.kind === 'map' && parentKey !== null) {
        for (const [key, value] of node.entries) {
            fields[`${parentKey}.${key}`] = flowText(value);
        }
        return '';
    }
    return flowText(node);
}

/** フロー形式の値の文字列表記。スカラー項目だけのリストはカンマ区切り、それ以外のコレクションは空文字列。 */
function flowText(node: FlowNode): string {
    if (typeof node === 'string') {
        return node;
    }
    if (node.kind === 'list' && node.items.every((item): item is string => typeof item === 'string')) {
        return node.items.filter(item => item !== '').join(', ');
    }
    return '';
}

// ダブルクォート内の 1 文字エスケープ。
const DOUBLE_QUOTED_ESCAPES: Record<string, string> = {
    '0': '\0',
    a: '\x07',
    b: '\b',
    t: '\t',
    '\t': '\t',
    n: '\n',
    v: '\v',
    f: '\f',
    r: '\r',
    e: '\x1b',
    ' ': ' ',
    '"': '"',
    '/': '/',
    '\\': '\\',
    N: '\u0085',
    _: '\u00a0',
    L: '\u2028',
    P: '\u2029',
};

/** ダブルクォート内のエスケープシーケンス（`\n` `\"` `\uXXXX` など）を解釈する。 */
function unescapeDoubleQuoted(text: string): string {
    return text.replace(/\\(x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8}|.)/g, (whole, seq: string) => {
        if (seq.length > 1) {
            return String.fromCodePoint(parseInt(seq.slice(1), 16));
        }
        return DOUBLE_QUOTED_ESCAPES[seq] ?? whole;
    });
}

/**
 * YAML の行末コメント（空白に続く `#` 以降）を除去し、前後の空白を除く。
 * 空白の前置が無い `#`（例: `provider/model#variant`）はコメントとみなさない。
 */
function stripComment(value: string): string {
    if (value.startsWith('#')) {
        return '';
    }
    for (let k = 1; k < value.length; k++) {
        if (value[k] === '#' && isWhite(value[k - 1])) {
            return value.slice(0, k).trim();
        }
    }
    return value.trim();
}
