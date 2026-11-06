import { lstatSync, mkdirSync, mkdtempSync, readdirSync, realpathSync, renameSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { applyMtime, zipEntryMtimeMs } from '../../../utils/fileTime';
import type { NormalizedArchiveEntry } from '../fs/archiveEntryPath';
import { isLinkOrUnknown, removeTreeBestEffort } from '../fs/removeTreeBestEffort';
import type { HomeFs } from '../wsl/HomeFs';

// 作業用ディレクトリの名前の先頭（隠しディレクトリにする）
export const STAGING_PREFIX = '.asset-upload-';

export interface StagedInstallOptions {
    // 作業用ディレクトリを destDir の外（destDir の実体の親ディレクトリ）に作る。実体の親は destDir と同じボリュームにある。
    stagingOutsideDest?: boolean;
    // 既にある対象がリンクでも、リンク自体を退避して置き換える。
    replaceLinks?: boolean;
}

/** 取り込むファイルかディレクトリ 1 つ。relPath は取り込み先からの相対パス（区切りは '/'）で、bytes が null ならディレクトリ。 */
export interface StagedFile {
    relPath: string;
    bytes: Buffer | null;
    mtimeMs: number | null;
}

/** パスに何か（リンクを含む）があるか。存在しないこと以外の理由で調べられない場合はあるものとする。 */
function present(path: string): boolean {
    try {
        lstatSync(path);
        return true;
    } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        return code !== 'ENOENT' && code !== 'ENOTDIR';
    }
}

/** ZIP のエントリ（正規化した相対パス）を、ZIP に記録された更新日時を引き継ぐ取り込みの内容にする。 */
export function stagedFilesOfArchive(entries: readonly NormalizedArchiveEntry[]): StagedFile[] {
    return entries.map(({ path, entry }) => ({
        relPath: path,
        bytes: entry.isDirectory ? null : entry.getData(),
        mtimeMs: zipEntryMtimeMs(entry),
    }));
}

/** 取り込みの内容を destDir（実 OS パス）の配下へ書き出し、更新日時を設定する。途中のディレクトリは作る。 */
function writeStagedFiles(files: readonly StagedFile[], destDir: string): void {
    // ディレクトリの日時はファイル書き込みで変わるため、全ファイルを書き出した後にまとめて適用する。
    const dirs: { path: string; mtimeMs: number | null }[] = [];
    for (const { relPath, bytes, mtimeMs } of files) {
        const outPath = join(destDir, relPath);
        if (bytes === null) {
            mkdirSync(outPath, { recursive: true });
            dirs.push({ path: outPath, mtimeMs });
            continue;
        }
        mkdirSync(dirname(outPath), { recursive: true });
        writeFileSync(outPath, bytes);
        applyMtime(outPath, mtimeMs);
    }
    for (const dir of dirs) {
        applyMtime(dir.path, dir.mtimeMs);
    }
}

/**
 * ホームからの相対パス destRel の配下へ取り込みの内容を置く。native は installStaged で、WSL は distro のスクリプトで同じ手順を行う。
 * items、replace、options の意味は installStaged と同じ。失敗すると取り込み前の状態に戻して例外を投げる。
 */
export async function installFiles(
    fs: HomeFs,
    destRel: string,
    items: readonly string[],
    replace: ReadonlySet<string>,
    files: readonly StagedFile[],
    options: StagedInstallOptions = {}
): Promise<void> {
    if (fs.usesDistro) {
        await fs.installFilesInDistro(destRel, items, replace, files, options);
        return;
    }
    const destDir = await fs.resolveRealPath(destRel);
    if (destDir === null) throw new Error(`No path for ${destRel}`);
    installStaged(destDir, items, replace, dir => writeStagedFiles(files, dir), options);
}

/** 作業用ディレクトリを作る親ディレクトリを返す。 */
function stagingParentOf(destDir: string, outside: boolean): string {
    if (!outside) return destDir;
    let real = destDir;
    try {
        real = realpathSync(destDir);
    } catch {
        // 実体を解決できない場合は渡されたパスの親に作る。
    }
    const parent = dirname(real);
    return parent === real ? destDir : parent;
}

/**
 * dir の直下に残った作業用ディレクトリを削除する。退避したものが残っているものは、元の内容を失わないよう削除しない。
 * 取り込みは同期処理なので、取り込みの開始時に残っているものは過去の取り込みの残骸である。
 */
