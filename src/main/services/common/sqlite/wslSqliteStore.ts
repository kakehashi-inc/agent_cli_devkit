import { posix } from 'path';
import type { WslDetector } from '../wsl/WslDetector';
import {
    buildProbeScript,
    buildReadScript,
    buildRegularFilesScript,
    buildStaleCopiesScript,
    buildTransactionScript,
    parseProbeOutput,
    parseReadOutput,
    parseTransactionOutput,
    type SqliteCliProbe,
} from './wslSqliteScripts';
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

// 1 回のスクリプトで読むデータベースの数。
const READ_BATCH_SIZE = 64;
// distro の事実として sqlite3 を調べた結果を保持する名前。
const SQLITE_FACT = 'sqlite3';

/**
 * distro の sqlite3 コマンドによるデータベースの読み書き。スクリプトは標準入力で渡し、データベースの内容のコピーは distro の中に
 * だけ作る。読み取りと書き込みは別のプロセスになるので、書き込みのロックの中で計画の読み取りの行数を確かめる。
 */
export class WslSqliteStore implements SqliteStore {
    constructor(
        private readonly distro: string,
        private readonly detector: WslDetector
    ) {}

    /** sqlite3 を distro ごとに一度だけ調べる。結果は detector の invalidate まで保持される。 */
    private probe(): Promise<SqliteCliProbe> {
        return this.detector.factOfDistro(this.distro, SQLITE_FACT, async () =>
            parseProbeOutput(await this.detector.runMarkedScriptInDistro(this.distro, buildProbeScript()))
        );
    }

    async availability(): Promise<SqliteAvailability> {
        try {
            const probe = await this.probe();
            if (probe.kind === 'found') return { kind: 'available' };
            return probe.kind === 'too-old' ? { kind: 'too-old', version: probe.version } : { kind: 'missing' };
        } catch (error) {
            console.error(`Failed to check sqlite3 (${this.distro}):`, error);
            return { kind: 'check-failed' };
        }
    }

    /** sqlite3 の場所。使えなければ例外を投げる。 */
    private async binary(): Promise<string> {
        const probe = await this.probe();
        if (probe.kind !== 'found') throw new SqliteCommandError(`sqlite3 is not usable in ${this.distro}`);
        return probe.binary;
    }

    join(dir: string, name: string): string {
        return posix.join(dir, name);
    }

    async existingDatabaseFiles(paths: readonly string[]): Promise<Set<string>> {
        if (paths.length === 0) return new Set();
        const out = await this.detector.runMarkedScriptInDistro(this.distro, buildRegularFilesScript(paths));
        const lines = out.toString('utf8').split('\n');
        if (lines[paths.length] !== 'END') throw new Error('Unexpected output from the database file check');
        return new Set(paths.filter((_, index) => lines[index] === 'Y'));
    }

    /** 1 つのスクリプトで複数のデータベースを読む。 */
    private async runRead(paths: readonly string[], statements: readonly SqlStatement[]) {
        const script = buildReadScript(await this.binary(), paths, statements);
        const out = await this.detector.runMarkedScriptInDistro(this.distro, script);
        return parseReadOutput(out, paths.length, statements.length);
    }

    /** データベース 1 つに対する読み取りの手段。呼び出しごとに 1 つのスクリプトを実行する。 */
    private readerOf(path: string): SqlReader {
        return {
            queryAll: async statements => {
                if (statements.length === 0) return [];
                const [result] = await this.runRead([path], statements);
                if (!result.ok) throw new SqliteCommandError(result.error);
                return result.rows;
            },
        };
    }

    async read<T>(path: string, work: (reader: SqlReader) => Promise<T>): Promise<T> {
        return work(this.readerOf(path));
    }

    async readEach(paths: readonly string[], statements: readonly SqlStatement[]): Promise<(SqlRow[][] | null)[]> {
        const results: (SqlRow[][] | null)[] = [];
        for (let at = 0; at < paths.length; at += READ_BATCH_SIZE) {
            const batch = paths.slice(at, at + READ_BATCH_SIZE);
            try {
                const reads = await this.runRead(batch, statements);
                reads.forEach((read, index) => {
                    if (!read.ok)
                        console.error(`Failed to read the database ${posix.basename(batch[index])}: ${read.error}`);
                    results.push(read.ok ? read.rows : null);
                });
            } catch (error) {
                console.error(`Failed to read databases (${this.distro}):`, error);
                results.push(...batch.map(() => null));
            }
        }
        return results;
    }

    /**
     * plan が読んだ文を覚えておき、書き込みのスクリプトのロックの中で同じ行数であることを確かめる。
     * 確かめられなければ何も確定せず例外を投げる。
     */
    async write<T>(
        path: string,
        plan: (reader: SqlReader) => Promise<SqliteWritePlan<T>>,
        options: SqliteWriteOptions
    ): Promise<T> {
        const binary = await this.binary();
        const guards: { statement: SqlStatement; count: number }[] = [];
        const direct = this.readerOf(path);
        const { statements, result } = await plan({
            queryAll: async queries => {
                const rows = await direct.queryAll(queries);
                queries.forEach((statement, index) => guards.push({ statement, count: rows[index].length }));
                return rows;
            },
        });
        if (statements.length === 0) return result;
        const script = buildTransactionScript(binary, path, statements, guards, options.busyTimeoutMs);
        const outcome = parseTransactionOutput(await this.detector.runMarkedScriptInDistro(this.distro, script));
        if (!outcome.ok) throw new SqliteCommandError(outcome.error);
        return result;
    }

    async removeStaleCopies(): Promise<void> {
        try {
            await this.detector.runMarkedScriptInDistro(this.distro, buildStaleCopiesScript());
        } catch (error) {
            console.error(`Failed to remove stale database copies (${this.distro}):`, error);
        }
    }
}
