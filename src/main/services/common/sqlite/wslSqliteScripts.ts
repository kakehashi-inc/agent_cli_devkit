import { wslFindCliScript } from '../../../../shared/agents/wsl';
import { DB_COPY_PREFIX } from '../cleanup/dbTempCopy';
import {
    BASE64_DELIMITER,
    base64Body,
    decodeBase64Text,
    mainScript,
    shellQuote,
    splitHeader,
} from '../wsl/wslFileScripts';
import type { SqlRow, SqlStatement, SqlValue } from './sqliteStore';

// distro の sqlite3 コマンドの名前。
const SQLITE_COMMAND = 'sqlite3';

// JSON の出力（.mode json）が使えるようになった版。
const MIN_VERSION: readonly number[] = [3, 33, 0];

// 出力を区切る行。JSON の行は [ か { か , で始まるので、これらの行と混ざらない。
const QUERY_FRAME = 'ADK_Q';
const QUERIES_DONE = 'ADK_SQL_DONE';
const DB_FRAME = 'ADK_DB';
const DB_OK = 'ADK_DB_OK';
const DB_FAIL = 'ADK_DB_FAIL';
const ALL_DONE = 'ADK_ALL_DONE';
const TX_COMMITTED = 'ADK_TX_COMMITTED';
const TX_OK = 'ADK_TX_OK';
const TX_FAIL = 'ADK_TX_FAIL';

// sqlite3 を起動する共通の引数。~/.sqliterc を読まない。
const CLI_ARGS = '-batch -bail -init /dev/null';

// シェルのパラメータ展開。テンプレートの式と区別するために定数にする。
const TEMP_ROOT = '${TMPDIR:-/tmp}';
const TEMP_VALUE = '${TMPDIR:-}';
const READ_PIPE_RC = '${PIPESTATUS[2]}';
const WRITE_PIPE_RC = '${PIPESTATUS[1]}';
const VERSION_WORD = '${adk_version%% *}';

// 作業フォルダを作って、シェルの終了時に消す本文。本文を実行する関数の中で使う。
const WORK_DIR_SETUP = String.raw`adk_work=$(mktemp -d "${TEMP_ROOT}/${DB_COPY_PREFIX}XXXXXX" 2>/dev/null) || { printf 'E ENOTEMP\n'; return 0; }
chmod 700 "$adk_work" 2>/dev/null
trap 'rm -rf -- "$adk_work"' EXIT
trap 'rm -rf -- "$adk_work"; exit 1' HUP INT TERM`;

/** distro の sqlite3 を調べた結果。 */
export type SqliteCliProbe =
    { kind: 'found'; binary: string } | { kind: 'missing' } | { kind: 'too-old'; version: string };

/**
 * 文字列の値を SQL のリテラルにする。制御文字を含む値は、sqlite3 が行の単位で読むときに変わらないよう 16 進で渡す。
 */
function stringLiteral(value: string): string {
    // eslint-disable-next-line no-control-regex -- 制御文字そのものを判定する
    if (/[\u0000-\u001f\u007f]/.test(value)) {
        return `CAST(X'${Buffer.from(value, 'utf8').toString('hex')}' AS TEXT)`;
    }
    return `'${value.replace(/'/g, "''")}'`;
}

/** 値を SQL のリテラルにする。 */
export function sqlLiteral(value: SqlValue): string {
    if (value === null) return 'NULL';
    if (typeof value === 'string') return stringLiteral(value);
    if (typeof value === 'bigint') return value.toString();
    if (Number.isNaN(value)) return 'NULL';
    if (!Number.isFinite(value)) return value > 0 ? '9e999' : '-9e999';
    return String(value);
}

