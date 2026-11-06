import { posix, win32 } from 'path';
import { AGY_CLI_DIR } from '../../../shared/agents/agy/constants';
import type { AgentEnvironment } from '../../../shared/agents/types';
import type { CleanupAfterDelete } from '../common/cleanup/AgentCleanupManager';
import { createSqliteStore } from '../common/sqlite/createSqliteStore';
import { sqliteFilesOnlyNotice } from '../common/sqlite/sqliteNotices';
import type { SqliteStore } from '../common/sqlite/sqliteStore';
import {
    createCleanupProbe,
    type CleanupProbe,
    type ProbeEntryType,
    type RemoveTarget,
} from '../common/cleanup/CleanupProbe';
import { homePath, type ResolvedChild } from '../common/cleanup/resolvedCleanup';
import { GitRunner } from '../common/git/GitRunner';
import { HomeFs } from '../common/wsl/HomeFs';
import { removeJetboxEntries } from './agyJetboxSummaries';
import { shellQuote } from '../common/wsl/wslFileScripts';
import type { WslDetector } from '../common/wsl/WslDetector';
import { removeAgySummaryRows } from './agyConversationDb';

const CONVERSATIONS_DIR = 'conversations';
const WORKTREES_DIR = 'worktrees';
export const AGY_SUMMARIES_DB = 'conversation_summaries.db';
const AGY_JETBOX_SUMMARIES = 'jetbox_summaries_proto.pb';
const SUMMARIES_FTS_TABLE = 'conversations_fts';
// conversations 直下の会話のファイルの名前（本体の .db と .pb、.db に付随する -wal と -shm）。
const CONVERSATION_FILE = /^(.+)\.(db|db-wal|db-shm|pb)$/;
// worktree の .git ファイルから読む大きさの上限。
const GIT_FILE_MAX_BYTES = 8192;

/** 会話に付随するデータの置き場所。名前は会話 ID に suffix を付けたもの。 */
export interface AgyCompanionRoot {
    dir: string;
    suffix: string;
}

export const AGY_COMPANION_ANNOTATIONS: AgyCompanionRoot = { dir: 'annotations', suffix: '.pbtxt' };
export const AGY_COMPANION_CHAPTER_TITLES: AgyCompanionRoot = { dir: 'chapter_titles', suffix: '.pb' };
export const AGY_COMPANION_VOICE_CHATS: AgyCompanionRoot = { dir: 'voice_chats', suffix: '.json' };
export const AGY_COMPANION_BROWSER_RECORDINGS: AgyCompanionRoot = { dir: 'browser_recordings', suffix: '' };

const COMPANION_ROOTS: readonly AgyCompanionRoot[] = [
    { dir: 'brain', suffix: '' },
    AGY_COMPANION_ANNOTATIONS,
    AGY_COMPANION_CHAPTER_TITLES,
    AGY_COMPANION_VOICE_CHATS,
    AGY_COMPANION_BROWSER_RECORDINGS,
    { dir: WORKTREES_DIR, suffix: '' },
];

/** worktree を git の登録から外す処理。gitDir は共通の .git ディレクトリ。失敗すると例外を投げる。 */
export type AgyWorktreeRemover = (gitDir: string, worktree: string) => Promise<void>;

/** conversations 直下のファイル名の会話 ID。会話のファイルの名前でなければ null。 */
export function agyConversationIdOf(name: string): string | null {
    return CONVERSATION_FILE.exec(name)?.[1] ?? null;
}

/** 会話の本体（.db か .pb）のファイル名か。 */
function isConversationBody(name: string): boolean {
    return name.endsWith('.db') || name.endsWith('.pb');
}

/** 付随データの置き場所の名前から会話 ID を取り出す。名前の形が違えば null。 */
function companionIdOf(root: AgyCompanionRoot, name: string): string | null {
    if (!name.endsWith(root.suffix) || name.length === root.suffix.length) return null;
    return name.slice(0, name.length - root.suffix.length);
}

