import {
    inBatches,
    inPlaceholders,
    readTableColumns,
    type SqlStatement,
    type SqliteStore,
} from '../common/sqlite/sqliteStore';

// CLI の DB のファイル名（~/.codex と ~/.codex/sqlite に同じ名前で置かれる）。
const STATE_DB = 'state_5.sqlite';
const THREAD_HISTORY_DB = 'thread_history_1.sqlite';
const LOGS_DB = 'logs_2.sqlite';
const QUEUE_DB = 'queue_1.sqlite';
const MEMORIES_DB = 'memories_1.sqlite';
const MEMORIES_V2_DB = 'memories_v2_1.sqlite';
const GOALS_DB = 'goals_1.sqlite';
// 秒で保存された日時とミリ秒で保存された日時の境（2020-01-01 のミリ秒）。
const MILLIS_THRESHOLD = 1_577_836_800_000;
const JOB_KIND_MEMORY_STAGE1 = 'memory_stage1';
const THREADS_TABLE = 'threads';

/** ID で行を消す表 1 つ。ids は ID と照合する列で、columns のうち存在する列ごとに消す。 */
interface TableDelete {
    table: string;
    columns: string[];
    // 追加の条件（列と値）。列が無ければこの表を飛ばす。
    where?: { column: string; value: string };
}

/** DB 1 つと、その DB から行を消す表（消す順）。 */
interface DbDeleteSpec {
    file: string;
    tables: TableDelete[];
}

const byThreadId = (table: string): TableDelete => ({ table, columns: ['thread_id'] });
const memoryTables: TableDelete[] = [
    byThreadId('stage1_outputs'),
    { table: 'jobs', columns: ['job_key'], where: { column: 'kind', value: JOB_KIND_MEMORY_STAGE1 } },
];

/** thread_history_1 の行（ロールアウト ID でも記録されている）。 */
export const THREAD_HISTORY_DELETES: DbDeleteSpec[] = [
    {
        file: THREAD_HISTORY_DB,
        tables: [
            byThreadId('thread_items'),
            byThreadId('thread_realtime_items'),
            byThreadId('thread_turns'),
            byThreadId('thread_history_projection_state'),
        ],
    },
];

/** threads の行の前に消す、スレッド単位の行。 */
export const THREAD_DATA_DELETES: DbDeleteSpec[] = [
    { file: LOGS_DB, tables: [byThreadId('logs')] },
    { file: QUEUE_DB, tables: [byThreadId('queued_items')] },
    { file: MEMORIES_DB, tables: memoryTables },
    { file: MEMORIES_V2_DB, tables: memoryTables },
    { file: GOALS_DB, tables: [byThreadId('thread_goals')] },
];

/** state_5 の行。threads の行を最後に消す（子の表の一部は外部キーの CASCADE で消える）。 */
export const THREAD_STATE_DELETES: DbDeleteSpec[] = [
    {
        file: STATE_DB,
        tables: [
            byThreadId('thread_dynamic_tools'),
            { table: 'thread_spawn_edges', columns: ['parent_thread_id', 'child_thread_id'] },
            byThreadId('thread_read_receipts'),
            { table: THREADS_TABLE, columns: ['id'] },
        ],
    },
];

/** threads の 1 行のうち、この機能が使う値。 */
export interface StateThreadRow {
    id: string;
    cwd: string;
    // 最終更新日時（エポックミリ秒。不明なら 0）
    updatedMs: number;
    attachedParentId: string | null;
}

/** DB 1 つの threads の読み取り結果。 */
export type StateThreadsRead =
    | { kind: 'absent' }
    | { kind: 'rows'; rows: StateThreadRow[] }
    // threads に id か cwd が無い
    | { kind: 'unusable' };

/** DB ごとの行の削除の失敗。 */
export interface DbDeleteFailure {
    path: string;
    error: unknown;
}

/** CLI の DB のファイル名の一覧。 */
export const CODEX_DB_FILES: readonly string[] = [
    STATE_DB,
    THREAD_HISTORY_DB,
    LOGS_DB,
    QUEUE_DB,
    MEMORIES_DB,
    MEMORIES_V2_DB,
    GOALS_DB,
];

