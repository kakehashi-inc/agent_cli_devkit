/**
 * hook の設定を一覧の行へ平坦化し、名前と有効状態を求める。
 * 入力がどのような形でも例外を投げない。不正な形は invalid の行にし、未知のイベントは印を付けて表示する。
 * 名前の体系を持つ形式（'grok'）では、名前を断定できる行にだけ名前と状態を付ける。
 */
import { posix } from 'path';
import type {
    HookEntryLocator,
    HookOverviewRow,
    HookOverviewSectionSpec,
    HookSourceNaming,
    ProfileDocFormat,
    ProfileEol,
} from '../../../../shared/agents/profile/types';
import { parseJsonc } from '../../../utils/jsoncEdit';
import { parseToml } from '../../../utils/tomlSubtree';

/** hook の読み取り元 1 つ分の本文と属性。 */
export interface HookDocument {
    // 行の source に出す名前。
    label: string;
    // ホームからのディレクトリ。相対コマンドの解決の基準。
    dir: string;
    format: ProfileDocFormat;
    path: string[] | null;
    excludePaths?: string[][];
    // 本文。読めなければ null。
    text: string | null;
    naming?: HookSourceNaming;
    // naming が 'global' のときのファイル名（最後の拡張子を除く）。
    stem?: string;
    custom?: boolean;
    // シンボリックリンクのファイル。
    linked?: boolean;
    // 編集できる読み取り元の ID と、ファイルの revision。
    sourceId?: string;
    revision?: string;
    // 形の崩れたファイルの全体を編集できる読み取り元か。
    repairable?: boolean;
}

/** 行と、コピーの判定に使う情報。 */
export interface AnalyzedHookRow {
    row: HookOverviewRow;
    // 同じイベント、matcher、ハンドラのコピーで同じになる値。名前を持つ行だけが持つ。
    copyKey?: string;
    // コピーの権威。大きいほど強い。
    authority: number;
    // 読み込み順。
    order: number;
}

/** 無効化の切り替えの内容。warnings は影響する相手の名前を含むコード。 */
export interface HookTogglePlan {
    add: string | null;
    remove: string[];
    warnings: string[];
}

type Table = Record<string, unknown>;

// 行の組み立てに使う途中の情報。
interface ParsedRow {
    row: HookOverviewRow;
    eventKey: string;
    groupIndex?: number;
    handlerIndex?: number;
    handler?: Table;
    matcher?: string;
    // CLI がファイルまたはイベントごと読まなくなる形の崩れ。
    structural: boolean;
    // 編集と削除で指せる位置。
    position?: Pick<HookEntryLocator, 'name' | 'event' | 'group' | 'handler'>;
}

// Grok のイベントの表示名（snake_case）。
const GROK_EVENTS = [
    'pre_tool_use',
    'post_tool_use',
    'post_tool_use_failure',
    'permission_denied',
    'stop',
    'stop_failure',
    'stop_cancelled',
    'notification',
    'session_start',
    'session_end',
    'user_prompt_submit',
    'subagent_start',
    'subagent_stop',
    'pre_compact',
    'post_compact',
];

// Grok のコピーの権威。config.toml は hooks/*.json より強い。
const GROK_AUTHORITY: Record<HookSourceNaming, number> = { user: 2, global: 1 };

// Agy のハンドラの type を省略したときの種類。
const AGY_DEFAULT_HANDLER_TYPE = 'command';

// 一覧に出す prompt の先頭の文字数。
const PROMPT_PREVIEW_LENGTH = 80;

// 既知の書き方から Grok のイベントの表示名を引く表。
const GROK_EVENT_SPELLINGS = buildGrokEventSpellings();

function buildGrokEventSpellings(): Map<string, string> {
    const spellings = new Map<string, string>();
    const add = (snake: string, event: string) => {
        const words = snake.split('_');
        const capitalized = words.map(word => word[0].toUpperCase() + word.slice(1));
        spellings.set(snake, event);
        spellings.set(capitalized.join(''), event);
        spellings.set(words[0] + capitalized.slice(1).join(''), event);
    };
    for (const event of GROK_EVENTS) add(event, event);
    add('subagent_end', 'subagent_stop');
    return spellings;
}

