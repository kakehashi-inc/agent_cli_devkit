import { DANGLING_LINK_REVISION, MISSING_REVISION } from '../../../../shared/agents/profile/types';
import { STAGING_PREFIX } from '../assets/stagedInstall';
import {
    ATOMIC_TEMP_PREFIX,
    BACKUP_SUFFIX,
    LINK_TO_NON_FILE_REVISION,
    RENAME_SUFFIX,
    STALE_TEMP_AGE_MS,
    describeBytes,
    revisionOf,
    sortListedEntries,
    type AtomicWrite,
    type FileStat,
    type ListedEntry,
    type ListedEntryKind,
    type ListedTree,
    type StrictDelete,
    type StrictRead,
    type StrictRename,
} from '../fs/atomicFile';
import type { LinkBelowRoot } from '../fs/profilePathSafety';

// base64 の 1 行の文字数。
const BASE64_LINE_LENGTH = 76;

// ヒアドキュメントの区切り（base64 の文字種に '_' は含まれない）。
export const BASE64_DELIMITER = 'ADK_B64_EOF';

// スクリプトの出力の形を解釈できない場合のエラーコード。
const BAD_OUTPUT_CODE = 'EWSLOUTPUT';

// 中断された書き込みの残骸として次の書き込みで削除する一時ファイルの古さ（分）。find の -mmin に渡す。
const STALE_TEMP_AGE_MINUTES = STALE_TEMP_AGE_MS / 60000;

// 変数 p の親ディレクトリのパラメータ展開。
const PARENT_OF_P = '${p%/*}';

// 複数のファイルを読むときの区切りの行の先頭（base64 の文字種に '_' と空白は含まれない）。
const READ_RECORD_PREFIX = 'ADK_READ_RECORD';

// スクリプトが共通で使う関数。エラーコードは stat などのメッセージの末尾（LC_ALL=C）から求める。
const HELPERS = String.raw`adk_errno() {
    case "$1" in
        *': No such file or directory') echo ENOENT ;;
        *': Not a directory') echo ENOTDIR ;;
        *': Is a directory') echo EISDIR ;;
        *': File exists') echo EEXIST ;;
        *': Too many levels of symbolic links') echo ELOOP ;;
        *': File name too long') echo ENAMETOOLONG ;;
        *': Permission denied') echo EACCES ;;
        *': Operation not permitted') echo EPERM ;;
        *': Read-only file system') echo EROFS ;;
        *': No space left on device') echo ENOSPC ;;
        *': Device or resource busy') echo EBUSY ;;
        *) echo EIO ;;
    esac
}
adk_lstat() {
    if adk_out=$(LC_ALL=C stat -c %h -- "$1" 2>&1); then
        adk_state=present
    else
        adk_err=$(adk_errno "$adk_out")
        case "$adk_err" in
            ENOENT|ENOTDIR) adk_state=missing ;;
            *) adk_state=error ;;
        esac
    fi
}
adk_follow() {
    if adk_out=$(LC_ALL=C stat -L -c %h -- "$1" 2>&1); then
        adk_state=present
    else
        adk_err=$(adk_errno "$adk_out")
        case "$adk_err" in
            ENOENT|ENOTDIR|ELOOP) adk_state=dangling ;;
            *) adk_state=error ;;
        esac
    fi
}
adk_sha() {
    adk_sum=$(sha256sum < "$1") || return 1
    printf '%s' "$adk_sum" | cut -d' ' -f1
}
adk_b64() {
    printf '%s' "$1" | base64 | tr -d '\n'
}
adk_regular() {
    if [ -d "$1" ]; then printf 'E EISDIR\n'; return 1; fi
    if [ ! -f "$1" ]; then printf 'E ENOTREG\n'; return 1; fi
    if [ ! -r "$1" ]; then printf 'E EACCES\n'; return 1; fi
    return 0
}`;

