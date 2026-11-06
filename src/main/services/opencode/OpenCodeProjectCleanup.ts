import { createHash } from 'crypto';
import { OPENCODE_DATABASE_REL } from '../../../shared/agents/opencode/constants';
import type { AgentEnvironment, CleanupChildBadge } from '../../../shared/agents/types';
import type { CleanupBlock, CleanupHandler, HandledChild } from '../common/cleanup/handledCleanup';
import { createCleanupProbe, type CleanupProbe } from '../common/cleanup/CleanupProbe';
import { homePath } from '../common/cleanup/resolvedCleanup';
import { isSafePathSegment } from '../common/fs/archiveEntryPath';
import { createSqliteStore } from '../common/sqlite/createSqliteStore';
import { sqliteBlockedNotice } from '../common/sqlite/sqliteNotices';
import {
    inBatches,
    inPlaceholders,
    readTableColumns,
    type SqlReader,
    type SqlRow,
    type SqlStatement,
    type SqliteStore,
} from '../common/sqlite/sqliteStore';
import type { WslDetector } from '../common/wsl/WslDetector';
import {
    displayPath,
    indexProjectPaths,
    planPathRemoval,
    snapshotHashInputs,
    snapshotPathForms,
    type ArtifactRow,
    type DirectoryRow,
    type PathRemovalPlan,
    type ProjectDbRows,
} from './openCodeProjectPaths';

const SNAPSHOT_REL = '.local/share/opencode/snapshot';
const SHELL_REL = '.local/share/opencode/shell';
const ARTIFACTS_REL = '.local/share/opencode/artifacts';
// kv のアーティファクトの行のキーの接頭辞。続く部分が artifacts 配下のフォルダー名になる。
const ARTIFACT_KEY_PREFIX = 'artifact:item:';
// 読み取りで列を調べるテーブル。
const READ_TABLES = ['project', 'session_v2', 'kv', 'permission', 'worktree', 'project_directory'];
// 削除で列を調べるテーブル。
const DELETE_TABLES = ['job', 'blob_ref', 'blob', 'event_sequence'];

type TableColumns = ReadonlyMap<string, ReadonlySet<string>>;

/** テーブルが存在し、指定の列をすべて持つか。 */
function hasColumns(columnsOf: TableColumns, table: string, columns: readonly string[]): boolean {
    const names = columnsOf.get(table);
    return names !== undefined && columns.every(column => names.has(column));
}

/** 文字列の値はそのまま、それ以外は空文字列にする。 */
function textOf(value: unknown): string {
    return typeof value === 'string' ? value : '';
}

/** worktree または project_directory の行を読む文。テーブルか列が無ければ null。 */
function directoryQuery(columnsOf: TableColumns, table: 'worktree' | 'project_directory'): SqlStatement | null {
    if (!hasColumns(columnsOf, table, ['project_id', 'directory'])) return null;
    const strategy = hasColumns(columnsOf, table, ['strategy']) ? 'strategy' : 'NULL AS strategy';
    const timeCreated = hasColumns(columnsOf, table, ['time_created']) ? 'time_created' : '0 AS time_created';
    return { sql: `SELECT project_id, directory, ${strategy}, ${timeCreated} FROM ${table}` };
}

/** worktree または project_directory の行を変換する。 */
function toDirectoryRow(row: SqlRow): DirectoryRow {
    return {
        projectId: textOf(row.project_id),
        directory: textOf(row.directory),
        strategy: typeof row.strategy === 'string' ? row.strategy : null,
        timeCreated: typeof row.time_created === 'number' ? row.time_created : 0,
    };
}

/** kv の 1 行をアーティファクトとして読む。アーティファクトの行でないもの、値を読めないもの、ID を使えないものは null。 */
function parseArtifact(key: string, value: unknown): ArtifactRow | null {
    if (!key.startsWith(ARTIFACT_KEY_PREFIX) || typeof value !== 'string') return null;
    const id = key.slice(ARTIFACT_KEY_PREFIX.length);
    if (!isSafePathSegment(id)) return null;
    let parsed: unknown;
    try {
        parsed = JSON.parse(value);
    } catch {
        return null;
    }
    const { directory, projectID } = (parsed ?? {}) as { directory?: unknown; projectID?: unknown };
    if (typeof directory !== 'string' || directory === '' || typeof projectID !== 'string') return null;
    return { key, id, directory, projectId: projectID };
}

