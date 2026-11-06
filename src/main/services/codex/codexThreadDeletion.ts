import { CODEX_DIR } from '../../../shared/agents/codex/constants';
import type { RemoveTarget } from '../common/cleanup/CleanupProbe';
import { withBom } from '../common/fs/atomicFile';
import type { HomeFs } from '../common/wsl/HomeFs';
import { readRolloutMetas, removeJsonlEntries } from './codexRollouts';
import {
    deleteThreadRows,
    THREAD_DATA_DELETES,
    THREAD_HISTORY_DELETES,
    THREAD_STATE_DELETES,
    type DbDeleteFailure,
} from './codexStateDb';
import type { CodexCleanupContext, ThreadLayout } from './codexThreadLayout';

const SESSION_INDEX_REL = `${CODEX_DIR}/session_index.jsonl`;
const HISTORY_REL = `${CODEX_DIR}/history.jsonl`;
const SHELL_SNAPSHOTS_DIR = 'shell_snapshots';
const THREAD_WRITER_LOCKS_DIR = 'thread-writer-locks';
const VISUALIZATIONS_DIR = 'visualizations';
// visualizations/YYYY/MM/DD/<スレッド ID> の深さ。
const VISUALIZATION_DEPTH = 4;
const LOCK_SUFFIX = '.lock';
// 書き込みの直前に内容が変わった場合に読み直す回数。
const WRITE_ATTEMPTS = 2;

/** スレッドの削除の結果。 */
export interface ThreadDeleteResult {
    // 消さなかったか、一部を消せなかったスレッド
    failedThreads: Set<string>;
    // 消せずに残ったパス
    failedPaths: string[];
    // 消したセッションファイルの絶対パス
    removedFiles: Set<string>;
}

/** あるスレッドが別のスレッドを参照している関係。 */
export interface ThreadReference {
    from: string;
    to: string;
}

/**
 * セッションファイルの session_meta と threads の行から、スレッド間の参照を集める。読めないファイルは飛ばす。
 * 履歴を引き継ぐ元（history_base）と、接続された親（attached_thread の forked_from_id、threads.attached_thread_parent_id）が対象。
 */
async function readThreadReferences(context: CodexCleanupContext, layout: ThreadLayout): Promise<ThreadReference[]> {
    const ownerOfRollout = new Map(layout.rollouts.map(rollout => [rollout.rolloutId, rollout.threadId]));
    const metas = await readRolloutMetas(context.probe, layout.rollouts);
    const references: ThreadReference[] = [];
    layout.rollouts.forEach((rollout, i) => {
        const meta = metas[i];
        if (!meta) return;
        if (meta.historyBaseRolloutId) {
            const to = ownerOfRollout.get(meta.historyBaseRolloutId) ?? meta.historyBaseRolloutId;
            references.push({ from: rollout.threadId, to });
        }
        if (meta.attachedParentId) references.push({ from: rollout.threadId, to: meta.attachedParentId });
    });
    for (const row of layout.rows.values()) {
        if (row.attachedParentId) references.push({ from: row.id, to: row.attachedParentId });
    }
    return references.filter(reference => reference.from !== reference.to);
}

/**
 * 集合の外のスレッドから参照されているスレッドを返す。消さないスレッドが参照する先も消せないので、
 * 集合の外になったものからの参照も順にたどる。集合の中だけの参照は妨げない。
 */
export function findRefusedThreads(
    requested: ReadonlySet<string>,
    references: readonly ThreadReference[]
): Set<string> {
    const remaining = new Set(requested);
    const refused = new Set<string>();
    let changed = true;
    while (changed) {
        changed = false;
        for (const { from, to } of references) {
            if (remaining.has(to) && !remaining.has(from)) {
                remaining.delete(to);
                refused.add(to);
                changed = true;
            }
        }
    }
    return refused;
}