/** POSIX シェル向けのシングルクォートエスケープ。 */
export function shellQuote(value: string): string {
    return `'${value.replace(/'/g, `'\\''`)}'`;
}

/**
 * 本体を関数にまとめて呼び出すスクリプトを組み立てる。関数の途中で入力が切れると構文エラーになり、何も実行されない。
 * 標準入力は閉じて実行する（スクリプトの残りを子プロセスが読み取らない）。
 */
export function mainScript(body: string): string {
    return `${HELPERS}\nadk_main() {\n${body}\n}\nadk_main </dev/null`;
}

/**
 * mainScript と同じだが、スクリプトの後ろに続く標準入力を本体の fd 3 から読める。本体の他のコマンドの標準入力は閉じる。
 */
export function streamingMainScript(body: string): string {
    return `${HELPERS}\nadk_main() {\n${body}\n}\nadk_main 3<&0 </dev/null`;
}

/** base64 のヒアドキュメントの本文（行を折り返す）。 */
export function base64Body(bytes: Buffer): string {
    const encoded = bytes.toString('base64');
    const lines: string[] = [];
    for (let at = 0; at < encoded.length; at += BASE64_LINE_LENGTH) {
        lines.push(encoded.slice(at, at + BASE64_LINE_LENGTH));
    }
    return lines.join('\n');
}

/** 1 行目と、その後ろのバイト列に分ける。 */
export function splitHeader(out: Buffer): { header: string; rest: Buffer } {
    const newline = out.indexOf(0x0a);
    return newline === -1
        ? { header: out.toString('utf8'), rest: Buffer.alloc(0) }
        : { header: out.toString('utf8', 0, newline), rest: out.subarray(newline + 1) };
}

/** base64 の文字列を UTF-8 のテキストへ戻す。 */
export function decodeBase64Text(encoded: string | undefined): string {
    return Buffer.from(encoded ?? '', 'base64').toString('utf8');
}

/** 出力が空や未知の形のときのエラー。 */
export function badOutput(): { kind: 'error'; code: string } {
    return { kind: 'error', code: BAD_OUTPUT_CODE };
}

// ---- exists ----

/** パスの test -e の終了コードを出力するスクリプト。 */
export function buildExistsScript(path: string): string {
    return mainScript(String.raw`p=${shellQuote(path)}
test -e "$p"
printf 'RC %s\n' "$?"`);
}

/** test -e の終了コードを返す。出力の形が違えば null。 */
export function parseExistsOutput(out: Buffer): number | null {
    const match = /^RC (\d+)$/.exec(splitHeader(out).header);
    return match ? Number(match[1]) : null;
}

// ---- 属性 ----

/** パスの種別、サイズ、権限、書き込めるかを出力するスクリプト。リンクはリンク先を調べ、リンク切れは未作成とする。 */
export function buildStatScript(path: string): string {
    return mainScript(String.raw`p=${shellQuote(path)}
adk_follow "$p"
case "$adk_state" in
    dangling) printf 'MISSING\n'; return 0 ;;
    error) printf 'E %s\n' "$adk_err"; return 0 ;;
esac
info=$(stat -L -c '%s %a' -- "$p") || { printf 'E EIO\n'; return 0; }
kind=other
[ -f "$p" ] && kind=file
writable=0
[ -w "$p" ] && writable=1
printf 'STAT %s %s %s\n' "$kind" "$info" "$writable"`);
}

/** 属性のスクリプトの出力を解釈する。 */
export function parseStatOutput(out: Buffer): FileStat {
    const [status, kind, size, mode, writable] = splitHeader(out).header.split(' ');
    switch (status) {
        case 'MISSING':
            return { kind: 'missing' };
        case 'E':
            return { kind: 'error', code: kind || BAD_OUTPUT_CODE };
        case 'STAT':
            if ((kind !== 'file' && kind !== 'other') || !/^\d+$/.test(size ?? '') || !/^[0-7]+$/.test(mode ?? '')) {
                return badOutput();
            }
            return { kind, size: Number(size), mode: Number.parseInt(mode, 8), writable: writable === '1' };
        default:
            return badOutput();
    }
}

// ---- 厳密な読み取り ----

// 変数 p のファイルを厳密に読むスクリプトの本体。sha256 と識別子を 1 行目に、本文を base64 で出力する。
const READ_BODY = String.raw`adk_lstat "$p"
case "$adk_state" in
    missing) printf 'MISSING\n'; return 0 ;;
    error) printf 'E %s\n' "$adk_err"; return 0 ;;
