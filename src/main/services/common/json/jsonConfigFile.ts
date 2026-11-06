import { formatConfigDetail } from '../../../../shared/agents/configFileFailure';
import type { MCPServerConfig } from '../../../../shared/agents/types';
import {
    JsoncConflictError,
    jsonSyntaxProblem,
    moveJsoncValue,
    parseJsoncObject,
    reorderJsoncProperties,
} from '../../../utils/jsoncEdit';
import { getNestedValue } from '../../../utils/nestedValue';
import {
    ConfigFileError,
    fileError,
    readConfigFile,
    type ConfigChange,
    type ConfigFile,
    type ConfigFileStore,
} from '../fs/configFile';

export type JsonRoot = Record<string, unknown>;

/** 読み取った JSON ファイルとその解釈結果。 */
export interface JsonFileState {
    file: ConfigFile;
    root: JsonRoot;
}

function isJsonRecord(value: unknown): value is JsonRoot {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * 厳密な JSON のファイルを読む。未作成だけを空のオブジェクトとして返す。
 * 読めないファイルは read-failed、JSON として読めない内容（空のファイルとオブジェクト以外のルートを含む）は invalid-file を投げる。
 */
export async function readStrictJsonFile(store: ConfigFileStore, rel: string): Promise<JsonFileState> {
    const file = await readConfigFile(store, rel);
    if (!file.exists) return { file, root: {} };
    let parsed: unknown;
    try {
        parsed = JSON.parse(file.text);
    } catch (error) {
        throw fileError('invalid-file', rel, formatConfigDetail(jsonSyntaxProblem(error, file.text)));
    }
    if (!isJsonRecord(parsed)) throw fileError('invalid-file', rel, formatConfigDetail({ code: 'json-root' }));
    return { file, root: parsed };
}

/**
 * JSONC のファイルを読む。未作成と空白だけのファイルを空のオブジェクトとして返す。
 * 読めないファイルは read-failed、JSONC として読めない内容とオブジェクト以外のルートは invalid-file を投げる。
 */
export async function readJsoncFile(store: ConfigFileStore, rel: string): Promise<JsonFileState> {
    const file = await readConfigFile(store, rel);
    if (file.text.trim().length === 0) return { file, root: {} };
    try {
        return { file, root: parseJsoncObject(file.text) };
    } catch (error) {
        throw fileError('invalid-file', rel, formatConfigDetail(jsonSyntaxProblem(error, file.text)));
    }
}

/** path のオブジェクトのうち、値がオブジェクトのエントリを記載順に返す。 */
export function jsonServerMap(root: JsonRoot, path: string[]): Record<string, MCPServerConfig> {
    const servers = getNestedValue(root, path);
    const result: Record<string, MCPServerConfig> = {};
    if (!isJsonRecord(servers)) return result;
    for (const [name, config] of Object.entries(servers)) {
        if (isJsonRecord(config)) result[name] = config as MCPServerConfig;
    }
    return result;
}

/**
 * テキストの編集を実行し、ConfigFileError 以外の失敗を already-defined か edit-failed にする。
 * 例外のメッセージは本文を含み得るので、edit-failed にはコードだけを載せる。
 */
export function guardEdit<T>(rel: string, edit: () => T): T {
    try {
        return edit();
    } catch (error) {
        if (error instanceof ConfigFileError) throw error;
        if (error instanceof JsoncConflictError) throw fileError('already-defined', rel, error.message);
        throw fileError('edit-failed', rel, formatConfigDetail({ code: 'edit-rejected' }));
    }
}

/**
 * source の path の値を target の同じ path へ原文のまま移した 2 つのテキストを返す。ファイルには書かない。
 * 値がオブジェクトでなければ entry-not-found、移動先に別の定義があれば already-defined を投げる。
 */
export function moveJsonEntry(
    source: JsonFileState,
    target: JsonFileState,
    path: string[],
    options: { cascade: boolean }
): { source: string; target: string } {
    const name = path[path.length - 1];
    if (!isJsonRecord(getNestedValue(source.root, path))) throw new ConfigFileError('entry-not-found', name);
    const moved = guardEdit(target.file.rel, () =>
        moveJsoncValue(source.file.text, target.file.text, path, path, options)
    );
    if (!moved) throw new ConfigFileError('entry-not-found', name);
    return { source: moved.from, target: moved.to };
}

/** path のオブジェクトを names の順に並べ替えたテキストを返す。対象がなければ元のテキストのまま。 */
export function reorderJsonEntries(state: JsonFileState, path: string[], names: string[]): string {
    return guardEdit(state.file.rel, () => reorderJsoncProperties(state.file.text, path, names));
}

/** 退避ファイルの変更を組み立てる。ルートが空のオブジェクトになったらファイルごと削除する。 */
export function sidecarChange(file: ConfigFile, next: string): ConfigChange {
    const empty = guardEdit(file.rel, () => Object.keys(parseJsoncObject(next)).length === 0);
    return { file, next: empty ? null : next };
}
