import {
    CLEANUP_CANDIDATES,
    CODEX_ARCHIVED_SESSIONS_CLEANUP_KEY,
    CODEX_CONFIG_REL,
    CODEX_PROJECT_RECORDS_CLEANUP_KEY,
    CODEX_SESSION_PROJECTS_CLEANUP_KEY,
    CODEX_SESSIONS_CLEANUP_KEY,
} from '../../../shared/agents/codex/constants';
import type {
    CleanupCandidate,
    CleanupCandidateSpec,
    CleanupChild,
    CleanupChildBadge,
    CleanupSelection,
} from '../../../shared/agents/types';
import type { RemoveTarget } from '../common/cleanup/CleanupProbe';
import type { CleanupBlock } from '../common/cleanup/handledCleanup';
import {
    candidateTextKeys,
    toBlockedCandidate,
    toResolvedCandidate,
    type CandidateSource,
} from '../common/cleanup/resolvedCleanup';
import { isSafePathSegment } from '../common/fs/archiveEntryPath';
import { sqliteBlockedNotice, sqliteFilesOnlyNotice } from '../common/sqlite/sqliteNotices';
import { CodexPathBook, codexPathKey } from './codexPathKey';
import { readCodexRecords, removeCodexRecords } from './codexProjectRecords';
import { readRolloutMetas } from './codexRollouts';
import { deleteCodexThreads } from './codexThreadDeletion';
import { loadThreadLayout, type CodexCleanupContext, type ThreadLayout, type WalkedTree } from './codexThreadLayout';

// sessions の日付の階層の深さ（年、月、日）。
const DATE_NODE_DEPTH = 3;
// node:sqlite を読み込めない環境で、セッションの行に添える注記。
// 日付の表示の削除の注意文。状態 DB を扱えない環境では DB の行に触れない。
const SESSIONS_CONFIRM_WARNING = 'codex.cleanup.confirmWarning.sessions';
const SESSIONS_NO_DB_CONFIRM_WARNING = 'codex.cleanup.confirmWarning.sessionsNoDb';

/** このモジュールが扱う候補のキー。 */
export const CODEX_SESSION_CLEANUP_KEYS: ReadonlySet<string> = new Set([
    CODEX_SESSIONS_CLEANUP_KEY,
    CODEX_ARCHIVED_SESSIONS_CLEANUP_KEY,
    CODEX_SESSION_PROJECTS_CLEANUP_KEY,
    CODEX_PROJECT_RECORDS_CLEANUP_KEY,
]);

/** プロジェクト単位の表示の 1 行（ワークスペースのパス 1 つ）。 */
interface ProjectRow {
    key: string;
    threadIds: Set<string>;
    size: number;
    fileCount: number;
    mtimeMs: number;
}

/** 削除の対象を選んだ単位。 */
interface SelectionOwner {
    name: string;
    threadIds: Set<string>;
}

function specOf(key: string): CleanupCandidateSpec {
    const spec = CLEANUP_CANDIDATES.find(candidate => candidate.key === key);
    if (!spec) throw new Error(`Unknown Codex cleanup candidate: ${key}`);
    return spec;
}

/** 候補の表示用の共通項目。 */
function candidateBase(spec: CleanupCandidateSpec): Omit<CleanupCandidate, 'exists' | 'size' | 'fileCount'> {
    return {
        key: spec.key,
        defaultChecked: spec.defaultChecked,
        expandable: spec.expandable,
        childKind: spec.childKind,
        ...candidateTextKeys(spec),
    };
}

/** 空の候補。 */
function emptyCandidate(spec: CleanupCandidateSpec): CleanupCandidate {
    return { ...candidateBase(spec), exists: false, size: 0, fileCount: 0, children: [] };
}

