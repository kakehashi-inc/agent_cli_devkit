import { CODEX_DIR } from '../../../shared/agents/codex/constants';
import type { AgentEnvironment } from '../../../shared/agents/types';
import type { CleanupProbe } from '../common/cleanup/CleanupProbe';
import type { SqliteAvailability, SqliteStore } from '../common/sqlite/sqliteStore';
import type { HomeFs } from '../common/wsl/HomeFs';
import { parseRolloutFileName, type RolloutName } from './codexRollouts';
import { CODEX_DB_FILES, readStateThreads, type StateThreadRow } from './codexStateDb';

const SESSIONS_DIR = 'sessions';
const ARCHIVED_SESSIONS_DIR = 'archived_sessions';
// ~/.codex と同じ名前の DB を置く、もう 1 つの場所。
const SQLITE_DIR = 'sqlite';

/** スキャンと削除に使う環境ごとの操作。 */
export interface CodexCleanupContext {
    env: AgentEnvironment;
    probe: CleanupProbe;
    fs: HomeFs;
    sqlite: SqliteStore;
}

/** 走査で見つかったファイル。rel は走査の起点からの相対パス（区切りは '/'）。 */
export interface TreeFile {
    rel: string;
    path: string;
    name: string;
    size: number;
    mtimeMs: number;
}

/** 走査で見つかったディレクトリやリンク。 */
export interface TreeEntry {
    rel: string;
    path: string;
}

/** ディレクトリ配下の走査結果。リンクは辿らない。 */
export interface WalkedTree {
    root: string;
    // 起点が実ディレクトリとして存在する
    exists: boolean;
    files: TreeFile[];
    dirs: TreeEntry[];
    links: TreeEntry[];
    // 一覧できなかったディレクトリ
    unlisted: TreeEntry[];
}

/** ファイル名からスレッド ID が分かるロールアウト。 */
export type RolloutFile = TreeFile & RolloutName;

/** スレッドの構成。削除先はここに入っている実エントリから作る。 */
export interface ThreadLayout {
    codexDir: string;
    sessions: WalkedTree;
    archived: WalkedTree;
    rollouts: RolloutFile[];
    // スレッド ID → そのスレッドのロールアウト
    byThread: Map<string, RolloutFile[]>;
    // データベースを扱えるか（データベースが無ければ扱える）
    sqlite: SqliteAvailability;
    // 行を読み書きする DB のフォルダ。データベースを扱えない環境では空。
    dbDirs: string[];
    // スレッド ID → threads の行
    rows: Map<string, StateThreadRow>;
    // プロジェクト単位の表示を出せるか
    projectViewOffered: boolean;
}

/** root 配下をリンクを辿らず走査する。起点が無い・リンクの場合は exists が false の空の結果を返す。 */
async function walkTree(probe: CleanupProbe, root: string): Promise<WalkedTree> {
    const tree: WalkedTree = { root, exists: false, files: [], dirs: [], links: [], unlisted: [] };
    const [self] = await probe.listNested(root, 0);
    if (self?.type !== 'dir') return tree;
    tree.exists = true;
    let level: TreeEntry[] = [{ rel: '', path: root }];
    while (level.length > 0) {
        const listings = await probe.listEach(level.map(dir => dir.path));
        const next: TreeEntry[] = [];
        level.forEach((dir, i) => {
            const listing = listings[i];
            if (listing === null) {
                tree.unlisted.push(dir);
                return;
            }
            for (const entry of listing) {
                const rel = dir.rel ? `${dir.rel}/${entry.name}` : entry.name;
                if (entry.type === 'file') {
                    tree.files.push({
                        rel,
                        path: entry.path,
                        name: entry.name,
                        size: entry.size,
                        mtimeMs: entry.mtimeMs,
                    });
                } else if (entry.type === 'dir') {
                    tree.dirs.push({ rel, path: entry.path });
                    next.push({ rel, path: entry.path });
                } else {
                    tree.links.push({ rel, path: entry.path });
                }
            }
        });
        level = next;
    }
    return tree;
}

/** 両方の DB フォルダの threads を読み、スレッド ID → 行と、プロジェクト単位の表示を出せるかを返す。 */
async function readRows(
    store: SqliteStore,
    dbDirs: readonly string[]
): Promise<{ rows: Map<string, StateThreadRow>; projectViewOffered: boolean }> {
    const rows = new Map<string, StateThreadRow>();
    let projectViewOffered = dbDirs.length > 0;
    for (const dir of dbDirs) {
        try {
            const read = await readStateThreads(store, dir);
            if (read.kind === 'unusable') projectViewOffered = false;
            if (read.kind !== 'rows') continue;
            for (const row of read.rows) {
                if (!rows.has(row.id)) rows.set(row.id, row);
            }
        } catch (error) {
            console.error(`Failed to read the Codex threads in ${dir}:`, error);
            projectViewOffered = false;
        }
    }
    return { rows, projectViewOffered };
}

/** DB のフォルダに CLI の DB があるか。調べられなければあるものとする。 */
async function hasDatabases(store: SqliteStore, dbDirs: readonly string[]): Promise<boolean> {
    try {
        const paths = dbDirs.flatMap(dir => CODEX_DB_FILES.map(file => store.join(dir, file)));
        return (await store.existingDatabaseFiles(paths)).size > 0;
    } catch (error) {
        console.error('Failed to look for the Codex databases:', error);
        return true;
    }
}

/**
 * セッションファイルと threads の行を調べる。データベースがあるのに扱えない環境（node:sqlite を読み込めない、distro の sqlite3 が
 * 無いか古い）と、threads に id か cwd が無い DB がある環境では、プロジェクト単位の表示を出さない。
 * データベースが無ければ、データベースを扱えない環境でも行の読み書きが無いので同じように扱う。
 */
export async function loadThreadLayout(context: CodexCleanupContext): Promise<ThreadLayout> {
    const { probe, sqlite } = context;
    const codexDir = probe.join(await probe.homeDir(), CODEX_DIR);
    const sessions = await walkTree(probe, probe.join(codexDir, SESSIONS_DIR));
    const archived = await walkTree(probe, probe.join(codexDir, ARCHIVED_SESSIONS_DIR));

    const rollouts: RolloutFile[] = [];
    const byThread = new Map<string, RolloutFile[]>();
    for (const file of [...sessions.files, ...archived.files]) {
        const name = parseRolloutFileName(file.name);
        if (!name) continue;
        const rollout: RolloutFile = { ...file, ...name };
        rollouts.push(rollout);
        byThread.set(name.threadId, [...(byThread.get(name.threadId) ?? []), rollout]);
    }

    const candidates = [codexDir];
    const sqliteDir = probe.join(codexDir, SQLITE_DIR);
    const [self] = await probe.listNested(sqliteDir, 0);
    if (self?.type === 'dir') candidates.push(sqliteDir);
    const availability = await sqlite.availability();
    const usable =
        availability.kind === 'available' ||
        (availability.kind !== 'runtime-missing' && !(await hasDatabases(sqlite, candidates)));
    const dbDirs = usable ? candidates : [];
    return {
        codexDir,
        sessions,
        archived,
        rollouts,
        byThread,
        sqlite: usable ? { kind: 'available' } : availability,
        dbDirs,
        ...(await readRows(sqlite, dbDirs)),
    };
}
