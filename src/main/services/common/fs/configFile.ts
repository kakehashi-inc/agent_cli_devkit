import { isAbsolute } from 'path';
import {
    formatConfigDetail,
    formatConfigFileFailure,
    type ConfigFileFailure,
} from '../../../../shared/agents/configFileFailure';
import { MISSING_REVISION } from '../../../../shared/agents/profile/types';
import type {
    McpFileProblem,
    SettingsFieldValue,
    SettingsRawResult,
    SettingsValues,
    SettingsWriteResult,
} from '../../../../shared/agents/types';
import { stripBom } from '../json/stripBom';
import {
    codeOf,
    deleteFileStrict,
    readFileStrict,
    withBom,
    writeFileAtomic,
    type AtomicWrite,
    type StrictDelete,
    type StrictRead,
} from './atomicFile';

export type ConfigEol = '\n' | '\r\n';

/**
 * 設定ファイルの読み書きの口。ホーム基準の HomeFs と、絶対パスをそのまま使う absolutePathStore がこの形を満たす。
 */
export interface ConfigFileStore {
    readTextStrict(path: string): Promise<StrictRead>;
    writeTextAtomic(
        path: string,
        content: string | Buffer,
        options: { expectedRevision: string }
    ): Promise<AtomicWrite>;
    deleteStrict(path: string, expectedRevision?: string): Promise<StrictDelete>;
}

/** 絶対パスをそのまま扱うストア。 */
export const absolutePathStore: ConfigFileStore = {
    readTextStrict: path => readFileStrict(path),
    writeTextAtomic: (path, content, options) => writeFileAtomic(path, content, options),
    deleteStrict: (path, expectedRevision) => deleteFileStrict(path, expectedRevision),
};

/** 読み取った時点の設定ファイル。未作成は exists=false で text は空文字列。 */
export interface ConfigFile {
    rel: string;
    exists: boolean;
    // BOM を除いたテキスト。
    text: string;
    hadBom: boolean;
    eol: ConfigEol;
    mixedEol: boolean;
    // 生のバイト列の sha256 16 進。未作成は MISSING_REVISION。
    revision: string;
}

/** 設定ファイルの操作の失敗。メッセージは formatConfigFileFailure の形。 */
export class ConfigFileError extends Error {
    constructor(
        readonly failure: ConfigFileFailure,
        readonly target: string,
        readonly detail?: string
    ) {
        super(formatConfigFileFailure(failure, target, detail));
        this.name = 'ConfigFileError';
    }
}

/** 相対パスをホーム基準の表示の形にする。絶対パスはそのまま返す。 */
export function displayRel(rel: string): string {
    return isAbsolute(rel) ? rel : `~/${rel}`;
}

/** ファイルの失敗を作る。 */
export function fileError(failure: ConfigFileFailure, rel: string, detail?: string): ConfigFileError {
    return new ConfigFileError(failure, displayRel(rel), detail);
}

/**
 * 設定ファイルを厳密に読む。未作成だけを空として返す。
 * リンク切れ、読み取りエラー、UTF-8 として往復できない内容は read-failed を投げる。
 */
export async function readConfigFile(store: ConfigFileStore, rel: string): Promise<ConfigFile> {
    const read = await store.readTextStrict(rel);
    switch (read.kind) {
        case 'missing':
            return {
                rel,
                exists: false,
                text: '',
                hadBom: false,
                eol: '\n',
                mixedEol: false,
                revision: MISSING_REVISION,
            };
        case 'dangling-link':
            throw fileError('read-failed', rel, formatConfigDetail({ code: 'dangling-link' }));
        case 'error':
            throw fileError('read-failed', rel, read.code);
        case 'ok':
            if (!read.utf8Clean) throw fileError('read-failed', rel, formatConfigDetail({ code: 'not-utf8' }));
            return {
                rel,
                exists: true,
                text: read.text,
                hadBom: read.hadBom,
                eol: read.eol,
                mixedEol: read.mixedEol,
                revision: read.revision,
            };
    }
}