esac
is_link=0
link_b64=-
if [ -L "$p" ]; then
    is_link=1
    link_b64=$(adk_b64 "$(readlink -- "$p")")
    adk_follow "$p"
    case "$adk_state" in
        dangling) printf 'DANGLING %s\n' "$link_b64"; return 0 ;;
        error) printf 'E %s\n' "$adk_err"; return 0 ;;
    esac
fi
adk_regular "$p" || return 0
sum=$(adk_sha "$p") || { printf 'E EIO\n'; return 0; }
id=$(stat -L -c %d:%i -- "$p") || { printf 'E EIO\n'; return 0; }
printf 'OK %s %s %s %s\n' "$sum" "$is_link" "$id" "$link_b64"
base64 < "$p"`;

/** ファイルを厳密に読むスクリプト。 */
export function buildReadScript(path: string): string {
    return mainScript(`p=${shellQuote(path)}\n${READ_BODY}`);
}

/** 複数のファイルを 1 回の実行で厳密に読むスクリプト。ファイルごとに番号の区切りの行を出力する。 */
export function buildReadManyScript(paths: readonly string[]): string {
    return mainScript(String.raw`adk_read_one() {
${READ_BODY}
}
i=0
for p in ${paths.map(shellQuote).join(' ')}; do
    printf '${READ_RECORD_PREFIX} %s\n' "$i"
    adk_read_one
    i=$((i + 1))
done
printf '${READ_RECORD_PREFIX} END\n'`);
}

/** 複数の読み取りスクリプトの出力をファイルごとに解釈する。全件の区切りがそろわなければ全件をエラーにする。 */
export function parseReadManyOutput(out: Buffer, count: number): StrictRead[] {
    const text = out.toString('latin1');
    const marker = new RegExp(`^${READ_RECORD_PREFIX} (\\d+|END)$`, 'gm');
    const marks = [...text.matchAll(marker)];
    if (marks.length !== count + 1 || marks[count][1] !== 'END') {
        return Array.from({ length: count }, () => badOutput());
    }
    return marks.slice(0, count).map((mark, index) => {
        const start = (mark.index as number) + mark[0].length + 1;
        return parseReadOutput(Buffer.from(text.slice(start, marks[index + 1].index as number), 'latin1'));
    });
}

/** 読み取りスクリプトの出力を解釈する。本文と sha256 が合わなければ EINTEGRITY のエラー。 */
export function parseReadOutput(out: Buffer): StrictRead {
    const { header, rest } = splitHeader(out);
    const [status, ...fields] = header.split(' ');
    switch (status) {
        case 'MISSING':
            return { kind: 'missing' };
        case 'DANGLING':
            return { kind: 'dangling-link', linkTarget: decodeBase64Text(fields[0]) };
        case 'E':
            return { kind: 'error', code: fields[0] || BAD_OUTPUT_CODE };
        case 'OK': {
            const [sum, isLink, identity, linkB64] = fields;
            if (!sum || !identity) return badOutput();
            const described = describeBytes(Buffer.from(rest.toString('latin1'), 'base64'));
            if (described.revision !== sum) return { kind: 'error', code: 'EINTEGRITY' };
            return {
                kind: 'ok',
                ...described,
                isLink: isLink === '1',
                ...(isLink === '1' ? { linkTarget: decodeBase64Text(linkB64) } : {}),
                identity,
            };
        }
        default:
            return badOutput();
    }
}

// ---- 原子的な書き込み ----

/**
 * 渡されたバイト列をそのまま原子的に書き込むスクリプト。本文の渡し方は decodeToTemp が決める（下の 2 つの関数）。
 * - expectedRevision を渡すと現在の内容と比較する（未作成は MISSING_REVISION）。違えば CONFLICT を出力して書かない。
 * - シンボリックリンクは実体へ書いてリンクを残す。リンク切れは DANGLING を出力して止める。
 * - 書き込み権限のない既存ファイルは置き換えない。
 * - 一時ファイルは実体と同じディレクトリに作る。既存ファイルの権限を引き継ぎ、新規は umask に従う。
 * - 置き換えの前に一時ファイルの sha256 を確かめ、内容が届いていなければ既存のファイルに触らない。
 * - ハードリンク（リンク数 2 以上）は共有を保つため、元の内容を同じディレクトリへ退避してからその場で書き込み、失敗したら元の内容へ戻す。
 *   元の内容へ戻せなかったときは退避したファイルを残し、E の行の 3 番目の値にそのパスを base64 で出力する。退避できなければ何も書き換えない。
 * - 書き込む先のディレクトリに残った一日より古い一時ファイルを削除する。元のファイルの唯一の写しになり得る一時名は残す。
 */
function writeBody(revision: string, path: string, decodeToTemp: string, expectedRevision?: string): string {
    return String.raw`p=${shellQuote(path)}