/** 日付の階層の子要素を作る。名前は起点からの相対パスで、新しいものを先に並べる。 */
function dateNodes(tree: WalkedTree): CleanupChild[] {
    const nodes = new Map<string, CleanupChild>();
    const roots: CleanupChild[] = [];
    const sorted = [...tree.dirs].sort((a, b) => (a.rel < b.rel ? 1 : -1));
    for (const dir of sorted.filter(entry => entry.rel.split('/').length === 1)) {
        const node: CleanupChild = { name: dir.rel, size: 0, fileCount: 0, children: [] };
        nodes.set(dir.rel, node);
        roots.push(node);
    }
    for (let depth = 2; depth <= DATE_NODE_DEPTH; depth++) {
        for (const dir of sorted.filter(entry => entry.rel.split('/').length === depth)) {
            const parent = nodes.get(dir.rel.slice(0, dir.rel.lastIndexOf('/')));
            if (!parent) continue;
            const node: CleanupChild = { name: dir.rel, size: 0, fileCount: 0 };
            if (depth < DATE_NODE_DEPTH) node.children = [];
            nodes.set(dir.rel, node);
            parent.children?.push(node);
        }
    }
    for (const file of tree.files) {
        const parts = file.rel.split('/').slice(0, -1);
        for (let depth = 1; depth <= Math.min(parts.length, DATE_NODE_DEPTH); depth++) {
            const node = nodes.get(parts.slice(0, depth).join('/'));
            if (node) {
                node.size += file.size;
                node.fileCount += 1;
            }
        }
    }
    return roots;
}

/** 日付の表示の行に添える注記。データベースを扱えない環境だけ。 */
function dateRowNotice(layout: ThreadLayout): CleanupBlock | Record<string, never> {
    if (layout.dbDirs.length > 0) return {};
    return sqliteFilesOnlyNotice(layout.sqlite) ?? {};
}

/** sessions の候補（年月日の階層）。 */
function sessionsCandidate(layout: ThreadLayout): CleanupCandidate {
    const { sessions } = layout;
    return {
        ...candidateBase(specOf(CODEX_SESSIONS_CLEANUP_KEY)),
        exists: sessions.exists,
        size: sessions.files.reduce((sum, file) => sum + file.size, 0),
        fileCount: sessions.files.length,
        children: dateNodes(sessions),
        confirmWarningKey: layout.dbDirs.length === 0 ? SESSIONS_NO_DB_CONFIRM_WARNING : SESSIONS_CONFIRM_WARNING,
        ...dateRowNotice(layout),
    };
}

/** archived_sessions の候補（ファイル単位）。 */
function archivedCandidate(layout: ThreadLayout): CleanupCandidate {
    const { archived } = layout;
    return {
        ...candidateBase(specOf(CODEX_ARCHIVED_SESSIONS_CLEANUP_KEY)),
        exists: archived.exists,
        size: archived.files.reduce((sum, file) => sum + file.size, 0),
        fileCount: archived.files.length,
        children: archived.files
            .filter(file => !file.rel.includes('/'))
            .map(file => ({ name: file.name, size: file.size, fileCount: 1 }))
            .sort((a, b) => b.size - a.size),
        confirmWarningKey: layout.dbDirs.length === 0 ? SESSIONS_NO_DB_CONFIRM_WARNING : SESSIONS_CONFIRM_WARNING,
        ...dateRowNotice(layout),
    };
}

/**
 * プロジェクト単位の行を作る。threads の行があるスレッドは行の cwd に、行の無いスレッドはセッションファイルの session_meta の
 * cwd に属する。cwd が空のものと読めないものは行に入れない。ファイルが無く行だけのパスも 1 行にする。
 */
async function resolveProjectRows(
    context: CodexCleanupContext,
    layout: ThreadLayout,
    book: CodexPathBook
): Promise<ProjectRow[]> {
    if (!layout.projectViewOffered) return [];
    const rows = new Map<string, ProjectRow>();
    const addThread = (key: string, threadId: string, updatedMs: number) => {
        let row = rows.get(key);
        if (!row) {
            row = { key, threadIds: new Set(), size: 0, fileCount: 0, mtimeMs: 0 };
            rows.set(key, row);
        }
        row.threadIds.add(threadId);
        row.mtimeMs = Math.max(row.mtimeMs, updatedMs);
        for (const file of layout.byThread.get(threadId) ?? []) {
            row.size += file.size;
            row.fileCount += 1;
            row.mtimeMs = Math.max(row.mtimeMs, file.mtimeMs);
        }
    };

    for (const row of layout.rows.values()) {
        if (row.cwd.length > 0) addThread(book.addThreadCwd(row.cwd), row.id, row.updatedMs);
    }
    const unmatched = layout.rollouts.filter(rollout => !layout.rows.has(rollout.threadId));
    const metas = await readRolloutMetas(context.probe, unmatched);
    const seen = new Set<string>();
    unmatched.forEach((rollout, i) => {
        const cwd = metas[i]?.cwd;
        if (!cwd || seen.has(rollout.threadId)) return;
        seen.add(rollout.threadId);
        addThread(book.addSessionMetaCwd(cwd), rollout.threadId, 0);
    });
    return [...rows.values()];
}

