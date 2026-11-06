/**
 * hook の 1 件の読み取り、追加、置き換え、削除を文書の本文へ適用する。
 * ファイルは読み書きしない。編集しない部分は原文のまま残し、結果は解釈して期待する内容と一致することを確かめる。
 */
import type {
    HookEntryAddition,
    HookEntryLocator,
    ProfileDocFormat,
    ProfileWriteError,
} from '../../../../shared/agents/profile/types';
import {
    insertJsoncElementAt,
    isJsoncArrayBlankAt,
    parseJsonc,
    parseJsoncObject,
    readJsoncArray,
    reindentJsoncRaw,
    removeJsoncElementAt,
    removeJsoncProperty,
    replaceJsoncValueAt,
    setJsoncRaw,
} from '../../../utils/jsoncEdit';
import { strictDeepEqual } from '../../../utils/strictDeepEqual';
import { editTomlArrayItems, parseToml, type TomlArrayStep } from '../../../utils/tomlSubtree';

type Table = Record<string, unknown>;

// グループのハンドラの配列のキー。
const HANDLERS_KEY = 'hooks';
// 名前付きの hook の中で、イベントではないキー。
const NAMED_HOOK_FLAG = 'enabled';

/** 編集の失敗。コードと付加情報だけを持つ。 */
export class HookEditFailure extends Error {
    constructor(
        readonly code: ProfileWriteError,
        readonly detail?: string
    ) {
        super(code);
        this.name = 'HookEditFailure';
    }
}

/** 文書の中の hooks の位置と形式。 */
export interface HookScope {
    parser: 'claudeStyle' | 'agyNamed';
    format: ProfileDocFormat;
    // null は文書全体。
    path: string[] | null;
    excludePaths?: string[][];
}

/** hook の 1 件の JSON のテキストを解釈した内容。 */
export interface HookEntryPart {
    // hooks 以外のキー。
    groupKeys: Table;
    handlers: Table[];
    // テキスト全体と各ハンドラの原文。
    rawGroup: string;
    rawHandlers: string[];
}

/** 文書への変更。key は書き込むイベントのキー。 */
export type HookEntryChange =
    | { kind: 'delete'; locator: HookEntryLocator }
    | { kind: 'replace'; locator: HookEntryLocator; part: HookEntryPart }
    | { kind: 'add'; addition: HookEntryAddition; key: string; flat: boolean; part: HookEntryPart };

/** 変更の結果。positionAfter は編集前の位置の編集後の位置を返す。null は無くなった位置。 */
export interface HookEntryEditResult {
    next: string;
    eventKey: string;
    positionAfter(group: number, handler: number | null): { group: number; handler: number | null } | null;
}

/** イベントの配列への編集の手順。 */
type HookStep =
    | { kind: 'removeGroup'; group: number }
    | { kind: 'removeChild'; group: number; child: number }
    | { kind: 'replaceChild'; group: number; child: number; values: Table[]; raws: string[] }
    | { kind: 'replaceGroup'; group: number; value: Table; raw: string }
    | { kind: 'replaceFlat'; group: number; raws: string[] }
    | { kind: 'insertGroup'; group: number; value: Table; raw: string }
    | { kind: 'append'; values: Table[]; raws: string[] };

/** 手順と編集後のイベントの配列。 */
interface HookPlan {
    eventKey: string;
    name?: string;
    steps: HookStep[];
    itemsAfter: unknown[];
    positionAfter: HookEntryEditResult['positionAfter'];
}

/** 行の位置に見つかった内容。handlers はイベントの配列に直接書かれたハンドラなら null。 */
interface HookEntryFound {
    items: unknown[];
    item: Table;
    handlers: Table[] | null;
    handler: Table;
}

function isTable(value: unknown): value is Table {
    return typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date);
}

function hasOwn(value: Table, key: string): boolean {
    return Object.hasOwn(value, key);
}

