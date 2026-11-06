/**
 * TOML テキストの 1 つのスコープ（テーブル、配列テーブル、テーブル以外の値）だけを読み書きする。
 *
 * - 全体を再シリアライズせず、走査で求めた範囲だけを切り貼りする。スコープ外の文はバイト単位で保たれる。
 * - 値は原文のまま扱う。parse 結果では区別できない数値の表記（`30.0` と `30`）も変わらない。
 * - 編集結果は返す前に verifyTomlEdit で検証する。安全に編集できない形と検証の失敗は TomlEditError を投げる。
 */

import { parse, stringify, TomlError, type TomlTable } from 'smol-toml';
import type { ConfigDetail, ConfigParseCode } from '../../shared/agents/configFileFailure';
import { strictDeepEqual } from './strictDeepEqual';
import { sameTomlPath, scanTomlStatements, type TomlAssignment, type TomlHeader } from './tomlStatements';

export type TomlEditErrorCode =
    | 'invalid-existing'
    | 'invalid-input'
    | 'outside-scope'
    | 'forbidden-subpath'
    | 'fragment-needs-header'
    | 'inline-parent'
    | 'unsupported-form'
    | 'already-defined'
    | 'verify-failed';

/** スコープ編集の失敗。line は入力の断片や値の中で parse に失敗した行（1 始まり）。 */
export class TomlEditError extends Error {
    constructor(
        readonly code: TomlEditErrorCode,
        detail: string,
        readonly line?: number
    ) {
        super(`${code}: ${detail}`);
        this.name = 'TomlEditError';
    }
}

/** readTomlTable の結果。normalized は fragment が原文の切り出しではなく、見出しを補って組み立てた形であること。 */
export interface TomlTableRead {
    present: boolean;
    fragment: string;
    normalized: boolean;
}

/** readTomlValue の結果。fragment は値の原文（複数行を含む）。 */
export interface TomlValueRead {
    present: boolean;
    fragment: string;
}

/** setTomlValue が受け付ける値。 */
export type TomlEditableValue = string | number | bigint | boolean | string[];

/** verifyTomlEdit の追加条件。 */
export interface TomlVerifyOptions {
    /** touched の配下でも編集しない（スコープ外として一致を確認する）パス。 */
    exclude?: string[][];
    /** スコープ内の数値の表記の基準にするテキスト。省略すると before を基準にする。 */
    source?: string;
}

export type TomlEol = '\n' | '\r\n';
type TomlModel = Record<string, unknown>;

/** 行単位の代入（インラインテーブルの内側を除く）。 */
type LineAssignment = TomlAssignment & { table: string[]; start: number; lineEnd: number };

/** 見出し 1 つとその本文の文。ルートの本文は header が null。 */
interface TomlBlock {
    header: TomlHeader | null;
    statements: LineAssignment[];
}

interface TomlLayout {
    text: string;
    bomEnd: number;
    headers: TomlHeader[];
    assignments: TomlAssignment[];
    lines: LineAssignment[];
    blocks: TomlBlock[];
}

interface TomlRange {
    start: number;
    end: number;
}

/** スコープに属する文。blocks は見出しごと対象のブロック、loose は親の本文にある行単位の文。 */
interface TomlScope {
    blocks: TomlBlock[];
    loose: LineAssignment[];
}

/** 文字列とコメントに一致する。複数行文字列の閉じ記号の直前の引用符も含める。 */
const STRING_OR_COMMENT = /"""(?:\\[\s\S]|[^\\])*?"""+|'''[\s\S]*?'''+|"(?:\\.|[^"\\\r\n])*"|'[^'\r\n]*'|#[^\r\n]*/g;

// ------------------------------------------------------------
// パース
// ------------------------------------------------------------

/** TOML をパースする。2^53 を超える整数だけを bigint で返し、例外にしない。 */
export function parseToml(text: string): TomlTable {
    return parse(text, { integersAsBigInt: 'asNeeded' });
}

/** テキストが TOML として読めなければコードと位置を返す。パーサーのメッセージは本文の抜粋を含むので使わない。読めれば null。 */
export function tomlSyntaxProblem(text: string): ConfigDetail<ConfigParseCode> | null {
    try {
        parseToml(text);
        return null;
    } catch (error) {
        if (error instanceof TomlError) return { code: 'toml-syntax', line: error.line, column: error.column };
        return { code: 'toml-syntax' };
    }
}

/** テキストの主な改行コードを返す（同数と改行なしは LF）。 */
export function detectTomlEol(text: string): TomlEol {
    const crlf = text.match(/\r\n/g)?.length ?? 0;
    const lf = (text.match(/\n/g)?.length ?? 0) - crlf;
    return crlf > lf ? '\r\n' : '\n';
}

function parseExisting(text: string): TomlModel {
    try {
        return parseToml(text);
    } catch (error) {
        throw new TomlEditError(
            'invalid-existing',
            'the existing TOML cannot be parsed',
            error instanceof TomlError ? error.line : undefined
        );
    }
}

function isLineAssignment(assignment: TomlAssignment): assignment is LineAssignment {
    return assignment.table !== null;
}

/** 文を見出しごとのブロックにまとめる。走査できなければ例外を投げる。 */
function layoutOf(text: string): TomlLayout {
    const { headers, assignments } = scanTomlStatements(text);
    const lines = assignments.filter(isLineAssignment);
    const blocks: TomlBlock[] = [
        { header: null, statements: [] },
        ...headers.map(header => ({ header, statements: [] as LineAssignment[] })),
    ];
    let index = 0;
    for (const line of lines) {
        while (index + 1 < blocks.length && (blocks[index + 1].header as TomlHeader).start < line.start) {
            index++;
        }
        blocks[index].statements.push(line);
    }
    return { text, bomEnd: text.charCodeAt(0) === 0xfeff ? 1 : 0, headers, assignments, lines, blocks };
}

function existingLayout(text: string): TomlLayout {
    try {
        return layoutOf(text);
    } catch (error) {
        throw new TomlEditError('invalid-existing', `the existing TOML cannot be scanned: ${String(error)}`);
    }
}

// ------------------------------------------------------------
// パスとモデル
// ------------------------------------------------------------

function isUnder(path: string[], scope: string[]): boolean {
    return path.length >= scope.length && scope.every((part, i) => part === path[i]);
}

function isProperPrefix(prefix: string[], path: string[]): boolean {
    return prefix.length < path.length && isUnder(path, prefix);
}

function assertPath(path: string[]): void {
    if (path.length === 0) {
        throw new TomlEditError('invalid-input', 'the scope path is empty');
    }
}

/** 値が TOML のテーブル（配列と日時を除くオブジェクト）か。 */
export function isTomlTable(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date);
}

function getAt(model: TomlModel, path: string[]): unknown {
    let current: unknown = model;
    for (const part of path) {
        if (!isTomlTable(current) || !Object.hasOwn(current, part)) {
            return undefined;
        }
        current = current[part];
    }
    return current;
}

function setAt(model: TomlModel, path: string[], value: unknown): void {
    let current = model;
    for (const part of path.slice(0, -1)) {
        const next = Object.hasOwn(current, part) ? current[part] : undefined;
        if (isTomlTable(next)) {
            current = next;
        } else {
            const created: TomlModel = Object.create(null);
            current[part] = created;
            current = created;
        }
    }
    current[path[path.length - 1]] = value;
}

function deleteAt(model: TomlModel, path: string[]): void {
    const parent = getAt(model, path.slice(0, -1));
    if (isTomlTable(parent)) {
        delete parent[path[path.length - 1]];
    }
}