/** session-projects の候補。候補を出さない環境では exists が false の空の候補。 */
function projectsCandidate(rows: readonly ProjectRow[], book: CodexPathBook): CleanupCandidate {
    const children = rows
        .map((row): CleanupChild => ({
            name: row.key,
            displayName: book.display(row.key),
            size: row.size,
            fileCount: row.fileCount,
            threadCount: row.threadIds.size,
            mtimeMs: row.mtimeMs,
        }))
        .sort((a, b) => (b.mtimeMs ?? 0) - (a.mtimeMs ?? 0));
    return {
        ...candidateBase(specOf(CODEX_SESSION_PROJECTS_CLEANUP_KEY)),
        exists: children.length > 0,
        size: children.reduce((sum, child) => sum + child.size, 0),
        fileCount: children.reduce((sum, child) => sum + child.fileCount, 0),
        children,
    };
}

/**
 * プロジェクト記録の行を作る。比較キーが同じキーを 1 行にまとめ、信頼状態をキーごとに集計する。
 * 大きさは取得せず、表示するパスで並べる。読めない場合はログを残して空を返す。
 */
async function resolveRecordRows(context: CodexCleanupContext, book: CodexPathBook): Promise<CandidateSource[]> {
    let records;
    try {
        records = await readCodexRecords(context.fs);
    } catch (error) {
        console.error(`Failed to read the Codex project records (${JSON.stringify(context.env)}):`, error);
        return [];
    }
    const groups = new Map<string, { keys: number; trusted: number; untrusted: number }>();
    for (const record of records) {
        const key = book.addRecordKey(record.key);
        if (key.length === 0) continue;
        const group = groups.get(key) ?? { keys: 0, trusted: 0, untrusted: 0 };
        group.keys += 1;
        if (record.trust === 'trusted') group.trusted += 1;
        if (record.trust === 'untrusted') group.untrusted += 1;
        groups.set(key, group);
    }
    return [...groups]
        .map(([key, group]): CandidateSource => {
            const countOf = (count: number) => (group.keys > 1 ? { count } : {});
            const unset = group.keys - group.trusted - group.untrusted;
            const badges: CleanupChildBadge[] = [];
            if (group.trusted > 0) badges.push({ key: 'trusted', ...countOf(group.trusted) });
            if (group.untrusted > 0) badges.push({ key: 'untrusted', ...countOf(group.untrusted) });
            if (unset > 0) badges.push({ key: 'trustUnset', ...countOf(unset) });
            if (group.keys > 1) badges.push({ key: 'duplicateKeys', count: group.keys });
            return {
                name: key,
                displayName: book.display(key),
                badges,
                size: 0,
                fileCount: 1,
                sizeUnknown: true,
            };
        })
        .sort((a, b) => ((a.displayName ?? '') < (b.displayName ?? '') ? -1 : 1));
}