/** SQL の中の文字列、識別子、コメントの終わりの位置を返す。at がそれらの始まりでなければ at のまま返す。 */
function skipQuoted(sql: string, at: number): number {
    const char = sql[at];
    if (char === "'" || char === '"' || char === '`') {
        let end = at + 1;
        while (end < sql.length) {
            if (sql[end] !== char) {
                end += 1;
            } else if (sql[end + 1] === char) {
                end += 2;
            } else {
                return end + 1;
            }
        }
        return sql.length;
    }
    if (char === '[') {
        const end = sql.indexOf(']', at);
        return end === -1 ? sql.length : end + 1;
    }
    if (char === '-' && sql[at + 1] === '-') {
        const end = sql.indexOf('\n', at);
        return end === -1 ? sql.length : end + 1;
    }
    if (char === '/' && sql[at + 1] === '*') {
        const end = sql.indexOf('*/', at + 2);
        return end === -1 ? sql.length : end + 2;
    }
    return at;
}

/** 文の ? を値のリテラルへ置き換える。? の数と値の数が合わなければ例外を投げる。 */
export function inlineParams({ sql, params = [] }: SqlStatement): string {
    let result = '';
    let used = 0;
    let at = 0;
    while (at < sql.length) {
        const skipped = skipQuoted(sql, at);
        if (skipped !== at) {
            result += sql.slice(at, skipped);
            at = skipped;
        } else if (sql[at] === '?') {
            if (used >= params.length) throw new Error(`Too few values for the statement: ${sql}`);
            result += sqlLiteral(params[used]);
            used += 1;
            at += 1;
        } else {
            result += sql[at];
            at += 1;
        }
    }
    if (used !== params.length) throw new Error(`Too many values for the statement: ${sql}`);
    return result.trim().replace(/;+$/, '');
}

/** パスを sqlite3 の URI ファイル名にする。 */
function fileUri(path: string, query: string): string {
    const encoded = path
        .split('/')
        .map(segment => encodeURIComponent(segment))
        .join('/');
    return `file:${encoded}?${query}`;
}

/** 版の文字列が JSON の出力を使える版か。 */
function supportsJsonOutput(version: string): boolean {
    const parts = version.split('.').map(part => Number.parseInt(part, 10));
    for (let index = 0; index < MIN_VERSION.length; index++) {
        const part = parts[index] ?? 0;
        if (Number.isNaN(part)) return false;
        if (part !== MIN_VERSION[index]) return part > MIN_VERSION[index];
    }
    return true;
}

/** sqlite3 の場所、版、JSON の出力の結果を調べるスクリプト。Windows 側のドライブにあるものは使わない。 */
export function buildProbeScript(): string {
    return mainScript(String.raw`${wslFindCliScript(SQLITE_COMMAND)}
adk_bin=$c
if [ -z "$adk_bin" ]; then printf 'MISSING\n'; return 0; fi
adk_version=$("$adk_bin" -init /dev/null --version 2>/dev/null) || { printf 'MISSING\n'; return 0; }
adk_json=$(printf '.mode json\nSELECT 1 AS adk;\n' | "$adk_bin" ${CLI_ARGS} :memory: 2>/dev/null)
printf 'FOUND %s %s %s\n' "$(adk_b64 "$adk_bin")" "$(adk_b64 "${VERSION_WORD}")" "$(adk_b64 "$adk_json")"`);
}

/** JSON の出力の確認の結果が期待どおりか。 */
function jsonOutputWorks(text: string): boolean {
    try {
        const rows = JSON.parse(text) as unknown;
        return Array.isArray(rows) && (rows[0] as { adk?: unknown } | undefined)?.adk === 1;
    } catch {
        return false;
    }
}

/** 調べるスクリプトの出力を解釈する。形が違えば例外を投げる。 */
export function parseProbeOutput(out: Buffer): SqliteCliProbe {
    const [status, binary, version, json] = splitHeader(out).header.split(' ');
    if (status === 'MISSING') return { kind: 'missing' };
    if (status !== 'FOUND' || !binary) throw new Error('Unexpected output from the sqlite3 check');
    const versionText = decodeBase64Text(version);
    if (!supportsJsonOutput(versionText) || !jsonOutputWorks(decodeBase64Text(json))) {
        return { kind: 'too-old', version: versionText };
    }
    return { kind: 'found', binary: decodeBase64Text(binary) };
}

