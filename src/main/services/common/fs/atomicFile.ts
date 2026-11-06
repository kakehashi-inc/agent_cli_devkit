import { createHash, randomBytes } from 'crypto';
import { constants, type Dirent, type Stats } from 'fs';
import {
    access,
    lstat,
    mkdir,
    open,
    readdir,
    readFile,
    readlink,
    realpath,
    rename,
    rm,
    rmdir,
    stat,
    unlink,
} from 'fs/promises';
import { dirname, join } from 'path';
import { setTimeout as sleep } from 'timers/promises';
import { DANGLING_LINK_REVISION, MISSING_REVISION, type ProfileEol } from '../../../../shared/agents/profile/types';
import { STAGING_PREFIX } from '../assets/stagedInstall';
import { stripBom } from '../json/stripBom';

// 原子的な書き込みで同じディレクトリに作る一時ファイルの名前の先頭（隠しファイルにする）。
export const ATOMIC_TEMP_PREFIX = '.adk-tmp-';

// 中身が元のファイルの唯一の写しになり得る一時名の末尾。時間が経っても自動では削除しない。
export const BACKUP_SUFFIX = '.bak';
export const RENAME_SUFFIX = '.rename';

// これより古い一時ファイルは、中断された書き込みの残骸として次の書き込みで削除する。
export const STALE_TEMP_AGE_MS = 24 * 60 * 60 * 1000;

// リンク先が通常のファイルではないシンボリックリンクを表す revision。
export const LINK_TO_NON_FILE_REVISION = 'link-to-non-file';

// Windows で他プロセスが開いている間に失敗する操作の再試行の間隔。
const BUSY_RETRY_DELAYS_MS = [50, 100, 200, 400, 400];

export type StrictRead =
    | { kind: 'missing' }
    | {
          kind: 'ok';
          bytes: Buffer;
          text: string;
          hadBom: boolean;
          eol: ProfileEol;
          // CRLF と LF が混在している。
          mixedEol: boolean;
          // 生のバイト列の sha256 16 進。
          revision: string;
          isLink: boolean;
          linkTarget?: string;
          // 実体の識別子（デバイスと inode）。同じ値なら同じ実体。
          identity: string;
          // UTF-8 として往復できる。false のファイルは text が元の内容と一致しない。
          utf8Clean: boolean;
      }
    | { kind: 'dangling-link'; linkTarget: string }
    | { kind: 'error'; code: string };

export type AtomicWrite =
    | { kind: 'ok'; revision: string }
    | { kind: 'conflict'; currentRevision: string }
    | { kind: 'dangling-link'; linkTarget: string }
    | { kind: 'error'; code: string };

export type StrictDelete =
    | { kind: 'removed'; was: 'file' | 'link' }
    | { kind: 'missing' }
    | { kind: 'conflict'; currentRevision: string }
    | { kind: 'error'; code: string };

export type FileStat =
    | { kind: 'missing' }
    | {
          // リンクはリンク先の種別。
          kind: 'file' | 'other';
          size: number;
          // 権限のビット（下位 12 ビット）。
          mode: number;
          writable: boolean;
      }
    | { kind: 'error'; code: string };

export type StrictRename = { kind: 'ok' } | { kind: 'missing' } | { kind: 'exists' } | { kind: 'error'; code: string };

export type ListedEntryKind = 'file' | 'dir' | 'other' | 'dangling';

export interface ListedEntry {
    name: string;
    // 一覧の起点からの相対パス（区切りは '/'）。
    relPath: string;
    // 起点の直下を 0 とする深さ。
    depth: number;
    // リンクはリンク先の種別。リンク切れは 'dangling'。
    kind: ListedEntryKind;
    isLink: boolean;
    // エントリ自身の（リンク先ではない）サイズと更新日時。
    size: number;
    mtimeMs: number;
}

export type ListedTree =
    | { kind: 'missing' }
    | { kind: 'dangling-link'; linkTarget: string }
    | {
          kind: 'ok';
          entries: ListedEntry[];
          // 深さの上限より下にエントリがあり、一覧に含めていない。
          truncated: boolean;
          // 読み取れなかったディレクトリがある。
          incomplete: boolean;
      }
    | { kind: 'error'; code: string };

