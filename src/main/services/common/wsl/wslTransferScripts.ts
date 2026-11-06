import { STAGING_PREFIX } from '../assets/stagedInstall';
import { ATOMIC_TEMP_PREFIX } from '../fs/atomicFile';
import { decodeBase64Text, mainScript, shellQuote, splitHeader, streamingMainScript } from './wslFileScripts';

// 取り込みの作業用ディレクトリを残骸として片付ける古さ（分）。処理の途中のものと区別する。
const STALE_STAGING_MINUTES = 60;

// シェルのパラメータ展開。テンプレートの式と区別するために定数にする。
const PARENT_OF_REAL = '${real%/*}';
const PARENT_OF_TARGET = '${target%/*}';
const PARENT_OF_BACKUP = '${backup%/*}';
const PARENT_OF_MISSING = '${missing%/*}';
const PARENT_OF_FILE = '${f%/*}';
const PARENT_OF_TO = '${to%/*}';
const LAST_INDEX = '$((${#moved_targets[@]} - 1))';
const CREATED_LAST_INDEX = '$((${#created[@]} - 1))';
const MOVED_TARGET_AT = '${moved_targets[$i]}';
const MOVED_BACKUP_AT = '${moved_backups[$i]}';
const MOVED_PLACED_AT = '${moved_placed[$i]}';
const CREATED_AT = '${created[$i]}';

/** ZIP へ入れるために一覧したエントリ 1 つ。 */
export interface ArchiveListEntry {
    kind: 'file' | 'dir' | 'link';
    // 起点からの相対パス。起点自身は ''。
    rel: string;
    size: number;
    mtimeMs: number;
    // 権限のビット
    mode: number;
    // リンクの指す先
    linkTarget: string;
}

/**
 * 各起点の配下を ZIP に入れるために一覧するスクリプト。起点はリンクでもたどり、配下のリンクはたどらない。作業用のエントリは含めない。
 * 出力は NUL 区切りで、起点ごとに P の行、エントリごとに「%y、%m、%T@、%s」「%l」「%P」の 3 つの値、最後に find の終了コードの S の行が続く。
 */
export function buildArchiveListScript(paths: readonly string[]): string {
    return mainScript(String.raw`i=0
for p in ${paths.map(shellQuote).join(' ')}; do
    printf 'P\t%s\0' "$i"
    find -H "$p" \( -name '${STAGING_PREFIX}*' -o -name '${ATOMIC_TEMP_PREFIX}*' \) -prune -o -printf '%y\t%m\t%T@\t%s\0%l\0%P\0' 2>/dev/null
    printf 'S\t%s\0' "$?"
    i=$((i + 1))
done
printf 'END\0'`);
}

/** 一覧のスクリプトの出力を起点ごとに解釈する。一覧できなかった起点は null。最後まで動かなければ例外を投げる。 */
export function parseArchiveListOutput(out: Buffer, count: number): (ArchiveListEntry[] | null)[] {
    const tokens = out.toString('utf8').split('\0');
    if (!tokens.includes('END')) throw new Error('The archive listing did not finish');
    const results: (ArchiveListEntry[] | null)[] = Array.from({ length: count }, () => null);
    let index = -1;
    let current: ArchiveListEntry[] = [];
    for (let at = 0; at < tokens.length; at++) {
        const token = tokens[at];
        if (token === 'END') break;
        if (token.startsWith('P\t')) {
            index = Number(token.slice(2));
            current = [];
        } else if (token.startsWith('S\t')) {
            if (index >= 0 && index < count) results[index] = token.slice(2) === '0' ? current : null;
        } else {
            const [type, mode, mtime, size] = token.split('\t');
            const linkTarget = tokens[at + 1] ?? '';
            const rel = tokens[at + 2] ?? '';
            at += 2;
            const kind = type === 'f' ? 'file' : type === 'd' ? 'dir' : type === 'l' ? 'link' : null;
            if (!kind) continue;
            current.push({
                kind,
                rel,
                size: Number.parseInt(size, 10) || 0,
                mtimeMs: Math.round((Number.parseFloat(mtime) || 0) * 1000),
                mode: Number.parseInt(mode, 8) || 0,
                linkTarget,
            });
        }
    }
    return results;
}

