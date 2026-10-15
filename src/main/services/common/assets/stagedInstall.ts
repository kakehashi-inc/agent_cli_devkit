import { lstatSync, mkdirSync, mkdtempSync, renameSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { applyMtime, zipEntryMtimeMs } from '../../../utils/fileTime';
import type { NormalizedArchiveEntry } from '../fs/archiveEntryPath';
import { isLinkOrUnknown, removeTreeBestEffort } from '../fs/removeTreeBestEffort';

// 取り込み先の直下に作る作業用ディレクトリの名前の先頭（隠しディレクトリにする）
const STAGING_PREFIX = '.asset-upload-';

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

/**
 * ZIP のエントリ（正規化した相対パス）を destDir 配下へ書き出し、ZIP に記録された更新日時を引き継ぐ。
 * adm-zip の extractAllTo は書き出した各ファイルへ chmodSync を呼び、WSL の UNC パス（\\wsl.localhost\...）では
 * ENOENT で失敗するため使わず、chmod を行わない writeFileSync で書き出す。destDir は実 OS パス（native の絶対パス・WSL の UNC パス）。
 */
export function extractArchiveEntries(entries: readonly NormalizedArchiveEntry[], destDir: string): void {
    // ディレクトリの日時はファイル書き込みで変わるため、全ファイルを書き出した後にまとめて適用する。
    const dirs: { path: string; mtimeMs: number | null }[] = [];
    for (const { path: rel, entry } of entries) {
        // join はプラットフォームの区切りに正規化する（Windows は '\' のため UNC パスにも正しく連結される）。
        const outPath = join(destDir, rel);
        if (entry.isDirectory) {
            mkdirSync(outPath, { recursive: true });
            dirs.push({ path: outPath, mtimeMs: zipEntryMtimeMs(entry) });
            continue;
        }
        mkdirSync(dirname(outPath), { recursive: true });
        writeFileSync(outPath, entry.getData());
        applyMtime(outPath, zipEntryMtimeMs(entry));
    }
    for (const dir of dirs) {
        applyMtime(dir.path, dir.mtimeMs);
    }
}

/**
 * destDir からの相対パス rel（区切りは '/'）へテキストを書き出し、更新日時を mtimeMs にする（null なら書き出した日時のまま）。
 * destDir は実 OS パス。途中のディレクトリは作る。
 */
export function writeTextFile(destDir: string, rel: string, content: string, mtimeMs: number | null): void {
    const outPath = join(destDir, rel);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, content, 'utf-8');
    applyMtime(outPath, mtimeMs);
}

/**
 * 取り込む内容を destDir 直下の作業用ディレクトリへ書き出してから、取り込み対象を destDir の所定の場所へ移す。
 * - stage: 渡されたディレクトリを destDir と見立てて、取り込む内容を書き出す。
 * - items: 取り込み対象の destDir からの相対パス（区切りは '/'）。書き出されなかったものは飛ばす。
 * - replace: 既にある場合に置き換えてよい取り込み対象。既にある対象は、replace に含まれリンクではない場合だけ
 *   作業用ディレクトリへ退避して置き換え、すべて移し終えてから退避したものを削除する。
 * 書き出し・移動に失敗した場合と、置き換えてよくない既存の対象があった場合は、移したものを取り除いて退避したものを戻し、
 * 取り込み前の状態にしてから例外を投げる。destDir は実 OS パスで、無ければ作る。
 */
export function installStaged(
    destDir: string,
    items: readonly string[],
    replace: ReadonlySet<string>,
    stage: (dir: string) => void
): void {
    mkdirSync(destDir, { recursive: true });
    const staging = mkdtempSync(join(destDir, STAGING_PREFIX));
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
                if (!replace.has(item) || isLinkOrUnknown(target)) {
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