/** 一覧の種別に対応する削除のしかた（リンクと特殊ファイルはそれ自体だけを外す）。 */
export function agyRemoveTypeOf(type: ProbeEntryType): ResolvedChild['type'] {
    return type === 'dir' ? 'dir' : type === 'file' ? 'file' : 'link';
}

/**
 * 会話 ID ごとの、会話のファイル（.db、-wal、-shm）と付随データの合計のサイズとファイル数。
 * 存在するものだけを数え、リンクは辿らない。
 */
export async function measureAgyConversations(
    probe: CleanupProbe,
    ids: ReadonlySet<string>
): Promise<Map<string, { size: number; fileCount: number }>> {
    const base = await homePath(probe, AGY_CLI_DIR);
    const totals = new Map<string, { size: number; fileCount: number }>();
    const add = (id: string, entry: { size: number; fileCount: number }) => {
        const total = totals.get(id) ?? { size: 0, fileCount: 0 };
        total.size += entry.size;
        total.fileCount += entry.fileCount;
        totals.set(id, total);
    };
    const conversationOf = (name: string) => (name.endsWith('.pb') ? null : agyConversationIdOf(name));
    const conversations = await probe.list(probe.join(base, CONVERSATIONS_DIR), name => {
        const id = conversationOf(name);
        return id !== null && ids.has(id);
    });
    for (const entry of conversations) add(conversationOf(entry.name) as string, entry);
    for (const root of COMPANION_ROOTS) {
        const entries = await probe.list(probe.join(base, root.dir), name => {
            const id = companionIdOf(root, name);
            return id !== null && ids.has(id);
        });
        for (const entry of entries) add(companionIdOf(root, entry.name) as string, entry);
    }
    return totals;
}

/**
 * root の中で、対応する会話（conversations の .db か .pb）が無いものを子要素として返す。
 * 一覧できない場合は判定できないので空。
 */
export async function resolveAgyOrphans(probe: CleanupProbe, root: AgyCompanionRoot): Promise<ResolvedChild[]> {
    const base = await homePath(probe, AGY_CLI_DIR);
    const [conversations, entries] = await probe.listEach([
        probe.join(base, CONVERSATIONS_DIR),
        probe.join(base, root.dir),
    ]);
    if (conversations === null || entries === null) return [];
    const live = new Set(
        conversations
            .filter(entry => isConversationBody(entry.name))
            .map(entry => agyConversationIdOf(entry.name) as string)
    );
    return entries.flatMap((entry): ResolvedChild[] => {
        const id = companionIdOf(root, entry.name);
        if (id === null || live.has(id)) return [];
        return [
            {
                name: entry.name,
                path: entry.path,
                type: agyRemoveTypeOf(entry.type),
                size: entry.size,
                fileCount: entry.fileCount,
            },
        ];
    });
}

/**
 * worktree の .git ファイルの内容から、共通の .git ディレクトリを求める。
 * 'gitdir: <共通の .git>/worktrees/<名前>' の形でなければ null。
 */
function gitCommonDirOf(gitFile: string, worktree: string, os: CleanupProbe['os']): string | null {
    const raw = /^gitdir:[ \t]*(.+?)[ \t]*\r?$/m.exec(gitFile)?.[1];
    if (!raw) return null;
    const paths = os === 'win32' ? win32 : posix;
    const worktreesDir = paths.dirname(paths.resolve(worktree, raw));
    return paths.basename(worktreesDir) === 'worktrees' ? paths.dirname(worktreesDir) : null;
}

/**
 * dir 自身と直下のディレクトリのうち、worktree の .git ファイルを持つものを git の登録から外す。
 * git を実行できない場合や失敗した場合はログを残して続ける。
 */