/** パスの分類に使う行を読む。project と session_v2 は必須で、無ければ例外を投げる。それ以外は存在するものだけ読む。 */
async function readRows(reader: SqlReader): Promise<ProjectDbRows> {
    const columnsOf = await readTableColumns(reader, READ_TABLES);
    if (
        !hasColumns(columnsOf, 'project', ['id', 'worktree']) ||
        !hasColumns(columnsOf, 'session_v2', ['id', 'project_id', 'parent_id', 'directory', 'path'])
    ) {
        throw new Error('The OpenCode database has no project or session_v2 table with the expected columns');
    }
    const optional: Record<string, SqlStatement | null> = {
        artifacts: hasColumns(columnsOf, 'kv', ['key', 'value']) ? { sql: 'SELECT key, value FROM kv' } : null,
        approvals: hasColumns(columnsOf, 'permission', ['project_id'])
            ? { sql: 'SELECT project_id, COUNT(*) AS total FROM permission GROUP BY project_id' }
            : null,
        worktrees: directoryQuery(columnsOf, 'worktree'),
        projectDirectories: directoryQuery(columnsOf, 'project_directory'),
    };
    const names = Object.keys(optional).filter(name => optional[name] !== null);
    const results = await reader.queryAll([
        { sql: 'SELECT id, worktree FROM project' },
        { sql: 'SELECT id, project_id, parent_id, directory, path FROM session_v2' },
        ...names.map(name => optional[name] as SqlStatement),
    ]);
    const [projects, sessions] = results;
    const rowsOf = (name: string) => results[2 + names.indexOf(name)] ?? [];
    return {
        projects: projects.map(row => ({ id: textOf(row.id), worktree: textOf(row.worktree) })),
        sessions: sessions.map(row => ({
            id: textOf(row.id),
            projectId: textOf(row.project_id),
            parentId: typeof row.parent_id === 'string' ? row.parent_id : null,
            directory: textOf(row.directory),
            path: typeof row.path === 'string' ? row.path : null,
        })),
        worktrees: names.includes('worktrees') ? rowsOf('worktrees').map(toDirectoryRow) : [],
        projectDirectories: names.includes('projectDirectories')
            ? rowsOf('projectDirectories').map(toDirectoryRow)
            : [],
        artifacts: names.includes('artifacts')
            ? rowsOf('artifacts').flatMap(row => parseArtifact(textOf(row.key), row.value) ?? [])
            : [],
        approvalCounts: new Map(
            names.includes('approvals')
                ? rowsOf('approvals').map(row => [textOf(row.project_id), Number(row.total)])
                : []
        ),
    };
}

/** パスのセッションと依存行を消す文を作る。job と blob と event_sequence はカスケードで消えないので先に消す。 */
async function sessionStatements(
    reader: SqlReader,
    columnsOf: TableColumns,
    sessionIds: readonly string[]
): Promise<SqlStatement[]> {
    const statements: SqlStatement[] = [];
    const hasJob = hasColumns(columnsOf, 'job', ['session_id', 'child_session_id']);
    const hasBlobRef = hasColumns(columnsOf, 'blob_ref', ['session_id', 'hash']);
    const hasBlob = hasBlobRef && hasColumns(columnsOf, 'blob', ['hash']);
    const hasEvents = hasColumns(columnsOf, 'event_sequence', ['aggregate_id']);
    const batches = inBatches(sessionIds);
    const hashes = hasBlob
        ? await reader.queryAll(
              batches.map(batch => ({
                  sql: `SELECT DISTINCT hash FROM blob_ref WHERE session_id IN (${inPlaceholders(batch)})`,
                  params: batch,
              }))
          )
        : [];
    batches.forEach((batch, index) => {
        const list = inPlaceholders(batch);
        if (hasJob) {
            statements.push({
                sql: `DELETE FROM job WHERE session_id IN (${list}) OR child_session_id IN (${list})`,
                params: [...batch, ...batch],
            });
        }
        if (hasBlobRef) {
            statements.push({ sql: `DELETE FROM blob_ref WHERE session_id IN (${list})`, params: batch });
        }
        for (const hashBatch of inBatches((hashes[index] ?? []).map(row => textOf(row.hash)))) {
            statements.push({
                sql: `DELETE FROM blob WHERE hash IN (${inPlaceholders(hashBatch)}) AND NOT EXISTS (SELECT 1 FROM blob_ref WHERE blob_ref.hash = blob.hash)`,
                params: hashBatch,
            });
        }
        if (hasEvents) {
            statements.push({ sql: `DELETE FROM event_sequence WHERE aggregate_id IN (${list})`, params: batch });
        }
        statements.push({ sql: `DELETE FROM session_v2 WHERE id IN (${list})`, params: batch });
    });
    return statements;
}

