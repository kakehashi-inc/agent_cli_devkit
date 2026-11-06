import { extname } from 'path';
import type { AssetEntry, AssetEntryLink, AssetEntryStatus } from '../../../../shared/agents/types';
import { parseFrontmatter } from '../../../utils/frontmatter';
import { isSafePathSegment } from '../fs/archiveEntryPath';
import type { ListedEntry } from '../fs/atomicFile';
import type { HomeFs } from '../wsl/HomeFs';

// フォルダー配下を再帰で読む種別の一覧の深さの上限。
export const RECURSIVE_ASSET_MAX_DEPTH = 32;

// 定義を探して降りないフォルダー。
const UNWALKED_DIR_NAMES = new Set(['node_modules', '.git']);

export type AssetMeta = Pick<AssetEntry, 'frontmatter' | 'frontmatterRaw'>;

// 定義ファイルの本文を一覧のメタ情報にする。読めなければ raw は null。
export type DescribeAsset = (raw: string | null) => AssetMeta;

export interface AssetScan {
    entries: AssetEntry[];
    // 深さの上限より下にエントリがあり、一覧に含めていない。
    truncated: boolean;
    // 読み取れなかったフォルダーがある。
    incomplete: boolean;
}

export interface FileScanOptions {
    // 定義ファイルの拡張子（'.md' など。大文字小文字は問わない）。
    extension: string;
    // 再帰で読む深さの上限。0 は直下だけを読み、フォルダーとフォルダーへのリンクを行にしない。
    maxDepth: number;
    describe?: DescribeAsset;
}

export interface DirScanOptions {
    // フォルダーを 1 件の定義とする目印のファイル（大文字小文字は問わない）。
    entryFile: string;
    // 目印を探すフォルダーの階層の上限。1 はルート直下のフォルダーだけ。
    maxLevels: number;
    // 目印のあるフォルダーの下も探し、その中の定義も行にする。指定しなければ目印のあるフォルダーの下は読まない。
    walkBelowEntry?: boolean;
    // '.' で始まる目印のあるフォルダーを、読み込まれない行として出す（CLI が '.' で始まるフォルダーを飛ばす場合）。
    hiddenNotLoaded?: boolean;
    // 指定すると、ルート直下のこの拡張子のファイルも 1 件の定義として行にする。
    rootFileExtension?: string;
    // ルート直下の目印のないフォルダーを、読み込まれない行として出す（'.' で始まるものは出さない）。
    listWithoutEntry?: boolean;
    // '.' で始まる目印のないフォルダーの下も探す。
    walkHidden?: boolean;
    // 一覧の対象にしないルート直下の名前か。
    isReserved?: (name: string) => boolean;
    describe?: DescribeAsset;
    // 行のメタ情報へ加える内容を、フォルダーの相対パスから求める。
    extraMeta?: (dirRel: string) => Promise<Record<string, string>>;
}

/** Markdown の frontmatter を一覧のメタ情報にする。 */
export const frontmatterMeta: DescribeAsset = raw => {
    const parsed = parseFrontmatter(raw);
    return { frontmatter: parsed?.fields ?? {}, frontmatterRaw: parsed?.raw ?? null };
};

/** prefix の下の相対パスを作る。 */
function joinRel(prefix: string, rel: string): string {
    return prefix ? `${prefix}/${rel}` : rel;
}

/** リンクとの関係。途中のフォルダーがリンクなら 'via'、自身がリンクなら 'self'。 */
function linkOf(item: ListedEntry, via: boolean): AssetEntryLink | undefined {
    if (via) return 'via';
    return item.isLink ? 'self' : undefined;
}

/** 定義の本文を持たない行（状態を表す行）を作る。 */
function statusRow(
    item: ListedEntry,
    relPath: string,
    status: AssetEntryStatus,
    isFile: boolean,
    via: boolean,
    name: string = item.name
): AssetEntry {
    const link = linkOf(item, via);
    return {
        name,
        relPath,
        isFile,
        frontmatter: {},
        frontmatterRaw: null,
        mtimeMs: item.mtimeMs,
        status,
        ...(link ? { link } : {}),
    };
}