/** エラーのコード。文字列のコードがなければ fallback。 */
export function codeOf(error: unknown, fallback = 'EIO'): string {
    const code = (error as NodeJS.ErrnoException).code;
    return typeof code === 'string' ? code : fallback;
}

/** パスが存在しないことを表すエラーか（途中がディレクトリではない場合を含む）。 */
function isAbsent(error: unknown): boolean {
    const code = codeOf(error);
    return code === 'ENOENT' || code === 'ENOTDIR';
}

/** リンク先をたどれないことを表すエラーか。 */
function isBrokenLink(error: unknown): boolean {
    return isAbsent(error) || codeOf(error) === 'ELOOP';
}

/** 生のバイト列の sha256 16 進を返す。 */
export function revisionOf(bytes: Uint8Array): string {
    return createHash('sha256').update(bytes).digest('hex');
}

/** テキストの改行を調べる。eol は多い方（同数と改行なしは LF）。 */
export function detectEolStyle(text: string): { eol: ProfileEol; mixedEol: boolean } {
    let crlf = 0;
    let lf = 0;
    for (let at = text.indexOf('\n'); at !== -1; at = text.indexOf('\n', at + 1)) {
        if (at > 0 && text[at - 1] === '\r') crlf++;
        else lf++;
    }
    return { eol: crlf > lf ? '\r\n' : '\n', mixedEol: crlf > 0 && lf > 0 };
}

/** 生のバイト列からテキスト（BOM を除く）と改行、revision、UTF-8 として往復できるかを求める。 */
export function describeBytes(bytes: Buffer) {
    const decoded = bytes.toString('utf8');
    const text = stripBom(decoded);
    return {
        bytes,
        text,
        hadBom: text.length !== decoded.length,
        ...detectEolStyle(text),
        revision: revisionOf(bytes),
        utf8Clean: Buffer.from(decoded, 'utf8').equals(bytes),
    };
}

/** テキストを hadBom に合わせて BOM 付きにする。 */
export function withBom(text: string, hadBom: boolean): string {
    return hadBom ? String.fromCharCode(0xfeff) + text : text;
}

/** アプリの作業用のエントリ（取り込みの作業ディレクトリ・原子的な書き込みの一時ファイル）の名前か。 */
export function isWorkEntryName(name: string): boolean {
    return name.startsWith(STAGING_PREFIX) || name.startsWith(ATOMIC_TEMP_PREFIX);
}

/** Windows で他プロセスが開いている間に失敗した場合だけ間隔を置いて再試行する。 */
async function retryWhileBusy<T>(operation: () => Promise<T>): Promise<T> {
    if (process.platform === 'win32') {
        for (const delay of BUSY_RETRY_DELAYS_MS) {
            try {
                return await operation();
            } catch (error) {
                const code = codeOf(error);
                if (code !== 'EPERM' && code !== 'EBUSY') throw error;
                await sleep(delay);
            }
        }
    }
    return operation();
}

/**
 * ファイルを厳密に読む。未作成（途中がディレクトリではない場合を含む）、リンク切れ、読み取りエラーを区別して返す。
 * リンクはリンク先を読み、リンクであることと参照先の文字列を結果に含める。通常のファイル以外はエラーにする。
 */
export async function readFileStrict(path: string): Promise<StrictRead> {
    let linkTarget: string | undefined;
    try {
        if ((await lstat(path)).isSymbolicLink()) linkTarget = await readlink(path);
    } catch (error) {
        return isAbsent(error) ? { kind: 'missing' } : { kind: 'error', code: codeOf(error) };
    }
    try {
        const target = await stat(path);
        if (target.isDirectory()) return { kind: 'error', code: 'EISDIR' };
        if (!target.isFile()) return { kind: 'error', code: 'ENOTREG' };
        const handle = await retryWhileBusy(() => open(path, 'r'));
        try {
            const own = await handle.stat({ bigint: true });
            return {
                kind: 'ok',
                ...describeBytes(await handle.readFile()),
                isLink: linkTarget !== undefined,
                ...(linkTarget !== undefined ? { linkTarget } : {}),
                identity: `${own.dev}:${own.ino}`,
            };
        } finally {
            await handle.close();
        }
    } catch (error) {
        if (linkTarget !== undefined && isBrokenLink(error)) return { kind: 'dangling-link', linkTarget };
        return isAbsent(error) ? { kind: 'missing' } : { kind: 'error', code: codeOf(error) };
    }
}