/** 配列テーブルの要素も辿って、path に値があるか調べる。 */
function hasPath(value: unknown, path: string[]): boolean {
    if (path.length === 0) {
        return true;
    }
    if (Array.isArray(value)) {
        return value.some(item => hasPath(item, path));
    }
    return isTomlTable(value) && Object.hasOwn(value, path[0]) && hasPath(value[path[0]], path.slice(1));
}

/** before のモデルに「path を value（undefined は削除）へ置き換え、exclude の値は元のまま」を適用する。 */
function applyToModel(model: TomlModel, path: string[], value: unknown, exclude: string[][]): TomlModel {
    const kept = exclude.map(part => ({ path: part, value: getAt(model, part) }));
    deleteAt(model, path);
    if (value !== undefined) {
        setAt(model, path, value);
    }
    for (const entry of kept) {
        if (entry.value !== undefined) {
            setAt(model, entry.path, entry.value);
        }
    }
    return model;
}

/** path の真の前置のテーブルのうち、空になったものを葉側から取り除いたコピーを返す。 */
function withoutEmptyChain(model: TomlModel, path: string[]): TomlModel {
    const copy: TomlModel = Object.assign(Object.create(null), model);
    if (path.length < 2 || !Object.hasOwn(copy, path[0]) || !isTomlTable(copy[path[0]])) {
        return copy;
    }
    const child = withoutEmptyChain(copy[path[0]] as TomlModel, path.slice(1));
    if (Object.keys(child).length === 0) {
        delete copy[path[0]];
    } else {
        copy[path[0]] = child;
    }
    return copy;
}

// ------------------------------------------------------------
// キーと値の表記
// ------------------------------------------------------------

