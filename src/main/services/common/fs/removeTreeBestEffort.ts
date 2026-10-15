import { chmodSync, lstatSync, readdirSync, rmdirSync, unlinkSync, type Dirent } from 'fs';
import { join } from 'path';

/** エラーのコード。 */
function codeOf(error: unknown): string | undefined {
    return (error as NodeJS.ErrnoException).code;
}

/** パスが存在しないことを表すエラーか（途中がディレクトリではない場合を含む）。 */
function isMissing(error: unknown): boolean {
    const code = codeOf(error);
    return code === 'ENOENT' || code === 'ENOTDIR';
}

/**
 * 実 OS パス（native の絶対パス、または WSL の UNC パス）がリンク（シンボリックリンク・ジャンクション）か、
 * 種別を判定できないものか。存在しない場合は false。
 * UNC 越しの Linux のシンボリックリンクは lstat が失敗するため、判定できないものとしてリンクと同じに扱う。
 */
export function isLinkOrUnknown(abs: string): boolean {
    try {
        return lstatSync(abs).isSymbolicLink();
    } catch (error) {
        return !isMissing(error);
    }
}

/**
 * 実 OS パス（native の絶対パス、または WSL の UNC パス）のディレクトリまたはファイルを可能な限り削除し、
 * 自身まで削除できた（もともと無かった場合を含む）かを返す（同期・ベストエフォート）。
 * 使用中（ロック）などで消せないものは残し、消せるものだけを削除する。
 * - 配下のリンクはリンク自体だけを外し、リンク先には触れない（Windows のジャンクション・マウントポイントなどの
 *   再解析ポイントも一覧ではリンクとして扱う）。
 * - 起点と別のファイルシステム（デバイス）のディレクトリには降りず、残す（POSIX のマウントポイント）。
 * - 起点自体がリンクの場合と、起点の種別を判定できない場合は何も削除せず false を返す。
 */
export function removeTreeBestEffort(abs: string): boolean {
    let st;
    try {
        st = lstatSync(abs);
    } catch (error) {
        return isMissing(error);
    }
    if (st.isSymbolicLink()) return false;
    return st.isDirectory() ? removeDirectory(abs, st.dev) : removeFile(abs);
}

/** リンクではないディレクトリを配下ごと削除し、自身まで削除できたかを返す。dev は起点のデバイス。 */
function removeDirectory(dir: string, dev: number): boolean {
    let entries: Dirent[];
    try {
        entries = readdirSync(dir, { withFileTypes: true });
    } catch (error) {
        return codeOf(error) === 'ENOENT';
    }
    let removedAll = true;
    for (const entry of entries) {
        // native の絶対パス・UNC パスに対する結合のため、プラットフォーム適切な区切りで join する。
        if (!removeEntry(join(dir, entry.name), entry, dev)) removedAll = false;
    }
    if (!removedAll) return false;
    try {
        rmdirSync(dir);
        return true;
    } catch (error) {
        return codeOf(error) === 'ENOENT';
    }
}

/**
 * ディレクトリ内のエントリ 1 件を削除する。リンクの判定は一覧の種別を優先する
 * （UNC 越しの Linux のシンボリックリンクは一覧ではリンクと分かるが、lstat は失敗するため）。
 */
function removeEntry(path: string, entry: Dirent, dev: number): boolean {
    if (entry.isSymbolicLink()) return removeLink(path);
    if (entry.isFile()) return removeFile(path);
    // ディレクトリと種別不明のエントリは lstat でも確かめ、リンクなら外すだけにする。
    let st;
    try {
        st = lstatSync(path);
    } catch (error) {
        return isMissing(error);
    }
    if (st.isSymbolicLink()) return removeLink(path);
    if (!st.isDirectory()) return removeFile(path);
    return st.dev === dev && removeDirectory(path, dev);
}

/** リンク自体だけを外す（リンク先は辿らない）。ジャンクションで unlink が失敗した場合は rmdir で外す。 */
function removeLink(path: string): boolean {
    try {
        unlinkSync(path);
        return true;
    } catch (error) {
        if (codeOf(error) === 'ENOENT') return true;
    }
    try {
        rmdirSync(path);
        return true;
    } catch (error) {
        return codeOf(error) === 'ENOENT';
    }
}

/** ファイルを削除する。権限で失敗した場合は読み取り専用属性を外して再試行する。 */
function removeFile(path: string): boolean {
    try {
        unlinkSync(path);
        return true;
    } catch (error) {
        if (isMissing(error)) return true;
        const code = codeOf(error);
        if (code !== 'EPERM' && code !== 'EACCES') return false;
    }
    try {
        chmodSync(path, 0o666);
        unlinkSync(path);
        return true;
    } catch (error) {
        return isMissing(error);
    }
}