/** このモジュールが扱う候補をスキャンして返す。調べられなかった候補は空の候補にする。 */
export async function scanCodexSessionCandidates(context: CodexCleanupContext): Promise<Map<string, CleanupCandidate>> {
    const book = new CodexPathBook(context.probe.os);
    const candidates = new Map<string, CleanupCandidate>();
    for (const key of CODEX_SESSION_CLEANUP_KEYS) candidates.set(key, emptyCandidate(specOf(key)));
    try {
        const layout = await loadThreadLayout(context);
        const projectRows = await resolveProjectRows(context, layout, book);
        candidates.set(CODEX_SESSIONS_CLEANUP_KEY, sessionsCandidate(layout));
        candidates.set(CODEX_ARCHIVED_SESSIONS_CLEANUP_KEY, archivedCandidate(layout));
        const block = sqliteBlockedNotice(layout.sqlite);
        candidates.set(
            CODEX_SESSION_PROJECTS_CLEANUP_KEY,
            block
                ? toBlockedCandidate(specOf(CODEX_SESSION_PROJECTS_CLEANUP_KEY), block)
                : projectsCandidate(projectRows, book)
        );
    } catch (error) {
        console.error(`Failed to resolve the Codex sessions (${JSON.stringify(context.env)}):`, error);
    }
    const recordSpec = specOf(CODEX_PROJECT_RECORDS_CLEANUP_KEY);
    candidates.set(recordSpec.key, toResolvedCandidate(recordSpec, await resolveRecordRows(context, book)));
    return candidates;
}

/** 名前が候補の起点からの相対パスとして扱えるか。 */
function isSafeRelName(name: string): boolean {
    return name.split('/').every(isSafePathSegment);
}

/** 選択された範囲を、スレッドとそれ以外の対象に振り分けて集める。 */
class TreeSelection {
    readonly owners: SelectionOwner[] = [];
    readonly plainTargets: { owner: SelectionOwner; target: RemoveTarget }[] = [];
    readonly unlisted: { owner: SelectionOwner; path: string }[] = [];
    // 空になったら消すディレクトリ（走査の結果ごとの相対パス）
    readonly emptyDirs = new Map<WalkedTree, Set<string>>();
    // 起点自体も空なら消す走査の結果
    readonly wholeTrees = new Set<WalkedTree>();
    private readonly rolloutPaths: Map<string, string>;

    constructor(layout: ThreadLayout) {
        this.rolloutPaths = new Map(layout.rollouts.map(rollout => [rollout.path, rollout.threadId]));
    }

    private noteEmptyDir(tree: WalkedTree, rel: string): void {
        const dirs = this.emptyDirs.get(tree) ?? new Set<string>();
        dirs.add(rel);
        this.emptyDirs.set(tree, dirs);
    }

    private newOwner(name: string): SelectionOwner {
        const owner: SelectionOwner = { name, threadIds: new Set() };
        this.owners.push(owner);
        return owner;
    }

    /** ファイル 1 つを選ぶ。ロールアウトならスレッドを、それ以外ならファイル自体を対象にする。 */
    private addFile(owner: SelectionOwner, path: string): void {
        const threadId = this.rolloutPaths.get(path);
        if (threadId) owner.threadIds.add(threadId);
        else this.plainTargets.push({ owner, target: { path, type: 'file' } });
    }

    /** 起点の配下すべてを選ぶ。 */
    addWhole(tree: WalkedTree, name: string): void {
        const owner = this.newOwner(name);
        for (const file of tree.files) this.addFile(owner, file.path);
        for (const link of tree.links) this.plainTargets.push({ owner, target: { path: link.path, type: 'link' } });
        for (const { path } of tree.unlisted) this.unlisted.push({ owner, path });
        for (const dir of tree.dirs) this.noteEmptyDir(tree, dir.rel);
        this.wholeTrees.add(tree);
    }

    /** 相対パスのディレクトリとその配下を選ぶ。 */
    addDir(tree: WalkedTree, rel: string): void {
        const owner = this.newOwner(rel);
        const prefix = `${rel}/`;
        const isInside = (entry: { rel: string }) => entry.rel === rel || entry.rel.startsWith(prefix);
        for (const file of tree.files.filter(isInside)) this.addFile(owner, file.path);
        for (const link of tree.links.filter(isInside)) {
            this.plainTargets.push({ owner, target: { path: link.path, type: 'link' } });
        }
        for (const { path } of tree.unlisted.filter(isInside)) this.unlisted.push({ owner, path });
        for (const dir of tree.dirs.filter(isInside)) this.noteEmptyDir(tree, dir.rel);
    }

    /** 起点の直下のファイルを選ぶ。一覧に無い名前は何もしない。 */
    addTopFile(tree: WalkedTree, name: string): boolean {
        const file = tree.files.find(entry => entry.rel === name);
        if (file) this.addFile(this.newOwner(name), file.path);
        return file !== undefined;
    }