want=${shellQuote(expectedRevision ?? '')}
new=${revision}
tmp=
adk_fail() {
    [ -n "$tmp" ] && rm -f -- "$tmp"
    trap - EXIT
    printf 'E %s\n' "$1"
}
adk_compare() {
    [ -n "$want" ] || return 0
    if [ -e "$p" ]; then
        cur=$(adk_sha "$p") || { adk_fail EIO; return 1; }
    else
        cur=${MISSING_REVISION}
    fi
    [ "$cur" = "$want" ] && return 0
    [ -n "$tmp" ] && rm -f -- "$tmp"
    trap - EXIT
    printf 'CONFLICT %s\n' "$cur"
    return 1
}
adk_lstat "$p"
case "$adk_state" in
    error) printf 'E %s\n' "$adk_err"; return 0 ;;
    present) exists=1 ;;
    *) exists=0 ;;
esac
if [ "$exists" = 1 ] && [ -L "$p" ]; then
    link_b64=$(adk_b64 "$(readlink -- "$p")")
    adk_follow "$p"
    case "$adk_state" in
        dangling) printf 'DANGLING %s\n' "$link_b64"; return 0 ;;
        error) printf 'E %s\n' "$adk_err"; return 0 ;;
    esac
    p=$(readlink -f -- "$p") || { printf 'E EIO\n'; return 0; }
fi
nlink=1
if [ "$exists" = 1 ]; then
    nlink=$adk_out
    adk_regular "$p" || return 0
    if [ ! -w "$p" ]; then printf 'E EACCES\n'; return 0; fi
fi
adk_compare || return 0
d=${PARENT_OF_P}
[ -n "$d" ] || d=/
if [ "$exists" = 0 ]; then
    msg=$(LC_ALL=C mkdir -p -- "$d" 2>&1) || { printf 'E %s\n' "$(adk_errno "$msg")"; return 0; }