/** パスの種別、サイズ、権限、書き込めるかを返す。リンクはリンク先を調べ、リンク切れは未作成として返す。 */
export async function statFileLocal(path: string): Promise<FileStat> {
    try {
        const target = await stat(path);
        let writable = true;
        try {
            await access(path, constants.W_OK);
        } catch {
            writable = false;
        }
        return {
            kind: target.isFile() ? 'file' : 'other',
            size: target.size,
            mode: target.mode & 0o7777,
            writable,
        };
    } catch (error) {
        return isBrokenLink(error) ? { kind: 'missing' } : { kind: 'error', code: codeOf(error) };
    }
}

/** ファイルの内容の revision。未作成なら MISSING_REVISION。 */
async function contentRevision(path: string): Promise<string> {
    try {
        return revisionOf(await retryWhileBusy(() => readFile(path)));
    } catch (error) {
        if (isAbsent(error)) return MISSING_REVISION;
        throw error;
    }
}

type WriteTarget = { dangling: string } | { dangling?: undefined; path: string; existing: Stats | null };

/** 書き込み先の実体を決める。シンボリックリンクは実体へ解決し、リンク切れは dangling で返す。 */
async function resolveWriteTarget(path: string): Promise<WriteTarget> {
    let own: Stats;
    try {
        own = await lstat(path);
    } catch (error) {
        if (isAbsent(error)) return { path, existing: null };
        throw error;
    }
    if (!own.isSymbolicLink()) return { path, existing: own };
    const linkTarget = await readlink(path);
    try {
        const real = await realpath(path);
        return { path: real, existing: await stat(real) };
    } catch (error) {
        if (isBrokenLink(error)) return { dangling: linkTarget };
        throw error;
    }
}

/** 既存のファイルのディレクトリ項目を変えず、同じ inode の内容を置き換える。 */
async function writeInPlace(path: string, bytes: Buffer): Promise<void> {
    const handle = await open(path, 'r+');
    try {
        await handle.writeFile(bytes);
        await handle.truncate(bytes.length);
        await handle.sync();
    } finally {
        await handle.close();
    }
}

/** 同じディレクトリに置く一時名を作る。 */
function tempNameIn(dir: string, suffix: string): string {
    return join(dir, `${ATOMIC_TEMP_PREFIX}${process.pid}-${randomBytes(6).toString('hex')}${suffix}`);
}

/**
 * ハードリンクのファイルをその場で書き換える。書き換えの前に元の内容を同じディレクトリへ退避し、失敗したら元の内容へ戻す。
 * 元の内容へ戻せなかったときは退避したファイルを残してログに記録する。退避できなければ何も書き換えない。
 */
async function writeHardLinked(path: string, bytes: Buffer): Promise<void> {
    const original = await retryWhileBusy(() => readFile(path));
    const backup = tempNameIn(dirname(path), BACKUP_SUFFIX);
    const handle = await open(backup, 'wx', 0o600);
    try {
        await handle.writeFile(original);
        await handle.sync();
    } catch (error) {
        await handle.close();
        await rm(backup, { force: true }).catch(() => undefined);
        throw error;
    }
    await handle.close();
    try {
        await retryWhileBusy(() => writeInPlace(path, bytes));
    } catch (error) {
        try {
            await retryWhileBusy(() => writeInPlace(path, original));
        } catch (restoreError) {
            console.error(`Failed to restore ${path}; the previous content is kept in ${backup}:`, restoreError);
            throw error;
        }
        await rm(backup, { force: true }).catch(() => undefined);
        throw error;
    }
    await rm(backup, { force: true }).catch(() => undefined);
}

/**
 * ディレクトリに残った一日より古い一時ファイルを削除する。中断された書き込みの残骸で、消せなくても書き込みの結果を変えない。
 * 元のファイルの唯一の写しになり得る一時名は残す。
 */