/** JSON Lines のファイルから key の値が ids に含まれる行を除く。読めない・書けない場合はログを残して false を返す。 */
async function removeJsonlLines(fs: HomeFs, rel: string, key: string, ids: ReadonlySet<string>): Promise<boolean> {
    for (let attempt = 0; attempt < WRITE_ATTEMPTS; attempt++) {
        const read = await fs.readTextStrict(rel);
        if (read.kind === 'missing') return true;
        if (read.kind !== 'ok' || !read.utf8Clean) {
            console.error(`Failed to read ${rel}: ${read.kind === 'error' ? read.code : read.kind}`);
            return false;
        }
        const next = removeJsonlEntries(read.text, key, ids);
        if (next.removed === 0) return true;
        const written = await fs.writeTextAtomic(rel, withBom(next.text, read.hadBom), {
            expectedRevision: read.revision,
        });
        if (written.kind === 'ok') return true;
        if (written.kind !== 'conflict') {
            console.error(`Failed to write ${rel}: ${written.kind === 'error' ? written.code : written.kind}`);
            return false;
        }
    }
    console.error(`${rel} kept changing while removing thread entries`);
    return false;
}

/** 親の相対パスを深い順に返す（rel 自身は含まない）。 */
function ancestorsOf(rel: string): string[] {
    const parts = rel.split('/');
    return parts.slice(0, -1).map((_, i) => parts.slice(0, parts.length - 1 - i).join('/'));
}

/**
 * 公式の削除が触らないスレッド単位のものを消す。history.jsonl の該当行、shell_snapshots/<ID>.*、
 * visualizations/YYYY/MM/DD/<ID>/、thread-writer-locks/<ID>.lock が対象。消せなかったものを result に記録する。
 */
async function removeThreadLeftovers(
    context: CodexCleanupContext,
    layout: ThreadLayout,
    ids: ReadonlySet<string>,
    result: ThreadDeleteResult
): Promise<void> {
    const { probe, fs, env } = context;
    if (!(await removeJsonlLines(fs, HISTORY_REL, 'session_id', ids))) {
        result.failedPaths.push(probe.join(layout.codexDir, 'history.jsonl'));
        ids.forEach(id => result.failedThreads.add(id));
    }

    const targets: { threadId: string; target: RemoveTarget }[] = [];
    const snapshotOwner = (name: string) => name.slice(0, Math.max(0, name.indexOf('.')));
    const snapshots = await probe.list(probe.join(layout.codexDir, SHELL_SNAPSHOTS_DIR), name =>
        ids.has(snapshotOwner(name))
    );
    for (const entry of snapshots) {
        if (entry.type === 'file') {
            targets.push({ threadId: snapshotOwner(entry.name), target: { path: entry.path, type: 'file' } });
        }
    }
    const lockOwner = (name: string) => name.slice(0, -LOCK_SUFFIX.length);
    const locks = await probe.list(
        probe.join(layout.codexDir, THREAD_WRITER_LOCKS_DIR),
        name => name.endsWith(LOCK_SUFFIX) && ids.has(lockOwner(name))
    );
    for (const entry of locks) {
        if (entry.type === 'file') {
            targets.push({ threadId: lockOwner(entry.name), target: { path: entry.path, type: 'file' } });
        }
    }
    const visualizationsDir = probe.join(layout.codexDir, VISUALIZATIONS_DIR);
    const emptied = new Set<string>();
    for (const entry of await probe.listNested(visualizationsDir, VISUALIZATION_DEPTH)) {
        const threadId = entry.rel.split('/').pop() ?? '';
        if (entry.type !== 'dir' || !ids.has(threadId)) continue;
        targets.push({ threadId, target: { path: entry.path, type: 'dir' } });
        ancestorsOf(entry.rel).forEach(rel => emptied.add(rel));
    }

    const left = await probe.removeReporting(targets.map(item => item.target));
    targets.forEach((item, i) => {
        if (left[i].length > 0) {
            console.error(`Failed to remove ${item.target.path} (${JSON.stringify(env)})`);
            result.failedThreads.add(item.threadId);
            result.failedPaths.push(...left[i]);
        }
    });
    const dirs = [...emptied].sort((a, b) => b.length - a.length);
    await probe.remove(
        dirs.map(rel => ({ path: probe.join(visualizationsDir, ...rel.split('/')), type: 'empty-dir' as const }))
    );
}