fi
find -H "$d" -mindepth 1 -maxdepth 1 -type f -name '${ATOMIC_TEMP_PREFIX}*' ! -name '*${BACKUP_SUFFIX}' ! -name '*${RENAME_SUFFIX}' -mmin +${STALE_TEMP_AGE_MINUTES} -exec rm -f -- {} + 2>/dev/null
msg=$(LC_ALL=C mktemp "$d/${ATOMIC_TEMP_PREFIX}XXXXXX" 2>&1) || { printf 'E %s\n' "$(adk_errno "$msg")"; return 0; }
tmp=$msg
trap 'rm -f -- "$tmp"' EXIT
${decodeToTemp}
got=$(adk_sha "$tmp") || { adk_fail EIO; return 0; }
[ "$got" = "$new" ] || { adk_fail EINTEGRITY; return 0; }
if [ "$nlink" -gt 1 ]; then
    adk_compare || return 0
    bak="$tmp${BACKUP_SUFFIX}"
    msg=$( { umask 077; set -C; : > "$bak"; } 2>&1) || { adk_fail "$(adk_errno "$msg")"; return 0; }
    trap 'rm -f -- "$tmp" "$bak"' EXIT
    if ! msg=$( { LC_ALL=C cat -- "$p" > "$bak"; } 2>&1); then
        code=$(adk_errno "$msg")
        rm -f -- "$bak"
        adk_fail "$code"
        return 0
    fi
    sync -- "$bak" 2>/dev/null
    trap 'rm -f -- "$tmp"' EXIT
    if ! msg=$( { LC_ALL=C cat -- "$tmp" > "$p"; } 2>&1); then
        code=$(adk_errno "$msg")
        if ( LC_ALL=C cat -- "$bak" > "$p" ) 2>/dev/null; then
            sync -- "$p" 2>/dev/null
            rm -f -- "$bak"
            adk_fail "$code"
        else
            kept=$(adk_b64 "$bak")
            adk_fail "$code $kept"
        fi
        return 0
    fi
    sync -- "$p" 2>/dev/null
    rm -f -- "$tmp" "$bak"
    trap - EXIT
    printf 'OK %s\n' "$new"
    return 0
fi
if [ "$exists" = 1 ]; then
    mode=$(stat -c %a -- "$p") || { adk_fail EIO; return 0; }
else
    mode=$(printf '%o' "$(( 0666 & ~0$(umask) ))")
fi
msg=$(LC_ALL=C chmod "$mode" "$tmp" 2>&1) || { adk_fail "$(adk_errno "$msg")"; return 0; }
sync -- "$tmp" 2>/dev/null
adk_compare || return 0
msg=$(LC_ALL=C mv -f -- "$tmp" "$p" 2>&1) || { adk_fail "$(adk_errno "$msg")"; return 0; }
trap - EXIT
sync -- "$d" 2>/dev/null
printf 'OK %s\n' "$new"`;
}

/** 本文を base64 のヒアドキュメントでスクリプトの中に書く、書き込みのスクリプト。 */
export function buildWriteScript(path: string, bytes: Buffer, expectedRevision?: string): string {
    const decode = [
        `base64 -d > "$tmp" <<'${BASE64_DELIMITER}' || { adk_fail EIO; return 0; }`,
        base64Body(bytes),
        BASE64_DELIMITER,
    ].join('\n');
    return mainScript(writeBody(revisionOf(bytes), path, decode, expectedRevision));
}

/** 本文を base64 にしてスクリプトの後ろの標準入力で渡す、書き込みのスクリプト。本文が切れていれば sha256 が合わず書き込まない。 */
export function buildStreamedWriteScript(
    path: string,
    bytes: Buffer,
    expectedRevision?: string
): { script: string; input: Buffer } {
    const input = Buffer.from(bytes.toString('base64'), 'latin1');
    const decode = `head -c ${input.length} <&3 | base64 -d > "$tmp"`;
    return { script: streamingMainScript(writeBody(revisionOf(bytes), path, decode, expectedRevision)), input };
}

/** 書き込みスクリプトの出力を解釈する。 */
export function parseWriteOutput(out: Buffer): AtomicWrite {
    const [status, field, kept] = splitHeader(out).header.split(' ');
    switch (status) {
        case 'OK':
            return field ? { kind: 'ok', revision: field } : badOutput();
        case 'CONFLICT':
            return field ? { kind: 'conflict', currentRevision: field } : badOutput();
        case 'DANGLING':
            return { kind: 'dangling-link', linkTarget: decodeBase64Text(field) };
        case 'E':
            if (kept) {
                console.error(`Failed to restore a file; the previous content is kept in ${decodeBase64Text(kept)}`);
            }
            return { kind: 'error', code: field || BAD_OUTPUT_CODE };
        default:
            return badOutput();
    }
}

// ---- 厳密な削除 ----

/**
 * ファイルかシンボリックリンクを 1 つ削除するスクリプト。リンクはリンク自体だけを消す。ディレクトリはエラーにする。
 * expectedRevision を渡すと現在の内容と比較し、違えば CONFLICT を出力して消さない。
 */
export function buildDeleteScript(path: string, expectedRevision?: string): string {
    return mainScript(String.raw`p=${shellQuote(path)}