function isTable(value: unknown): value is Table {
    return typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date);
}

function isStringMap(value: unknown): boolean {
    return isTable(value) && Object.values(value).every(item => typeof item === 'string');
}

/** 空白や引用符を含む引数を引用符で囲む。 */
function formatArg(arg: string): string {
    return /[\s"']/.test(arg) ? JSON.stringify(arg) : arg;
}

/** ハンドラの timeout を秒の数値にする。数値でなければ undefined。 */
function timeoutSeconds(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    return typeof value === 'bigint' ? Number(value) : undefined;
}

/** ハンドラの内容を行の項目にする。defaultType は type を省略できる形式の既定の種類。 */
function describeHandler(
    handler: Table,
    defaultType?: string
): Pick<HookOverviewRow, 'type' | 'command' | 'timeoutSec'> & {
    broken: boolean;
} {
    const fields: Pick<HookOverviewRow, 'type' | 'command' | 'timeoutSec'> = {};
    let broken = false;
    if (typeof handler.type === 'string') fields.type = handler.type;
    else if (handler.type === undefined && defaultType !== undefined) fields.type = defaultType;
    else broken = true;

    const { command, args, url, server, tool, prompt, timeout, env } = handler;
    if (command !== undefined && typeof command !== 'string') broken = true;
    if (url !== undefined && typeof url !== 'string') broken = true;
    if (args !== undefined && !(Array.isArray(args) && args.every(arg => typeof arg === 'string'))) broken = true;
    if (env !== undefined && env !== null && !isStringMap(env)) broken = true;
    if (typeof command === 'string') {
        const list = Array.isArray(args) ? args.filter((arg): arg is string => typeof arg === 'string') : [];
        fields.command = [command, ...list.map(formatArg)].join(' ');
    } else if (typeof url === 'string') {
        fields.command = url;
    } else if (typeof server === 'string' && typeof tool === 'string') {
        fields.command = `${server}/${tool}`;
    } else if (typeof prompt === 'string') {
        fields.command = prompt.slice(0, PROMPT_PREVIEW_LENGTH);
    }
    if (timeout !== undefined) {
        const seconds = timeoutSeconds(timeout);
        if (seconds === undefined) broken = true;
        else fields.timeoutSec = seconds;
    }
    return { ...fields, broken };
}

/** path の位置の値を返す。無ければ undefined。 */
function valueAt(root: unknown, path: string[] | null): unknown {
    let current = root;
    for (const key of path ?? []) {
        if (!isTable(current) || !Object.hasOwn(current, key)) return undefined;
        current = current[key];
    }
    return current;
}

function isExcluded(document: HookDocument, eventKey: string): boolean {
    const target = [...(document.path ?? []), eventKey];
    return (document.excludePaths ?? []).some(
        part => part.length <= target.length && part.every((segment, index) => segment === target[index])
    );
}

/** `event: [{ matcher, hooks: [handler] }]` の形を行にする。 */
function parseClaudeStyle(value: Table, document: HookDocument, isKnown: (event: string) => boolean): ParsedRow[] {
    const rows: ParsedRow[] = [];
    for (const [eventKey, groups] of Object.entries(value)) {
        if (isExcluded(document, eventKey)) continue;
        const unknownEvent = !isKnown(eventKey);
        const base = { source: document.label, event: eventKey, ...(unknownEvent ? { unknownEvent: true } : {}) };
        if (!Array.isArray(groups)) {
            rows.push({ row: { ...base, invalid: true }, eventKey, structural: true });
            continue;
        }
        groups.forEach((group, groupIndex) => {
            if (!isTable(group)) {
                rows.push({ row: { ...base, invalid: true }, eventKey, groupIndex, structural: true });
                return;
            }
            const matcherValue = group.matcher;
            const matcherBroken =
                matcherValue !== undefined && matcherValue !== null && typeof matcherValue !== 'string';
            const matcher = typeof matcherValue === 'string' ? matcherValue : undefined;
            const groupBase = { ...base, ...(matcher !== undefined ? { matcher } : {}) };
            if (!Array.isArray(group.hooks)) {
                rows.push({ row: { ...groupBase, invalid: true }, eventKey, groupIndex, matcher, structural: true });
                return;
            }
            if (group.hooks.length === 0) {
                const row = matcherBroken ? { ...groupBase, invalid: true } : groupBase;
                rows.push({ row, eventKey, groupIndex, matcher, structural: matcherBroken });
            }
            group.hooks.forEach((handler: unknown, handlerIndex: number) => {
                if (!isTable(handler)) {
                    rows.push({
                        row: { ...groupBase, invalid: true },
                        eventKey,
                        groupIndex,
                        handlerIndex,
                        matcher,
                        structural: true,
                    });
                    return;
                }
                const { broken, ...fields } = describeHandler(handler);
                const invalid = broken || matcherBroken;
                rows.push({
                    row: { ...groupBase, ...fields, ...(invalid ? { invalid: true } : {}) },
                    eventKey,
                    groupIndex,
                    handlerIndex,
                    handler,
                    matcher,
                    structural: invalid,
                    position: { event: eventKey, group: groupIndex, handler: handlerIndex },
                });
            });
        });
    }
    return rows;
}

/** `name: { enabled, Event: [...] }` の形を行にする。要素が hooks を持てばグループ、持たなければハンドラとして読む。 */
function parseAgyNamed(value: Table, document: HookDocument, isKnown: (event: string) => boolean): ParsedRow[] {
    const rows: ParsedRow[] = [];
    const push = (row: HookOverviewRow, eventKey: string, position?: ParsedRow['position']) =>
        rows.push({ row, eventKey, structural: false, ...(position ? { position } : {}) });
    for (const [hookName, definition] of Object.entries(value)) {
        const named = { source: document.label, hookName };
        if (!isTable(definition)) {
            push({ ...named, event: '', invalid: true }, '');
            continue;
        }
        const enabledBroken = definition.enabled !== undefined && typeof definition.enabled !== 'boolean';
        const state: HookOverviewRow['state'] = definition.enabled === false ? 'disabled' : 'enabled';
        const base = { ...named, state, ...(enabledBroken ? { invalid: true } : {}) };
        let count = 0;
        for (const [event, items] of Object.entries(definition)) {
            if (event === 'enabled') continue;
            const known = isKnown(event);
            if (!Array.isArray(items)) {
                if (known) {
                    push({ ...base, event, invalid: true }, event);
                    count += 1;
                }
                continue;
            }
            const eventBase = { ...base, event, ...(known ? {} : { unknownEvent: true }) };
            items.forEach((item: unknown, group: number) => {
                count += 1;
                if (!isTable(item)) {
                    push({ ...eventBase, invalid: true }, event);
                } else if (item.hooks === undefined) {
                    const { broken, ...fields } = describeHandler(item, AGY_DEFAULT_HANDLER_TYPE);
                    push({ ...eventBase, ...fields, ...(broken ? { invalid: true } : {}) }, event, {
                        name: hookName,
                        event,
                        group,
                        handler: null,
                    });
                } else {
                    const matcher = typeof item.matcher === 'string' ? { matcher: item.matcher } : {};
                    if (!Array.isArray(item.hooks)) {
                        push({ ...eventBase, ...matcher, invalid: true }, event);
                        return;
                    }
                    const handlers = item.hooks as unknown[];
                    const allTables = handlers.every(isTable);
                    handlers.forEach((handler, handlerIndex) => {
                        if (!isTable(handler)) {
                            push({ ...eventBase, ...matcher, invalid: true }, event);
                            return;
                        }
                        const { broken, ...fields } = describeHandler(handler, AGY_DEFAULT_HANDLER_TYPE);
                        const position = allTables
                            ? { name: hookName, event, group, handler: handlerIndex }
                            : undefined;
                        push(
                            { ...eventBase, ...matcher, ...fields, ...(broken ? { invalid: true } : {}) },
                            event,
                            position
                        );
                    });
                }
            });
        }
        if (count === 0) push({ ...base, event: '' }, '');
    }
    return rows;
}

/** 文書の本文を解釈する。読めなければ例外を投げる。 */
function parseDocument(document: HookDocument): unknown {
    const text = document.text as string;
    if (text.trim() === '') return {};
    return document.format === 'toml' ? parseToml(text) : parseJsonc(text);
}

/** 文書 1 つを行にする。例外を投げない。 */
function parseHookDocument(
    section: Pick<HookOverviewSectionSpec, 'parser'>,
    document: HookDocument,
    isKnown: (event: string) => boolean
): ParsedRow[] {
    const invalidDocument = (): ParsedRow[] => [
        {
            row: {
                source: document.label,
                event: '',
                invalid: true,
                ...(document.custom ? { custom: true } : {}),
            },
            eventKey: '',
            structural: true,
        },
    ];
    if (document.text === null) return invalidDocument();
    try {
        const value = valueAt(parseDocument(document), document.path);
        if (value === undefined) return [];
        if (!isTable(value)) return invalidDocument();
        const rows =
            section.parser === 'agyNamed'
                ? parseAgyNamed(value, document, isKnown)
                : parseClaudeStyle(value, document, isKnown);
        for (const parsed of rows) {
            if (document.custom) parsed.row.custom = true;
            if (document.linked) parsed.row.linked = true;
            if (document.sourceId !== undefined && parsed.position) {
                parsed.row.locator = { source: document.sourceId, ...parsed.position };
                if (document.revision !== undefined) parsed.row.revision = document.revision;
            }
        }
        return rows;
    } catch {
        return invalidDocument();
    }
}

// ------------------------------------------------------------
// Grok の名前
// ------------------------------------------------------------

/** 相対コマンドをファイルのディレクトリ基準で解決した形にする。 */
function resolvedCommand(command: string, dir: string): string {
    const trimmed = command.trim();
    const match = /^(\S+)([\s\S]*)$/.exec(trimmed);
    if (!match) return trimmed;
    const head = match[1].replace(/\\/g, '/');
    const absolute = head.startsWith('/') || /^[a-zA-Z]:/.test(head) || /^[~$%]/.test(head);
    if (absolute || !head.includes('/')) return trimmed;
    return `${posix.normalize(posix.join(dir, head))}${match[2]}`;
}

/** コピーの判定に使うハンドラの値。URL、または解決したコマンドと args と env で決まる。 */
function handlerIdentity(handler: Table, dir: string): unknown {
    if (handler.type === 'http') return ['http', handler.url];
    const env = isTable(handler.env)
        ? Object.keys(handler.env)
              .sort()
              .map(key => [key, (handler.env as Table)[key]])
        : [];
    return ['command', resolvedCommand(String(handler.command), dir), handler.args ?? null, env];
}

/** Grok のハンドラとして読み込まれる形か。 */
function isLoadableGrokHandler(handler: Table): boolean {
    if (handler.type === 'http') return typeof handler.url === 'string';
    return handler.type === 'command' && typeof handler.command === 'string';
}

interface GrokNameTarget {
    parsed: ParsedRow;
    name: string;
    copyKey: string;
}

/**
 * 名前を断定できる行に名前を付ける。次の行には付けない。
 * - 未知の書き方のイベントが同じ読み取り元にある（別名なら番号が変わるので、番号を断定できない）
 * - 同じイベントを別の書き方で併記している（連結の順が定まらない）
 * - JSON でファイル全体、TOML でそのイベントが読み込まれなくなる形の崩れがある
 * - 読み込まれないハンドラ（行を invalid にする）
 */
function grokNameTargets(document: HookDocument, rows: ParsedRow[]): GrokNameTarget[] {
    if (!document.naming) return [];
    const keys = [...new Set(rows.map(parsed => parsed.eventKey))];
    if (keys.some(key => !GROK_EVENT_SPELLINGS.has(key))) return [];
    const structuralKeys = new Set(rows.filter(parsed => parsed.structural).map(parsed => parsed.eventKey));
    if (document.format !== 'toml' && structuralKeys.size > 0) return [];
    const keysOfEvent = new Map<string, string[]>();
    for (const key of keys) {
        const event = GROK_EVENT_SPELLINGS.get(key) as string;
        keysOfEvent.set(event, [...(keysOfEvent.get(event) ?? []), key]);
    }
    const prefix = document.naming === 'user' ? 'user' : `global/${document.stem ?? ''}`;
    const targets: GrokNameTarget[] = [];
    for (const parsed of rows) {
        const { handler, groupIndex, handlerIndex, eventKey } = parsed;
        if (!handler || groupIndex === undefined || handlerIndex === undefined) continue;
        const event = GROK_EVENT_SPELLINGS.get(eventKey) as string;
        if (structuralKeys.has(eventKey) || (keysOfEvent.get(event) as string[]).length > 1) continue;
        if (!isLoadableGrokHandler(handler)) {
            parsed.row.invalid = true;
            continue;
        }
        targets.push({
            parsed,
            name: `${prefix}:${event}[${groupIndex}].hooks[${handlerIndex}]`,
            copyKey: JSON.stringify([event, parsed.matcher ?? '', handlerIdentity(handler, document.dir)]),
        });
    }
    return targets;
}

/** covering が covered を止めるか（権威が強い、または同じ権威で先に読み込まれる）。 */
function covers(covering: AnalyzedHookRow, covered: AnalyzedHookRow): boolean {
    return (
        covering !== covered &&
        covering.copyKey !== undefined &&
        covering.copyKey === covered.copyKey &&
        (covering.authority > covered.authority ||
            (covering.authority === covered.authority && covering.order < covered.order))
    );
}

/** 名前を持つ行の状態を、無効化の行の内容から決める。disabled が null なら状態を付けない。 */
function applyDisabledState(rows: AnalyzedHookRow[], disabled: ReadonlySet<string> | null): void {
    if (disabled === null) return;
    for (const entry of rows) {
        const name = entry.row.hookName;
        if (name === undefined) continue;
        if (disabled.has(name)) {
            entry.row.state = 'disabled';
            continue;
        }
        const covering = rows.find(
            other => other.row.hookName !== undefined && disabled.has(other.row.hookName) && covers(other, entry)
        );
        entry.row.state = covering ? 'maskedByOtherCopy' : 'enabled';
        if (covering) entry.row.maskedBy = covering.row.hookName;
    }
}

// ------------------------------------------------------------
// 一覧
// ------------------------------------------------------------

/**
 * 読み取り元を順に一覧の行へ平坦化する。例外を投げない。
 * disabled は無効化の行の名前の集合で、読めないときは null（名前は付けるが状態は断定しない）。
 */
export function analyzeHookDocuments(
    section: Pick<HookOverviewSectionSpec, 'parser' | 'knownEvents' | 'hookNaming'>,
    documents: readonly HookDocument[],
    disabled: ReadonlySet<string> | null
): AnalyzedHookRow[] {
    const known = new Set(section.knownEvents);
    const isKnown = (event: string) => (section.hookNaming ? GROK_EVENT_SPELLINGS.has(event) : known.has(event));
    const analyzed: AnalyzedHookRow[] = [];
    for (const document of documents) {
        const rows = parseHookDocument(section, document, isKnown);
        const targets = section.hookNaming ? grokNameTargets(document, rows) : [];
        const targetOf = new Map(targets.map(target => [target.parsed, target]));
        for (const parsed of rows) {
            const target = targetOf.get(parsed);
            if (target) parsed.row.hookName = target.name;
            if (parsed.row.invalid && !parsed.row.locator && document.repairable && document.sourceId !== undefined) {
                parsed.row.repairSource = document.sourceId;
            }
            analyzed.push({
                row: parsed.row,
                ...(target ? { copyKey: target.copyKey } : {}),
                authority: document.naming ? GROK_AUTHORITY[document.naming] : 0,
                order: analyzed.length,
            });
        }
    }
    if (section.hookNaming) applyDisabledState(analyzed, disabled);
    return analyzed;
}

// ------------------------------------------------------------
// 無効化の行
// ------------------------------------------------------------

/** 無効化の行のファイルから名前の集合を読む。空行と `#` で始まる行は名前ではない。 */
export function parseDisabledHookNames(text: string): Set<string> {
    const names = new Set<string>();
    for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed !== '' && !trimmed.startsWith('#')) names.add(trimmed);
    }
    return names;
}