function isIndex(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/** renderer から受け取った行の位置の形を確かめる。 */
export function isHookEntryLocator(value: unknown): value is HookEntryLocator {
    if (!isTable(value)) return false;
    const { source, name, event, group, handler } = value;
    return (
        typeof source === 'string' &&
        typeof event === 'string' &&
        (name === undefined || typeof name === 'string') &&
        isIndex(group) &&
        (handler === null || isIndex(handler))
    );
}

/** renderer から受け取った追加の指定の形を確かめる。 */
export function isHookEntryAddition(value: unknown): value is HookEntryAddition {
    if (!isTable(value)) return false;
    const { source, name, event } = value;
    return typeof source === 'string' && typeof event === 'string' && (name === undefined || typeof name === 'string');
}

/** テーブルから hooks のキーを除いたコピーを返す。 */
function withoutHandlers(table: Table): Table {
    const copy = { ...table };
    delete copy[HANDLERS_KEY];
    return copy;
}

/** 文書の本文を解釈する。読めなければ invalid-existing の HookEditFailure を投げる。 */
function parseDocument(text: string, scope: HookScope): Table {
    if (text.trim() === '') return {};
    try {
        return scope.format === 'toml' ? parseToml(text) : parseJsoncObject(text);
    } catch {
        throw new HookEditFailure('invalid-existing');
    }
}

/** 文書のキーに使える名前か。 */
function isSafeKey(key: string): boolean {
    return key !== '' && key !== '__proto__' && key !== NAMED_HOOK_FLAG;
}

function jsonLineOf(error: unknown, text: string): string | undefined {
    const position = /position (\d+)/.exec(error instanceof Error ? error.message : '');
    return position ? `line:${text.slice(0, Number(position[1])).split('\n').length}` : undefined;
}

/** 値に null が入っているか。 */
function containsNull(value: unknown): boolean {
    if (value === null) return true;
    if (Array.isArray(value)) return value.some(containsNull);
    return isTable(value) && Object.values(value).some(containsNull);
}

/**
 * hook の 1 件の JSON のテキストを解釈する。`{ "matcher": ..., "hooks": [ { ハンドラ } ] }` の形でなければ
 * invalid-input の HookEditFailure を投げる。付加情報は形の違いを示すコード。
 */
export function parseHookEntryText(text: string): HookEntryPart {
    let value: unknown;
    try {
        value = JSON.parse(text);
    } catch (error) {
        const line = jsonLineOf(error, text);
        throw new HookEditFailure('invalid-input', ['json-invalid', ...(line ? [line] : [])].join(','));
    }
    const reject = (code: string): never => {
        throw new HookEditFailure('invalid-input', code);
    };
    if (!isTable(value)) return reject('hook-entry-not-object');
    if (!hasOwn(value, HANDLERS_KEY)) return reject('hook-entry-hooks-missing');
    const handlers = value[HANDLERS_KEY];
    if (!Array.isArray(handlers) || handlers.length === 0) return reject('hook-entry-hooks-empty');
    if (!handlers.every(isTable)) return reject('hook-entry-handler-not-object');
    const { matcher } = value;
    if (matcher !== undefined && typeof matcher !== 'string') return reject('hook-entry-matcher-not-string');
    return {
        groupKeys: withoutHandlers(value),
        handlers: handlers as Table[],
        rawGroup: text.trim(),
        rawHandlers: readJsoncArray(text, [HANDLERS_KEY]).elements.map(element => element.rawText),
    };
}

/** TOML の文書へ書けない内容なら失敗にする。 */
function assertWritableToToml(part: HookEntryPart): void {
    if (containsNull({ ...part.groupKeys, [HANDLERS_KEY]: part.handlers })) {
        throw new HookEditFailure('invalid-input', 'hook-entry-null-value');
    }
}

/** path の位置の値を返す。 */
function valueAt(model: unknown, path: readonly string[]): unknown {
    let current = model;
    for (const key of path) {
        if (!isTable(current) || !hasOwn(current, key)) return undefined;
        current = current[key];
    }
    return current;
}

function setValueAt(model: Table, path: readonly string[], value: unknown): void {
    let current = model;
    for (const key of path.slice(0, -1)) {
        if (!isTable(current[key])) current[key] = {};
        current = current[key] as Table;
    }
    current[path[path.length - 1]] = value;
}

function deleteValueAt(model: Table, path: readonly string[]): void {
    const parent = valueAt(model, path.slice(0, -1));
    if (isTable(parent)) delete parent[path[path.length - 1]];
}

/** イベントのキーの親の位置を返す。 */
function parentPathOf(scope: HookScope, name: string | undefined): string[] {
    return [...(scope.path ?? []), ...(name !== undefined ? [name] : [])];
}

function isExcluded(scope: HookScope, target: readonly string[]): boolean {
    return (scope.excludePaths ?? []).some(
        part => part.length <= target.length && part.every((segment, index) => segment === target[index])
    );
}

/** 行の位置の内容を返す。位置に内容が無ければ null。 */
function locateHookEntry(model: unknown, scope: HookScope, locator: HookEntryLocator): HookEntryFound | null {
    if ((scope.parser === 'agyNamed') !== (locator.name !== undefined)) return null;
    const path = [...parentPathOf(scope, locator.name), locator.event];
    if (isExcluded(scope, path)) return null;
    const items = valueAt(model, path);
    if (!Array.isArray(items)) return null;
    const item: unknown = items[locator.group];
    if (!isTable(item)) return null;
    if (locator.handler === null)
        return hasOwn(item, HANDLERS_KEY) ? null : { items, item, handlers: null, handler: item };
    const handlers = item[HANDLERS_KEY];
    if (!Array.isArray(handlers) || !handlers.every(isTable)) return null;
    const handler: unknown = handlers[locator.handler];
    return isTable(handler) ? { items, item, handlers: handlers as Table[], handler } : null;
}

/** JSON のテキストにすると値が変わる内容（TOML の日時と大きな整数）が入っているか。 */
function hasNonJsonValue(value: unknown): boolean {
    if (typeof value === 'bigint' || value instanceof Date) return true;
    if (Array.isArray(value)) return value.some(hasNonJsonValue);
    return isTable(value) && Object.values(value).some(hasNonJsonValue);
}

/** 行の内容を JSON のテキストにする。位置に内容が無いときと JSON で表せないときは HookEditFailure を投げる。 */
export function readHookEntryText(text: string, scope: HookScope, locator: HookEntryLocator): string {
    const found = locateHookEntry(parseDocument(text, scope), scope, locator);
    if (!found) throw new HookEditFailure('not-found');
    const groupKeys = found.handlers === null ? {} : withoutHandlers(found.item);
    const part = { ...groupKeys, [HANDLERS_KEY]: [found.handler] };
    if (hasNonJsonValue(part)) throw new HookEditFailure('unsupported-form');
    return `${JSON.stringify(part, null, 2)}\n`;
}

/** 追加先の情報を返す。names は名前付きの形式の既存の hook の名前。文書を読めなければ null。 */
export function additionInfoOf(text: string, scope: HookScope): { names?: string[] } | null {
    let holder: unknown;
    try {
        holder = valueAt(parseDocument(text, scope), scope.path ?? []);
    } catch {
        return null;
    }
    if (holder !== undefined && !isTable(holder)) return null;
    if (scope.parser !== 'agyNamed') return {};
    return { names: isTable(holder) ? Object.keys(holder).filter(key => isTable(holder[key])) : [] };
}

/** 追加先のイベントのキーを返す。同じイベントを表すキーが文書にあれば、そのキーの書き方を使う。 */
export function eventKeyForAddition(
    text: string,
    scope: HookScope,
    addition: HookEntryAddition,
    sameEvent: (a: string, b: string) => boolean
): string {
    const holder = valueAt(parseDocument(text, scope), parentPathOf(scope, addition.name));
    if (!isTable(holder)) return addition.event;
    return Object.keys(holder).find(key => sameEvent(key, addition.event)) ?? addition.event;
}

/** イベントに合わせた追加の雛形を返す。 */
export function hookEntryTemplate(usesMatcher: boolean): string {
    const handler = { type: 'command', command: '' };
    const part = usesMatcher ? { matcher: '', [HANDLERS_KEY]: [handler] } : { [HANDLERS_KEY]: [handler] };
    return `${JSON.stringify(part, null, 2)}\n`;
}

const samePosition = (group: number, handler: number | null) => ({ group, handler });

/** テキストの内容が行の今の内容と同じか。 */
function isSameEntry(found: HookEntryFound, part: HookEntryPart): boolean {
    const groupKeys = found.handlers === null ? {} : withoutHandlers(found.item);
    return (
        strictDeepEqual(groupKeys, part.groupKeys) &&
        part.handlers.length === 1 &&
        strictDeepEqual(found.handler, part.handlers[0])
    );
}

/** 削除の手順を組み立てる。 */
function planDelete(locator: HookEntryLocator, found: HookEntryFound): HookPlan {
    const { group, handler } = locator;
    const { items, handlers, item } = found;
    const dropsItem = handlers === null || handlers.length === 1;
    const name = locator.name;
    if (dropsItem) {
        return {
            eventKey: locator.event,
            name,
            steps: [{ kind: 'removeGroup', group }],
            itemsAfter: items.filter((_, index) => index !== group),
            positionAfter: (g, h) => {
                if (g === group) return null;
                return g > group ? samePosition(g - 1, h) : samePosition(g, h);
            },
        };
    }
    const child = handler as number;
    return {
        eventKey: locator.event,
        name,
        steps: [{ kind: 'removeChild', group, child }],
        itemsAfter: items.map((value, index) =>
            index === group ? { ...item, [HANDLERS_KEY]: handlers.filter((_, at) => at !== child) } : value
        ),
        positionAfter: (g, h) => {
            if (g !== group || h === null) return samePosition(g, h);
            if (h === child) return null;
            return samePosition(g, h > child ? h - 1 : h);
        },
    };
}

/** 置き換えの手順を組み立てる。hooks 以外のキーが同じならハンドラだけを置き換え、違えば新しいグループへ移す。 */
function planReplace(locator: HookEntryLocator, found: HookEntryFound, part: HookEntryPart): HookPlan {
    const { group, handler, event: eventKey, name } = locator;
    const { items, handlers, item } = found;
    const count = part.handlers.length;
    const newGroup = { ...part.groupKeys, [HANDLERS_KEY]: part.handlers };
    const replaced = (values: unknown[]) => [...items.slice(0, group), ...values, ...items.slice(group + 1)];

    if (handlers === null) {
        if (Object.keys(part.groupKeys).length === 0) {
            return {
                eventKey,
                name,
                steps: [{ kind: 'replaceFlat', group, raws: part.rawHandlers }],
                itemsAfter: replaced(part.handlers),
                positionAfter: (g, h) => samePosition(g > group ? g + count - 1 : g, h),
            };
        }
        return {
            eventKey,
            name,
            steps: [{ kind: 'replaceGroup', group, value: newGroup, raw: part.rawGroup }],
            itemsAfter: replaced([newGroup]),
            positionAfter: (g, h) => (g === group ? samePosition(g, 0) : samePosition(g, h)),
        };
    }

    const child = handler as number;
    if (strictDeepEqual(withoutHandlers(item), part.groupKeys)) {
        return {
            eventKey,
            name,
            steps: [{ kind: 'replaceChild', group, child, values: part.handlers, raws: part.rawHandlers }],
            itemsAfter: replaced([
                {
                    ...item,
                    [HANDLERS_KEY]: [...handlers.slice(0, child), ...part.handlers, ...handlers.slice(child + 1)],
                },
            ]),
            positionAfter: (g, h) => {
                if (g !== group || h === null || h <= child) return samePosition(g, h);
                return samePosition(g, h + count - 1);
            },
        };
    }
    if (handlers.length === 1) {
        return {
            eventKey,
            name,
            steps: [{ kind: 'replaceGroup', group, value: newGroup, raw: part.rawGroup }],
            itemsAfter: replaced([newGroup]),
            positionAfter: samePosition,
        };
    }
    return {
        eventKey,
        name,
        steps: [
            { kind: 'removeChild', group, child },
            { kind: 'insertGroup', group, value: newGroup, raw: part.rawGroup },
        ],
        itemsAfter: replaced([newGroup, { ...item, [HANDLERS_KEY]: handlers.filter((_, at) => at !== child) }]),
        positionAfter: (g, h) => {
            if (g < group) return samePosition(g, h);
            if (g > group) return samePosition(g + 1, h);
            if (h === child || h === null) return samePosition(g, 0);
            return samePosition(g + 1, h > child ? h - 1 : h);
        },
    };
}

/** 追加の手順を組み立てる。 */
function planAdd(model: unknown, scope: HookScope, change: Extract<HookEntryChange, { kind: 'add' }>): HookPlan {
    const { addition, key, flat, part } = change;
    const { name } = addition;
    if (name !== undefined && !isSafeKey(name)) throw new HookEditFailure('invalid-input');
    const holder = valueAt(model, parentPathOf(scope, name));
    if (holder !== undefined && !isTable(holder)) throw new HookEditFailure('unsupported-form');
    const current = valueAt(model, [...parentPathOf(scope, name), key]);
    if (current !== undefined && !Array.isArray(current)) throw new HookEditFailure('unsupported-form');
    const values = flat ? part.handlers : [{ ...part.groupKeys, [HANDLERS_KEY]: part.handlers }];
    const raws = flat ? part.rawHandlers : [part.rawGroup];
    return {
        eventKey: key,
        name,
        steps: [{ kind: 'append', values, raws }],
        itemsAfter: [...((current as unknown[] | undefined) ?? []), ...values],
        positionAfter: samePosition,
    };
}

/** model を編集後の文書全体の値にする。空になったイベント、名前付きの hook、hooks のキーを取り除く。 */
function applyToModel(model: Table, scope: HookScope, plan: HookPlan, keepEmptyEvent: boolean): void {
    const parent = parentPathOf(scope, plan.name);
    const eventPath = [...parent, plan.eventKey];
    if (plan.itemsAfter.length > 0 || keepEmptyEvent) {
        setValueAt(model, eventPath, plan.itemsAfter);
        return;
    }
    deleteValueAt(model, eventPath);
    const holder = valueAt(model, parent);
    if (!isTable(holder)) return;
    const emptied = Object.keys(holder).every(key => plan.name !== undefined && key === NAMED_HOOK_FLAG);
    if (emptied && parent.length > 0) deleteValueAt(model, parent);
}

/** JSON の文書へ手順を適用する。 */
function applyJsonSteps(text: string, eventPath: string[], steps: HookStep[]): string {
    const raw = (value: string) => reindentJsoncRaw(value, text);
    let result = text;
    for (const step of steps) {
        const handlersPath = [...eventPath, 'group' in step ? step.group : 0, HANDLERS_KEY];
        switch (step.kind) {
            case 'removeGroup':
                result = removeJsoncElementAt(result, eventPath, step.group);
                break;
            case 'removeChild':
                result = removeJsoncElementAt(result, handlersPath, step.child);
                break;
            case 'replaceChild':
                result = replaceJsoncValueAt(result, [...handlersPath, step.child], raw(step.raws[0]));
                step.raws.slice(1).forEach((item, offset) => {
                    result = insertJsoncElementAt(result, handlersPath, step.child + offset + 1, raw(item));
                });
                break;
            case 'replaceGroup':
                result = replaceJsoncValueAt(result, [...eventPath, step.group], raw(step.raw));
                break;
            case 'replaceFlat':
                result = replaceJsoncValueAt(result, [...eventPath, step.group], raw(step.raws[0]));
                step.raws.slice(1).forEach((item, offset) => {
                    result = insertJsoncElementAt(result, eventPath, step.group + offset + 1, raw(item));
                });
                break;
            case 'insertGroup':
                result = insertJsoncElementAt(result, eventPath, step.group, raw(step.raw));
                break;
            default: {
                const current = readJsoncArray(result, eventPath);
                if (current.present) {
                    step.raws.forEach((item, offset) => {
                        result = insertJsoncElementAt(result, eventPath, current.elements.length + offset, raw(item));
                    });
                } else {
                    const body = step.raws.map(item => `  ${item.replace(/\n/g, '\n  ')}`).join(',\n');
                    result = setJsoncRaw(result, eventPath, reindentJsoncRaw(`[\n${body}\n]`, text));
                }
            }
        }
    }
    return result;
}

/** JSON の文書へ変更を適用する。空になったキーを切り取り、結果を確かめる。 */
function applyJsonChange(text: string, model: Table, scope: HookScope, plan: HookPlan): string {
    const parent = parentPathOf(scope, plan.name);
    const eventPath = [...parent, plan.eventKey];
    let result: string;
    try {
        result = applyJsonSteps(text, eventPath, plan.steps);
    } catch {
        throw new HookEditFailure('unsupported-form');
    }
    const emptied = plan.itemsAfter.length === 0;
    const keepEmptyEvent = emptied && !isJsoncArrayBlankAt(result, eventPath);
    if (emptied && !keepEmptyEvent) {
        result = removeJsoncProperty(result, eventPath, { cascade: true });
        if (plan.name !== undefined) {
            const holder = valueAt(parseJsonc(result), parent);
            if (isTable(holder) && Object.keys(holder).every(key => key === NAMED_HOOK_FLAG)) {
                result = removeJsoncProperty(result, parent, { cascade: false });
            }
        }
    }
    const actual = parseJsonc(result);
    applyToModel(model, scope, plan, keepEmptyEvent);
    // コメントが残っていて切り取らなかった空の親は、そのまま残す。
    const holder = valueAt(actual, parent);
    if (isTable(holder) && Object.keys(holder).length === 0 && valueAt(model, parent) === undefined) {
        setValueAt(model, parent, {});
    }
    if (!strictDeepEqual(actual, model)) throw new HookEditFailure('verify-failed');
    return result;
}

/** TOML の文書へ変更を適用する。 */
function applyTomlChange(text: string, model: Table, scope: HookScope, plan: HookPlan): string {
    const path = [...parentPathOf(scope, plan.name), plan.eventKey];
    const steps: TomlArrayStep[] = plan.steps.map(step => {
        switch (step.kind) {
            case 'replaceChild':
                return { kind: 'replaceChild', group: step.group, child: step.child, values: step.values };
            case 'replaceGroup':
                return { kind: 'replaceGroup', group: step.group, value: step.value };
            case 'insertGroup':
                return { kind: 'insertGroup', group: step.group, value: step.value };
            case 'append':
                return { kind: 'appendGroup', value: step.values[0] };
            case 'replaceFlat':
                throw new HookEditFailure('unsupported-form');
            default:
                return step;
        }
    });
    applyToModel(model, scope, plan, false);
    return editTomlArrayItems(text, {
        path,
        childKey: HANDLERS_KEY,
        steps,
        expected: model,
        exclude: scope.excludePaths,
    });
}

/** 文書へ変更を適用した本文と位置の対応を返す。位置に内容が無ければ not-found の HookEditFailure を投げる。 */
export function applyHookEntryChange(text: string, scope: HookScope, change: HookEntryChange): HookEntryEditResult {
    const model = parseDocument(text, scope);
    if (scope.format === 'toml' && change.kind !== 'delete') assertWritableToToml(change.part);
    let plan: HookPlan;
    if (change.kind === 'add') {
        plan = planAdd(model, scope, change);
    } else {
        const found = locateHookEntry(model, scope, change.locator);
        if (!found) throw new HookEditFailure('not-found');
        if (change.kind === 'replace' && isSameEntry(found, change.part)) {
            return { next: text, eventKey: change.locator.event, positionAfter: samePosition };
        }
        plan =
            change.kind === 'delete'
                ? planDelete(change.locator, found)
                : planReplace(change.locator, found, change.part);
    }
    const next =
        scope.format === 'toml' ? applyTomlChange(text, model, scope, plan) : applyJsonChange(text, model, scope, plan);
    return { next, eventKey: plan.eventKey, positionAfter: plan.positionAfter };
}