want=${shellQuote(expectedRevision ?? '')}
adk_lstat "$p"
case "$adk_state" in
    error) printf 'E %s\n' "$adk_err"; return 0 ;;
    missing)
        if [ -z "$want" ] || [ "$want" = ${MISSING_REVISION} ]; then
            printf 'MISSING\n'
        else
            printf 'CONFLICT ${MISSING_REVISION}\n'
        fi
        return 0 ;;
esac
if [ -L "$p" ]; then
    was=link
    if [ -n "$want" ]; then
        adk_follow "$p"
        case "$adk_state" in
            dangling) cur=${DANGLING_LINK_REVISION} ;;
            error) printf 'E %s\n' "$adk_err"; return 0 ;;
            *)
                if [ -f "$p" ]; then
                    adk_regular "$p" || return 0
                    cur=$(adk_sha "$p") || { printf 'E EIO\n'; return 0; }
                else
                    cur=${LINK_TO_NON_FILE_REVISION}
                fi ;;
        esac
    fi
else
    was=file
    if [ -d "$p" ]; then printf 'E EISDIR\n'; return 0; fi
    if [ ! -f "$p" ]; then printf 'E ENOTREG\n'; return 0; fi
    if [ -n "$want" ]; then
        adk_regular "$p" || return 0
        cur=$(adk_sha "$p") || { printf 'E EIO\n'; return 0; }
    fi
fi
if [ -n "$want" ] && [ "$cur" != "$want" ]; then printf 'CONFLICT %s\n' "$cur"; return 0; fi
msg=$(LC_ALL=C rm -f -- "$p" 2>&1) || { printf 'E %s\n' "$(adk_errno "$msg")"; return 0; }
if [ -e "$p" ] || [ -L "$p" ]; then printf 'E EIO\n'; return 0; fi
printf 'REMOVED %s\n' "$was"`);
}

/** 削除スクリプトの出力を解釈する。 */
export function parseDeleteOutput(out: Buffer): StrictDelete {
    const [status, field] = splitHeader(out).header.split(' ');
    switch (status) {
        case 'REMOVED':
            return field === 'file' || field === 'link' ? { kind: 'removed', was: field } : badOutput();
        case 'MISSING':
            return { kind: 'missing' };
        case 'CONFLICT':
            return field ? { kind: 'conflict', currentRevision: field } : badOutput();
        case 'E':
            return { kind: 'error', code: field || BAD_OUTPUT_CODE };
        default:
            return badOutput();
    }
}

// ---- 実体のパス ----

/** リンクをすべてたどった実体のパスを出力するスクリプト。たどれなければ MISSING を出力する。 */
export function buildRealPathScript(path: string): string {
    return mainScript(String.raw`p=${shellQuote(path)}
if r=$(readlink -f -- "$p" 2>/dev/null) && [ -e "$r" ]; then
    printf 'OK %s\n' "$(adk_b64 "$r")"
else
    printf 'MISSING\n'
fi`);
}

/** 実体のパスのスクリプトの出力を解釈する。たどれなければ null。 */
export function parseRealPathOutput(out: Buffer): string | null {
    const [status, field] = splitHeader(out).header.split(' ');
    return status === 'OK' && field ? decodeBase64Text(field) : null;
}

// ---- 名前の変更 ----

/**
 * 同じディレクトリの中でファイルかリンクの名前を、一時名を経由して変えるスクリプト。リンクはリンク自体の名前を変える。
 * to が from と別の実体として既にあれば EXISTS を出力して何も変えない。to へ移せなければ元の名前に戻す。
 * 一時名の末尾は、中断された場合に元のファイルの唯一の写しとして残す名前にし、既にあれば上書きせず EEXIST を出力する。
 */
export function buildRenameScript(from: string, to: string): string {
    return mainScript(String.raw`p=${shellQuote(from)}