/** 改行をすべて eol に揃える。 */
export function normalizeEol(text: string, eol: ConfigEol): string {
    return text.replace(/\r\n?|\n/g, eol);
}

/** 空でないテキストを改行で終える。 */
export function withFinalEol(text: string, eol: ConfigEol): string {
    return text.length === 0 || text.endsWith('\n') ? text : `${text}${eol}`;
}

/**
 * 読み取った時点から内容が変わっていなければ text を原子的に書き込み、新しい revision を返す。
 * 変わっていれば conflict を投げる。読み取ったファイルの BOM は、あってもなくてもその形のまま書き戻す。
 */
export async function writeConfigFile(store: ConfigFileStore, file: ConfigFile, text: string): Promise<string> {
    const result = await store.writeTextAtomic(file.rel, withBom(text, file.hadBom), {
        expectedRevision: file.revision,
    });
    switch (result.kind) {
        case 'ok':
            return result.revision;
        case 'conflict':
            throw fileError('conflict', file.rel);
        case 'dangling-link':
            throw fileError('write-failed', file.rel, formatConfigDetail({ code: 'dangling-link' }));
        case 'error':
            throw fileError('write-failed', file.rel, result.code);
    }
}

/** 読み取った時点から内容が変わっていなければファイルを削除する。変わっていれば conflict を投げる。 */
export async function removeConfigFile(store: ConfigFileStore, file: ConfigFile): Promise<void> {
    const result = await store.deleteStrict(file.rel, file.revision);
    if (result.kind === 'conflict') throw fileError('conflict', file.rel);
    if (result.kind === 'error') throw fileError('write-failed', file.rel, result.code);
}

/** 1 つのファイルの変更。next が null ならファイルを削除する。 */
export interface ConfigChange {
    file: ConfigFile;
    next: string | null;
}

function isNoChange({ file, next }: ConfigChange): boolean {
    if (next === null) return !file.exists;
    return next === file.text && (file.exists || next.length === 0);
}

/** 適用済みの変更を読み取った時点の内容へ戻す。戻せなかったものは記録だけ残す。 */
async function restoreChanges(
    store: ConfigFileStore,
    applied: { file: ConfigFile; revision: string }[]
): Promise<void> {
    for (const { file, revision } of [...applied].reverse()) {
        try {
            const result = file.exists
                ? await store.writeTextAtomic(file.rel, withBom(file.text, file.hadBom), {
                      expectedRevision: revision,
                  })
                : await store.deleteStrict(file.rel, revision);
            if (result.kind === 'conflict' || result.kind === 'error' || result.kind === 'dangling-link') {
                console.error(`Failed to restore ${file.rel}:`, result);
            }
        } catch (error) {
            console.error(`Failed to restore ${file.rel}:`, error);
        }
    }
}

/**
 * 複数のファイルの変更を渡された順に適用する。途中で失敗したら適用済みの分を読み取った時点の内容へ戻し、例外を投げ直す。
 * 内容の移動では移動先を先に渡すと、途中で失敗しても定義が消えない。
 */
export async function commitConfigChanges(store: ConfigFileStore, changes: ConfigChange[]): Promise<void> {
    const applied: { file: ConfigFile; revision: string }[] = [];
    try {
        for (const change of changes) {
            if (isNoChange(change)) continue;
            if (change.next === null) {
                await removeConfigFile(store, change.file);
                applied.push({ file: change.file, revision: MISSING_REVISION });
            } else {
                const revision = await writeConfigFile(store, change.file, change.next);
                applied.push({ file: change.file, revision });
            }
        }
    } catch (error) {
        await restoreChanges(store, applied);
        throw error;
    }
}

/** 例外を読み取りの問題の形にする。例外のメッセージは本文を含み得るので、種類とコードだけを使う。 */
export function problemOf(error: unknown, fallbackRel: string): McpFileProblem {
    return error instanceof ConfigFileError
        ? { failure: error.failure, path: error.target, ...(error.detail ? { detail: error.detail } : {}) }
        : { failure: 'read-failed', path: displayRel(fallbackRel), detail: codeOf(error, 'EUNKNOWN') };
}