/**
 * name の切り替えの内容を決める。名前が一覧に無ければ null。
 * - 有効化: 自分の行と、自分を止めているコピーの行を消す。相手の名前を warnings に含める。
 * - 無効化: 自分の行を足す。一緒に止まるコピーの名前を warnings に含める。
 */
export function planHookToggle(
    rows: readonly AnalyzedHookRow[],
    disabled: ReadonlySet<string>,
    name: string,
    enabled: boolean
): HookTogglePlan | null {
    const entry = rows.find(item => item.row.hookName === name);
    if (!entry) return null;
    if (enabled) {
        const covering = rows
            .filter(
                other => other.row.hookName !== undefined && disabled.has(other.row.hookName) && covers(other, entry)
            )
            .map(other => other.row.hookName as string);
        return {
            add: null,
            remove: [...(disabled.has(name) ? [name] : []), ...covering],
            warnings: covering.map(other => `hook-enable-removes:${other}`),
        };
    }
    if (disabled.has(name)) return { add: null, remove: [], warnings: [] };
    const covered = rows
        .filter(other => other.row.hookName !== undefined && !disabled.has(other.row.hookName) && covers(entry, other))
        .map(other => other.row.hookName as string);
    return { add: name, remove: [], warnings: covered.map(other => `hook-disable-also-stops:${other}`) };
}