/** 読み取りの sqlite3 の入力。 */
function readSql(statements: readonly SqlStatement[]): string {
    const lines = ['.bail on', '.mode json'];
    statements.forEach((statement, index) => {
        lines.push(`.print ${QUERY_FRAME} ${index}`, `${inlineParams(statement)}\n;`);
    });
    lines.push(`.print ${QUERIES_DONE}`, '');
    return lines.join('\n');
}

/**
 * 各データベースで同じ文を実行するスクリプト。元のファイルを変更しない方法で開く。
 * - -wal が無ければ読み取り専用かつ immutable で開く（-wal と -shm を作らない）。
 * - -wal と -shm が両方あれば読み取り専用で実ファイルを開き、開けなければコピーを読む。
 * - それ以外（-shm が無い）は、開くと -shm を作ってしまうので .db と -wal を作業フォルダへコピーして読む。
 * 作業フォルダは所有者だけが使える mktemp -d のフォルダで、シェルの終了時に消す。
 */
export function buildReadScript(binary: string, paths: readonly string[], statements: readonly SqlStatement[]): string {
    const sql = Buffer.from(readSql(statements), 'utf8').toString('base64');
    const calls = paths
        .map((path, index) =>
            [
                `printf '${DB_FRAME} ${index}\\n'`,
                `adk_read_one ${shellQuote(path)} ${shellQuote(fileUri(path, 'mode=ro'))} ${shellQuote(fileUri(path, 'immutable=1'))}`,
            ].join('\n')
        )
        .join('\n');
    return mainScript(String.raw`adk_bin=${shellQuote(binary)}
adk_sql=${shellQuote(sql)}
${WORK_DIR_SETUP}
adk_query() {
    printf '%s' "$adk_sql" | base64 -d | "$adk_bin" ${CLI_ARGS} "$@" > "$adk_work/out" 2> "$adk_work/err"
    adk_rc=${READ_PIPE_RC}
    [ "$adk_rc" = 0 ] && [ "$(tail -n 1 "$adk_work/out")" = ${QUERIES_DONE} ]
}
adk_fail_read() {
    printf '${DB_FAIL} %s\n' "$(adk_b64 "$(cat "$adk_work/err")")"
}
adk_emit() {
    printf '${DB_OK}\n'
    cat "$adk_work/out"
}
adk_copy_read() {
    adk_copy="$adk_work/db"
    if ! cp -- "$p" "$adk_copy" 2> "$adk_work/err"; then adk_fail_read; return; fi
    if [ -f "$p-wal" ] && [ ! -L "$p-wal" ]; then
        if ! cp -- "$p-wal" "$adk_copy-wal" 2> "$adk_work/err"; then
            rm -f -- "$adk_copy"
            adk_fail_read
            return
        fi
    fi
    chmod 600 "$adk_copy" "$adk_copy-wal" 2>/dev/null
    if adk_query "$adk_copy"; then adk_emit; else adk_fail_read; fi
    rm -f -- "$adk_copy" "$adk_copy-wal" "$adk_copy-shm"
}
adk_read_one() {
    p=$1
    if [ -L "$p" ] || [ ! -f "$p" ]; then
        printf '${DB_FAIL} %s\n' "$(adk_b64 'Not a regular file')"
        return
    fi
    if [ ! -e "$p-wal" ] && [ ! -L "$p-wal" ]; then
        if adk_query -readonly "$3"; then adk_emit; else adk_fail_read; fi
        return
    fi
    if [ -f "$p-wal" ] && [ ! -L "$p-wal" ] && [ -f "$p-shm" ] && [ ! -L "$p-shm" ]; then
        if adk_query -readonly "$2"; then adk_emit; return; fi
        case "$(cat "$adk_work/err")" in
            *locked*|*busy*|*readonly*|*read-only*|*'unable to open'*|*'disk I/O'*) ;;
            *) adk_fail_read; return ;;
        esac
    fi
    adk_copy_read
}
${calls}
printf '${ALL_DONE}\n'`);
}

