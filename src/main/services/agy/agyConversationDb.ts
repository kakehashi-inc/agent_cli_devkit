import {
    inBatches,
    inPlaceholders,
    isMissingModuleError,
    type SqlStatement,
    type SqliteStore,
} from '../common/sqlite/sqliteStore';

// 要約 DB を開くときに、ほかの接続のロックの解放を待つ時間。
const SUMMARY_BUSY_TIMEOUT_MS = 2000;
const SUMMARY_TABLE = 'conversation_summaries';
const SUMMARY_FTS_TABLE = 'conversations_fts';
const METADATA_QUERY: SqlStatement = {
    sql: `SELECT typeof(data) AS type, hex(data) AS data FROM trajectory_metadata_blob WHERE id = 'main'`,
};

/** 要約 DB の行の削除の結果。 */
export interface AgySummaryRemoval {
    // 消せた（消すものが無かった場合を含む）か
    removed: boolean;
    // sqlite3 に FTS5 が無いために conversations_fts の行を飛ばしたか
    ftsSkipped: boolean;
}

/**
 * 各会話 DB の trajectory_metadata_blob の main 行の data を読む。元のファイルは変更しない。
 * 読めない場合（壊れている、テーブルや行が無い、BLOB でないなど）は null。
 */
export async function readAgyConversationBlobs(
    store: SqliteStore,
    dbPaths: readonly string[]
): Promise<(Uint8Array | null)[]> {
    const reads = await store.readEach(dbPaths, [METADATA_QUERY]);
    return reads.map(read => {
        const row = read?.[0]?.[0];
        if (row?.type !== 'blob' || typeof row.data !== 'string') return null;
        return new Uint8Array(Buffer.from(row.data, 'hex'));
    });
}

/**
 * 要約 DB から会話 ID の行を消す。DB が無ければ作らずに何もせず、無いテーブルは飛ばす。
 * すべてのテーブルを 1 つのトランザクションで消し、失敗したら元に戻す。sqlite3 に FTS5 が無ければ conversations_fts を
 * 飛ばして ftsSkipped を返す。例外は投げない。
 */
export async function removeAgySummaryRows(
    store: SqliteStore,
    dbPath: string,
    ids: readonly string[]
): Promise<AgySummaryRemoval> {
    if (ids.length === 0) return { removed: true, ftsSkipped: false };
    try {
        if (!(await store.existingDatabaseFiles([dbPath])).has(dbPath)) return { removed: true, ftsSkipped: false };
        return await store.write(
            dbPath,
            async reader => {
                const [present] = await reader.queryAll([
                    {
                        sql: `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (?, ?)`,
                        params: [SUMMARY_TABLE, SUMMARY_FTS_TABLE],
                    },
                ]);
                const tables = present.map(row => String(row.name));
                let ftsSkipped = false;
                if (tables.includes(SUMMARY_FTS_TABLE)) {
                    try {
                        await reader.queryAll([{ sql: `SELECT 1 FROM ${SUMMARY_FTS_TABLE} LIMIT 0` }]);
                    } catch (error) {
                        if (!isMissingModuleError(error)) throw error;
                        ftsSkipped = true;
                    }
                }
                const statements = tables
                    .filter(table => !(ftsSkipped && table === SUMMARY_FTS_TABLE))
                    .flatMap(table =>
                        inBatches(ids).map(batch => ({
                            sql: `DELETE FROM ${table} WHERE conversation_id IN (${inPlaceholders(batch)})`,
                            params: batch,
                        }))
                    );
                return { statements, result: { removed: true, ftsSkipped } };
            },
            { lock: 'after-plan', busyTimeoutMs: SUMMARY_BUSY_TIMEOUT_MS }
        );
    } catch (error) {
        console.error('Failed to update the Agy conversation summaries:', error);
        return { removed: false, ftsSkipped: false };
    }
}
