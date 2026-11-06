import { posix, win32 } from 'path';
import type { CleanupProbe } from '../common/cleanup/CleanupProbe';
import { isGrokAbsolutePath, parseGitDirPointer, parseGitOriginUrls } from './grokProjectPaths';

// .git/config と .git、commondir を読む上限。
const GIT_FILE_MAX_BYTES = 1024 * 1024;

/** ファイルの内容を読む場所にできるパス。Windows の UNC（ネットワークや他の環境の可能性がある）は読まないので null。 */
function localDir(probe: CleanupProbe, path: string): string | null {
    if (!isGrokAbsolutePath(probe.os, path)) return null;
    if (probe.os !== 'win32') return probe.join(path);
    const plain = path.replace(/\//g, '\\');
    const local = plain.startsWith('\\\\?\\') ? plain.slice(4) : plain;
    return /^[A-Za-z]:\\/.test(local) ? probe.join(local) : null;
}

/** .git が指すパスを解決する。相対パスは base からの相対。読む場所にできなければ null。 */
function resolvePointer(probe: CleanupProbe, base: string, target: string): string | null {
    return isGrokAbsolutePath(probe.os, target) ? localDir(probe, target) : probe.join(base, target);
}

/**
 * 各ディレクトリの .git から origin の URL を読む。.git が無ければ null（親のディレクトリを探す）。
 * .git がファイル（worktree・サブモジュール）なら gitdir をたどり、commondir があればその先の config を読む。
 * .git があるのに読めない場合は空配列。
 */
async function readOriginsAt(probe: CleanupProbe, dirs: readonly string[]): Promise<(string[] | null)[]> {
    const heads = await probe.readHeads(
        dirs.flatMap(dir => [probe.join(dir, '.git', 'config'), probe.join(dir, '.git')]),
        GIT_FILE_MAX_BYTES
    );
    const results: (string[] | null)[] = dirs.map(() => null);
    const linked: { index: number; gitDir: string }[] = [];
    dirs.forEach((dir, i) => {
        const config = heads[i * 2];
        const pointer = heads[i * 2 + 1];
        if (config) {
            results[i] = parseGitOriginUrls(config.toString('utf8'));
        } else if (pointer) {
            results[i] = [];
            const target = parseGitDirPointer(pointer.toString('utf8'));
            const gitDir = target ? resolvePointer(probe, dir, target) : null;
            if (gitDir) linked.push({ index: i, gitDir });
        }
    });
    if (linked.length === 0) return results;

    const linkedHeads = await probe.readHeads(
        linked.flatMap(link => [probe.join(link.gitDir, 'commondir'), probe.join(link.gitDir, 'config')]),
        GIT_FILE_MAX_BYTES
    );
    const common: { index: number; path: string }[] = [];
    linked.forEach((link, i) => {
        const commonDir = linkedHeads[i * 2]?.toString('utf8').trim();
        const commonPath = commonDir ? resolvePointer(probe, link.gitDir, commonDir) : null;
        const config = linkedHeads[i * 2 + 1];
        if (commonPath) {
            common.push({ index: link.index, path: probe.join(commonPath, 'config') });
        } else if (config) {
            results[link.index] = parseGitOriginUrls(config.toString('utf8'));
        }
    });
    const commonHeads = await probe.readHeads(
        common.map(item => item.path),
        GIT_FILE_MAX_BYTES
    );
    common.forEach((item, i) => {
        const config = commonHeads[i];
        if (config) results[item.index] = parseGitOriginUrls(config.toString('utf8'));
    });
    return results;
}

/**
 * 各パスから親へたどって最初に見つかった .git の、origin の URL を返す（git コマンドは実行しない）。
 * 読む場所にできないパスと、.git が見つからないパスは空配列。同じディレクトリは 1 度だけ読む。
 */
export async function readGitOrigins(probe: CleanupProbe, paths: readonly string[]): Promise<Map<string, string[]>> {
    const parentOf = probe.os === 'win32' ? win32.dirname : posix.dirname;
    const starts = new Map<string, string>();
    for (const path of paths) {
        const start = localDir(probe, path);
        if (start) starts.set(path, start);
    }
    const originsAt = new Map<string, string[] | null>();
    let level = new Set(starts.values());
    while (level.size > 0) {
        const dirs = [...level].filter(dir => !originsAt.has(dir));
        const found = await readOriginsAt(probe, dirs);
        const next = new Set<string>();
        dirs.forEach((dir, i) => {
            originsAt.set(dir, found[i]);
            const parent = parentOf(dir);
            if (found[i] === null && parent !== dir) next.add(parent);
        });
        level = next;
    }
    const results = new Map<string, string[]>();
    for (const path of paths) {
        let dir = starts.get(path);
        let origins: string[] | null | undefined = null;
        while (dir !== undefined && origins === null) {
            origins = originsAt.get(dir);
            const parent: string = parentOf(dir);
            dir = parent === dir ? undefined : parent;
        }
        results.set(path, origins ?? []);
    }
    return results;
}