async function unregisterWorktrees(
    probe: CleanupProbe,
    removeWorktree: AgyWorktreeRemover,
    dir: string
): Promise<void> {
    const children = await probe.listNested(dir, 1);
    const candidates = [dir, ...children.filter(child => child.type === 'dir').map(child => child.path)];
    const heads = await probe.readHeads(
        candidates.map(candidate => probe.join(candidate, '.git')),
        GIT_FILE_MAX_BYTES
    );
    for (const [index, candidate] of candidates.entries()) {
        const head = heads[index];
        const gitDir = head ? gitCommonDirOf(head.toString('utf8'), candidate, probe.os) : null;
        if (!gitDir) continue;
        try {
            await removeWorktree(gitDir, candidate);
        } catch (error) {
            console.error(`Failed to unregister the worktree ${candidate}:`, error);
        }
    }
}

/**
 * 会話を、そのファイル（.db、-wal、-shm）と付随データ（brain、annotations、chapter_titles、voice_chats、
 * browser_recordings、worktrees）ごと消す。消す先は一覧で得た実エントリから作り、無いものは飛ばし、リンクは辿らない。
 * ファイルを消せなかった会話と、同じ ID の .pb が残る会話の付随データには触らない。worktree は git の登録から外してから消す。
 * 消えた会話の行を要約 DB からベストエフォートで消す。distro の sqlite3 を使えない環境では要約 DB の行が残る（行の注記で伝える）。
 * sqlite3 に FTS5 が無ければ conversations_fts の行を飛ばし、failedPaths で伝える。
 * 消しきれなかった会話 ID を返し、削除できずに残ったパスを failedPaths に追加する。
 */
export async function removeAgyConversations(
    store: SqliteStore,
    probe: CleanupProbe,
    removeWorktree: AgyWorktreeRemover,
    ids: readonly string[],
    failedPaths: string[],
    fs: HomeFs
): Promise<string[]> {
    if (ids.length === 0) return [];
    const wanted = new Set(ids);
    const base = await homePath(probe, AGY_CLI_DIR);
    const listed = await probe.tryListNested(probe.join(base, CONVERSATIONS_DIR), 1);
    if (listed === null) return [...ids];

    const incomplete = new Set<string>();
    const keptAsPb = new Set<string>();
    const fileOwners: string[] = [];
    const fileTargets: RemoveTarget[] = [];
    for (const entry of listed) {
        const id = agyConversationIdOf(entry.rel);
        if (id === null || !wanted.has(id)) continue;
        if (entry.rel.endsWith('.pb')) {
            keptAsPb.add(id);
            continue;
        }
        fileOwners.push(id);
        fileTargets.push({ path: entry.path, type: agyRemoveTypeOf(entry.type) });
    }
    const removeAll = async (targets: RemoveTarget[], owners: string[]) => {
        const left = await probe.removeReporting(targets);
        left.forEach((paths, index) => {
            if (paths.length === 0) return;
            incomplete.add(owners[index]);
            failedPaths.push(...paths);
        });
    };
    await removeAll(fileTargets, fileOwners);

    const gone = ids.filter(id => !incomplete.has(id) && !keptAsPb.has(id));
    const companionOwners: string[] = [];
    const companionTargets: RemoveTarget[] = [];
    for (const root of COMPANION_ROOTS) {
        const dir = probe.join(base, root.dir);
        const byName = new Map((await probe.listNested(dir, 1)).map(entry => [entry.rel, entry]));
        for (const id of gone) {
            const entry = byName.get(`${id}${root.suffix}`);
            if (!entry) continue;
            if (root.dir === WORKTREES_DIR && entry.type === 'dir') {
                await unregisterWorktrees(probe, removeWorktree, entry.path);
            }
            companionOwners.push(id);
            companionTargets.push({ path: entry.path, type: agyRemoveTypeOf(entry.type) });
        }
    }
    await removeAll(companionTargets, companionOwners);

    if (sqliteFilesOnlyNotice(await store.availability()) === null) {
        const summaries = probe.join(base, AGY_SUMMARIES_DB);
        const removal = await removeAgySummaryRows(store, summaries, gone);
        if (!removal.removed) failedPaths.push(summaries);
        if (removal.ftsSkipped) failedPaths.push(`${summaries} (${SUMMARIES_FTS_TABLE})`);
    }
    if (!(await removeFromJetboxSummaries(fs, gone))) failedPaths.push(probe.join(base, AGY_JETBOX_SUMMARIES));
    return [...incomplete];
}