async function removeStaleTemps(dir: string): Promise<void> {
    let names: string[];
    try {
        names = await readdir(dir);
    } catch {
        return;
    }
    const limit = Date.now() - STALE_TEMP_AGE_MS;
    for (const name of names) {
        if (!name.startsWith(ATOMIC_TEMP_PREFIX) || name.endsWith(BACKUP_SUFFIX) || name.endsWith(RENAME_SUFFIX)) {
            continue;
        }
        const path = join(dir, name);
        try {
            const own = await lstat(path);
            if (own.isFile() && own.mtimeMs < limit) await rm(path, { force: true });
        } catch {
            // 次の書き込みで再び試す。
        }
    }
}

/** ディレクトリの更新を永続化する。POSIX のみで、失敗しても書き込み自体は成立しているので無視する。 */
async function syncDirectory(dir: string): Promise<void> {
    if (process.platform === 'win32') return;
    try {
        const handle = await open(dir, 'r');
        try {
            await handle.sync();
        } finally {
            await handle.close();
        }
    } catch {
        // 永続化の念押しなので結果を変えない。
    }
}

/** 同じディレクトリの一時ファイルへ書いて同期し、権限を引き継いで置き換える。比較に失敗したら置き換えない。 */
async function replaceViaTemp(
    target: string,
    existing: Stats | null,
    bytes: Buffer,
    expectedRevision: string | undefined
): Promise<string | null> {
    const dir = dirname(target);
    if (!existing) await mkdir(dir, { recursive: true });
    const temp = tempNameIn(dir, '.tmp');
    try {
        const handle = await open(temp, 'wx', 0o666);
        try {
            await handle.writeFile(bytes);
            if (existing && process.platform !== 'win32') await handle.chmod(existing.mode & 0o7777);
            await handle.sync();
        } finally {
            await handle.close();
        }
        if (expectedRevision !== undefined) {
            const current = await contentRevision(target);
            if (current !== expectedRevision) {
                await rm(temp, { force: true });
                return current;
            }
        }
        await retryWhileBusy(() => rename(temp, target));
    } catch (error) {
        await rm(temp, { force: true }).catch(() => undefined);
        throw error;
    }
    await syncDirectory(dir);
    return null;
}

/**
 * 渡されたバイト列をそのまま原子的に書き込む（文字列は UTF-8 にする。BOM と改行は変換しない）。
 * - expectedRevision を渡すと現在の内容と比較し、違えば何も書かず conflict を返す。未作成は MISSING_REVISION と比較する。
 * - シンボリックリンクは実体へ書き、リンクを残す。リンク切れは dangling-link で止める。
 * - 書き込み権限のない既存ファイルは置き換えない。
 * - 新規作成は親ディレクトリを作る。一時ファイルは実体と同じディレクトリに作り、既存ファイルの権限を引き継ぐ。
 * - ハードリンク（リンク数 2 以上）は共有を保つため、元の内容を退避してからその場で書き込み、失敗したら元の内容へ戻す。
 * - 書き込む先のディレクトリに残った一日より古い一時ファイルを削除する。
 */
export async function writeFileAtomic(
    path: string,
    content: string | Buffer,
    options: { expectedRevision?: string } = {}
): Promise<AtomicWrite> {
    const bytes = typeof content === 'string' ? Buffer.from(content, 'utf8') : content;
    const { expectedRevision } = options;
    try {
        const target = await resolveWriteTarget(path);
        if (target.dangling !== undefined) return { kind: 'dangling-link', linkTarget: target.dangling };
        const { path: real, existing } = target;
        if (existing?.isDirectory()) return { kind: 'error', code: 'EISDIR' };
        if (existing && !existing.isFile()) return { kind: 'error', code: 'ENOTREG' };
        if (existing) await access(real, constants.W_OK);
        if (expectedRevision !== undefined) {
            const current = await contentRevision(real);
            if (current !== expectedRevision) return { kind: 'conflict', currentRevision: current };
        }
        await removeStaleTemps(dirname(real));
        if (existing && existing.nlink > 1) {
            await writeHardLinked(real, bytes);
        } else {
            const changed = await replaceViaTemp(real, existing, bytes, expectedRevision);
            if (changed !== null) return { kind: 'conflict', currentRevision: changed };
        }
        return { kind: 'ok', revision: revisionOf(bytes) };
    } catch (error) {
        return { kind: 'error', code: codeOf(error) };
    }
}