t=${shellQuote(to)}
adk_lstat "$p"
case "$adk_state" in
    missing) printf 'MISSING\n'; return 0 ;;
    error) printf 'E %s\n' "$adk_err"; return 0 ;;
esac
own=$(stat -c %d:%i -- "$p") || { printf 'E EIO\n'; return 0; }
adk_lstat "$t"
case "$adk_state" in
    error) printf 'E %s\n' "$adk_err"; return 0 ;;
    present)
        other=$(stat -c %d:%i -- "$t") || { printf 'E EIO\n'; return 0; }
        if [ "$own" != "$other" ]; then printf 'EXISTS\n'; return 0; fi ;;
esac
d=${PARENT_OF_P}
[ -n "$d" ] || d=/
tmp="$d/${ATOMIC_TEMP_PREFIX}$$-$RANDOM${RENAME_SUFFIX}"
if [ -e "$tmp" ] || [ -L "$tmp" ]; then printf 'E EEXIST\n'; return 0; fi
msg=$(LC_ALL=C mv -f -- "$p" "$tmp" 2>&1) || { printf 'E %s\n' "$(adk_errno "$msg")"; return 0; }
if ! msg=$(LC_ALL=C mv -f -- "$tmp" "$t" 2>&1); then
    code=$(adk_errno "$msg")
    mv -f -- "$tmp" "$p" 2>/dev/null
    printf 'E %s\n' "$code"
    return 0
fi
sync -- "$d" 2>/dev/null
printf 'OK\n'`);
}

/** 名前の変更スクリプトの出力を解釈する。 */
export function parseRenameOutput(out: Buffer): StrictRename {
    const [status, field] = splitHeader(out).header.split(' ');
    switch (status) {
        case 'OK':
            return { kind: 'ok' };
        case 'MISSING':
            return { kind: 'missing' };
        case 'EXISTS':
            return { kind: 'exists' };
        case 'E':
            return { kind: 'error', code: field || BAD_OUTPUT_CODE };
        default:
            return badOutput();
    }
}

// ---- 一覧 ----

/**
 * ディレクトリの配下を NUL 区切りで一覧するスクリプト。起点はリンクでもたどり、配下のリンクはたどらない。
 * 作業用のエントリは降りずに除外する。findDepth は find の -maxdepth（起点の直下が 1）。
 */
export function buildListScript(root: string, findDepth: number): string {
    return mainScript(String.raw`r=${shellQuote(root)}
adk_lstat "$r"
case "$adk_state" in
    missing) printf 'MISSING\n'; return 0 ;;
    error) printf 'E %s\n' "$adk_err"; return 0 ;;
esac
if [ -L "$r" ]; then
    adk_follow "$r"
    case "$adk_state" in
        dangling) printf 'DANGLING %s\n' "$(adk_b64 "$(readlink -- "$r")")"; return 0 ;;
        error) printf 'E %s\n' "$adk_err"; return 0 ;;
    esac
