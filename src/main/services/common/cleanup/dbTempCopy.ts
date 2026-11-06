import type { Stats } from 'fs';
import { chmod, copyFile, lstat, mkdtemp, readdir, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { basename, join } from 'path';

// 一時フォルダーに作るコピーのフォルダー名の先頭。このアプリのものと分かる名前にする。
export const DB_COPY_PREFIX = 'agent-cli-devkit-db-copy-';

// これより古いコピーは、読み取りの途中で終了したプロセスの残骸として扱う。
const STALE_COPY_AGE_MS = 24 * 60 * 60 * 1000;

// POSIX でのコピーのフォルダーとファイルの権限（所有者だけが使える）。
const COPY_DIR_MODE = 0o700;
const COPY_FILE_MODE = 0o600;

// Windows で他のプロセスが一時的に開いている間の削除の再試行。
const REMOVE_OPTIONS = { recursive: true, force: true, maxRetries: 3, retryDelay: 100 };

/** POSIX でパスの権限を設定する。Windows は一時フォルダーの ACL に任せる。 */
async function restrict(path: string, mode: number): Promise<void> {
    if (process.platform !== 'win32') await chmod(path, mode);
}

/** ファイルをコピーし、所有者だけが読めるようにする。 */
async function copyPrivately(source: string, target: string): Promise<void> {
    await copyFile(source, target);
    await restrict(target, COPY_FILE_MODE);
}

/** path が通常のファイルか（リンクは含めない）。 */
async function isRegularFile(path: string): Promise<boolean> {
    try {
        return (await lstat(path)).isFile();
    } catch {
        return false;
    }
}

/** コピーのフォルダーを消す。消せなくても読み取りの結果は変えず、ログを残す。残ったものは古くなってから片付く。 */
async function removeCopy(dir: string): Promise<void> {
    try {
        await rm(dir, REMOVE_OPTIONS);
    } catch (error) {
        console.error(`Failed to remove the temporary database copy ${dir}:`, error);
    }
}

/**
 * SQLite の DB とあれば -wal を一時フォルダーの専用のフォルダーへコピーし、コピーの DB のパスを read に渡して結果を返す。
 * 元のファイルは開かない。read は返るまでに DB を閉じる。コピーは read の結果にかかわらず消す。コピーできなければ例外を投げる。
 */
export async function withDbCopy<T>(source: string, read: (copyPath: string) => T | Promise<T>): Promise<T> {
    const dir = await mkdtemp(join(tmpdir(), DB_COPY_PREFIX));
    try {
        await restrict(dir, COPY_DIR_MODE);
        const copy = join(dir, basename(source));
        await copyPrivately(source, copy);
        if (await isRegularFile(`${source}-wal`)) await copyPrivately(`${source}-wal`, `${copy}-wal`);
        return await read(copy);
    } finally {
        await removeCopy(dir);
    }
}

/** 実行中のユーザーのものか。ユーザーの概念を持たない Windows では常に true。 */
function isOwnEntry(entry: Stats): boolean {
    return process.getuid === undefined || entry.uid === process.getuid();
}

/**
 * 一時フォルダーに残った、このアプリの一日より古い DB のコピーを消す。読み取りの途中で終了したプロセスの残骸で、リンクと
 * ファイルと他のユーザーのものは対象にしない。消せなくてもログを残すだけで、例外を投げない。
 */
export async function removeStaleDbCopies(): Promise<void> {
    const root = tmpdir();
    let names: string[];
    try {
        names = await readdir(root);
    } catch (error) {
        console.error(`Failed to list the temporary folder ${root}:`, error);
        return;
    }
    const limit = Date.now() - STALE_COPY_AGE_MS;
    for (const name of names) {
        if (!name.startsWith(DB_COPY_PREFIX)) continue;
        const path = join(root, name);
        try {
            const entry = await lstat(path);
            if (entry.isDirectory() && entry.mtimeMs < limit && isOwnEntry(entry)) await rm(path, REMOVE_OPTIONS);
        } catch (error) {
            console.error(`Failed to remove the stale database copy ${path}:`, error);
        }
    }
}