/** ファイルの一部を base64 で出力するスクリプト。offset は 0 始まり。 */
export function buildReadChunkScript(path: string, offset: number, length: number): string {
    return mainScript(String.raw`p=${shellQuote(path)}
if [ ! -f "$p" ]; then printf 'E ENOENT\n'; return 0; fi
printf 'OK\n'
tail -c +${offset + 1} -- "$p" | head -c ${length} | base64`);
}

/** ファイルの sha256 を出力するスクリプト。 */
export function buildSumScript(path: string): string {
    return mainScript(String.raw`p=${shellQuote(path)}
if sum=$(adk_sha "$p"); then printf 'OK %s\n' "$sum"; else printf 'E EIO\n'; fi`);
}

// ---- 取り込み ----

/** 取り込み先と作業用ディレクトリ。 */
export interface InstallStaging {
    // 取り込み先の実体のパス
    dest: string;
    staging: string;
}

/**
 * 取り込み先を作り、作業用ディレクトリを作るスクリプト。outside のときは作業用ディレクトリを取り込み先の実体の親に作る。
 * 取り込み先とその親に残った古い作業用ディレクトリを片付ける。退避したものが残っているものは削除しない。
 */
export function buildInstallBeginScript(dest: string, outside: boolean): string {
    return mainScript(String.raw`dest=${shellQuote(dest)}
msg=$(LC_ALL=C mkdir -p -- "$dest" 2>&1) || { printf 'E %s\n' "$(adk_errno "$msg")"; return 0; }
real=$(readlink -f -- "$dest") || real=$dest
parent=$real
if [ ${outside ? 1 : 0} = 1 ]; then
    parent=${PARENT_OF_REAL}
    [ -n "$parent" ] || parent=$real
fi
adk_sweep() {
    find -P "$1" -mindepth 1 -maxdepth 1 -type d -name '${STAGING_PREFIX}*' -mmin +${STALE_STAGING_MINUTES} -print0 2>/dev/null |
    while IFS= read -r -d '' old; do
        if [ -e "$old/old" ] || [ -L "$old/old" ]; then continue; fi
        rm -rf -- "$old"
    done
}
adk_sweep "$real"
[ "$parent" = "$real" ] || adk_sweep "$parent"
msg=$(LC_ALL=C mktemp -d "$parent/${STAGING_PREFIX}XXXXXX" 2>&1) || { printf 'E %s\n' "$(adk_errno "$msg")"; return 0; }
staging=$msg
msg=$(LC_ALL=C mkdir -- "$staging/new" 2>&1) || { rm -rf -- "$staging"; printf 'E %s\n' "$(adk_errno "$msg")"; return 0; }
printf 'OK %s %s\n' "$(adk_b64 "$real")" "$(adk_b64 "$staging")"`);
}

/** 作業用ディレクトリを作るスクリプトの出力を解釈する。失敗なら例外を投げる。 */
export function parseInstallBeginOutput(out: Buffer): InstallStaging {
    const [status, real, staging] = splitHeader(out).header.split(' ');
    if (status === 'OK' && real && staging) {
        return { dest: decodeBase64Text(real), staging: decodeBase64Text(staging) };
    }
    throw Object.assign(new Error(`Failed to prepare the upload: ${real ?? status}`), { code: real ?? 'EWSLOUTPUT' });
}

/** 作業用ディレクトリへ書く 1 つの断片。bytes が null ならディレクトリを作る。append は前の断片の続き。 */
export interface InstallChunk {
    relPath: string;
    bytes: Buffer | null;
    append: boolean;
}

/** 断片を作業用ディレクトリへ書き出すスクリプトと、その本文。本文は base64 にしてスクリプトの後ろの標準入力で渡す。 */
export function buildInstallWriteScript(
    staging: string,
    chunks: readonly InstallChunk[]
): { script: string; input: Buffer } {
    const inputs: Buffer[] = [];
    const steps = chunks.map(chunk => {
        const target = `f="$inc"/${shellQuote(chunk.relPath)}`;
        if (chunk.bytes === null) {
            return `${target}\nmkdir -p -- "$f" || { printf 'E EIO\\n'; return 0; }`;
        }
        const encoded = Buffer.from(chunk.bytes.toString('base64'), 'latin1');
        inputs.push(encoded);
        const redirect = chunk.append ? '>>' : '>';
        return [
            target,
            `mkdir -p -- "${PARENT_OF_FILE}" || { printf 'E EIO\\n'; return 0; }`,
            `head -c ${encoded.length} <&3 | base64 -d ${redirect} "$f" || { printf 'E EIO\\n'; return 0; }`,
        ].join('\n');
    });
    return {
        script: streamingMainScript(`inc=${shellQuote(staging)}/new\n${steps.join('\n')}\nprintf 'OK\\n'`),
        input: Buffer.concat(inputs),
    };
}