/** データベース 1 つの読み取りの結果。 */
export type CliRead = { ok: true; rows: SqlRow[][] } | { ok: false; error: string };

/** 区切りの行の間の JSON を文ごとの行にする。全部の文の区切りがそろわなければ null。 */
function parseQueryFrames(lines: readonly string[], statementCount: number): SqlRow[][] | null {
    const results: string[][] = Array.from({ length: statementCount }, () => []);
    let current = -1;
    let done = false;
    let seen = 0;
    for (const line of lines) {
        if (line === QUERIES_DONE) {
            done = true;
        } else if (line.startsWith(`${QUERY_FRAME} `)) {
            current = Number(line.slice(QUERY_FRAME.length + 1));
            seen += 1;
        } else if (current >= 0 && current < statementCount) {
            results[current].push(line);
        }
    }
    if (!done || seen !== statementCount) return null;
    return results.map(part => {
        const text = part.join('\n').trim();
        return text.length === 0 ? [] : (JSON.parse(text) as SqlRow[]);
    });
}

/** 読み取りスクリプトの出力をデータベースごとに解釈する。スクリプトが最後まで動かなければ例外を投げる。 */
export function parseReadOutput(out: Buffer, dbCount: number, statementCount: number): CliRead[] {
    const lines = out.toString('utf8').split('\n');
    if (lines[0].startsWith('E ')) throw new Error(`The sqlite3 read could not start: ${lines[0].slice(2)}`);
    if (!lines.includes(ALL_DONE)) throw new Error('The sqlite3 read did not finish');
    const reads: CliRead[] = Array.from({ length: dbCount }, () => ({ ok: false, error: 'No output' }));
    let index = -1;
    let body: string[] | null = null;
    const flush = () => {
        if (body === null || index < 0 || index >= dbCount) return;
        try {
            const rows = parseQueryFrames(body, statementCount);
            reads[index] = rows ? { ok: true, rows } : { ok: false, error: 'Incomplete output' };
        } catch (error) {
            reads[index] = { ok: false, error: String(error) };
        }
        body = null;
    };
    for (const line of lines) {
        if (line.startsWith(`${DB_FRAME} `)) {
            flush();
            index = Number(line.slice(DB_FRAME.length + 1));
        } else if (line === DB_OK) {
            body = [];
        } else if (line.startsWith(`${DB_FAIL} `)) {
            reads[index] = { ok: false, error: decodeBase64Text(line.slice(DB_FAIL.length + 1)) };
        } else if (line === ALL_DONE) {
            flush();
        } else if (body !== null) {
            body.push(line);
        }
    }
    return reads;
}

/** 計画の読み取りの結果がロックの中でも同じ行数であることを確かめる文。違えば CHECK の失敗で止まる。 */
function countGuard(statement: SqlStatement, count: number): string {
    return `INSERT INTO temp.adk_guard SELECT (SELECT COUNT(*) FROM (${inlineParams(statement)}\n)) = ${count};`;
}

/** トランザクションの sqlite3 の入力。 */
function transactionSql(
    statements: readonly SqlStatement[],
    guards: readonly { statement: SqlStatement; count: number }[],
    busyTimeoutMs: number | undefined
): string {
    return [
        '.bail on',
        ...(busyTimeoutMs ? [`.timeout ${Math.floor(busyTimeoutMs)}`] : []),
        'PRAGMA foreign_keys=ON;',
        'CREATE TEMP TABLE adk_guard(ok INTEGER NOT NULL CHECK (ok = 1));',
        'INSERT INTO temp.adk_guard SELECT (SELECT foreign_keys FROM pragma_foreign_keys) IS 1;',
        'BEGIN IMMEDIATE;',
        ...guards.map(({ statement, count }) => countGuard(statement, count)),
        ...statements.map(statement => `${inlineParams(statement)}\n;`),
        'COMMIT;',
        `.print ${TX_COMMITTED}`,
        '',
    ].join('\n');
}