function removeStaleStaging(dir: string): void {
    let names: string[];
    try {
        names = readdirSync(dir);
    } catch {
        return;
    }
    for (const name of names) {
        if (!name.startsWith(STAGING_PREFIX)) continue;
        const path = join(dir, name);
        if (isLinkOrUnknown(path)) continue;
        if (present(join(path, 'old'))) {
            console.error(`Keeping the staging directory ${path} because it holds replaced items`);
            continue;
        }
        removeStaging(path);
    }
}

/**
 * 取り込む内容を作業用ディレクトリへ書き出してから、取り込み対象を destDir の所定の場所へ移す。作業用ディレクトリは既定で
 * destDir の直下に作り、options.stagingOutsideDest なら destDir の外に作る。開始時に過去の取り込みの残骸を片付ける。
 * - stage: 渡されたディレクトリを destDir と見立てて、取り込む内容を書き出す。
 * - items: 取り込み対象の destDir からの相対パス（区切りは '/'）。書き出されなかったものは飛ばす。
 * - replace: 既にある場合に置き換えてよい取り込み対象。既にある対象は、replace に含まれリンクではない場合だけ
 *   （options.replaceLinks ならリンクでも）作業用ディレクトリへ退避して置き換え、すべて移し終えてから退避したものを削除する。
 * 書き出し・移動に失敗した場合と、置き換えてよくない既存の対象があった場合は、移したものを取り除いて退避したものを戻し、
 * 取り込み前の状態にしてから例外を投げる。destDir は実 OS パスで、無ければ作る。
 */
export function installStaged(
    destDir: string,
    items: readonly string[],
    replace: ReadonlySet<string>,
    stage: (dir: string) => void,
    options: StagedInstallOptions = {}
): void {
    mkdirSync(destDir, { recursive: true });
    const stagingParent = stagingParentOf(destDir, options.stagingOutsideDest === true);
    removeStaleStaging(destDir);
    if (stagingParent !== destDir) removeStaleStaging(stagingParent);
    const staging = mkdtempSync(join(stagingParent, STAGING_PREFIX));
    const incoming = join(staging, 'new');
    const saved = join(staging, 'old');
    // 移した対象（backup は退避した既存の対象、placed は取り込み対象を置き終えたか）と、移すために作ったディレクトリ
    const moved: { target: string; backup: string | null; placed: boolean }[] = [];
    const createdDirs: string[] = [];
    try {
        mkdirSync(incoming);
        stage(incoming);
        for (const item of items) {
            const source = join(incoming, item);
            if (!present(source)) continue;
            const target = join(destDir, item);
            const step = { target, backup: null as string | null, placed: false };
            if (present(target)) {
                if (!replace.has(item) || (!options.replaceLinks && isLinkOrUnknown(target))) {
                    throw new Error(`Refusing to replace ${target}`);
                }
                const backup = join(saved, item);
                mkdirSync(dirname(backup), { recursive: true });
                renameSync(target, backup);
                step.backup = backup;
            } else {
                const created = mkdirSync(dirname(target), { recursive: true });
                if (created) createdDirs.push(created);
            }
            moved.push(step);
            renameSync(source, target);
            step.placed = true;
        }
    } catch (error) {
        if (!rollback(moved, createdDirs)) {
            console.error(`Failed to restore replaced items; they remain in ${saved}`);
            throw error;
        }
        removeStaging(staging);
        throw error;
    }
    removeStaging(staging);
}

/** 移した対象を取り除き、退避したものを元の場所へ戻す。すべて戻せたかを返す。 */
function rollback(moved: { target: string; backup: string | null; placed: boolean }[], createdDirs: string[]): boolean {
    let restored = true;
    for (const step of [...moved].reverse()) {
        if (step.placed && !removeTreeBestEffort(step.target)) {
            restored = false;
            continue;
        }
        if (!step.backup) continue;
        try {
            renameSync(step.backup, step.target);
        } catch (error) {
            console.error(`Failed to restore ${step.target}:`, error);
            restored = false;
        }
    }
    // 移すために作ったディレクトリの配下には、取り込もうとしたものしか無い。
    for (const dir of [...createdDirs].reverse()) {
        removeTreeBestEffort(dir);
    }
    return restored;
}

/** 作業用ディレクトリを削除する。削除しきれなかった場合はログを残す。 */
function removeStaging(staging: string): void {
    if (!removeTreeBestEffort(staging)) {
        console.error(`Failed to remove the staging directory ${staging}`);
    }
}