/** 書き出しのスクリプトの出力を確かめる。失敗なら例外を投げる。 */
export function assertInstallWritten(out: Buffer): void {
    const { header } = splitHeader(out);
    if (header !== 'OK') throw new Error(`Failed to send the upload: ${header}`);
}

/** 取り込むファイルの確認の内容。 */
export interface InstallVerify {
    relPath: string;
    // ファイルの sha256。ディレクトリは null。
    sum: string | null;
    mtimeMs: number | null;
}

/** 取り込みを確定するスクリプトの入力。 */
export interface InstallCommit {
    staging: string;
    dest: string;
    items: readonly string[];
    replace: ReadonlySet<string>;
    verify: readonly InstallVerify[];
    // 既にある対象がリンクでも置き換える。
    replaceLinks: boolean;
}

/** 更新日時を touch の形にする。 */
function touchTime(mtimeMs: number): string {
    return `@${(mtimeMs / 1000).toFixed(3)}`;
}

/**
 * 取り込みを確定するスクリプト。書き出したファイルの sha256 を確かめ、更新日時を設定してから、取り込み対象を所定の場所へ移す。
 * 既にある対象は、replace に含まれリンクではない場合だけ作業用ディレクトリへ退避して置き換え、すべて移し終えてから作業用ディレクトリを消す。
 * 確かめられなかった場合と移せなかった場合は、移したものを取り除いて退避したものを戻す。戻せなければ作業用ディレクトリを残し、
 * E の行の 3 番目の値に退避先を base64 で出力する。
 */
export function buildInstallCommitScript(commit: InstallCommit): string {
    const verify = commit.verify
        .flatMap(({ relPath, sum }) =>
            sum === null
                ? []
                : [
                      `f="$inc"/${shellQuote(relPath)}`,
                      `[ "$(adk_sha "$f")" = ${shellQuote(sum)} ] || { adk_finish_fail EINTEGRITY; return 0; }`,
                  ]
        )
        .join('\n');
    const touchFiles = commit.verify.filter(item => item.mtimeMs !== null && item.sum !== null);
    const touchDirs = commit.verify.filter(item => item.mtimeMs !== null && item.sum === null);
    const touches = [...touchFiles, ...touchDirs]
        .map(
            item => `touch -m -d ${touchTime(item.mtimeMs as number)} -- "$inc"/${shellQuote(item.relPath)} 2>/dev/null`
        )
        .join('\n');
    const moves = commit.items
        .map(item => `adk_place ${shellQuote(item)} ${commit.replace.has(item) ? 1 : 0} || return 0`)
        .join('\n');
    return mainScript(String.raw`staging=${shellQuote(commit.staging)}
dest=${shellQuote(commit.dest)}
inc="$staging/new"
saved="$staging/old"
moved_targets=()
moved_backups=()
moved_placed=()
created=()
adk_rollback() {
    adk_ok=0
    i=${LAST_INDEX}
    while [ "$i" -ge 0 ]; do
        if [ "${MOVED_PLACED_AT}" = 1 ]; then
            rm -rf -- "${MOVED_TARGET_AT}" 2>/dev/null
            if [ -e "${MOVED_TARGET_AT}" ] || [ -L "${MOVED_TARGET_AT}" ]; then adk_ok=1; i=$((i - 1)); continue; fi
        fi
        if [ -n "${MOVED_BACKUP_AT}" ]; then
            mv -- "${MOVED_BACKUP_AT}" "${MOVED_TARGET_AT}" 2>/dev/null || adk_ok=1
        fi
        i=$((i - 1))
    done
    i=${CREATED_LAST_INDEX}
    while [ "$i" -ge 0 ]; do
        rm -rf -- "${CREATED_AT}" 2>/dev/null
        i=$((i - 1))
    done
    return $adk_ok
}
adk_finish_fail() {
    if adk_rollback; then
        rm -rf -- "$staging"
        printf 'E %s\n' "$1"
    else
        printf 'E %s %s\n' "$1" "$(adk_b64 "$saved")"
    fi
}
adk_place() {
    src="$inc/$1"
    if [ ! -e "$src" ] && [ ! -L "$src" ]; then return 0; fi
    target="$dest/$1"
    backup=
    if [ -e "$target" ] || [ -L "$target" ]; then
        if [ "$2" != 1 ]${commit.replaceLinks ? '' : ' || [ -L "$target" ]'}; then adk_finish_fail EEXIST; return 1; fi
        backup="$saved/$1"
        msg=$(LC_ALL=C mkdir -p -- "${PARENT_OF_BACKUP}" 2>&1) || { adk_finish_fail "$(adk_errno "$msg")"; return 1; }
        msg=$(LC_ALL=C mv -- "$target" "$backup" 2>&1) || { adk_finish_fail "$(adk_errno "$msg")"; return 1; }
    else
        missing=${PARENT_OF_TARGET}
        top=
        while [ -n "$missing" ] && [ ! -e "$missing" ]; do
            top=$missing
            missing=${PARENT_OF_MISSING}
        done
        [ -z "$top" ] || created+=("$top")
        msg=$(LC_ALL=C mkdir -p -- "${PARENT_OF_TARGET}" 2>&1) || { adk_finish_fail "$(adk_errno "$msg")"; return 1; }
    fi
    moved_targets+=("$target")
    moved_backups+=("$backup")
    moved_placed+=(0)
    msg=$(LC_ALL=C mv -- "$src" "$target" 2>&1) || { adk_finish_fail "$(adk_errno "$msg")"; return 1; }
    moved_placed[${LAST_INDEX}]=1
    return 0
}
${verify}
${touches}
${moves}
rm -rf -- "$staging" 2>/dev/null
printf 'OK\n'`);
}