/** 要約キャッシュから会話の項目を取り除く。ファイルが無いか、該当の項目が無ければ何もしない。取り除けなければ false。 */
async function removeFromJetboxSummaries(fs: HomeFs, ids: readonly string[]): Promise<boolean> {
    if (ids.length === 0) return true;
    const rel = `${AGY_CLI_DIR}/${AGY_JETBOX_SUMMARIES}`;
    const read = await fs.readTextStrict(rel);
    if (read.kind === 'missing') return true;
    if (read.kind !== 'ok') return false;
    const removal = removeJetboxEntries(read.bytes, new Set(ids));
    if (removal.kind === 'unrecognized') return false;
    if (removal.kind === 'unchanged') return true;
    const write = await fs.writeTextAtomic(rel, Buffer.from(removal.bytes), { expectedRevision: read.revision });
    return write.kind === 'ok';
}

/** 環境に対応する、worktree を git の登録から外す処理。git が無い環境では何もしない。 */
export function createAgyWorktreeRemover(env: AgentEnvironment, detector: WslDetector): AgyWorktreeRemover {
    if (env.kind === 'wsl' && env.distro) {
        const distro = env.distro;
        return async (gitDir, worktree) => {
            const quoted = `--git-dir=${shellQuote(gitDir)} worktree remove --force ${shellQuote(worktree)}`;
            await detector.runMarkedScriptInDistro(
                distro,
                `if command -v git >/dev/null 2>&1; then git ${quoted} >/dev/null 2>&1; fi\n:`
            );
        };
    }
    const git = new GitRunner();
    return async (gitDir, worktree) => {
        if (await git.isAvailable()) await git.removeWorktree(gitDir, worktree);
    };
}

/**
 * 会話のファイルを消した後に、本体（.db と .pb）が残っていない会話の、残りのファイルと付随データを消す処理を作る。
 * 本体が残っている会話には触らない。
 */
export function createAgyConversationAfterDelete(detector: WslDetector): CleanupAfterDelete {
    return async (env, probe, names, failedPaths) => {
        const ids = new Set(names.flatMap(name => agyConversationIdOf(name) ?? []));
        if (ids.size === 0) return [];
        const base = await homePath(probe, AGY_CLI_DIR);
        const remaining = await probe.tryListNested(probe.join(base, CONVERSATIONS_DIR), 1);
        if (remaining === null) return [...ids];
        for (const entry of remaining) {
            if (isConversationBody(entry.rel)) ids.delete(agyConversationIdOf(entry.rel) as string);
        }
        return removeAgyConversations(
            createSqliteStore(env, detector),
            probe,
            createAgyWorktreeRemover(env, detector),
            [...ids],
            failedPaths,
            new HomeFs(env, detector)
        );
    };
}

/**
 * conversations の行に添える注記を返す処理を作る。要約 DB があるのに distro の sqlite3 を使えない環境だけ、
 * 要約 DB の行が残ることを伝える。
 */
export function createAgyConversationNotice(detector: WslDetector) {
    return async (env: AgentEnvironment) => {
        const store = createSqliteStore(env, detector);
        const notice = sqliteFilesOnlyNotice(await store.availability());
        if (!notice) return null;
        const summaries = await homePath(createCleanupProbe(env, detector), `${AGY_CLI_DIR}/${AGY_SUMMARIES_DB}`);
        return (await store.existingDatabaseFiles([summaries])).size > 0 ? notice : null;
    };
}