/**
 * 文を 1 つのトランザクションで実行するスクリプト。外部キーが有効にならなければ、何も書かずに失敗する。
 * guards は計画の読み取りの文と行数で、ロックの中で行数が変わっていれば何も確定しない。
 * sqlite3 の終了コードが 0 で COMMIT の後の区切りが出力された場合だけ成功を出力する。
 * 実ファイルが通常のファイルでなければ開かない（sqlite3 が新しいデータベースを作らないようにする）。
 */
export function buildTransactionScript(
    binary: string,
    path: string,
    statements: readonly SqlStatement[],
    guards: readonly { statement: SqlStatement; count: number }[],
    busyTimeoutMs?: number
): string {
    const sql = Buffer.from(transactionSql(statements, guards, busyTimeoutMs), 'utf8');
    return mainScript(String.raw`p=${shellQuote(path)}
adk_bin=${shellQuote(binary)}
if [ -L "$p" ] || [ ! -f "$p" ]; then
    printf '${TX_FAIL} 0 %s\n' "$(adk_b64 'Not a regular file')"
    return 0
fi
${WORK_DIR_SETUP}
base64 -d <<'${BASE64_DELIMITER}' | "$adk_bin" ${CLI_ARGS} "$p" > "$adk_work/out" 2> "$adk_work/err"
${base64Body(sql)}
${BASE64_DELIMITER}
adk_rc=${WRITE_PIPE_RC}
if [ "$adk_rc" = 0 ] && [ "$(tail -n 1 "$adk_work/out")" = ${TX_COMMITTED} ]; then
    printf '${TX_OK}\n'
else
    printf '${TX_FAIL} %s %s\n' "$adk_rc" "$(adk_b64 "$(cat "$adk_work/err")")"
fi`);
}

/** トランザクションのスクリプトの出力を解釈する。成功でなければ失敗の内容を返す。 */
export function parseTransactionOutput(out: Buffer): { ok: true } | { ok: false; error: string } {
    const [status, code, detail] = splitHeader(out).header.split(' ');
    if (status === TX_OK) return { ok: true };
    if (status === TX_FAIL) {
        return { ok: false, error: `sqlite3 exited with code ${code}: ${decodeBase64Text(detail)}`.trim() };
    }
    return { ok: false, error: `Unexpected output from the sqlite3 transaction: ${status ?? ''}` };
}

/** 通常のファイルを 1 行ずつ出力するスクリプト。出力は入力の順で Y か N。 */
export function buildRegularFilesScript(paths: readonly string[]): string {
    return mainScript(String.raw`for p in ${paths.map(shellQuote).join(' ')}; do
    if [ -f "$p" ] && [ ! -L "$p" ]; then echo Y; else echo N; fi
done
printf 'END\n'`);
}

/** 一時フォルダーに残った、このアプリの一日より古いコピーを消すスクリプト。リンクと他のユーザーのものは対象にしない。 */
export function buildStaleCopiesScript(): string {
    return mainScript(String.raw`adk_uid=$(id -u)
for adk_dir in /tmp "${TEMP_VALUE}"; do
    [ -n "$adk_dir" ] && [ -d "$adk_dir" ] || continue
    find -P "$adk_dir" -mindepth 1 -maxdepth 1 -type d -name '${DB_COPY_PREFIX}*' -user "$adk_uid" -mmin +1440 -exec rm -rf -- {} + 2>/dev/null
done
:`);
}