/** イベントのキーの書き方が違っても同じ Grok のイベントを指すか。 */
export function isSameGrokEvent(a: string, b: string): boolean {
    const event = GROK_EVENT_SPELLINGS.get(a);
    return event !== undefined && event === GROK_EVENT_SPELLINGS.get(b);
}

/** 名前の位置の番号を置き換える。 */
export function renumberedHookName(name: string, group: number, handler: number): string {
    return name.replace(/\[\d+\]\.hooks\[\d+\]$/, `[${group}].hooks[${handler}]`);
}

/** 無効化の行の名前を renames のとおりに変える。null の名前の行は消す。コメントと未知の行はそのまま残す。 */
export function renameDisabledHookLines(text: string, renames: ReadonlyMap<string, string | null>): string {
    return (text.match(/[^\n]*\n|[^\n]+$/g) ?? [])
        .flatMap(line => {
            const name = line.trim();
            const next = renames.get(name);
            if (next === undefined) return [line];
            return next === null ? [] : [line.replace(name, next)];
        })
        .join('');
}

/** 無効化の行のファイルの本文を編集する。コメントと未知の行はそのまま残す。 */
export function editDisabledHookLines(text: string, plan: HookTogglePlan, eol: ProfileEol): string {
    const removing = new Set(plan.remove);
    const kept = (text.match(/[^\n]*\n|[^\n]+$/g) ?? []).filter(line => !removing.has(line.trim())).join('');
    if (plan.add === null) return kept;
    const separator = kept === '' || kept.endsWith('\n') ? '' : eol;
    return `${kept}${separator}${plan.add}${eol}`;
}
