import { lstat } from 'fs/promises';
import { basename, join } from 'path';
import { pathToFileURL } from 'url';
import type { DatabaseSync, SQLInputValue } from 'node:sqlite';
import { removeStaleDbCopies, withDbCopy } from '../cleanup/dbTempCopy';
import {
    SqliteCommandError,
    type SqlReader,
    type SqlRow,
    type SqlStatement,
    type SqliteAvailability,
    type SqliteStore,
    type SqliteWriteOptions,
    type SqliteWritePlan,
} from './sqliteStore';

type SqliteModule = typeof import('node:sqlite');

/** node:sqlite を必要になったときに読み込む。 */
function loadSqlite(): Promise<SqliteModule> {
    return import('node:sqlite');
}

/** 通常のファイルか（シンボリックリンクとディレクトリは false）。 */
async function isRegularFile(path: string): Promise<boolean> {
    try {
        return (await lstat(path)).isFile();
    } catch {
        return false;
    }
}

/** 文の値をバインドできる形にする。 */
function bindings(params: SqlStatement['params']): SQLInputValue[] {
    return [...(params ?? [])];
}

/** 整数は安全な範囲なら number にし、それ以外は bigint のまま返す。 */
function toRow(row: Record<string, unknown>): SqlRow {
    const converted: SqlRow = {};
    for (const [key, value] of Object.entries(row)) {
        converted[key] =
            typeof value === 'bigint' &&
            value >= BigInt(Number.MIN_SAFE_INTEGER) &&
            value <= BigInt(Number.MAX_SAFE_INTEGER)
                ? Number(value)
                : value;
    }
    return converted;
}

/** 開いたデータベースに対する読み取りの手段。整数は bigint で受け取って変換し、大きな値でも失敗しない。 */
function readerOf(db: DatabaseSync): SqlReader {
    return {
        queryAll: async (statements: readonly SqlStatement[]) =>
            statements.map(({ sql, params }) => {
                const statement = db.prepare(sql);
                statement.setReadBigInts(true);
                return statement.all(...bindings(params)).map(row => toRow(row as Record<string, unknown>));
            }),
    };
}

/** データベースを閉じる。閉じられなくても結果は変わらないので、ログだけを残す。 */
function closeQuietly(db: DatabaseSync, path: string): void {
    try {
        db.close();
    } catch (error) {
        console.error(`Failed to close the database ${basename(path)}:`, error);
    }
}

/**
 * node:sqlite によるデータベースの読み書き。node:sqlite は使うときに初めて読み込む。
 * 読み取りは -wal があれば .db と -wal の一時的なコピーを開き、無ければ読み取り専用かつ immutable で開く。
 * 書き込みは実ファイルを 1 つの接続で開くので、計画の読み取りと書き込みが同じ接続になる。
 */
export class NativeSqliteStore implements SqliteStore {
    async availability(): Promise<SqliteAvailability> {
        try {
            await loadSqlite();
            return { kind: 'available' };
        } catch (error) {
            console.error('node:sqlite is not available:', error);
            return { kind: 'runtime-missing' };
        }
    }

    join(dir: string, name: string): string {
        return join(dir, name);
    }

    async existingDatabaseFiles(paths: readonly string[]): Promise<Set<string>> {
        const flags = await Promise.all(paths.map(isRegularFile));
        return new Set(paths.filter((_, index) => flags[index]));
    }

    async read<T>(path: string, work: (reader: SqlReader) => Promise<T>): Promise<T> {
        const { DatabaseSync: Database } = await loadSqlite();
        const readOpened = async (db: DatabaseSync) => {
            try {
                return await work(readerOf(db));
            } finally {
                closeQuietly(db, path);
            }
        };
        if (await isRegularFile(`${path}-wal`)) {
            return withDbCopy(path, copy => readOpened(new Database(copy)));
        }
        return readOpened(new Database(`${pathToFileURL(path).href}?immutable=1`, { readOnly: true }));
    }

    async readEach(paths: readonly string[], statements: readonly SqlStatement[]): Promise<(SqlRow[][] | null)[]> {
        const results: (SqlRow[][] | null)[] = [];
        for (const path of paths) {
            try {
                results.push(await this.read(path, reader => reader.queryAll(statements)));
            } catch (error) {
                console.error(`Failed to read the database ${basename(path)}:`, error);
                results.push(null);
            }
        }
        return results;
    }

    async write<T>(
        path: string,
        plan: (reader: SqlReader) => Promise<SqliteWritePlan<T>>,
        options: SqliteWriteOptions
    ): Promise<T> {
        const { DatabaseSync: Database } = await loadSqlite();
        if (!(await isRegularFile(path))) throw new SqliteCommandError(`Not a regular file: ${path}`);
        const db = new Database(path, options.busyTimeoutMs ? { timeout: options.busyTimeoutMs } : {});
        let inTransaction = false;
        const begin = () => {
            db.exec('BEGIN IMMEDIATE');
            inTransaction = true;
        };
        try {
            db.exec('PRAGMA foreign_keys=ON');
            if (db.prepare('PRAGMA foreign_keys').get()?.foreign_keys !== 1) {
                throw new Error('Foreign keys could not be enabled');
            }
            if (options.lock === 'before-plan') begin();
            const { statements, result } = await plan(readerOf(db));
            if (statements.length === 0 && !inTransaction) return result;
            if (!inTransaction) begin();
            for (const { sql, params } of statements) db.prepare(sql).run(...bindings(params));
            db.exec('COMMIT');
            inTransaction = false;
            return result;
        } catch (error) {
            if (inTransaction) {
                try {
                    db.exec('ROLLBACK');
                } catch (rollbackError) {
                    console.error(`Failed to roll back the database ${basename(path)}:`, rollbackError);
                }
            }
            throw error;
        } finally {
            closeQuietly(db, path);
        }
    }

    async removeStaleCopies(): Promise<void> {
        await removeStaleDbCopies();
    }
}
