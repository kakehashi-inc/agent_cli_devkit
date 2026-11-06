import { createWriteStream } from 'fs';
import archiver from 'archiver';
import type { AssetEntry, AssetKind, AssetOpResult } from '../../../../shared/agents/types';
import { zipArchiveOptions } from '../../../utils/fileTime';
import type { HomeFs } from '../wsl/HomeFs';

/** ZIP へ入れる 1 件。source は環境の中の絶対パスで、name は ZIP 内の名前。 */
export interface AssetZipSource {
    source: string;
    name: string;
    isDirectory: boolean;
}

/**
 * スキルのフォルダーを上書きするときに一緒に置き換わる、フォルダーの中のスキルを結果の形で返す。無ければ空。
 * 一覧を読めないときは何も示さない（上書きの確認そのものは変わらない）。
 */
export async function nestedReplacedOf(
    kind: AssetKind,
    conflicts: readonly string[],
    list: () => Promise<{ entries: readonly AssetEntry[] }>
): Promise<Pick<AssetOpResult, 'nestedReplaced'>> {
    if (kind !== 'skills' || conflicts.length === 0) return {};
    try {
        const { entries } = await list();
        const nested = entries
            .map(entry => entry.relPath)
            .filter(relPath => conflicts.some(conflict => relPath.startsWith(`${conflict}/`)));
        return nested.length > 0 ? { nestedReplaced: nested } : {};
    } catch (error) {
        console.error('Failed to list the skills replaced by an upload:', error);
        return {};
    }
}

/**
 * ルート配下の 1 件を削除し、消せたか（もともと無かった場合を含む）を返す。
 * 行そのものがリンクならリンクだけを外す。途中のフォルダーがリンクなら、リンク先の実体を消さないよう削除しない。
 * allowDirectory のときだけ実体のフォルダーを配下ごと削除する。消した後は空になった親フォルダーをルートの手前まで削除する。
 */
export async function removeAssetEntry(
    fs: HomeFs,
    rootRel: string,
    rel: string,
    allowDirectory: boolean
): Promise<boolean> {
    const segments = rel.split('/').filter(segment => segment.length > 0);
    const below = await fs.findLinkBelowRoot(rootRel, segments);
    if (below.kind !== 'none') return false;
    const target = `${rootRel}/${segments.join('/')}`;
    const removed = await fs.deleteStrict(target);
    if (removed.kind === 'error') {
        if (removed.code !== 'EISDIR' || !allowDirectory) return false;
        if (!(await fs.removeDirBestEffort(target)).removedAll) return false;
    } else if (removed.kind === 'conflict') {
        return false;
    }
    await fs.removeEmptyParents(target, rootRel);
    return true;
}

/**
 * ダウンロードする相対パスを、リンクをたどった環境の中の絶対パスの一覧にする。
 * リンク切れと読めないものは含めない。name は ZIP 内の名前で、既定は相対パスのまま。
 * 一緒に選ばれたフォルダーの下にあるものは、そのフォルダーの内容として入るので別に数えない。
 */
export async function resolveZipSources(
    fs: HomeFs,
    items: readonly { rootRel: string; rel: string; name?: string }[]
): Promise<AssetZipSource[]> {
    const sources: AssetZipSource[] = [];
    const outermost = items.filter(
        item => !items.some(other => other.rootRel === item.rootRel && item.rel.startsWith(`${other.rel}/`))
    );
    for (const { rootRel, rel, name } of outermost) {
        const full = `${rootRel}/${rel}`;
        const stat = await fs.statFile(full);
        if (stat.kind !== 'file' && stat.kind !== 'other') continue;
        const source = await fs.resolveFollowedPath(full);
        if (source !== null) sources.push({ source, name: name ?? rel, isDirectory: stat.kind === 'other' });
    }
    return sources;
}

/** 環境の中の絶対パスの一覧を 1 つの ZIP に書き出す。WSL は本文を distro のスクリプトで読む。 */
export async function writeAssetZip(fs: HomeFs, sources: readonly AssetZipSource[], destZip: string): Promise<void> {
    const items = fs.usesDistro ? await fs.distroArchiveItems(sources) : null;
    return new Promise((resolve, reject) => {
        const output = createWriteStream(destZip);
        const archive = archiver('zip', zipArchiveOptions());
        output.on('close', () => resolve());
        output.on('error', reject);
        archive.on('error', reject);
        archive.pipe(output);
        if (items) {
            for (const { kind, name, mtimeMs, mode, bytes, linkTarget } of items) {
                const date = new Date(mtimeMs);
                if (kind === 'file') archive.append(bytes as Buffer, { name, date, mode });
                else if (kind === 'dir') archive.append('', { name: `${name}/`, date, mode });
                else archive.symlink(name, linkTarget as string);
            }
        } else {
            for (const { source, name, isDirectory } of sources) {
                if (isDirectory) archive.directory(source, name);
                else archive.file(source, { name });
            }
        }
        void archive.finalize();
    });
}

/** フォルダーの中の定義ファイルの本文を読む（名前の大文字小文字は問わない）。無ければ null。 */
export async function readEntryFile(fs: HomeFs, dirRel: string, entryFile: string): Promise<string | null> {
    const exact = await fs.readTextStrict(`${dirRel}/${entryFile}`);
    if (exact.kind === 'ok') return exact.text;
    const listed = await fs.listEntries(dirRel);
    if (listed.kind !== 'ok') return null;
    const found = listed.entries.find(entry => entry.name.toLowerCase() === entryFile.toLowerCase());
    if (!found) return null;
    const read = await fs.readTextStrict(`${dirRel}/${found.name}`);
    return read.kind === 'ok' ? read.text : null;
}