/** 秒かミリ秒で保存された日時をエポックミリ秒にする。 */
function toEpochMs(value: unknown): number {
    const number = typeof value === 'bigint' ? Number(value) : typeof value === 'number' ? value : 0;
    if (!Number.isFinite(number) || number <= 0) return 0;
    return number < MILLIS_THRESHOLD ? number * 1000 : number;
}

/**
 * <dbDir>/state_5.sqlite の threads を読む。-wal にしかない行も読め、元のファイルは変更しない。
 * 通常ファイルが無ければ absent。開けない・読めない場合は例外を投げる。
 */
export async function readStateThreads(store: SqliteStore, dbDir: string): Promise<StateThreadsRead> {
    const source = store.join(dbDir, STATE_DB);
    if (!(await store.existingDatabaseFiles([source])).has(source)) return { kind: 'absent' };
    return store.read(source, async reader => {
        const columns = (await readTableColumns(reader, [THREADS_TABLE])).get(THREADS_TABLE) as Set<string>;
        if (columns.size === 0) return { kind: 'absent' };
        if (!columns.has('id') || !columns.has('cwd')) return { kind: 'unusable' };
        const timeColumn = ['updated_at_ms', 'updated_at'].find(column => columns.has(column));
        const parentColumn = columns.has('attached_thread_parent_id') ? 'attached_thread_parent_id' : null;
        const [selected] = await reader.queryAll([
            {
                sql: `SELECT id, cwd, ${timeColumn ?? '0'} AS updated, ${parentColumn ?? 'NULL'} AS parent FROM ${THREADS_TABLE}`,
            },
        ]);
        const rows: StateThreadRow[] = [];
        for (const row of selected) {
            if (typeof row.id !== 'string' || typeof row.cwd !== 'string') continue;
            rows.push({
                id: row.id,
                cwd: row.cwd,
                updatedMs: toEpochMs(row.updated),
                attachedParentId: typeof row.parent === 'string' && row.parent.length > 0 ? row.parent : null,
            });
        }
        return { kind: 'rows', rows };
    });
}

/** 存在する表と列について、ids の行を消す文を作る。 */
function deleteStatements(
    tables: readonly TableDelete[],
    columnsOf: ReadonlyMap<string, ReadonlySet<string>>,
    ids: readonly string[]
): SqlStatement[] {
    const statements: SqlStatement[] = [];
    for (const { table, columns, where } of tables) {
        const existing = columnsOf.get(table) as ReadonlySet<string>;
        if (where && !existing.has(where.column)) continue;
        for (const column of columns) {
            if (!existing.has(column)) continue;
            const condition = where ? `"${where.column}" = ? AND ` : '';
            for (const batch of inBatches(ids)) {
                statements.push({
                    sql: `DELETE FROM "${table}" WHERE ${condition}"${column}" IN (${inPlaceholders(batch)})`,
                    params: [...(where ? [where.value] : []), ...batch],
                });
            }
        }
    }
    return statements;
}

/**
 * 各 DB フォルダの各 DB から ids の行を、DB ごとのトランザクションで消す。外部キーを有効にして実ファイルを開くので、
 * ほかの接続が書き込み中なら待たずに失敗する。表と列のうち存在するものだけを扱い、通常ファイルでない DB は飛ばし、
 * 消す表が無い DB はロックを取らない。失敗した DB を返す（失敗しても残りの DB は処理する）。
 */
export async function deleteThreadRows(
    store: SqliteStore,
    dbDirs: readonly string[],
    specs: readonly DbDeleteSpec[],
    ids: readonly string[]
): Promise<DbDeleteFailure[]> {
    const failures: DbDeleteFailure[] = [];
    if (ids.length === 0) return failures;
    const targets = dbDirs.flatMap(dbDir =>
        specs.map(({ file, tables }) => ({ path: store.join(dbDir, file), tables }))
    );
    let existing: Set<string>;
    try {
        existing = await store.existingDatabaseFiles(targets.map(target => target.path));
    } catch (error) {
        return targets.map(({ path }) => ({ path, error }));
    }
    for (const { path, tables } of targets) {
        if (!existing.has(path)) continue;
        try {
            await store.write(
                path,
                async reader => {
                    const columnsOf = await readTableColumns(
                        reader,
                        tables.map(({ table }) => table)
                    );
                    return { statements: deleteStatements(tables, columnsOf, ids), result: undefined };
                },
                { lock: 'after-plan' }
            );
        } catch (error) {
            failures.push({ path, error });
        }
    }
    return failures;
}