/** 取り込みを確定するスクリプトの出力を確かめる。失敗なら例外を投げる。退避先を残した場合はログに残す。 */
export function assertInstallCommitted(out: Buffer): void {
    const [status, code, kept] = splitHeader(out).header.split(' ');
    if (status === 'OK') return;
    if (kept) console.error(`Failed to restore replaced items; they remain in ${decodeBase64Text(kept)}`);
    throw Object.assign(new Error(`Failed to finish the upload: ${code ?? status}`), { code: code ?? 'EWSLOUTPUT' });
}

/** 作業用ディレクトリを消すスクリプト。 */
export function buildInstallAbortScript(staging: string): string {
    return mainScript(`rm -rf -- ${shellQuote(staging)} 2>/dev/null\nprintf 'OK\\n'`);
}

// ---- 移動 ----

/** ファイルかフォルダーかリンクを移動するスクリプト。移動先が既にあれば EXISTS を出力して何も変えない。親のフォルダーは作る。 */
export function buildMoveScript(from: string, to: string): string {
    return mainScript(String.raw`from=${shellQuote(from)}
to=${shellQuote(to)}
adk_lstat "$from"
case "$adk_state" in
    missing) printf 'MISSING\n'; return 0 ;;
    error) printf 'E %s\n' "$adk_err"; return 0 ;;
esac
adk_lstat "$to"
case "$adk_state" in
    present) printf 'EXISTS\n'; return 0 ;;
    error) printf 'E %s\n' "$adk_err"; return 0 ;;
esac
msg=$(LC_ALL=C mkdir -p -- "${PARENT_OF_TO}" 2>&1) || { printf 'E %s\n' "$(adk_errno "$msg")"; return 0; }
msg=$(LC_ALL=C mv -T -- "$from" "$to" 2>&1) || { printf 'E %s\n' "$(adk_errno "$msg")"; return 0; }
printf 'OK\n'`);
}

/** パスがシンボリックリンクかを出力するスクリプト。 */
export function buildIsLinkScript(path: string): string {
    return mainScript(String.raw`if [ -L ${shellQuote(path)} ]; then printf 'L\n'; else printf 'N\n'; fi`);
}