/** 計画どおりに行を消し、project の行を消すか付け替える文を作る。 */
async function planStatements(reader: SqlReader, plan: PathRemovalPlan): Promise<SqlStatement[]> {
    const columnsOf = await readTableColumns(reader, DELETE_TABLES);
    const statements = await sessionStatements(reader, columnsOf, plan.sessionIds);
    const deleteDirectories = (table: 'worktree' | 'project_directory', rows: readonly DirectoryRow[]) => {
        for (const row of rows) {
            statements.push({
                sql: `DELETE FROM ${table} WHERE project_id=? AND directory=?`,
                params: [row.projectId, row.directory],
            });
        }
    };
    deleteDirectories('worktree', plan.worktrees);
    deleteDirectories('project_directory', plan.projectDirectories);
    for (const artifact of plan.artifacts) {
        statements.push({ sql: 'DELETE FROM kv WHERE key=?', params: [artifact.key] });
    }
    const hasEvents = hasColumns(columnsOf, 'event_sequence', ['aggregate_id']);
    for (const action of plan.projects) {
        if (action.kind === 'repoint') {
            statements.push({ sql: 'UPDATE project SET worktree=? WHERE id=?', params: [action.worktree, action.id] });
        } else if (action.kind === 'remove') {
            if (hasEvents) {
                statements.push({ sql: 'DELETE FROM event_sequence WHERE aggregate_id=?', params: [action.id] });
            }
            statements.push({ sql: 'DELETE FROM project WHERE id=?', params: [action.id] });
        }
    }
    return statements;
}

/**
 * 1 つのパスを 1 トランザクションで消し、消した内容を返す。全行を読み直して分類する。
 * パスが既に無ければ何も変えず null を返す。失敗すると元に戻して例外を投げる（ロックの失敗を含む）。
 */
function removePath(
    store: SqliteStore,
    dbPath: string,
    key: string,
    os: CleanupProbe['os']
): Promise<PathRemovalPlan | null> {
    return store.write(
        dbPath,
        async reader => {
            const plan = planPathRemoval(indexProjectPaths(await readRows(reader), os), key);
            return { statements: plan ? await planStatements(reader, plan) : [], result: plan };
        },
        { lock: 'before-plan' }
    );
}

/** 計画に対応するフォルダーのホーム相対パスを返す。project の行を消す ID は snapshot と shell を丸ごと、それ以外はパスのスナップショットだけ。 */
async function folderTargets(probe: CleanupProbe, plan: PathRemovalPlan): Promise<string[]> {
    const forms = snapshotPathForms(plan.spellings, probe.os);
    const reals = await probe.realPaths(forms);
    const realOf = new Map(forms.map((form, index) => [form, reals[index]]));
    const hashes = snapshotHashInputs(plan.spellings, probe.os, form => realOf.get(form) ?? null).map(input =>
        createHash('sha1').update(input).digest('hex')
    );
    const targets = plan.artifacts.map(artifact => `${ARTIFACTS_REL}/${artifact.id}`);
    for (const action of plan.projects) {
        if (!isSafePathSegment(action.id)) continue;
        if (action.kind === 'remove') {
            targets.push(`${SNAPSHOT_REL}/${action.id}`, `${SHELL_REL}/${action.id}`);
        } else {
            for (const hash of hashes) targets.push(`${SNAPSHOT_REL}/${action.id}/${hash}`);
        }
    }
    return targets;
}