    /** スレッドの集合を選ぶ。 */
    addThreads(name: string, threadIds: ReadonlySet<string>): void {
        this.newOwner(name).threadIds = new Set(threadIds);
    }

    threadIds(): Set<string> {
        return new Set(this.owners.flatMap(owner => [...owner.threadIds]));
    }
}

/** 消したファイルの親のうち、走査の結果にあるディレクトリを空なら消す対象に加える。 */
function noteParentsOfRemoved(selection: TreeSelection, tree: WalkedTree, removed: ReadonlySet<string>): void {
    const dirs = selection.emptyDirs.get(tree) ?? new Set<string>();
    for (const file of tree.files) {
        if (!removed.has(file.path)) continue;
        const parts = file.rel.split('/').slice(0, -1);
        for (let depth = parts.length; depth > 0; depth--) dirs.add(parts.slice(0, depth).join('/'));
    }
    selection.emptyDirs.set(tree, dirs);
}

/**
 * sessions、archived_sessions、プロジェクト単位の選択をまとめて削除する。スレッドは 1 つの集合にしてから消すので、
 * 選択の間の参照は妨げにならない。削除できなかった選択の名前と、残ったパスを返す。
 * DB の行は日付の表示の選択でも一緒に消す。ロールアウトでないファイルとリンクは、選択された範囲のものだけを消す。
 */
async function deleteThreadSelection(
    context: CodexCleanupContext,
    selection: CleanupSelection
): Promise<{ skipped: string[]; failedPaths: string[] }> {
    const { probe, env } = context;
    const childSelections = selection.childSelections ?? {};
    const pick = (key: string): 'all' | string[] | null => {
        if (selection.dirs.includes(key)) return 'all';
        const names = childSelections[key];
        return names && names.length > 0 ? names : null;
    };
    const sessionsPick = pick(CODEX_SESSIONS_CLEANUP_KEY);
    const archivedPick = pick(CODEX_ARCHIVED_SESSIONS_CLEANUP_KEY);
    const projectsPick = pick(CODEX_SESSION_PROJECTS_CLEANUP_KEY);
    if (!sessionsPick && !archivedPick && !projectsPick) return { skipped: [], failedPaths: [] };

    const skipped = new Set<string>();
    let layout: ThreadLayout;
    try {
        layout = await loadThreadLayout(context);
    } catch (error) {
        console.error(`Failed to resolve the Codex sessions (${JSON.stringify(env)}):`, error);
        const names = (key: string, picked: 'all' | string[] | null) =>
            picked === 'all' ? [key] : picked ? [...picked] : [];
        return {
            skipped: [
                ...names(CODEX_SESSIONS_CLEANUP_KEY, sessionsPick),
                ...names(CODEX_ARCHIVED_SESSIONS_CLEANUP_KEY, archivedPick),
                ...names(CODEX_SESSION_PROJECTS_CLEANUP_KEY, projectsPick),
            ],
            failedPaths: [],
        };
    }

    const chosen = new TreeSelection(layout);
    if (sessionsPick === 'all') {
        chosen.addWhole(layout.sessions, CODEX_SESSIONS_CLEANUP_KEY);
    } else if (sessionsPick) {
        const nodes = new Set(
            layout.sessions.dirs.map(dir => dir.rel).filter(rel => rel.split('/').length <= DATE_NODE_DEPTH)
        );
        for (const name of sessionsPick) {
            if (!isSafeRelName(name) || !nodes.has(name)) skipped.add(name);
            else chosen.addDir(layout.sessions, name);
        }
    }
    if (archivedPick === 'all') {
        chosen.addWhole(layout.archived, CODEX_ARCHIVED_SESSIONS_CLEANUP_KEY);
    } else if (archivedPick) {
        for (const name of archivedPick) {
            if (!isSafePathSegment(name) || !chosen.addTopFile(layout.archived, name)) skipped.add(name);
        }
    }
    if (projectsPick && layout.projectViewOffered) {
        const book = new CodexPathBook(probe.os);
        const rows = await resolveProjectRows(context, layout, book);
        const wanted = projectsPick === 'all' ? null : new Set(projectsPick.map(name => codexPathKey(probe.os, name)));
        for (const row of rows) {
            if (!wanted || wanted.has(row.key)) chosen.addThreads(row.key, row.threadIds);
        }
        if (projectsPick !== 'all') {
            const known = new Set(rows.map(row => row.key));
            for (const name of projectsPick) {
                if (!known.has(codexPathKey(probe.os, name))) skipped.add(name);
            }
        }
    } else if (projectsPick && projectsPick !== 'all') {
        for (const name of projectsPick) skipped.add(name);
    }

    const result = await deleteCodexThreads(context, layout, chosen.threadIds());
    const failedPaths = [...result.failedPaths];
    for (const owner of chosen.owners) {
        if ([...owner.threadIds].some(id => result.failedThreads.has(id))) skipped.add(owner.name);
    }

    const left = await probe.removeReporting(chosen.plainTargets.map(item => item.target));
    chosen.plainTargets.forEach((item, i) => {
        if (left[i].length > 0) {
            console.error(`Failed to remove ${item.target.path} (${JSON.stringify(env)})`);
            skipped.add(item.owner.name);
            failedPaths.push(...left[i]);
        }
    });
    for (const { owner, path } of chosen.unlisted) {
        skipped.add(owner.name);
        failedPaths.push(path);
    }

    for (const tree of [layout.sessions, layout.archived]) {
        noteParentsOfRemoved(chosen, tree, result.removedFiles);
        const rels = [...(chosen.emptyDirs.get(tree) ?? [])].sort((a, b) => b.length - a.length);
        const paths = rels.map(rel => probe.join(tree.root, ...rel.split('/')));
        if (chosen.wholeTrees.has(tree)) paths.push(tree.root);
        await probe.remove(paths.map(path => ({ path, type: 'empty-dir' as const })));
    }
    return { skipped: [...skipped], failedPaths };
}