/** to が from と同じ実体か（大文字小文字を区別しないファイルシステムの同じ名前を含む）。 */
async function sameEntry(from: string, to: string): Promise<boolean> {
    const [own, other] = await Promise.all([lstat(from, { bigint: true }), lstat(to, { bigint: true })]);
    return own.dev === other.dev && own.ino === other.ino;
}

/**
 * 同じディレクトリの中でファイルかリンクの名前を、一時名を経由して変える。リンクはリンク自体の名前を変える。
 * to が from と別の実体として既にあれば何も変えず exists を返す。to へ移せなければ元の名前に戻す。
 */
export async function renameFileViaTemp(from: string, to: string): Promise<StrictRename> {
    try {
        try {
            await lstat(from);
        } catch (error) {
            if (isAbsent(error)) return { kind: 'missing' };
            throw error;
        }
        try {
            if (!(await sameEntry(from, to))) return { kind: 'exists' };
        } catch (error) {
            if (!isAbsent(error)) throw error;
        }
        const dir = dirname(from);
        const temp = tempNameIn(dir, RENAME_SUFFIX);
        await retryWhileBusy(() => rename(from, temp));
        try {
            await retryWhileBusy(() => rename(temp, to));
        } catch (error) {
            await retryWhileBusy(() => rename(temp, from));
            throw error;
        }
        await syncDirectory(dir);
        return { kind: 'ok' };
    } catch (error) {
        return { kind: 'error', code: codeOf(error) };
    }
}

/** シンボリックリンクの現在の revision。リンク切れと通常のファイル以外への参照は専用の値を返す。 */
async function linkRevision(path: string): Promise<string> {
    let target: Stats;
    try {
        target = await stat(path);
    } catch (error) {
        if (isBrokenLink(error)) return DANGLING_LINK_REVISION;
        throw error;
    }
    return target.isFile() ? contentRevision(path) : LINK_TO_NON_FILE_REVISION;
}

/** リンク自体だけを外す（リンク先は辿らない）。ジャンクションで unlink が失敗した場合は rmdir で外す。 */
async function removeLinkOnly(path: string): Promise<void> {
    try {
        await retryWhileBusy(() => unlink(path));
    } catch (error) {
        try {
            await rmdir(path);
        } catch {
            throw error;
        }
    }
}

/**
 * ファイルかシンボリックリンクを 1 つ削除する。リンクはリンク自体だけを消す。ディレクトリはエラーにする。
 * expectedRevision を渡すと現在の内容と比較し、違えば何も消さず conflict を返す。
 * リンク切れの revision は DANGLING_LINK_REVISION、未作成は MISSING_REVISION。
 */
export async function deleteFileStrict(path: string, expectedRevision?: string): Promise<StrictDelete> {
    try {
        let own: Stats;
        try {
            own = await lstat(path);
        } catch (error) {
            if (!isAbsent(error)) throw error;
            return expectedRevision === undefined || expectedRevision === MISSING_REVISION
                ? { kind: 'missing' }
                : { kind: 'conflict', currentRevision: MISSING_REVISION };
        }
        const isLink = own.isSymbolicLink();
        if (!isLink && own.isDirectory()) return { kind: 'error', code: 'EISDIR' };
        if (!isLink && !own.isFile()) return { kind: 'error', code: 'ENOTREG' };
        if (expectedRevision !== undefined) {
            const current = isLink ? await linkRevision(path) : await contentRevision(path);
            if (current !== expectedRevision) return { kind: 'conflict', currentRevision: current };
        }
        if (isLink) await removeLinkOnly(path);
        else await retryWhileBusy(() => unlink(path));
        return { kind: 'removed', was: isLink ? 'link' : 'file' };
    } catch (error) {
        return { kind: 'error', code: codeOf(error) };
    }
}

/**
 * ディレクトリのエントリ 1 件を一覧の形にする。消えていれば null。
 * Dirent のリンク判定は再解析ポイント全般を含むので、lstat でシンボリックリンクとジャンクションだけをリンクとする。
 */