/**
 * ワークスペースのパスごとに、セッションと依存データ、パスの記録、スナップショットを消すクリーンアップ候補。
 * WSL は distro の sqlite3 で扱い、データベースがあるのに使えなければ、行と注記だけを出して削除しない。
 * 一覧は元のファイルを変更せずに読み、削除は実ファイルを開いて、パスごとに 1 トランザクションで行う。ロックの解放を待たないので、
 * 他がロックを保持していれば待たずに失敗し、そのパスを消せなかったものとして返す。
 * 作業ツリーのフォルダー（worktree 配下を含む）には触れない。
 */
export class OpenCodeProjectCleanup implements CleanupHandler {
    constructor(private readonly detector: WslDetector) {}

    /** データベースの場所と読み書きの手段。データベースが無ければ null。 */
    private async database(
        env: AgentEnvironment
    ): Promise<{ probe: CleanupProbe; store: SqliteStore; dbPath: string } | null> {
        const probe = createCleanupProbe(env, this.detector);
        const store = createSqliteStore(env, this.detector);
        const dbPath = await homePath(probe, OPENCODE_DATABASE_REL);
        return (await store.existingDatabaseFiles([dbPath])).has(dbPath) ? { probe, store, dbPath } : null;
    }

    async blocked(env: AgentEnvironment): Promise<CleanupBlock | null> {
        const block = sqliteBlockedNotice(await createSqliteStore(env, this.detector).availability());
        if (!block) return null;
        return (await this.database(env)) ? block : null;
    }

    async listChildren(env: AgentEnvironment): Promise<HandledChild[]> {
        const database = await this.database(env);
        if (!database) return [];
        const { probe, store, dbPath } = database;
        const rows = await store.read(dbPath, readRows);
        const index = indexProjectPaths(rows, probe.os);
        const children: HandledChild[] = [];
        for (const key of index.entries.keys()) {
            const plan = planPathRemoval(index, key);
            if (!plan) continue;
            const approvals = plan.projects.reduce(
                (sum, action) => sum + (action.kind === 'remove' ? (rows.approvalCounts.get(action.id) ?? 0) : 0),
                0
            );
            const badges: CleanupChildBadge[] = [{ key: 'sessions', count: plan.sessionIds.length }];
            if (approvals > 0) badges.push({ key: 'savedApprovals', count: approvals });
            children.push({
                name: key,
                displayName: displayPath(plan.spellings[0], probe.os),
                badges,
                size: 0,
                fileCount: 1,
                sizeUnknown: true,
            });
        }
        return children.sort((a, b) => ((a.displayName ?? '') < (b.displayName ?? '') ? -1 : 1));
    }

    /**
     * 選択されたパス（名前は比較キー）を順に消し、消せなかった名前を返す。一覧に無い名前は消せなかったものとして返す。
     * データベースの行を消した後でフォルダーが残った場合も、消せなかったものとして返す。
     */
    async remove(env: AgentEnvironment, names: 'all' | string[]): Promise<string[]> {
        const nothingToRemove = names === 'all' ? [] : [...names];
        if (await this.blocked(env)) throw new Error('sqlite3 is not usable in this distro');
        const database = await this.database(env);
        if (!database) return nothingToRemove;
        const { probe, store, dbPath } = database;
        const failed: string[] = [];
        const index = indexProjectPaths(await store.read(dbPath, readRows), probe.os);
        const listed = [...index.entries.keys()].filter(key => planPathRemoval(index, key) !== null);
        const keys = names === 'all' ? listed : names.filter(name => listed.includes(name));
        if (names !== 'all') failed.push(...names.filter(name => !listed.includes(name)));
        for (const key of keys) {
            try {
                const plan = await removePath(store, dbPath, key, probe.os);
                if (plan && !(await this.removeFolders(probe, plan))) failed.push(key);
            } catch (error) {
                console.error(`Failed to remove the OpenCode project ${key}:`, error);
                failed.push(key);
            }
        }
        return failed;
    }

    /** 計画に対応するフォルダーを消し、すべて消せた（もともと無かった場合を含む）かを返す。 */
    private async removeFolders(probe: CleanupProbe, plan: PathRemovalPlan): Promise<boolean> {
        const targets = await Promise.all(
            (await folderTargets(probe, plan)).map(async rel => ({
                path: await homePath(probe, rel),
                type: 'dir' as const,
            }))
        );
        const left = (await probe.removeReporting(targets)).flat();
        if (left.length > 0) console.error(`Failed to remove folders of the OpenCode project ${plan.key}:`, left);
        return left.length === 0;
    }
}