/** 直下のエントリを読む。読めなければ scan に記録して空を返す。 */
async function readDirect(fs: HomeFs, dirRel: string, scan: AssetScan): Promise<ListedEntry[]> {
    const listed = await fs.listEntries(dirRel);
    if (listed.kind === 'error') scan.incomplete = true;
    if (listed.kind !== 'ok') return [];
    if (listed.incomplete) scan.incomplete = true;
    return listed.entries;
}

/** 読み取った本文。読めなければ null。 */
async function readTexts(fs: HomeFs, rels: string[]): Promise<Map<string, string | null>> {
    const reads = await fs.readTextStrictMany(rels);
    const texts = new Map<string, string | null>();
    for (const rel of rels) {
        const read = reads.get(rel);
        texts.set(rel, read?.kind === 'ok' ? read.text : null);
    }
    return texts;
}

/** リンクではないファイルの一覧の日時を使い、リンクはリンク先の日時を使う。 */
async function fileMtime(fs: HomeFs, rel: string, item: ListedEntry): Promise<number> {
    if (!item.isLink) return item.mtimeMs;
    return (await fs.fileStats(rel)).mtimeMs || item.mtimeMs;
}

/**
 * ルート配下の定義ファイルを 1 件ずつの行にする。リンクは行に印を付ける。
 * - フォルダーへのリンクは行にしたうえで配下をたどる。同じ実体を 2 度たどらず、その行は 'link-loop' にする。
 * - リンク切れは 'dangling-link' の行、安全でない名前は 'refused-name' の行にする。安全でない名前のフォルダーの下は読まない。
 * - 取り込みの作業フォルダーと原子的な書き込みの一時ファイルは含めない。
 */
export async function scanFileAssets(fs: HomeFs, rootRel: string, options: FileScanOptions): Promise<AssetScan> {
    const scan: AssetScan = { entries: [], truncated: false, incomplete: false };
    const extension = options.extension.toLowerCase();
    const describe = options.describe ?? frontmatterMeta;
    const recursive = options.maxDepth > 0;
    const visited = new Set<string>();
    const pending: { item: ListedEntry; relPath: string; full: string; via: boolean }[] = [];
    const rootKey = recursive ? await fs.realPathKey(rootRel) : null;
    if (rootKey !== null) visited.add(rootKey);

    const walk = async (dirRel: string, prefix: string, maxDepth: number, via: boolean): Promise<void> => {
        const listed = recursive ? await fs.listTree(dirRel, { maxDepth }) : await fs.listEntries(dirRel);
        if (listed.kind === 'error') scan.incomplete = true;
        if (listed.kind !== 'ok') return;
        if (listed.truncated) scan.truncated = true;
        if (listed.incomplete) scan.incomplete = true;
        const refusedDirs: string[] = [];
        for (const item of listed.entries) {
            if (refusedDirs.some(dir => item.relPath.startsWith(`${dir}/`))) continue;
            const relPath = joinRel(prefix, item.relPath);
            const full = `${dirRel}/${item.relPath}`;
            const safe = isSafePathSegment(item.name);
            const matches = item.name.toLowerCase().endsWith(extension);
            const stem = matches ? item.name.slice(0, item.name.length - extension.length) : item.name;
            if (item.kind === 'dir') {
                if (!safe) {
                    refusedDirs.push(item.relPath);
                    if (recursive) scan.entries.push(statusRow(item, relPath, 'refused-name', false, via));
                    continue;
                }
                if (!recursive || !item.isLink) continue;
                const key = await fs.realPathKey(full);
                if (key === null || visited.has(key)) {
                    const status = key === null ? 'dangling-link' : 'link-loop';
                    scan.entries.push(statusRow(item, relPath, status, false, via));
                    continue;
                }
                visited.add(key);
                scan.entries.push(statusRow(item, relPath, 'link-folder', false, via));
                const remaining = maxDepth - item.depth - 1;
                if (remaining < 0) scan.truncated = true;
                else await walk(full, relPath, remaining, true);
                continue;
            }
            if (item.kind === 'dangling') {
                // 拡張子のないリンク切れはフォルダーを指していた可能性があるので、再帰で読む種別では行にする。
                if (matches || (recursive && extname(item.name) === '')) {
                    scan.entries.push(statusRow(item, relPath, 'dangling-link', matches, via, stem));
                }
                continue;
            }
            if (item.kind !== 'file' || !matches) continue;
            if (!safe) {
                scan.entries.push(statusRow(item, relPath, 'refused-name', true, via, stem));
                continue;
            }
            pending.push({ item, relPath, full, via });
        }
    };

    await walk(rootRel, '', options.maxDepth, false);
    const texts = await readTexts(
        fs,
        pending.map(file => file.full)
    );
    for (const { item, relPath, full, via } of pending) {
        const link = linkOf(item, via);
        scan.entries.push({
            name: item.name.slice(0, item.name.length - extension.length),
            relPath,
            isFile: true,
            ...describe(texts.get(full) ?? null),
            mtimeMs: await fileMtime(fs, full, item),
            ...(link ? { link } : {}),
        });
    }
    return scan;
}