fi
if [ ! -d "$r" ]; then printf 'E ENOTDIR\n'; return 0; fi
if [ ! -r "$r" ] || [ ! -x "$r" ]; then printf 'E EACCES\n'; return 0; fi
printf 'OK\n'
find -H "$r" -mindepth 1 -maxdepth ${findDepth} \( -name '${STAGING_PREFIX}*' -o -name '${ATOMIC_TEMP_PREFIX}*' \) -prune -o -printf '%y\t%Y\t%d\t%s\t%T@\t%P\0' 2>/dev/null
printf 'RC\t%s\0' "$?"`);
}

/** find の種別（%y・%Y）を一覧の種別にする。 */
function listedKind(type: string, targetType: string): { kind: ListedEntryKind; isLink: boolean } {
    const isLink = type === 'l';
    const code = isLink ? targetType : type;
    if (code === 'f') return { kind: 'file', isLink };
    if (code === 'd') return { kind: 'dir', isLink };
    return { kind: isLink && (code === 'N' || code === 'L') ? 'dangling' : 'other', isLink };
}

/** 一覧スクリプトの出力を解釈する。maxDepth より深いレコードは一覧に含めず truncated にする。 */
export function parseListOutput(out: Buffer, maxDepth: number): ListedTree {
    const { header, rest } = splitHeader(out);
    const [status, field] = header.split(' ');
    if (status === 'MISSING') return { kind: 'missing' };
    if (status === 'DANGLING') return { kind: 'dangling-link', linkTarget: decodeBase64Text(field) };
    if (status === 'E') return { kind: 'error', code: field || BAD_OUTPUT_CODE };
    if (status !== 'OK') return badOutput();

    const entries: ListedEntry[] = [];
    let truncated = false;
    let exitCode: string | null = null;
    for (const record of rest.toString('utf8').split('\0')) {
        if (record.startsWith('RC\t')) {
            exitCode = record.slice(3);
            continue;
        }
        const entry = parseListRecord(record);
        if (!entry) continue;
        if (entry.depth > maxDepth) truncated = true;
        else entries.push(entry);
    }
    if (exitCode === null) return badOutput();
    return { kind: 'ok', entries: sortListedEntries(entries), truncated, incomplete: exitCode !== '0' };
}

/** 一覧の 1 レコード（%y・%Y・%d・%s・%T@・%P のタブ区切り）を解釈する。形が違えば null。 */
function parseListRecord(record: string): ListedEntry | null {
    const fields: string[] = [];
    let rest = record;
    for (let index = 0; index < 5; index++) {
        const tab = rest.indexOf('\t');
        if (tab === -1) return null;
        fields.push(rest.slice(0, tab));
        rest = rest.slice(tab + 1);
    }
    if (rest.length === 0) return null;
    const [type, targetType, findDepth, size, mtime] = fields;
    const mtimeSec = Number.parseFloat(mtime);
    return {
        name: rest.slice(rest.lastIndexOf('/') + 1),
        relPath: rest,
        depth: Number.parseInt(findDepth, 10) - 1,
        ...listedKind(type, targetType),
        size: Number.parseInt(size, 10) || 0,
        mtimeMs: Number.isFinite(mtimeSec) ? Math.round(mtimeSec * 1000) : 0,
    };
}

// ---- 空の親ディレクトリの削除 ----

/** 渡された順に空のディレクトリを削除するスクリプト。リンク、ディレクトリ以外、空でないものに当たったら止める。 */
export function buildRemoveEmptyDirsScript(dirs: readonly string[]): string {
    return mainScript(String.raw`for d in ${dirs.map(shellQuote).join(' ')}; do
    [ -L "$d" ] && break
    if [ -d "$d" ]; then
        rmdir -- "$d" 2>/dev/null || break
    elif [ -e "$d" ]; then
        break
    fi
done
printf 'DONE\n'`);
}

// ---- 中間のリンクの検査 ----

/** ルートより下の中間のセグメントにリンクがあるかを調べるスクリプト。segments に最後のセグメントは含めない。 */
export function buildLinkBelowRootScript(root: string, segments: readonly string[]): string {
    return mainScript(String.raw`cur=${shellQuote(root)}
i=0
for s in ${segments.map(shellQuote).join(' ')}; do
    cur=$cur/$s
    i=$((i + 1))
    if [ -L "$cur" ]; then printf 'LINK %s\n' "$i"; return 0; fi
    adk_lstat "$cur"
    case "$adk_state" in
        missing) printf 'NONE\n'; return 0 ;;
        error) printf 'E %s\n' "$adk_err"; return 0 ;;
    esac
done
printf 'NONE\n'`);
}

/** 中間のリンクの検査スクリプトの出力を解釈する。 */
export function parseLinkBelowRootOutput(out: Buffer, segments: readonly string[]): LinkBelowRoot {
    const [status, field] = splitHeader(out).header.split(' ');
    switch (status) {
        case 'NONE':
            return { kind: 'none' };
        case 'LINK':
            return { kind: 'link', at: segments.slice(0, Number(field)).join('/') };
        case 'E':
            return { kind: 'error', code: field || BAD_OUTPUT_CODE };
        default:
            return badOutput();
    }
}