/**
 * スレッド ID の集合を削除する。集合の外のスレッドから参照されているものは消さず、失敗として報告する。
 * 次の順に消し、ある段階が失敗したら、それより後の段階へ進まない（残った行とファイルからやり直せるようにするため）。
 * 1. thread_history_1 の行（スレッド ID とロールアウト ID）
 * 2. sessions と archived_sessions のセッションファイル（消せなかったスレッドは以降の対象から外す）
 * 3. session_index.jsonl の該当行
 * 4. logs_2、queue_1、memories_1、memories_v2_1、goals_1 の行、最後に state_5 の行
 * 5. history.jsonl の該当行、shell_snapshots、visualizations、thread-writer-locks
 * layout.dbDirs が空の環境では DB の段階を飛ばす。sqlite/codex.db と .codex-global-state.json には触れない。
 */
export async function deleteCodexThreads(
    context: CodexCleanupContext,
    layout: ThreadLayout,
    requested: ReadonlySet<string>
): Promise<ThreadDeleteResult> {
    const { probe, fs, env, sqlite } = context;
    const result: ThreadDeleteResult = { failedThreads: new Set(), failedPaths: [], removedFiles: new Set() };
    if (requested.size === 0) return result;
    const fail = (ids: Iterable<string>) => {
        for (const id of ids) result.failedThreads.add(id);
    };
    const failDatabases = (failures: readonly DbDeleteFailure[], ids: Iterable<string>) => {
        for (const { path, error } of failures) {
            console.error(`Failed to delete the Codex thread rows in ${path}:`, error);
            result.failedPaths.push(path);
        }
        fail(ids);
    };

    const refused = findRefusedThreads(requested, await readThreadReferences(context, layout));
    for (const id of refused) {
        const files = layout.byThread.get(id)?.map(file => file.path) ?? [];
        result.failedPaths.push(...(files.length > 0 ? files : [`${layout.codexDir} (${id})`]));
    }
    fail(refused);
    const targets = [...requested].filter(id => !refused.has(id));
    if (targets.length === 0) return result;

    const rolloutFiles = targets.flatMap(id => layout.byThread.get(id) ?? []);
    const historyIds = new Set([...targets, ...rolloutFiles.map(file => file.rolloutId)]);
    const historyFailures = await deleteThreadRows(sqlite, layout.dbDirs, THREAD_HISTORY_DELETES, [...historyIds]);
    if (historyFailures.length > 0) {
        failDatabases(historyFailures, targets);
        return result;
    }

    const left = await probe.removeReporting(rolloutFiles.map(file => ({ path: file.path, type: 'file' as const })));
    const remaining = new Set(targets);
    rolloutFiles.forEach((file, i) => {
        if (left[i].length > 0) {
            console.error(`Failed to remove ${file.path} (${JSON.stringify(env)})`);
            result.failedPaths.push(...left[i]);
            result.failedThreads.add(file.threadId);
            remaining.delete(file.threadId);
        } else {
            result.removedFiles.add(file.path);
        }
    });
    if (remaining.size === 0) return result;

    if (!(await removeJsonlLines(fs, SESSION_INDEX_REL, 'id', remaining))) {
        result.failedPaths.push(probe.join(layout.codexDir, 'session_index.jsonl'));
        fail(remaining);
        return result;
    }

    const ids = [...remaining];
    const dataFailures = await deleteThreadRows(sqlite, layout.dbDirs, THREAD_DATA_DELETES, ids);
    if (dataFailures.length > 0) {
        failDatabases(dataFailures, ids);
        return result;
    }
    const stateFailures = await deleteThreadRows(sqlite, layout.dbDirs, THREAD_STATE_DELETES, ids);
    if (stateFailures.length > 0) {
        failDatabases(stateFailures, ids);
        return result;
    }

    await removeThreadLeftovers(context, layout, remaining, result);
    return result;
}