/** 読めなかった理由。例外のメッセージは本文を含み得るので、コードだけを使う。 */
export function failureDetail(error: unknown): string {
    if (error instanceof ConfigFileError) return error.detail ?? error.failure;
    return codeOf(error, 'EUNKNOWN');
}

/** 直接編集のために読んだファイルの全文の結果。 */
export function rawResultOf(file: ConfigFile, raw: string | null): SettingsRawResult {
    return { raw, revision: file.revision, hadBom: file.hadBom, eol: file.eol, mixedEol: file.mixedEol };
}

/** 直接編集のためにファイルを読めなかったときの結果。 */
export function unreadableRawResult(error: unknown): SettingsRawResult {
    return {
        raw: null,
        revision: MISSING_REVISION,
        hadBom: false,
        eol: '\n',
        mixedEol: false,
        readFailed: failureDetail(error),
    };
}

/**
 * 保存する項目のうち、読み込んだ時点の値（base）と現在の値が違うものの key を返す。
 * 現在の値が保存する値と同じ項目は失われる変更が無いので含めない。base に無い key は未設定として比べる。
 */
export function staleSettingsKeys(
    values: SettingsValues,
    base: SettingsValues,
    current: Readonly<Record<string, SettingsFieldValue>>
): string[] {
    const known = base !== null && typeof base === 'object' ? base : {};
    return Object.keys(values).filter(
        key => !Object.is(current[key], known[key]) && !Object.is(current[key], values[key])
    );
}

/** 値が変わった項目があるときの保存の結果。 */
export function conflictResult(conflictKeys: string[]): SettingsWriteResult {
    return { ok: false, message: 'conflict', conflictKeys };
}

/** 保存の失敗を画面向けの結果にする。 */
export function saveFailure(error: unknown, rel: string): SettingsWriteResult {
    console.error(`Failed to save ${rel}:`, error);
    return { ok: false, message: error instanceof ConfigFileError ? error.failure : 'write-failed' };
}

/** 編集後のテキストを保存し、保存後の revision を返す。内容が同じならファイルに触らない。 */
export async function saveConfigText(
    store: ConfigFileStore,
    file: ConfigFile,
    text: string
): Promise<SettingsWriteResult> {
    try {
        if (isNoChange({ file, next: text })) return { ok: true, revision: file.revision };
        return { ok: true, revision: await writeConfigFile(store, file, text) };
    } catch (error) {
        return saveFailure(error, file.rel);
    }
}

/**
 * 直接編集の内容を保存する。
 * 1. 現在のファイルを厳密に読み、baseRevision と違えば conflict を返して書かない
 * 2. 届いたテキストの改行をファイルの改行へ揃え、最後の行を改行で終える（混在するファイルは多い方の改行へ揃う）
 * 3. validate で検証する。問題があれば validate が返したメッセージで失敗を返す
 * 4. 読み取った時点の内容との一致を条件に原子的に書き込む
 */
export async function saveDirectEdit(
    store: ConfigFileStore,
    rel: string,
    input: string,
    baseRevision: string,
    validate: (text: string) => string | null
): Promise<SettingsWriteResult> {
    try {
        const file = await readConfigFile(store, rel);
        if (file.revision !== baseRevision) return { ok: false, message: 'conflict' };
        const text = withFinalEol(normalizeEol(stripBom(input), file.eol), file.eol);
        const problem = validate(text);
        if (problem !== null) return { ok: false, message: problem };
        return await saveConfigText(store, file, text);
    } catch (error) {
        return saveFailure(error, rel);
    }
}

/** パスが存在するか。確かめられなければ true を返す（読み取りの段階で理由を示せるようにする）。 */
export async function existsOrUnknown(fs: { exists(rel: string): Promise<boolean> }, rel: string): Promise<boolean> {
    try {
        return await fs.exists(rel);
    } catch (error) {
        console.error(`Failed to check ${rel}:`, error);
        return true;
    }
}