async function describeEntry(dir: string, dirent: Dirent, relPath: string, depth: number): Promise<ListedEntry | null> {
    const abs = join(dir, dirent.name);
    let own: Stats;
    try {
        own = await lstat(abs);
    } catch (error) {
        if (isAbsent(error)) return null;
        throw error;
    }
    const base = { name: dirent.name, relPath, depth, size: own.size, mtimeMs: own.mtimeMs };
    if (!own.isSymbolicLink()) {
        const kind: ListedEntryKind = own.isFile() ? 'file' : own.isDirectory() ? 'dir' : 'other';
        return { ...base, kind, isLink: false };
    }
    try {
        const target = await stat(abs);
        const kind: ListedEntryKind = target.isFile() ? 'file' : target.isDirectory() ? 'dir' : 'other';
        return { ...base, kind, isLink: true };
    } catch (error) {
        return { ...base, kind: isBrokenLink(error) ? 'dangling' : 'other', isLink: true };
    }
}

/** ディレクトリの中に作業用のエントリ以外があるか。読めなければ undefined。 */
async function hasVisibleEntries(dir: string): Promise<boolean | undefined> {
    try {
        return (await readdir(dir)).some(name => !isWorkEntryName(name));
    } catch {
        return undefined;
    }
}

/** 一覧の結果を相対パスの順に並べる。 */
export function sortListedEntries(entries: ListedEntry[]): ListedEntry[] {
    return entries.sort((a, b) => (a.relPath < b.relPath ? -1 : a.relPath > b.relPath ? 1 : 0));
}

/**
 * ディレクトリの配下を一覧する。起点はリンクでもたどる。配下のディレクトリへのリンクはたどらず、印だけ付ける。
 * 作業用のエントリ（isWorkEntryName）は含めない。
 * - maxDepth: 一覧する深さの上限。0 は直下のみ。
 * - detectTruncation: 上限の深さのディレクトリに中身があれば truncated にする。
 */
export async function listTreeLocal(root: string, maxDepth: number, detectTruncation: boolean): Promise<ListedTree> {
    try {
        let own: Stats;
        try {
            own = await lstat(root);
        } catch (error) {
            if (isAbsent(error)) return { kind: 'missing' };
            throw error;
        }
        if (own.isSymbolicLink()) {
            try {
                await stat(root);
            } catch (error) {
                if (isBrokenLink(error)) return { kind: 'dangling-link', linkTarget: await readlink(root) };
                throw error;
            }
        }
        const rootEntries = await readdir(root, { withFileTypes: true });
        const entries: ListedEntry[] = [];
        let truncated = false;
        let incomplete = false;

        const walk = async (dir: string, dirents: Dirent[], prefix: string, depth: number): Promise<void> => {
            for (const dirent of dirents) {
                if (isWorkEntryName(dirent.name)) continue;
                const relPath = prefix ? `${prefix}/${dirent.name}` : dirent.name;
                let entry: ListedEntry | null;
                try {
                    entry = await describeEntry(dir, dirent, relPath, depth);
                } catch {
                    incomplete = true;
                    continue;
                }
                if (!entry) continue;
                entries.push(entry);
                if (entry.kind !== 'dir' || entry.isLink) continue;
                const child = join(dir, dirent.name);
                if (depth < maxDepth) {
                    let children: Dirent[];
                    try {
                        children = await readdir(child, { withFileTypes: true });
                    } catch {
                        incomplete = true;
                        continue;
                    }
                    await walk(child, children, relPath, depth + 1);
                } else if (detectTruncation) {
                    const visible = await hasVisibleEntries(child);
                    if (visible === undefined) incomplete = true;
                    else if (visible) truncated = true;
                }
            }
        };
        await walk(root, rootEntries, '', 0);
        return { kind: 'ok', entries: sortListedEntries(entries), truncated, incomplete };
    } catch (error) {
        return { kind: 'error', code: codeOf(error) };
    }
}

/**
 * 渡された順（深い方から）に空のディレクトリを削除する。リンク、ディレクトリ以外、空でないものに当たったらそこで止める。
 * まだ無いディレクトリは飛ばす。消せないことはエラーにしない。
 */
export async function removeEmptyDirs(dirs: readonly string[]): Promise<void> {
    for (const dir of dirs) {
        let own: Stats;
        try {
            own = await lstat(dir);
        } catch (error) {
            if (isAbsent(error)) continue;
            return;
        }
        if (own.isSymbolicLink() || !own.isDirectory()) return;
        try {
            await rmdir(dir);
        } catch {
            return;
        }
    }
}