/**
 * ルート配下の、目印のファイルを持つフォルダーを 1 件ずつの行にする。目印のあるフォルダーの下は walkBelowEntry のときだけ読む。
 * 目印のないフォルダーは下の階層を maxLevels まで探す。リンクは行に印を付けてたどり、同じ実体を 2 度たどらない。
 * 取り込みの作業フォルダーと原子的な書き込みの一時ファイルは含めない。
 */
export async function scanDirAssets(fs: HomeFs, rootRel: string, options: DirScanOptions): Promise<AssetScan> {
    const scan: AssetScan = { entries: [], truncated: false, incomplete: false };
    const describe = options.describe ?? frontmatterMeta;
    const entryLower = options.entryFile.toLowerCase();
    const rootExtension = options.rootFileExtension?.toLowerCase();
    const visited = new Set<string>();
    const dirs: {
        item: ListedEntry;
        relPath: string;
        full: string;
        markerRel: string;
        via: boolean;
        status?: AssetEntryStatus;
    }[] = [];
    const files: { item: ListedEntry; relPath: string; full: string; via: boolean }[] = [];
    const rootKey = await fs.realPathKey(rootRel);
    if (rootKey !== null) visited.add(rootKey);

    /** dirRel の直下を調べて行を作り、作った行の数を返す。level はルート直下のフォルダーを 1 とする階層。 */
    const visit = async (dirRel: string, prefix: string, level: number, via: boolean): Promise<number> => {
        // 直下と、その中の目印をまとめて読む。リンクの中は別に読む。
        const listed = await fs.listTree(dirRel, { maxDepth: 1 });
        if (listed.kind === 'error') scan.incomplete = true;
        if (listed.kind !== 'ok') return 0;
        if (listed.incomplete) scan.incomplete = true;
        const children = new Map<string, ListedEntry[]>();
        for (const entry of listed.entries) {
            if (entry.depth !== 1) continue;
            const parent = entry.relPath.slice(0, entry.relPath.lastIndexOf('/'));
            children.set(parent, [...(children.get(parent) ?? []), entry]);
        }
        let found = 0;
        for (const item of listed.entries) {
            if (item.depth !== 0) continue;
            if (level === 1 && options.isReserved?.(item.name)) continue;
            const relPath = joinRel(prefix, item.name);
            const full = `${dirRel}/${item.name}`;
            const safe = isSafePathSegment(item.name);
            const isRootFile =
                level === 1 && rootExtension !== undefined && item.name.toLowerCase().endsWith(rootExtension);
            const stem = isRootFile
                ? item.name.slice(0, item.name.length - (rootExtension as string).length)
                : item.name;
            if (item.kind === 'dangling') {
                scan.entries.push(statusRow(item, relPath, 'dangling-link', isRootFile, via, stem));
                found += 1;
                continue;
            }
            if (item.kind === 'file') {
                if (!isRootFile) continue;
                if (safe) files.push({ item, relPath, full, via });
                else scan.entries.push(statusRow(item, relPath, 'refused-name', true, via, stem));
                found += 1;
                continue;
            }
            if (item.kind !== 'dir') continue;
            if (!safe) {
                scan.entries.push(statusRow(item, relPath, 'refused-name', false, via));
                found += 1;
                continue;
            }
            const inner = item.isLink ? await readDirect(fs, full, scan) : (children.get(item.name) ?? []);
            const marker = inner.find(child => child.kind === 'file' && child.name.toLowerCase() === entryLower);
            const hidden = item.name.startsWith('.');
            const unwalked = (hidden && !options.walkHidden) || UNWALKED_DIR_NAMES.has(item.name);
            if (marker) {
                const status = hidden && options.hiddenNotLoaded ? 'no-entry-file' : undefined;
                dirs.push({ item, relPath, full, markerRel: `${full}/${marker.name}`, via, status });
                found += 1;
                if (options.walkBelowEntry && !unwalked && level < options.maxLevels) {
                    if (item.isLink) {
                        const key = await fs.realPathKey(full);
                        if (key === null || visited.has(key)) continue;
                        visited.add(key);
                    }
                    found += await visit(full, relPath, level + 1, via || item.isLink);
                }
                continue;
            }
            if (unwalked) continue;
            if (item.isLink) {
                const key = await fs.realPathKey(full);
                if (key === null || visited.has(key)) {
                    const status = key === null ? 'dangling-link' : 'link-loop';
                    scan.entries.push(statusRow(item, relPath, status, false, via));
                    found += 1;
                    continue;
                }
                visited.add(key);
            }
            const below = level < options.maxLevels ? await visit(full, relPath, level + 1, via || item.isLink) : 0;
            found += below;
            if (item.isLink) {
                const status = below > 0 ? 'link-folder' : 'no-entry-file';
                scan.entries.push(statusRow(item, relPath, status, false, via));
                found += 1;
            } else if (below === 0 && level === 1 && options.listWithoutEntry && !item.name.startsWith('.')) {
                scan.entries.push(statusRow(item, relPath, 'no-entry-file', false, via));
                found += 1;
            }
        }
        return found;
    };

    await visit(rootRel, '', 1, false);
    const texts = await readTexts(fs, [...dirs.map(dir => dir.markerRel), ...files.map(file => file.full)]);
    for (const { item, relPath, full, markerRel, via, status } of dirs) {
        const stats = await fs.dirStats(full);
        const meta = describe(texts.get(markerRel) ?? null);
        const extra = options.extraMeta ? await options.extraMeta(full) : {};
        const link = linkOf(item, via);
        scan.entries.push({
            name: item.name,
            relPath,
            isFile: false,
            fileCount: stats.fileCount,
            frontmatter: { ...meta.frontmatter, ...extra },
            frontmatterRaw: meta.frontmatterRaw,
            mtimeMs: stats.mtimeMs,
            ...(link ? { link } : {}),
            ...(status ? { status } : {}),
        });
    }
    for (const { item, relPath, full, via } of files) {
        const link = linkOf(item, via);
        scan.entries.push({
            name: item.name.slice(0, item.name.length - (rootExtension as string).length),
            relPath,
            isFile: true,
            fileCount: 1,
            ...describe(texts.get(full) ?? null),
            mtimeMs: await fileMtime(fs, full, item),
            ...(link ? { link } : {}),
        });
    }
    return scan;
}