/**
 * config.toml から選択されたプロジェクト記録を切り取る。一致するキーが無い名前は消せなかったものとして返す。
 * 切り取れなかった場合は選択全体とファイルのパスを返す。
 */
async function deleteRecordSelection(
    context: CodexCleanupContext,
    names: 'all' | string[]
): Promise<{ skipped: string[]; failedPaths: string[] }> {
    const { probe, fs, env } = context;
    const wanted = names === 'all' ? null : new Set(names.map(name => codexPathKey(probe.os, name)));
    const matched = new Set<string>();
    try {
        await removeCodexRecords(fs, key => {
            const compareKey = codexPathKey(probe.os, key);
            const hit = compareKey.length > 0 && (!wanted || wanted.has(compareKey));
            if (hit) matched.add(compareKey);
            return hit;
        });
        const unmatched = names === 'all' ? [] : names.filter(name => !matched.has(codexPathKey(probe.os, name)));
        return { skipped: unmatched, failedPaths: [] };
    } catch (error) {
        console.error(`Failed to remove the Codex project records (${JSON.stringify(env)}):`, error);
        return {
            skipped: names === 'all' ? [CODEX_PROJECT_RECORDS_CLEANUP_KEY] : [...names],
            failedPaths: [await fs.displayPath(CODEX_CONFIG_REL)],
        };
    }
}

/** このモジュールが扱う候補の選択を削除し、削除できなかった選択の名前と残ったパスを返す。 */
export async function deleteCodexSessionSelection(
    context: CodexCleanupContext,
    selection: CleanupSelection
): Promise<{ skipped: string[]; failedPaths: string[] }> {
    const threads = await deleteThreadSelection(context, selection);
    const recordNames = selection.dirs.includes(CODEX_PROJECT_RECORDS_CLEANUP_KEY)
        ? ('all' as const)
        : (selection.childSelections?.[CODEX_PROJECT_RECORDS_CLEANUP_KEY] ?? []);
    if (recordNames !== 'all' && recordNames.length === 0) return threads;
    const records = await deleteRecordSelection(context, recordNames);
    return {
        skipped: [...threads.skipped, ...records.skipped],
        failedPaths: [...threads.failedPaths, ...records.failedPaths],
    };
}
