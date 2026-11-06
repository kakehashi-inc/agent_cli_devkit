/** SQL の文に渡す値。 */
export type SqlValue = string | number | bigint | null;

/** SQL の文 1 つ。params は文の中の ? に順に対応する。 */
export interface SqlStatement {
    sql: string;
    params?: readonly SqlValue[];
}

/** 結果の 1 行。BLOB は SQL の hex() で文字列にして受け取る。2^53 を超える整数の精度は実装によって異なる。 */
export type SqlRow = Record<string, unknown>;

/**
 * データベースを扱えるか。
 * - runtime-missing: native で node:sqlite を読み込めない。
 * - missing: distro に sqlite3 コマンドが無い。
 * - too-old: distro の sqlite3 が古く、JSON の出力を使えない。
 * - check-failed: distro の sqlite3 を調べるスクリプトを実行できなかった。
 */
export type SqliteAvailability =
    | { kind: 'available' }
    | { kind: 'runtime-missing' }
    | { kind: 'missing' }
    | { kind: 'too-old'; version: string }
    | { kind: 'check-failed' };

/** 読み取りの手段。1 回の呼び出しの文を順に実行し、文ごとの行を返す。失敗すると例外を投げる。 */
export interface SqlReader {
    queryAll(statements: readonly SqlStatement[]): Promise<SqlRow[][]>;
}

/** トランザクションで実行する文と、write が返す値。文が空なら何も書き込まない。 */
export interface SqliteWritePlan<T> {
    statements: SqlStatement[];
    result: T;
}

export interface SqliteWriteOptions {
    /**
     * 計画の読み取りと書き込みのロックの順序。before-plan は、実装が 1 つの接続で読み書きできるならロックの中で読む。
     * after-plan はロックの前に読み、文が無ければロックを取らない。
     */
    lock: 'before-plan' | 'after-plan';
    // ほかの接続のロックの解放を待つ時間。指定しなければ待たずに失敗する。
    busyTimeoutMs?: number;
}

/**
 * 環境の中にあるデータベースの読み書き。パスは環境の中の絶対パス（native は OS のパス、WSL は distro の中のパス）。
 * 読み取りは元のデータを変更せず、-wal にしかない行も読める。
 * 書き込みは外部キーを有効にして BEGIN IMMEDIATE の 1 つのトランザクションで実行し、失敗すれば何も確定しない。
 */
export interface SqliteStore {
    availability(): Promise<SqliteAvailability>;
    /** 環境のパスの規則でファイル名を連結する。 */
    join(dir: string, name: string): string;
    /** paths のうち通常のファイル（リンクを含めない）を返す。調べられなければ例外を投げる。 */
    existingDatabaseFiles(paths: readonly string[]): Promise<Set<string>>;
    /** データベースを読み取り用に開き、work に読み取りの手段を渡して結果を返す。 */
    read<T>(path: string, work: (reader: SqlReader) => Promise<T>): Promise<T>;
    /** 各データベースで同じ文を実行し、データベースごとの文ごとの行を返す。読めなかったデータベースは null。 */
    readEach(paths: readonly string[], statements: readonly SqlStatement[]): Promise<(SqlRow[][] | null)[]>;
    /** plan の結果の文を 1 つのトランザクションで実行し、plan が返した値を返す。失敗すると例外を投げる。 */
    write<T>(
        path: string,
        plan: (reader: SqlReader) => Promise<SqliteWritePlan<T>>,
        options: SqliteWriteOptions
    ): Promise<T>;
    /** 読み取りの途中で終了したプロセスが残した一日より古いコピーを消す。例外を投げない。 */
    removeStaleCopies(): Promise<void>;
}

/** データベースの操作の失敗。message は SQLite のエラーの文を含む。 */
export class SqliteCommandError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SqliteCommandError';
    }
}

// 1 つの文の IN に並べる値の数。
const SQL_IN_BATCH_SIZE = 500;

/** 値を 1 つの文の IN に並べられる数ごとに分ける。 */
export function inBatches<T>(values: readonly T[]): T[][] {
    const batches: T[][] = [];
    for (let at = 0; at < values.length; at += SQL_IN_BATCH_SIZE) {
        batches.push(values.slice(at, at + SQL_IN_BATCH_SIZE));
    }
    return batches;
}

/** IN に渡す、値の数だけの ? の並び。 */
export function inPlaceholders(values: readonly unknown[]): string {
    return values.map(() => '?').join(',');
}

/** 仮想テーブルのモジュールが無いために失敗したか。 */
export function isMissingModuleError(error: unknown): boolean {
    return error instanceof Error && /no such module/i.test(error.message);
}

/** 各テーブルの列名の集合を返す。テーブルが無ければ空の集合。 */
export async function readTableColumns(
    reader: SqlReader,
    tables: readonly string[]
): Promise<Map<string, Set<string>>> {
    const results = await reader.queryAll(
        tables.map(table => ({ sql: 'SELECT name FROM pragma_table_info(?)', params: [table] }))
    );
    return new Map(tables.map((table, index) => [table, new Set(results[index].map(row => String(row.name)))]));
}