/** TOML のキー 1 つを表記する（bare で書けなければ literal、書けなければ basic）。 */
function formatTomlKey(key: string): string {
    if (/^[A-Za-z0-9_-]+$/.test(key)) {
        return key;
    }
    // eslint-disable-next-line no-control-regex -- literal string に書けない制御文字を判定するため
    if (!/['\x00-\x08\x0a-\x1f\x7f]/.test(key)) {
        return `'${key}'`;
    }
    return JSON.stringify(key).replaceAll('\x7f', '\\u007f');
}

function formatKeyPath(path: string[]): string {
    return path.map(formatTomlKey).join('.');
}

interface NumberToken {
    float: boolean;
    value: number;
}

/** 値の原文に含まれる数値を、出現順に表記（整数か小数か）と値で返す。キー、文字列、日時は数えない。 */
function numberTokens(raw: string): NumberToken[] {
    const tokens: NumberToken[] = [];
    const bare = raw.replace(STRING_OR_COMMENT, ' ').replace(/[^\s,[\]{}=]+\s*=/g, ' ');
    for (const token of bare.match(/[^\s,[\]{}]+/g) ?? []) {
        const plain = token.replace(/_/g, '').replace(/^\+/, '');
        if (/^-?inf$/.test(plain)) {
            tokens.push({ float: true, value: plain.startsWith('-') ? -Infinity : Infinity });
        } else if (/^-?nan$/.test(plain)) {
            tokens.push({ float: true, value: NaN });
        } else if (/^(?:0x[0-9a-fA-F]+|0o[0-7]+|0b[01]+|-?\d+)$/.test(plain)) {
            tokens.push({ float: false, value: Number(plain) });
        } else if (/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(plain)) {
            tokens.push({ float: true, value: Number(plain) });
        }
    }
    return tokens;
}

/** 値の literal を組み立てる。現在の値が小数表記なら、整数の値も小数表記にする。 */
function valueLiteral(value: TomlEditableValue, currentRaw: string | null): string {
    if (typeof value === 'number' && Number.isInteger(value) && currentRaw !== null) {
        const tokens = numberTokens(currentRaw);
        if (tokens.length === 1 && tokens[0].float) {
            return value.toFixed(1);
        }
    }
    return stringify({ v: value })
        .slice('v = '.length)
        .replace(/\r?\n$/, '');
}

// ------------------------------------------------------------
// スコープの分類と範囲
// ------------------------------------------------------------

function innerAssignments(layout: TomlLayout, owner: TomlAssignment): TomlAssignment[] {
    return layout.assignments.filter(
        a => a.table === null && a.valueStart > owner.valueStart && a.valueEnd < owner.valueEnd
    );
}

/** インラインテーブルの直下の代入を出現順に返す。 */
function inlineChildren(layout: TomlLayout, owner: TomlAssignment): TomlAssignment[] {
    const inner = innerAssignments(layout, owner);
    return inner
        .filter(a => !inner.some(o => o.inlineOpen !== null && a.valueStart > o.valueStart && a.valueEnd < o.valueEnd))
        .sort((a, b) => a.valueStart - b.valueStart);
}

/** path に属する文を集める。path の途中がインラインテーブルや配列なら拒否する。 */
function analyzeScope(layout: TomlLayout, path: string[], exclude: string[][]): TomlScope {
    const label = path.join('.');
    const excluded = (target: string[]) => exclude.some(part => isUnder(target, part));
    const rejectExcluded = (statements: LineAssignment[]) => {
        for (const statement of statements) {
            if (excluded(statement.path) || innerAssignments(layout, statement).some(a => excluded(a.path))) {
                throw new TomlEditError('unsupported-form', `an excluded key is written inside the body of ${label}`);
            }
        }
    };

    for (const header of layout.headers) {
        if (header.array && isProperPrefix(header.path, path)) {
            throw new TomlEditError(
                'unsupported-form',
                `${label} is inside the array of tables ${header.path.join('.')}`
            );
        }
    }
    const scope: TomlScope = { blocks: [], loose: [] };
    for (const block of layout.blocks) {
        if (block.header && isUnder(block.header.path, path)) {
            if (!excluded(block.header.path)) {
                rejectExcluded(block.statements);
                scope.blocks.push(block);
            }
            continue;
        }
        for (const statement of block.statements) {
            if (isProperPrefix(statement.path, path)) {
                const code = statement.inlineOpen !== null ? 'inline-parent' : 'unsupported-form';
                throw new TomlEditError(code, `${statement.path.join('.')} is not a table section containing ${label}`);
            }
            if (isUnder(statement.path, path)) {
                scope.loose.push(statement);
            }
        }
    }
    rejectExcluded(scope.loose);
    return scope;
}

function blockEnd(block: TomlBlock, fallback: number): number {
    const last = block.statements[block.statements.length - 1];
    return last ? last.lineEnd : block.header ? block.header.lineEnd : fallback;
}

/** 行の直上に連続するコメント行の先頭を返す。floor より前には戻らない。 */
function attachedStart(text: string, lineStart: number, floor: number): number {
    let start = lineStart;
    while (start > floor) {
        const previous = Math.max(text.lastIndexOf('\n', start - 2) + 1, floor);
        if (!text.slice(previous, start).trimStart().startsWith('#')) {
            break;
        }
        start = previous;
    }
    return start;
}

/** 対象ブロックの範囲を返す。直上のコメントを含み、間に他の文がない隣接ブロックは 1 つにまとめる。 */
function blockRanges(layout: TomlLayout, blocks: TomlBlock[]): TomlRange[] {
    const targets = new Set(blocks);
    const ranges: TomlRange[] = [];
    let floor = layout.bomEnd;
    let open: TomlRange | null = null;
    for (const block of layout.blocks) {
        const end = blockEnd(block, floor);
        if (block.header && targets.has(block)) {
            if (open) {
                open.end = end;
            } else {
                open = { start: attachedStart(layout.text, block.header.start, floor), end };
                ranges.push(open);
            }
        } else {
            open = null;
        }
        floor = end;
    }
    return ranges;
}

function looseRanges(scope: TomlScope): TomlRange[] {
    return scope.loose.map(statement => ({ start: statement.start, end: statement.lineEnd }));
}

function exactStatement(scope: TomlScope, path: string[]): LineAssignment | undefined {
    return scope.loose.find(statement => sameTomlPath(statement.path, path));
}

// ------------------------------------------------------------
// テキストの切り貼り
// ------------------------------------------------------------

function stripEol(line: string): string {
    return line.replace(/\r?\n$/, '');
}

/** 先頭の空行と末尾の空白を除き、改行で終える。 */
function trimBlankEdges(text: string, eol: TomlEol): string {
    return `${text.replace(/^(?:[ \t]*\r?\n)+/, '').replace(/\s+$/, '')}${eol}`;
}

/** 行頭 pos から空白だけの行を読み飛ばした位置を返す。 */
function skipBlankLines(text: string, pos: number): number {
    let current = pos;
    while (current < text.length) {
        const newline = text.indexOf('\n', current);
        const end = newline === -1 ? text.length : newline + 1;
        if (text.slice(current, end).trim() !== '') {
            return current;
        }
        current = end;
    }
    return text.length;
}

/** 範囲を切り取り、切り取った周辺だけ空行が重ならないように整える。 */
function removeRange(text: string, range: TomlRange): string {
    const bomEnd = text.charCodeAt(0) === 0xfeff ? 1 : 0;
    const before = text.slice(bomEnd, range.start);
    const following = skipBlankLines(text, range.end);
    if (following === text.length) {
        return text.slice(0, bomEnd) + before.replace(/(^|\n)(?:[ \t]*\r?\n)+$/, '$1');
    }
    const afterBlank = /(?:^|\n)[ \t]*\r?\n$/.test(before) || before.length === 0;
    return text.slice(0, range.start) + text.slice(afterBlank ? following : range.end);
}

/** 範囲を重なりをまとめて後ろから切り取る。 */
function removeRanges(text: string, ranges: TomlRange[]): string {
    const merged: TomlRange[] = [];
    for (const range of [...ranges].sort((a, b) => a.start - b.start)) {
        const last = merged[merged.length - 1];
        if (last && range.start <= last.end) {
            last.end = Math.max(last.end, range.end);
        } else {
            merged.push({ ...range });
        }
    }
    return merged.reverse().reduce(removeRange, text);
}

function splice(text: string, range: TomlRange, replacement: string): string {
    return text.slice(0, range.start) + replacement + text.slice(range.end);
}

/** ブロックを末尾に追記する（既存の末尾の空行を除き、前に空行を 1 つ入れる）。空のテキストならブロックだけにする。 */
export function appendTomlBlock(text: string, block: string, eol: TomlEol): string {
    const bom = text.charCodeAt(0) === 0xfeff ? text[0] : '';
    const body = text.slice(bom.length).replace(/(?:\r?\n[ \t]*)+$/, '');
    if (body.trim() === '') {
        return bom + block;
    }
    return `${bom}${body}${eol}${eol}${block}`;
}

/** 行頭 at に行を差し込む（最終行が改行で終わっていなければ改行を補う）。 */
function insertLines(layout: TomlLayout, at: number, lines: string, eol: TomlEol): string {
    const { text } = layout;
    const needsEol = at === text.length && at > layout.bomEnd && !text.endsWith('\n');
    return `${text.slice(0, at)}${needsEol ? eol : ''}${lines}${text.slice(at)}`;
}

/** path の値を親の本文に挿入する。render は所属テーブルに対する相対キーで行を組み立てる。 */
function insertIntoParent(text: string, path: string[], render: (table: string[]) => string, eol: TomlEol): string {
    const layout = existingLayout(text);
    const parent = path.slice(0, -1);
    if (parent.length === 0) {
        const root = layout.blocks[0];
        if (root.statements.length > 0) {
            return insertLines(layout, blockEnd(root, layout.bomEnd), render([]), eol);
        }
        if (layout.headers.length > 0) {
            const at = attachedStart(text, layout.headers[0].start, layout.bomEnd);
            return insertLines(layout, at, `${render([])}${eol}`, eol);
        }
        return insertLines(layout, text.length, render([]), eol);
    }

    const parentBlock = layout.blocks.find(b => b.header && !b.header.array && sameTomlPath(b.header.path, parent));
    if (parentBlock) {
        return insertLines(layout, blockEnd(parentBlock, layout.bomEnd), render(parent), eol);
    }
    // 親がドット記法で定義されていれば、同じ本文の最後のドットキーの直後に同じ書き方で加える。
    const dotted = layout.lines.filter(line => isProperPrefix(parent, line.path) && line.table.length < parent.length);
    if (dotted.length > 0) {
        const last = dotted[dotted.length - 1];
        return insertLines(layout, last.lineEnd, render(last.table), eol);
    }
    return appendTomlBlock(text, `[${formatKeyPath(parent)}]${eol}${render(parent)}`, eol);
}

/** 代入を 1 行で表す。所属テーブルが同じならキーの表記も行末コメントも原文のまま使う。 */
function statementLine(text: string, statement: LineAssignment, table: string[]): string {
    if (sameTomlPath(statement.table, table)) {
        return stripEol(text.slice(statement.start, statement.lineEnd));
    }
    const key = formatKeyPath(statement.path.slice(table.length));
    return `${key} = ${stripEol(text.slice(statement.valueStart, statement.lineEnd))}`;
}

// ------------------------------------------------------------
// 検証
// ------------------------------------------------------------

function verifyFailure(detail: string): TomlEditError {
    return new TomlEditError('verify-failed', detail);
}

function inTouchedScope(target: string[], touched: string[][], exclude: string[][]): boolean {
    return touched.some(part => isUnder(target, part)) && !exclude.some(part => isUnder(target, part));
}

/** スコープ外の文（完全パスと原文）を出現順に返す。chain は touched の親にあたる見出しで、新規の追加を許す。 */
function outsideStatements(
    layout: TomlLayout,
    touched: string[][],
    exclude: string[][]
): { others: string[]; chain: string[] } {
    const statements = [...layout.headers, ...layout.lines].sort((a, b) => a.start - b.start);
    const others: string[] = [];
    const chain: string[] = [];
    for (const statement of statements) {
        if (inTouchedScope(statement.path, touched, exclude)) {
            continue;
        }
        const raw = stripEol(layout.text.slice(statement.start, statement.lineEnd));
        const entry = JSON.stringify([statement.path, raw]);
        const isHeader = !('valueStart' in statement);
        if (isHeader && touched.some(part => isProperPrefix(statement.path, part))) {
            chain.push(entry);
        } else {
            others.push(entry);
        }
    }
    return { others, chain };
}

/** スコープ内の葉の値に含まれる数値を、完全パスごとに出現順で返す。 */
function numberFormsInScope(layout: TomlLayout, touched: string[][], exclude: string[][]): Map<string, NumberToken[]> {
    const forms = new Map<string, NumberToken[]>();
    for (const assignment of layout.assignments) {
        if (assignment.inlineOpen === null && inTouchedScope(assignment.path, touched, exclude)) {
            const key = JSON.stringify(assignment.path);
            const tokens = numberTokens(layout.text.slice(assignment.valueStart, assignment.valueEnd));
            forms.set(key, [...(forms.get(key) ?? []), ...tokens]);
        }
    }
    return forms;
}

/** 同じパスの同じ値の数値が、source と after で整数と小数の表記が変わっていれば失敗にする。 */
function assertNumberForms(source: TomlLayout, after: TomlLayout, touched: string[][], exclude: string[][]): void {
    const afterForms = numberFormsInScope(after, touched, exclude);
    for (const [key, tokens] of numberFormsInScope(source, touched, exclude)) {
        const other = afterForms.get(key);
        if (!other || other.length !== tokens.length) {
            continue;
        }
        tokens.forEach((token, i) => {
            if (Object.is(token.value, other[i].value) && token.float !== other[i].float) {
                throw verifyFailure(`the number form changed at ${key}`);
            }
        });
    }
}

/**
 * 編集結果を検証し、問題があれば verify-failed を投げる。
 * 1. after の parse 結果と expected の厳密な一致（空テーブルも区別。touched の親で空になったものだけ両側から除く）
 * 2. touched の外の文が同じ順序で原文まで一致すること（touched の親にあたる見出しは残っていること）
 * 3. touched の中の数値の表記（整数か小数か）が基準のテキストと一致すること
 */
export function verifyTomlEdit(
    before: string,
    after: string,
    expected: Record<string, unknown>,
    touched: string[][],
    options: TomlVerifyOptions = {}
): void {
    const exclude = options.exclude ?? [];
    let actual: TomlModel;
    let beforeLayout: TomlLayout;
    let afterLayout: TomlLayout;
    let sourceLayout: TomlLayout;
    try {
        actual = parseToml(after);
        beforeLayout = layoutOf(before);
        afterLayout = layoutOf(after);
        sourceLayout = options.source === undefined ? beforeLayout : layoutOf(options.source);
    } catch (error) {
        throw verifyFailure(`the edited TOML cannot be read: ${String(error)}`);
    }

    const prune = (model: TomlModel) => touched.reduce(withoutEmptyChain, model);
    if (!strictDeepEqual(prune(actual), prune(expected))) {
        throw verifyFailure('the edited TOML does not match the expected values');
    }

    const beforeOutside = outsideStatements(beforeLayout, touched, exclude);
    const afterOutside = outsideStatements(afterLayout, touched, exclude);
    if (!strictDeepEqual(beforeOutside.others, afterOutside.others)) {
        throw verifyFailure('statements outside the scope changed');
    }
    const remaining = [...afterOutside.chain];
    for (const entry of beforeOutside.chain) {
        const index = remaining.indexOf(entry);
        if (index === -1) {
            throw verifyFailure('a parent table header changed');
        }
        remaining.splice(index, 1);
    }

    assertNumberForms(sourceLayout, afterLayout, touched, exclude);
}

// ------------------------------------------------------------
// テーブルの読み取りと置換
// ------------------------------------------------------------

/** 親の本文などに散らばった文を、path を起点とする断片に組み立てる。値は原文のまま使う。 */
function normalizedFragment(layout: TomlLayout, scope: TomlScope, path: string[], eol: TomlEol): string {
    const { text } = layout;
    const exact = exactStatement(scope, path);
    if (exact && exact.inlineOpen === null) {
        const parent = path.slice(0, -1);
        const line = statementLine(text, exact, parent);
        return parent.length === 0 ? `${line}${eol}` : `[${formatKeyPath(parent)}]${eol}${line}${eol}`;
    }
    const lines: string[] = [];
    for (const statement of scope.loose) {
        if (statement.inlineOpen !== null && sameTomlPath(statement.path, path)) {
            for (const child of inlineChildren(layout, statement)) {
                const key = formatKeyPath(child.path.slice(path.length));
                lines.push(`${key} = ${text.slice(child.valueStart, child.valueEnd)}`);
            }
        } else {
            lines.push(statementLine(text, statement, path));
        }
    }
    const head = [`[${formatKeyPath(path)}]`, ...lines].join(eol) + eol;
    return [head, ...rawRanges(layout, blockRanges(layout, scope.blocks), eol)].join(eol);
}

function rawRanges(layout: TomlLayout, ranges: TomlRange[], eol: TomlEol): string[] {
    return ranges.map(range => trimBlankEdges(layout.text.slice(range.start, range.end), eol));
}

/**
 * path のスコープを断片のテキストとして返す。
 * 見出しのブロックだけなら原文（コメントを含む）の切り出し。親の本文にある文を含むときは normalized=true で、
 * 見出しを補った形にする（行の直上のコメントは含まれない）。exclude の配下は含めない。
 */
export function readTomlTable(text: string, path: string[], exclude: string[][] = []): TomlTableRead {
    assertPath(path);
    const model = parseExisting(text);
    const layout = existingLayout(text);
    const scope = analyzeScope(layout, path, exclude);
    if (scope.blocks.length === 0 && scope.loose.length === 0) {
        return { present: false, fragment: '', normalized: false };
    }
    const eol = detectTomlEol(text);
    const exact = exactStatement(scope, path);
    const fragment =
        scope.loose.length === 0
            ? rawRanges(layout, blockRanges(layout, scope.blocks), eol).join(eol)
            : normalizedFragment(layout, scope, path, eol);
    const rootValue = path.length === 1 && exact !== undefined && exact.inlineOpen === null;

    // 断片が元の値と同じ内容と表記を表していることを確かめる。
    let fragmentValue: unknown;
    let fragmentLayout: TomlLayout;
    try {
        fragmentValue = getAt(parseToml(fragment), path);
        fragmentLayout = layoutOf(fragment);
    } catch (error) {
        throw verifyFailure(`the fragment of ${path.join('.')} cannot be read alone: ${String(error)}`);
    }
    exclude.forEach(part => deleteAt(model, part));
    if (!strictDeepEqual(fragmentValue, getAt(model, path))) {
        throw verifyFailure(`the fragment of ${path.join('.')} does not match the file`);
    }
    assertNumberForms(layout, fragmentLayout, [path], exclude);
    return { present: true, fragment, normalized: scope.loose.length > 0 && !rootValue };
}

/** 断片が path の値を表す形か確かめ、parse 結果を返す。失敗の行番号は渡された断片の行を指す。 */
function validateFragment(input: string, path: string[], exclude: string[][]): TomlModel {
    let parsed: TomlModel;
    try {
        parsed = parseToml(input);
    } catch (error) {
        throw new TomlEditError(
            'invalid-input',
            'the fragment cannot be parsed',
            error instanceof TomlError ? error.line : undefined
        );
    }
    const label = path.join('.');
    let current: unknown = parsed;
    for (const part of path) {
        if (!isTomlTable(current)) {
            throw new TomlEditError('outside-scope', `the fragment must only define ${label}`);
        }
        const keys = Object.keys(current);
        if (keys.length === 0) {
            throw new TomlEditError('fragment-needs-header', `the fragment does not define ${label}`);
        }
        if (keys.length !== 1 || keys[0] !== part) {
            throw new TomlEditError('outside-scope', `the fragment must only define ${label}`);
        }
        current = current[part];
    }
    for (const part of exclude) {
        if (hasPath(parsed, part)) {
            throw new TomlEditError('forbidden-subpath', `${part.join('.')} cannot be edited here`);
        }
    }
    return parsed;
}

/**
 * 断片の形を判定する。P を path として、受け付けるのは次の 2 つ。
 * - ブロック形: 最初の文が P または P 配下の見出し。
 * - 値形: 最初の文が P 自身への代入。`rules = []` のように P がテーブルでない値の正規形で、親の見出しが先行してもよい。
 * 返り値は値形のときの代入で、ブロック形なら null。
 */
function fragmentValueStatement(layout: TomlLayout, path: string[]): LineAssignment | null {
    const header = layout.headers[0] as TomlHeader | undefined;
    const line = layout.lines[0] as LineAssignment | undefined;
    if (header && isUnder(header.path, path) && (!line || header.start < line.start)) {
        return null;
    }
    if (line && layout.lines.length === 1 && layout.headers.length <= 1 && sameTomlPath(line.path, path)) {
        if (!header || (!header.array && header.start < line.start)) {
            return line;
        }
    }
    throw new TomlEditError('fragment-needs-header', `the fragment must start with the [${path.join('.')}] header`);
}

/** 値形の断片を、所属テーブルに対する相対キーの行に直す。親の見出しの行は除き、コメントは残す。 */
function renderValueFragment(layout: TomlLayout, statement: LineAssignment, table: string[], eol: TomlEol): string {
    const { text } = layout;
    const header = layout.headers[0];
    const head =
        header && header.start < statement.start
            ? text.slice(0, header.start) + text.slice(header.lineEnd, statement.start)
            : text.slice(0, statement.start);
    return trimBlankEdges(`${head}${statementLine(text, statement, table)}${eol}${text.slice(statement.lineEnd)}`, eol);
}

/**
 * path のスコープを断片で置き換える。fragment が null ならスコープをすべて削除し、空テーブルを残さない。
 * ブロック形の断片は最初に消した見出しブロックの位置に入れ、見出しブロックが無ければ末尾に追記する（テーブルの本文の
 * 途中には入れない）。値形の断片は親の本文に入れる。断片の改行コードはファイルに揃える。exclude の配下は変更しない。
 */
export function replaceTomlTable(
    text: string,
    path: string[],
    fragment: string | null,
    exclude: string[][] = []
): string {
    assertPath(path);
    const model = parseExisting(text);
    const layout = existingLayout(text);
    const scope = analyzeScope(layout, path, exclude);
    const blocks = blockRanges(layout, scope.blocks);
    const loose = looseRanges(scope);

    if (fragment === null) {
        const removed = removeRanges(text, [...blocks, ...loose]);
        verifyTomlEdit(text, removed, applyToModel(model, path, undefined, exclude), [path], { exclude });
        return removed;
    }

    const eol = detectTomlEol(text || fragment);
    const input = (fragment.charCodeAt(0) === 0xfeff ? fragment.slice(1) : fragment).replace(/\r?\n/g, eol);
    const parsed = validateFragment(input, path, exclude);
    const body = trimBlankEdges(input, eol);
    let bodyLayout: TomlLayout;
    try {
        bodyLayout = layoutOf(body);
    } catch (error) {
        throw new TomlEditError('unsupported-form', `the fragment cannot be scanned: ${String(error)}`);
    }

    const valueStatement = fragmentValueStatement(bodyLayout, path);
    let result: string;
    if (valueStatement) {
        const exact = exactStatement(scope, path);
        if (exact && scope.loose.length === 1 && scope.blocks.length === 0) {
            const lines = renderValueFragment(bodyLayout, valueStatement, exact.table, eol);
            result = splice(text, { start: exact.start, end: exact.lineEnd }, lines);
        } else {
            const cleared = removeRanges(text, [...blocks, ...loose]);
            const render = (table: string[]) => renderValueFragment(bodyLayout, valueStatement, table, eol);
            result = insertIntoParent(cleared, path, render, eol);
        }
    } else if (blocks.length > 0) {
        // 後ろの範囲から処理するので、前の範囲の位置はずれない。
        const ranges = [...blocks, ...loose].sort((a, b) => b.start - a.start);
        result = ranges.reduce(
            (current, range) => (range === blocks[0] ? splice(current, range, body) : removeRange(current, range)),
            text
        );
    } else {
        result = appendTomlBlock(removeRanges(text, loose), body, eol);
    }

    const expected = applyToModel(model, path, getAt(parsed, path), exclude);
    verifyTomlEdit(text, result, expected, [path], { exclude, source: body });
    return result;
}

/** 複数のテーブルをまとめて削除する。無いパスは無視し、空テーブルを残さない。 */
export function removeTomlTables(text: string, paths: string[][]): string {
    paths.forEach(assertPath);
    const model = parseExisting(text);
    const layout = existingLayout(text);
    const ranges: TomlRange[] = [];
    for (const path of paths) {
        const scope = analyzeScope(layout, path, []);
        ranges.push(...blockRanges(layout, scope.blocks), ...looseRanges(scope));
        deleteAt(model, path);
    }
    if (ranges.length === 0) {
        return text;
    }
    const removed = removeRanges(text, ranges);
    verifyTomlEdit(text, removed, model, paths);
    return removed;
}

// ------------------------------------------------------------
// テーブル以外の値
// ------------------------------------------------------------

/** path の値が見出しやドットキーで書かれたテーブルなら unsupported-form を投げ、代入の文を返す。 */
function valueStatement(layout: TomlLayout, path: string[]): LineAssignment | undefined {
    const scope = analyzeScope(layout, path, []);
    const exact = exactStatement(scope, path);
    if (!exact && (scope.blocks.length > 0 || scope.loose.length > 0)) {
        throw new TomlEditError('unsupported-form', `${path.join('.')} is written as a table`);
    }
    return exact;
}

/** テーブル以外の値（配列、スカラー、インラインテーブル）の原文を返す。テーブルの形で書かれていれば拒否する。 */
export function readTomlValue(text: string, path: string[]): TomlValueRead {
    assertPath(path);
    parseExisting(text);
    const exact = valueStatement(existingLayout(text), path);
    return exact
        ? { present: true, fragment: text.slice(exact.valueStart, exact.valueEnd) }
        : { present: false, fragment: '' };
}

function removeValue(text: string, path: string[]): string {
    const model = parseExisting(text);
    const exact = valueStatement(existingLayout(text), path);
    if (!exact) {
        return text;
    }
    const removed = removeRange(text, { start: exact.start, end: exact.lineEnd });
    deleteAt(model, path);
    verifyTomlEdit(text, removed, model, [path]);
    return removed;
}

function applyValue(text: string, path: string[], raw: string, value: unknown, source?: string): string {
    const model = parseExisting(text);
    const exact = valueStatement(existingLayout(text), path);
    const eol = detectTomlEol(text || raw);
    const result = exact
        ? splice(text, { start: exact.valueStart, end: exact.valueEnd }, raw)
        : insertIntoParent(text, path, table => `${formatKeyPath(path.slice(table.length))} = ${raw}${eol}`, eol);
    setAt(model, path, value);
    verifyTomlEdit(text, result, model, [path], { source });
    return result;
}

/**
 * テーブル以外の値を原文で置き換える。rawValue が null なら代入の行を削除する（親のテーブルは残す）。
 * 既存の代入は値の範囲だけを置き換えるので、キーの表記と行末コメントは残る。
 */
export function replaceTomlValue(text: string, path: string[], rawValue: string | null): string {
    assertPath(path);
    if (rawValue === null) {
        return removeValue(text, path);
    }
    const raw = rawValue.replace(/\r?\n/g, detectTomlEol(text || rawValue)).trim();
    let parsed: TomlModel;
    try {
        parsed = parseToml(`v = ${raw}`);
    } catch (error) {
        throw new TomlEditError(
            'invalid-input',
            'the value cannot be parsed',
            error instanceof TomlError ? error.line : undefined
        );
    }
    if (Object.keys(parsed).length !== 1) {
        throw new TomlEditError('invalid-input', 'the text must contain one value only');
    }
    return applyValue(text, path, raw, parsed.v, `${formatKeyPath(path)} = ${raw}`);
}

/**
 * path へ値を設定する。null なら代入の行を削除する（親のテーブルは残す）。
 * 既存の代入は値の範囲だけを置き換える。同じ値なら原文の表記を変えず、小数表記の値へ整数を設定しても小数表記を保つ。
 * 無ければ親の本文の末尾（ルートは最初の見出しの前、親がドット記法ならその直後に同じ書き方）に加え、親が定義されて
 * いなければ末尾に見出しごと追記する。
 */
export function setTomlValue(text: string, path: string[], value: TomlEditableValue | null): string {
    assertPath(path);
    if (value === null) {
        return removeValue(text, path);
    }
    parseExisting(text);
    const exact = valueStatement(existingLayout(text), path);
    const currentRaw = exact ? text.slice(exact.valueStart, exact.valueEnd) : null;
    const raw = valueLiteral(value, currentRaw);
    const parsed = parseToml(`v = ${raw}`).v;
    if (currentRaw !== null && strictDeepEqual(parseToml(`v = ${currentRaw}`).v, parsed)) {
        return text;
    }
    return applyValue(text, path, raw, parsed);
}

// ------------------------------------------------------------
// 配列テーブルの要素の編集
// ------------------------------------------------------------

/** 配列テーブルの要素 1 つ。blocks は要素の見出しと配下の見出しのブロックで、children は childKey の配列テーブルの要素。 */
interface TomlArrayItem {
    blocks: TomlBlock[];
    children: TomlBlock[][];
    // 要素の本文に `childKey = [...]` で書かれた配列。
    inlineChildren: LineAssignment | null;
}

/**
 * 配列テーブルの要素の編集の手順。group は path の配列の位置、child は要素の childKey の配列の位置。
 * - removeChild: 要素の子を切り取る。
 * - replaceChild: 要素の子を values で置き換える。先頭の値が同じ位置に入り、残りはその直後に続く。
 * - removeGroup / replaceGroup / insertGroup / appendGroup: 要素そのものの切り取り、置き換え、挿入、末尾への追加。
 */
export type TomlArrayStep =
    | { kind: 'removeGroup'; group: number }
    | { kind: 'removeChild'; group: number; child: number }
    | { kind: 'replaceChild'; group: number; child: number; values: Record<string, unknown>[] }
    | { kind: 'replaceGroup'; group: number; value: Record<string, unknown> }
    | { kind: 'insertGroup'; group: number; value: Record<string, unknown> }
    | { kind: 'appendGroup'; value: Record<string, unknown> };

/** editTomlArrayItems の入力。expected は編集後の文書全体の値で、path の親のテーブルが無くなっていれば親も切り取る。 */
export interface TomlArrayEdit {
    path: string[];
    childKey: string;
    steps: TomlArrayStep[];
    expected: Record<string, unknown>;
    exclude?: string[][];
}

/** 値をインラインの原文にする。TOML にない null は invalid-input を投げる。 */
function inlineLiteral(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(inlineLiteral).join(', ')}]`;
    if (isTomlTable(value)) {
        const body = Object.entries(value)
            .map(([key, item]) => `${formatTomlKey(key)} = ${inlineLiteral(item)}`)
            .join(', ');
        return body === '' ? '{}' : `{ ${body} }`;
    }
    if (value === null || value === undefined) {
        throw new TomlEditError('invalid-input', 'TOML has no null value');
    }
    return valueLiteral(value as TomlEditableValue, null);
}

/** テーブルを見出しと本文の原文にする。テーブルと配列テーブルは配下の見出しのブロックにする。 */
function renderTableBlock(path: string[], array: boolean, value: Record<string, unknown>, eol: TomlEol): string {
    const label = formatKeyPath(path);
    const lines = [array ? `[[${label}]]` : `[${label}]`];
    const nested: string[] = [];
    for (const [key, item] of Object.entries(value)) {
        const childPath = [...path, key];
        if (isTomlTable(item)) {
            nested.push(renderTableBlock(childPath, false, item, eol));
        } else if (Array.isArray(item) && item.length > 0 && item.every(isTomlTable)) {
            for (const element of item) nested.push(renderTableBlock(childPath, true, element, eol));
        } else {
            lines.push(`${formatTomlKey(key)} = ${inlineLiteral(item)}`);
        }
    }
    return [`${lines.join(eol)}${eol}`, ...nested].join(eol);
}

/** path の配列テーブルの要素 1 つを `[[path]]` の断片にする。 */
export function renderTomlArrayItem(path: string[], value: Record<string, unknown>): string {
    return renderTableBlock(path, true, value, '\n');
}

/** path の配列テーブルの要素を並びの順に集める。 */
function arrayItemsOf(layout: TomlLayout, path: string[], childKey: string): TomlArrayItem[] {
    const childPath = [...path, childKey];
    const items: TomlArrayItem[] = [];
    let item: TomlArrayItem | null = null;
    let child: TomlBlock[] | null = null;
    for (const block of layout.blocks) {
        const { header } = block;
        if (!header) continue;
        if (header.array && sameTomlPath(header.path, path)) {
            const inlineChildren = block.statements.find(statement => sameTomlPath(statement.path, childPath));
            item = { blocks: [block], children: [], inlineChildren: inlineChildren ?? null };
            items.push(item);
            child = null;
        } else if (item && isUnder(header.path, path)) {
            item.blocks.push(block);
            if (header.array && sameTomlPath(header.path, childPath)) {
                child = [block];
                item.children.push(child);
            } else if (child && isUnder(header.path, childPath)) {
                child.push(block);
            }
        }
    }
    return items;
}

/** 配列の値の要素の範囲（要素の前後の空白とコメントを含まない）を返す。 */
function arrayElementRanges(text: string, value: { valueStart: number; valueEnd: number }): TomlRange[] {
    const ranges: TomlRange[] = [];
    const token = new RegExp(STRING_OR_COMMENT.source, 'y');
    let depth = 0;
    let start = -1;
    let end = -1;
    const close = () => {
        if (start !== -1) ranges.push({ start, end });
        start = -1;
    };
    let pos = value.valueStart + 1;
    while (pos < value.valueEnd - 1) {
        const ch = text[pos];
        token.lastIndex = pos;
        const match = ch === '"' || ch === "'" || ch === '#' ? token.exec(text) : null;
        if (match) {
            if (ch !== '#') {
                if (start === -1) start = pos;
                end = pos + match[0].length;
            }
            pos += match[0].length;
        } else if (/\s/.test(ch)) {
            pos += 1;
        } else if (ch === ',' && depth === 0) {
            close();
            pos += 1;
        } else {
            if (ch === '[' || ch === '{') depth += 1;
            if (ch === ']' || ch === '}') depth -= 1;
            if (start === -1) start = pos;
            pos += 1;
            end = pos;
        }
    }
    close();
    return ranges;
}

function itemAt(items: TomlArrayItem[], index: number): TomlArrayItem {
    const item = items[index];
    if (!item) throw new TomlEditError('unsupported-form', 'the array of tables has no such element');
    return item;
}

/** 行頭 at に原文を差し込む。at がテキストの末尾で改行が無ければ補う。 */
function insertAt(text: string, at: number, inserted: string, eol: TomlEol): string {
    if (inserted === '') return text;
    const needsEol = at === text.length && at > 0 && !text.endsWith('\n');
    return `${text.slice(0, at)}${needsEol ? eol : ''}${inserted}${text.slice(at)}`;
}

/** 範囲を切り取る。範囲の前後に空白しかなければ行ごと切り取る。 */
function cutOwnLine(text: string, range: TomlRange): string {
    const lineStart = text.lastIndexOf('\n', range.start - 1) + 1;
    const lineEnd = /^[ \t]*\r?\n/.exec(text.slice(range.end));
    if (text.slice(lineStart, range.start).trim() === '' && lineEnd) {
        return splice(text, { start: lineStart, end: range.end + lineEnd[0].length }, '');
    }
    return splice(text, range, '');
}

/**
 * インライン配列の要素を切り取る。後ろの要素があれば次の要素の先頭まで切り取る。
 * 最後の要素は、末尾のカンマがあれば一緒に切り取り、無ければ前のカンマを切り取る。前の要素の後ろのコメントは残す。
 */
function removeInlineElement(text: string, statement: LineAssignment, index: number): string {
    const ranges = arrayElementRanges(text, statement);
    const target = ranges[index];
    if (!target) throw new TomlEditError('unsupported-form', 'the inline array has no such element');
    const next = ranges[index + 1];
    if (next) return splice(text, { start: target.start, end: next.start }, '');
    const trailing = /^\s*,/.exec(text.slice(target.end));
    if (trailing) return cutOwnLine(text, { start: target.start, end: target.end + trailing[0].length });
    const previous = ranges[index - 1];
    if (!previous) return splice(text, target, '');
    const between = text.slice(previous.end, target.start);
    if (!between.includes('#')) return splice(text, { start: previous.end, end: target.end }, '');
    const comma = previous.end + between.indexOf(',');
    return splice(cutOwnLine(text, target), { start: comma, end: comma + 1 }, '');
}

/** 子のテーブルの文を values[0] に合わせて編集し、残りの値を直後に続ける。キーごとの編集で表せない形はブロックごと書き直す。 */
function replaceChildBlocks(
    layout: TomlLayout,
    blocks: TomlBlock[],
    childPath: string[],
    current: Record<string, unknown>,
    values: Record<string, unknown>[],
    eol: TomlEol
): string {
    const { text } = layout;
    const [first, ...rest] = values;
    const last = blocks[blocks.length - 1];
    const end = blockEnd(last, layout.bomEnd);
    const following = rest.map(value => `${eol}${renderTableBlock(childPath, true, value, eol)}`).join('');
    const block = blocks[0];
    const direct = block.statements.every(statement => statement.path.length === childPath.length + 1);
    if (blocks.length > 1 || !direct) {
        const ranges = blockRanges(layout, blocks);
        if (ranges.length !== 1) throw new TomlEditError('unsupported-form', 'the table is not written in one place');
        const start = (block.header as TomlHeader).start;
        return splice(text, { start, end }, `${renderTableBlock(childPath, true, first, eol)}${following}`);
    }
    const edits: { start: number; end: number; text: string }[] = [];
    for (const statement of block.statements) {
        const key = statement.path[statement.path.length - 1];
        if (!Object.hasOwn(first, key)) {
            edits.push({ start: statement.start, end: statement.lineEnd, text: '' });
        } else if (!strictDeepEqual(current[key], first[key])) {
            edits.push({ start: statement.valueStart, end: statement.valueEnd, text: inlineLiteral(first[key]) });
        }
    }
    const added = Object.keys(first)
        .filter(key => !Object.hasOwn(current, key))
        .map(key => `${formatTomlKey(key)} = ${inlineLiteral(first[key])}${eol}`)
        .join('');
    let result = insertAt(text, end, `${added}${following}`, eol);
    for (const item of edits.sort((a, b) => b.start - a.start)) {
        result = splice(result, item, item.text);
    }
    return result;
}

/** 手順を 1 つ適用する。 */
function applyArrayStep(text: string, edit: TomlArrayEdit, step: TomlArrayStep, eol: TomlEol): string {
    const layout = existingLayout(text);
    const { path, childKey } = edit;
    const items = arrayItemsOf(layout, path, childKey);
    const childPath = [...path, childKey];
    switch (step.kind) {
        case 'removeGroup':
            return removeRanges(text, blockRanges(layout, itemAt(items, step.group).blocks));
        case 'removeChild': {
            const item = itemAt(items, step.group);
            if (item.inlineChildren) return removeInlineElement(text, item.inlineChildren, step.child);
            const blocks = item.children[step.child];
            if (!blocks) throw new TomlEditError('unsupported-form', 'the array of tables has no such child');
            return removeRanges(text, blockRanges(layout, blocks));
        }
        case 'replaceChild': {
            const item = itemAt(items, step.group);
            if (item.inlineChildren) {
                const target = arrayElementRanges(text, item.inlineChildren)[step.child];
                if (!target) throw new TomlEditError('unsupported-form', 'the inline array has no such element');
                return splice(text, target, step.values.map(inlineLiteral).join(', '));
            }
            const blocks = item.children[step.child];
            if (!blocks) throw new TomlEditError('unsupported-form', 'the array of tables has no such child');
            const groups = getAt(parseExisting(text), path) as Record<string, unknown>[];
            const current = (groups[step.group][childKey] as Record<string, unknown>[])[step.child];
            return replaceChildBlocks(layout, blocks, childPath, current, step.values, eol);
        }
        case 'replaceGroup': {
            const item = itemAt(items, step.group);
            const rendered = renderTableBlock(path, true, step.value, eol);
            const ranges = blockRanges(layout, item.blocks);
            if (ranges.length !== 1) {
                const cleared = removeRanges(text, ranges);
                return insertAt(cleared, ranges[0].start, `${rendered}${eol}`, eol);
            }
            const start = (item.blocks[0].header as TomlHeader).start;
            return splice(text, { start, end: ranges[0].end }, rendered);
        }
        case 'insertGroup': {
            const item = itemAt(items, step.group);
            const at = blockRanges(layout, [item.blocks[0]])[0].start;
            return insertAt(text, at, `${renderTableBlock(path, true, step.value, eol)}${eol}`, eol);
        }
        default: {
            const rendered = renderTableBlock(path, true, step.value, eol);
            const last = items[items.length - 1];
            if (!last) return appendTomlBlock(text, rendered, eol);
            const at = blockEnd(last.blocks[last.blocks.length - 1], layout.bomEnd);
            const follows = at < text.length && !/^[ \t]*\r?\n/.test(text.slice(at));
            return insertAt(text, at, `${eol}${rendered}${follows ? eol : ''}`, eol);
        }
    }
}

/**
 * path の配列テーブルの要素を手順のとおりに編集する。編集しない要素とスコープ外の文は原文のまま残る。
 * 配列が `path = [...]` の値で書かれていれば、編集後の値でその値を置き換える。結果は verifyTomlEdit で検証する。
 */
export function editTomlArrayItems(text: string, edit: TomlArrayEdit): string {
    const { path, expected } = edit;
    const exclude = edit.exclude ?? [];
    assertPath(path);
    parseExisting(text);
    const layout = existingLayout(text);
    const eol = detectTomlEol(text || '\n');
    const exact = exactStatement(analyzeScope(layout, path, exclude), path);
    let result = text;
    if (exact) {
        const value = getAt(expected, path);
        result = replaceTomlValue(text, path, value === undefined ? null : inlineLiteral(value));
    } else {
        for (const step of edit.steps) result = applyArrayStep(result, edit, step, eol);
    }
    const parent = path.slice(0, -1);
    const parentRemoved = parent.length > 0 && getAt(expected, parent) === undefined;
    if (parentRemoved) {
        const parentLayout = existingLayout(result);
        const scope = analyzeScope(parentLayout, parent, []);
        result = removeRanges(result, [...blockRanges(parentLayout, scope.blocks), ...looseRanges(scope)]);
    }
    verifyTomlEdit(text, result, expected, [parentRemoved ? parent : path], { exclude, source: result });
    return result;
}

/** before のコメントのうち after に残っていないものを返す。 */
export function lostTomlComments(before: string, after: string): string[] {
    const commentsOf = (text: string) => (text.match(STRING_OR_COMMENT) ?? []).filter(item => item.startsWith('#'));
    const remaining = commentsOf(after);
    return commentsOf(before).filter(comment => {
        const index = remaining.indexOf(comment);
        if (index === -1) return true;
        remaining.splice(index, 1);
        return false;
    });
}

// ------------------------------------------------------------
// Codex の [hooks]
// ------------------------------------------------------------

export type CodexHooksIssueCode =
    | 'invalid-toml'
    | 'not-table'
    | 'not-array'
    | 'matcher-type'
    | 'type-missing'
    | 'type-invalid'
    | 'command-missing'
    | 'command-type'
    | 'timeout-invalid'
    | 'state-type'
    | 'unknown-event'
    | 'handler-unsupported'
    | 'mcp-tool-incomplete';

export interface CodexHooksIssue {
    code: CodexHooksIssueCode;
    /** 問題の位置（例: `hooks.PreToolUse[0].hooks[1].timeout`）。 */
    path: string;
    /** invalid-toml のときの行（1 始まり）。 */
    line?: number;
}

/** errors は Codex の起動エラーになると確認済みのもの、warnings は起動はできるが注意を要するもの。 */
export interface CodexHooksValidation {
    errors: CodexHooksIssue[];
    warnings: CodexHooksIssue[];
}

const CODEX_HOOK_EVENTS = new Set([
    'Interrupt',
    'PermissionRequest',
    'PostCompact',
    'PostModelRequest',
    'PostToolUse',
    'PreCompact',
    'PreModelRequest',
    'PreToolUse',
    'SessionEnd',
    'SessionStart',
    'Stop',
    'SubagentStart',
    'SubagentStop',
    'UserPromptSubmit',
]);

function validCodexTimeout(value: unknown): boolean {
    return typeof value === 'bigint' ? value >= 0n : typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function validateCodexHandler(handler: unknown, at: string, result: CodexHooksValidation): void {
    if (!isTomlTable(handler)) {
        result.errors.push({ code: 'not-table', path: at });
        return;
    }
    const type = handler.type;
    if (type === undefined) {
        result.errors.push({ code: 'type-missing', path: `${at}.type` });
        return;
    }
    if (type === 'prompt' || type === 'agent') {
        result.warnings.push({ code: 'handler-unsupported', path: `${at}.type` });
        return;
    }
    if (type !== 'command' && type !== 'mcp_tool') {
        result.errors.push({ code: 'type-invalid', path: `${at}.type` });
        return;
    }
    if (type === 'command') {
        if (handler.command === undefined) {
            result.errors.push({ code: 'command-missing', path: `${at}.command` });
        } else if (typeof handler.command !== 'string') {
            result.errors.push({ code: 'command-type', path: `${at}.command` });
        }
    } else if (typeof handler.server !== 'string' || typeof handler.tool !== 'string') {
        result.warnings.push({ code: 'mcp-tool-incomplete', path: at });
    }
    if (handler.timeout !== undefined && !validCodexTimeout(handler.timeout)) {
        result.errors.push({ code: 'timeout-invalid', path: `${at}.timeout` });
    }
}

function validateCodexEvent(event: string, groups: unknown, result: CodexHooksValidation): void {
    const at = `hooks.${event}`;
    if (!Array.isArray(groups)) {
        result.errors.push({ code: 'not-array', path: at });
        return;
    }
    groups.forEach((group, index) => {
        const groupAt = `${at}[${index}]`;
        if (!isTomlTable(group)) {
            result.errors.push({ code: 'not-table', path: groupAt });
            return;
        }
        if (group.matcher !== undefined && typeof group.matcher !== 'string') {
            result.errors.push({ code: 'matcher-type', path: `${groupAt}.matcher` });
        }
        if (group.hooks === undefined) {
            return;
        }
        if (!Array.isArray(group.hooks)) {
            result.errors.push({ code: 'not-array', path: `${groupAt}.hooks` });
            return;
        }
        group.hooks.forEach((handler, handlerIndex) => {
            validateCodexHandler(handler, `${groupAt}.hooks[${handlerIndex}]`, result);
        });
    });
}

function validateCodexHookState(state: unknown, result: CodexHooksValidation): void {
    if (!isTomlTable(state)) {
        result.errors.push({ code: 'state-type', path: 'hooks.state' });
        return;
    }
    for (const [key, entry] of Object.entries(state)) {
        const at = `hooks.state.${key}`;
        const valid =
            isTomlTable(entry) &&
            (entry.enabled === undefined || typeof entry.enabled === 'boolean') &&
            (entry.trusted_hash === undefined || typeof entry.trusted_hash === 'string') &&
            (entry.trusted_content_hash === undefined || typeof entry.trusted_content_hash === 'string');
        if (!valid) {
            result.errors.push({ code: 'state-type', path: at });
        }
    }
}

/** 既知のイベントの配下で、小数表記で書かれた整数値の timeout（例: `30.0`）の位置を返す。 */
function codexFloatTimeouts(fragment: string): string[] {
    const found = new Set<string>();
    const isFloatInteger = (raw: string) => {
        const tokens = numberTokens(raw);
        return tokens.length === 1 && tokens[0].float && Number.isInteger(tokens[0].value);
    };
    for (const assignment of scanTomlStatements(fragment).assignments) {
        const [root, event, nested, key] = assignment.path;
        if (root !== 'hooks' || !CODEX_HOOK_EVENTS.has(event)) {
            continue;
        }
        const raw = fragment.slice(assignment.valueStart, assignment.valueEnd);
        const at = `hooks.${event}.hooks.timeout`;
        if (assignment.path.length === 4 && nested === 'hooks' && key === 'timeout') {
            if (isFloatInteger(raw)) {
                found.add(at);
            }
        } else if (raw.startsWith('[')) {
            const bare = raw.replace(STRING_OR_COMMENT, ' ');
            for (const match of bare.matchAll(/(?:^|[\s,{])timeout\s*=\s*([^\s,}\]]+)/g)) {
                if (isFloatInteger(match[1])) {
                    found.add(at);
                }
            }
        }
    }
    return [...found];
}

/**
 * Codex の `[hooks]` の断片を検証する。起動エラーになると確認済みの次の内容だけを errors にする。
 * - 型違い: 既知のイベントが配列でない、グループやハンドラがテーブルでない、matcher が文字列でない、hooks が配列でない
 * - type の不正値と欠落、command の欠落と型違い、timeout の文字列、負数、小数
 * - hooks.state の型違い
 * 未知のイベントと未知のキー、不正な matcher の正規表現は起動できるので拒否しない。
 */
export function validateCodexHooksFragment(fragment: string): CodexHooksValidation {
    const result: CodexHooksValidation = { errors: [], warnings: [] };
    let parsed: TomlModel;
    try {
        parsed = parseToml(fragment);
    } catch (error) {
        const line = error instanceof TomlError ? error.line : undefined;
        result.errors.push({ code: 'invalid-toml', path: '', line });
        return result;
    }
    const hooks = parsed.hooks;
    if (hooks === undefined) {
        return result;
    }
    if (!isTomlTable(hooks)) {
        result.errors.push({ code: 'not-table', path: 'hooks' });
        return result;
    }
    for (const [event, groups] of Object.entries(hooks)) {
        if (event === 'state') {
            validateCodexHookState(groups, result);
        } else if (CODEX_HOOK_EVENTS.has(event)) {
            validateCodexEvent(event, groups, result);
        } else {
            result.warnings.push({ code: 'unknown-event', path: `hooks.${event}` });
        }
    }
    try {
        for (const path of codexFloatTimeouts(fragment)) {
            result.errors.push({ code: 'timeout-invalid', path });
        }
    } catch {
        // 小数表記の判定は走査の結果に基づくので、走査できない形では判定できないことだけを伝える。
        result.warnings.push({ code: 'invalid-toml', path: 'hooks' });
    }
    return result;
}
