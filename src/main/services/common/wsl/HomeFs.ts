import { existsSync, lstatSync, mkdirSync, readFileSync, renameSync, unlinkSync, readdirSync, statSync } from 'fs';
import { readFile, realpath, stat } from 'fs/promises';
import { homedir } from 'os';
import { dirname, join } from 'path';
import { AgentEnvironment } from '../../../../shared/agents/types';
import { recursiveDirStats, type DirStats } from '../../../utils/fsSize';
import type { StagedFile, StagedInstallOptions } from '../assets/stagedInstall';
import {
    codeOf,
    deleteFileStrict,
    listTreeLocal,
    readFileStrict,
    removeEmptyDirs,
    renameFileViaTemp,
    revisionOf,
    statFileLocal,
    writeFileAtomic,
    type AtomicWrite,
    type FileStat,
    type ListedTree,
    type StrictDelete,
    type StrictRead,
    type StrictRename,
} from '../fs/atomicFile';
import { findLocalLinkBelowRoot, type LinkBelowRoot } from '../fs/profilePathSafety';
import { isLinkOrUnknown, removeTreeBestEffort } from '../fs/removeTreeBestEffort';
import {
    buildDeleteScript,
    buildExistsScript,
    buildLinkBelowRootScript,
    buildListScript,
    buildReadManyScript,
    buildReadScript,
    buildRealPathScript,
    buildRemoveEmptyDirsScript,
    buildRenameScript,
    buildStatScript,
    buildStreamedWriteScript,
    buildWriteScript,
    parseDeleteOutput,
    parseExistsOutput,
    parseLinkBelowRootOutput,
    parseListOutput,
    parseReadManyOutput,
    parseReadOutput,
    parseRealPathOutput,
    parseRenameOutput,
    parseStatOutput,
    parseWriteOutput,
    splitHeader,
    shellQuote,
} from './wslFileScripts';
import {
    assertInstallCommitted,
    assertInstallWritten,
    buildArchiveListScript,
    buildInstallAbortScript,
    buildInstallBeginScript,
    buildInstallCommitScript,
    buildInstallWriteScript,
    buildIsLinkScript,
    buildMoveScript,
    buildReadChunkScript,
    buildSumScript,
    parseArchiveListOutput,
    parseInstallBeginOutput,
    type ArchiveListEntry,
    type InstallChunk,
} from './wslTransferScripts';
import { WslDetector } from './WslDetector';

// distro 内で 1 つのパス（変数 p）を削除するスクリプト。起点がシンボリックリンクなら何もしない。
// rm は配下のシンボリックリンクを辿らない。--one-file-system（GNU coreutils）があれば別のファイルシステムへも降りない。
// 出力は R（削除済み・もともと無い）か K（残っている）。
const WSL_REMOVE_TREE_SCRIPT = [
    'if [ ! -L "$p" ] && [ -e "$p" ]; then',
    '    if rm --help 2>&1 | grep -q -- --one-file-system; then rm -rf --one-file-system -- "$p" 2>/dev/null; else rm -rf -- "$p" 2>/dev/null; fi',
    'fi',
    'if [ -e "$p" ] || [ -L "$p" ]; then echo K; else echo R; fi',
].join('\n');

// ホームの外を指す相対パスのエラーコード。
const UNSAFE_REL_CODE = 'EUNSAFEPATH';

// distro から 1 回のスクリプトで読むファイルの合計の大きさと数の上限。これより大きなファイルは分けて読む。
const READ_BATCH_BYTES = 48 * 1024 * 1024;
const READ_BATCH_FILES = 128;
// distro へ 1 回のスクリプトで渡す本文の大きさの上限。これより大きなファイルは分けて渡す。
const INSTALL_BATCH_BYTES = 32 * 1024 * 1024;
// 書き込みの本文をスクリプトの中に書く大きさの上限。bash はスクリプトを 1 バイトずつ読むので、これより大きな本文は後ろの標準入力で渡す。
const INLINE_WRITE_MAX_BYTES = 1024 * 1024;

/** ZIP へ入れるエントリ 1 つ。name は ZIP の中の名前。 */
export interface ArchiveItem {
    kind: 'dir' | 'file' | 'link';
    name: string;
    mtimeMs: number;
    mode: number;
    bytes?: Buffer;
    linkTarget?: string;
}

/** ZIP へ入れるファイルの本文と更新日時。 */
export interface ArchiveFile {
    bytes: Buffer;
    mtimeMs: number;
}

/** 取り込みの内容を、大きさの上限ごとの断片のまとまりに分ける。 */
function installBatches(files: readonly StagedFile[]): InstallChunk[][] {
    const batches: InstallChunk[][] = [];
    let current: InstallChunk[] = [];
    let currentBytes = 0;
    const push = (chunk: InstallChunk, size: number) => {
        if (current.length > 0 && currentBytes + size > INSTALL_BATCH_BYTES) {
            batches.push(current);
            current = [];
            currentBytes = 0;
        }
        current.push(chunk);
        currentBytes += size;
    };
    for (const { relPath, bytes } of files) {
        if (bytes === null) {
            push({ relPath, bytes: null, append: false }, 0);
            continue;
        }
        if (bytes.length === 0) push({ relPath, bytes, append: false }, 0);
        for (let at = 0; at < bytes.length; at += INSTALL_BATCH_BYTES) {
            const part = bytes.subarray(at, at + INSTALL_BATCH_BYTES);
            push({ relPath, bytes: part, append: at > 0 }, part.length);
        }
    }
    if (current.length > 0) batches.push(current);
    return batches;
}

/** ホームの外を指し得る相対パスか。 */
function isUnsafeRel(relPath: string): boolean {
    return relPath.includes('\0') || relPath.split(/[\\/]/).includes('..');
}

/**
 * AgentEnvironment（native / wsl）に対するファイル操作を抽象化する。
 *
 * - native: os.homedir() を基点に通常の fs を使用。
 * - wsl: 厳密な読み取り・原子的な書き込み・削除・移動・一覧・リンクの判定・ZIP の内容の読み取りと取り込みは、
 *        UNC に届くかにかかわらず distro 内のスクリプトで行う（UNC 越しではリンクの判定と rename の原子性に頼れないため）。
 *        `exists` などの残りの読み取りは \\wsl.localhost\<distro>\<home> か \\wsl$\<distro>\<home> の UNC を優先し、
 *        どちらにも届かなければ wsl コマンドで行う。
 *
 * relPath はすべて Linux ホームからの相対パス（例: '.claude.json', '.codex/config.toml'）。
 */
export class HomeFs {
    private readonly env: AgentEnvironment;
    private readonly detector: WslDetector;

    // WSL 用に解決済みの UNC 基点（例: \\wsl.localhost\Ubuntu-24.04\home\yendo）。
    // null = 未解決、'' = UNC 不可（コマンドモードを使う）。
    private uncBase: string | null = null;

    constructor(env: AgentEnvironment, detector: WslDetector) {
        this.env = env;
        this.detector = detector;
    }

    private get isWsl(): boolean {
        return this.env.kind === 'wsl';
    }

    /** ファイル操作を distro のスクリプトで行う環境か。 */
    get usesDistro(): boolean {
        return this.isWsl;
    }

    /** この環境のファイルに届くか。native は常に届き、WSL はホームを解決できれば届く。 */
    async isReachable(): Promise<boolean> {
        if (!this.isWsl) return true;
        try {
            await this.linuxPath('');
            return true;
        } catch {
            return false;
        }
    }

    private get distro(): string {
        if (!this.env.distro) {
            throw new Error('WSL environment requires a distro name');
        }
        return this.env.distro;
    }

    /**
     * WSL の UNC 基点を解決する。到達できない場合は '' を返し、コマンドモードへ切り替える。
     */
    private async resolveUncBase(): Promise<string> {
        if (this.uncBase !== null) {
            return this.uncBase;
        }
        const distro = this.distro;
        let home: string;
        try {
            home = await this.detector.resolveHome(distro);
        } catch {
            home = '';
        }
        if (home) {
            // Linux パス /home/user を Windows UNC の相対部分に変換
            const rel = home.replace(/^\//, '').replace(/\//g, '\\');
            const candidates = [`\\\\wsl.localhost\\${distro}\\${rel}`, `\\\\wsl$\\${distro}\\${rel}`];
            for (const base of candidates) {
                try {
                    if (existsSync(base)) {
                        this.uncBase = base;
                        return base;
                    }
                } catch {
                    // 次の候補へ
                }
            }
        }
        // UNC 不可 → コマンドモード
        this.uncBase = '';
        return '';
    }

    /** native のホーム基点 */
    private nativeBase(): string {
        return homedir();
    }

    /**
     * relPath を実 OS パス（native の絶対パス、または WSL UNC の絶対パス）に解決する。
     * コマンドモードが必要な場合は null を返す。
     */
    private async resolveAbs(relPath: string): Promise<string | null> {
        if (!this.isWsl) {
            return join(this.nativeBase(), relPath);
        }
        const base = await this.resolveUncBase();
        if (!base) {
            return null; // コマンドモード
        }
        const rel = relPath.replace(/\//g, '\\');
        return `${base}\\${rel}`;
    }

    /**
     * この OS のプロセスから見えるパス（native 絶対パス / WSL UNC パス）を返す。WSL で UNC に届かない場合は null。
     */
    async resolveRealPath(relPath: string): Promise<string | null> {
        return this.resolveAbs(relPath);
    }

    /** relPath のリンクをすべてたどった実体の distro 内のパス。たどれなければ null。 */
    private async canonicalLinuxPath(relPath: string): Promise<string | null> {
        try {
            const script = buildRealPathScript(await this.linuxPath(relPath));
            return parseRealPathOutput(await this.detector.runMarkedScriptInDistro(this.distro, script));
        } catch {
            return null;
        }
    }

    /**
     * relPath の実体を指す比較用の文字列を返す。同じ実体なら同じ値になる。リンク切れと未作成は null。
     * 文字列はこの環境の中でだけ比較できる。
     */
    async realPathKey(relPath: string): Promise<string | null> {
        if (isUnsafeRel(relPath)) return null;
        if (this.isWsl) return this.canonicalLinuxPath(relPath);
        try {
            const real = await realpath(join(this.nativeBase(), relPath));
            return process.platform === 'win32' ? real.toLowerCase() : real;
        } catch {
            return null;
        }
    }

    /**
     * relPath のリンクをすべてたどった実体の、環境の中の絶対パス（native は OS のパス、WSL は distro の中のパス）を返す。
     * リンク切れと未作成は null。
     */
    async resolveFollowedPath(relPath: string): Promise<string | null> {
        if (isUnsafeRel(relPath)) return null;
        if (this.isWsl) return this.canonicalLinuxPath(relPath);
        try {
            return await realpath(join(this.nativeBase(), relPath));
        } catch {
            return null;
        }
    }

    /** distro 内で使う Linux 絶対パス。ホームが '/' で始まらない場合は例外を投げる。 */
    private async linuxPath(relPath: string): Promise<string> {
        const home = await this.detector.resolveHome(this.distro);
        if (!home.startsWith('/')) {
            throw Object.assign(new Error(`The WSL home directory is not usable (${this.distro})`), {
                code: 'EWSLHOME',
            });
        }
        return `${home}/${relPath}`;
    }

    /** 表示用のパス文字列（実際のアクセス可否に関わらず人間に分かる形） */
    async displayPath(relPath: string): Promise<string> {
        if (!this.isWsl) {
            return join(this.nativeBase(), relPath);
        }
        try {
            return await this.linuxPath(relPath);
        } catch {
            return `~/${relPath}`;
        }
    }

    /**
     * パスが存在するか。コマンドモードは test -e の終了コードが 1 のときだけ存在しないものとし、
     * それ以外の失敗（distro を実行できないなど）は例外を投げる。
     */
    async exists(relPath: string): Promise<boolean> {
        const abs = await this.resolveAbs(relPath);
        if (abs !== null) {
            return existsSync(abs);
        }
        // コマンドモード
        const out = await this.detector.runMarkedScriptInDistro(
            this.distro,
            buildExistsScript(await this.linuxPath(relPath))
        );
        const exitCode = parseExistsOutput(out);
        if (exitCode === 0) return true;
        if (exitCode === 1) return false;
        throw new Error(`Failed to check ${relPath} (${JSON.stringify(this.env)}): exit code ${exitCode}`);
    }

    /** パスの種別、サイズ、権限、書き込めるかを返す。リンクはリンク先を調べ、リンク切れは未作成として返す。 */
    async statFile(relPath: string): Promise<FileStat> {
        if (isUnsafeRel(relPath)) return { kind: 'error', code: UNSAFE_REL_CODE };
        if (!this.isWsl) return statFileLocal(join(this.nativeBase(), relPath));
        try {
            const script = buildStatScript(await this.linuxPath(relPath));
            return parseStatOutput(await this.detector.runMarkedScriptInDistro(this.distro, script));
        } catch (error) {
            return { kind: 'error', code: codeOf(error, 'EWSL') };
        }
    }

    /**
     * 生のテキストファイルを読み込む（JSON.parse せず、trim もしない）。存在しない場合と読めない場合はどちらも null なので、
     * 欠損が無害な読み取り専用の用途に限る。未作成とエラーを区別する必要がある読み取りには readTextStrict を使う。
     */
    async readText(relPath: string): Promise<string | null> {
        const abs = await this.resolveAbs(relPath);
        try {
            if (abs !== null) {
                if (!existsSync(abs)) {
                    return null;
                }
                return readFileSync(abs, 'utf-8');
            }
            // コマンドモード
            const lp = await this.linuxPath(relPath);
            const exists = await this.exists(relPath);
            if (!exists) {
                return null;
            }
            const buf = await this.detector.runInDistro(this.distro, `cat ${shellQuote(lp)}`);
            return buf.toString('utf8');
        } catch (error) {
            console.error(`Failed to read text from ${relPath} (${JSON.stringify(this.env)}):`, error);
            return null;
        }
    }

    /**
     * 生のテキストを原子的に書き込む（content をそのまま、バイト忠実に。改行コードを保持）。
     * 現在の内容とは比較せず、リンク切れと書き込みの失敗は例外を投げる。
     */
    async writeText(relPath: string, content: string): Promise<void> {
        const result = await this.writeBytes(relPath, Buffer.from(content, 'utf8'));
        if (result.kind === 'ok') return;
        const code = result.kind === 'error' ? result.code : 'EDANGLINGLINK';
        throw Object.assign(new Error(`Failed to write ${relPath} (${JSON.stringify(this.env)}): ${code}`), { code });
    }

    /** ファイルを厳密に読む。未作成、リンク切れ、読み取りエラーを区別して返す。 */
    async readTextStrict(relPath: string): Promise<StrictRead> {
        if (isUnsafeRel(relPath)) return { kind: 'error', code: UNSAFE_REL_CODE };
        if (!this.isWsl) return readFileStrict(join(this.nativeBase(), relPath));
        try {
            const script = buildReadScript(await this.linuxPath(relPath));
            const first = parseReadOutput(await this.detector.runMarkedScriptInDistro(this.distro, script));
            // 読み取りの途中でファイルが置き換わると本文と sha256 が合わないので、1 回だけ読み直す。
            if (first.kind !== 'error' || first.code !== 'EINTEGRITY') return first;
            return parseReadOutput(await this.detector.runMarkedScriptInDistro(this.distro, script));
        } catch (error) {
            return { kind: 'error', code: codeOf(error, 'EWSL') };
        }
    }

    /** ホームの外を含む環境の中の絶対パスのファイルを厳密に読む。 */
    async readAbsoluteStrict(path: string): Promise<StrictRead> {
        if (!this.isWsl) return readFileStrict(path);
        try {
            const out = await this.detector.runMarkedScriptInDistro(this.distro, buildReadScript(path));
            return parseReadOutput(out);
        } catch (error) {
            return { kind: 'error', code: codeOf(error, 'EWSL') };
        }
    }

    /** 環境の中の絶対パスのファイルを 1 回のスクリプトでまとめて厳密に読む。読み取りの途中で置き換わったファイルは読み直す。 */
    private async readAbsoluteMany(paths: readonly string[]): Promise<StrictRead[]> {
        const out = await this.detector.runMarkedScriptInDistro(this.distro, buildReadManyScript(paths));
        const reads = parseReadManyOutput(out, paths.length);
        return Promise.all(
            reads.map((read, index) =>
                read.kind === 'error' && read.code === 'EINTEGRITY' ? this.readAbsoluteStrict(paths[index]) : read
            )
        );
    }

    /**
     * 複数のファイルを厳密に読み、相対パスごとの結果を返す。WSL は 1 回のスクリプトの実行でまとめて読む。
     * スクリプトを実行できなければ全件をエラーにする。
     */
    async readTextStrictMany(relPaths: readonly string[]): Promise<Map<string, StrictRead>> {
        const unique = [...new Set(relPaths)];
        const results = new Map<string, StrictRead>();
        if (!this.isWsl) {
            await Promise.all(unique.map(async rel => results.set(rel, await this.readTextStrict(rel))));
            return results;
        }
        const safe = unique.filter(rel => {
            if (!isUnsafeRel(rel)) return true;
            results.set(rel, { kind: 'error', code: UNSAFE_REL_CODE });
            return false;
        });
        if (safe.length === 0) return results;
        try {
            const paths = await Promise.all(safe.map(rel => this.linuxPath(rel)));
            const reads = await this.readAbsoluteMany(paths);
            safe.forEach((rel, index) => results.set(rel, reads[index]));
        } catch (error) {
            for (const rel of safe) results.set(rel, { kind: 'error', code: codeOf(error, 'EWSL') });
        }
        return results;
    }

    /**
     * 渡された内容をそのまま原子的に書き込む（BOM と改行は変換しない）。
     * expectedRevision は開いた時点の revision（未作成は MISSING_REVISION）で、現在の内容と違えば conflict を返して書かない。
     * シンボリックリンクは実体へ書いてリンクを残す。リンク切れは dangling-link で止める。ハードリンクはその場で書く。
     */
    async writeTextAtomic(
        relPath: string,
        content: string | Buffer,
        options: { expectedRevision: string }
    ): Promise<AtomicWrite> {
        const bytes = typeof content === 'string' ? Buffer.from(content, 'utf8') : content;
        return this.writeBytes(relPath, bytes, options.expectedRevision);
    }

    /** バイト列を原子的に書き込む。expectedRevision を省略すると現在の内容と比較しない。 */
    private async writeBytes(relPath: string, bytes: Buffer, expectedRevision?: string): Promise<AtomicWrite> {
        if (isUnsafeRel(relPath)) return { kind: 'error', code: UNSAFE_REL_CODE };
        if (!this.isWsl) return writeFileAtomic(join(this.nativeBase(), relPath), bytes, { expectedRevision });
        try {
            const path = await this.linuxPath(relPath);
            if (bytes.length <= INLINE_WRITE_MAX_BYTES) {
                const script = buildWriteScript(path, bytes, expectedRevision);
                return parseWriteOutput(await this.detector.runMarkedScriptInDistro(this.distro, script));
            }
            const { script, input } = buildStreamedWriteScript(path, bytes, expectedRevision);
            return parseWriteOutput(await this.detector.runMarkedScriptInDistro(this.distro, script, input));
        } catch (error) {
            return { kind: 'error', code: codeOf(error, 'EWSL') };
        }
    }

    /**
     * ファイルかシンボリックリンクを 1 つ削除する。リンクはリンク自体だけを消す。ディレクトリはエラーにする。
     * expectedRevision を渡すと現在の内容と比較し、違えば conflict を返して消さない。
     * リンク切れの revision は DANGLING_LINK_REVISION、未作成は MISSING_REVISION。
     */
    async deleteStrict(relPath: string, expectedRevision?: string): Promise<StrictDelete> {
        if (isUnsafeRel(relPath)) return { kind: 'error', code: UNSAFE_REL_CODE };
        if (!this.isWsl) return deleteFileStrict(join(this.nativeBase(), relPath), expectedRevision);
        try {
            const script = buildDeleteScript(await this.linuxPath(relPath), expectedRevision);
            return parseDeleteOutput(await this.detector.runMarkedScriptInDistro(this.distro, script));
        } catch (error) {
            return { kind: 'error', code: codeOf(error, 'EWSL') };
        }
    }

    /**
     * 同じディレクトリの中でファイルかリンクの名前を、一時名を経由して変える。リンクはリンク自体の名前を変える。
     * toRel が fromRel と別の実体として既にあれば何も変えず exists を返す。
     */
    async renameViaTemp(fromRel: string, toRel: string): Promise<StrictRename> {
        if (isUnsafeRel(fromRel) || isUnsafeRel(toRel)) return { kind: 'error', code: UNSAFE_REL_CODE };
        if (!this.isWsl) {
            return renameFileViaTemp(join(this.nativeBase(), fromRel), join(this.nativeBase(), toRel));
        }
        try {
            const script = buildRenameScript(await this.linuxPath(fromRel), await this.linuxPath(toRel));
            return parseRenameOutput(await this.detector.runMarkedScriptInDistro(this.distro, script));
        } catch (error) {
            return { kind: 'error', code: codeOf(error, 'EWSL') };
        }
    }

    /**
     * ディレクトリ直下のエントリ一覧。起点はリンクでもたどる。
     * 作業用のエントリ（取り込みの作業ディレクトリ・原子的な書き込みの一時ファイル）は含めない。
     */
    async listEntries(relPath: string): Promise<ListedTree> {
        return this.listBelow(relPath, 0, false);
    }

    /**
     * ディレクトリ配下のエントリ一覧。起点はリンクでもたどり、配下のディレクトリへのリンクはたどらず印だけ付ける。
     * maxDepth は一覧する深さの上限（0 は直下のみ）で、それより下にエントリがあれば truncated にする。
     * 作業用のエントリ（取り込みの作業ディレクトリ・原子的な書き込みの一時ファイル）は含めない。
     */
    async listTree(relPath: string, options: { maxDepth: number }): Promise<ListedTree> {
        return this.listBelow(relPath, options.maxDepth, true);
    }

    /** 一覧の共通処理。detectTruncation のとき、上限の深さのディレクトリに中身があれば truncated にする。 */
    private async listBelow(relPath: string, maxDepth: number, detectTruncation: boolean): Promise<ListedTree> {
        if (!Number.isInteger(maxDepth) || maxDepth < 0) {
            throw new RangeError(`maxDepth must be a non-negative integer: ${maxDepth}`);
        }
        if (isUnsafeRel(relPath)) return { kind: 'error', code: UNSAFE_REL_CODE };
        if (!this.isWsl) return listTreeLocal(join(this.nativeBase(), relPath), maxDepth, detectTruncation);
        try {
            const findDepth = maxDepth + (detectTruncation ? 2 : 1);
            const script = buildListScript(await this.linuxPath(relPath), findDepth);
            return parseListOutput(await this.detector.runMarkedScriptInDistro(this.distro, script), maxDepth);
        } catch (error) {
            return { kind: 'error', code: codeOf(error, 'EWSL') };
        }
    }

    /**
     * relPath の親から stopAtRel の手前まで、空になったディレクトリを順に削除する（stopAtRel 自身は残す）。
     * リンク、空でないディレクトリに当たったらそこで止める。消せないことはエラーにしない。
     * stopAtRel が relPath の親の階層でなければ例外を投げ、何も削除しない。
     */
    async removeEmptyParents(relPath: string, stopAtRel: string): Promise<void> {
        const segments = relPath.split('/');
        const stop = stopAtRel.split('/');
        if (
            isUnsafeRel(relPath) ||
            segments.length <= stop.length ||
            !stop.every((segment, index) => segment === segments[index])
        ) {
            throw new Error(`${stopAtRel} is not an ancestor of ${relPath}`);
        }
        const dirs: string[] = [];
        for (let count = segments.length - 1; count > stop.length; count--) {
            dirs.push(segments.slice(0, count).join('/'));
        }
        if (dirs.length === 0) return;
        if (!this.isWsl) {
            await removeEmptyDirs(dirs.map(dir => join(this.nativeBase(), dir)));
            return;
        }
        try {
            const paths = await Promise.all(dirs.map(dir => this.linuxPath(dir)));
            await this.detector.runMarkedScriptInDistro(this.distro, buildRemoveEmptyDirsScript(paths));
        } catch (error) {
            console.error(`Failed to remove empty parents of ${relPath} (${JSON.stringify(this.env)}):`, error);
        }
    }

    /**
     * rootRel より下の相対パス（segments はセグメントの配列）の中間のセグメントにリンクがあるかを調べる。
     * rootRel 自身と最後のセグメントはリンクでもよい。
     */
    async findLinkBelowRoot(rootRel: string, segments: readonly string[]): Promise<LinkBelowRoot> {
        if (isUnsafeRel(rootRel) || segments.includes('..')) return { kind: 'error', code: UNSAFE_REL_CODE };
        if (!this.isWsl) return findLocalLinkBelowRoot(join(this.nativeBase(), rootRel), segments);
        const intermediate = segments.slice(0, -1);
        if (intermediate.length === 0) return { kind: 'none' };
        try {
            const script = buildLinkBelowRootScript(await this.linuxPath(rootRel), intermediate);
            const out = await this.detector.runMarkedScriptInDistro(this.distro, script);
            return parseLinkBelowRootOutput(out, intermediate);
        } catch (error) {
            return { kind: 'error', code: codeOf(error, 'EWSL') };
        }
    }

    /** ファイルかリンクを消す。無ければ何もしない。WSL はリンク切れも distro の中で消す。 */
    async deleteFile(relPath: string): Promise<void> {
        if (this.isWsl) {
            const lp = await this.linuxPath(relPath);
            await this.detector.runInDistro(this.distro, `rm -f ${shellQuote(lp)}`);
            return;
        }
        const abs = join(this.nativeBase(), relPath);
        if (existsSync(abs)) {
            unlinkSync(abs);
        }
    }

    /**
     * ファイルかフォルダーかリンクを移動する。リンクはリンク自体を移す。移動先の親のフォルダーは作る。
     * 移動先が既にあれば何も変えず exists を返す。
     */
    async moveEntry(fromRel: string, toRel: string): Promise<StrictRename> {
        if (isUnsafeRel(fromRel) || isUnsafeRel(toRel)) return { kind: 'error', code: UNSAFE_REL_CODE };
        try {
            if (this.isWsl) {
                const script = buildMoveScript(await this.linuxPath(fromRel), await this.linuxPath(toRel));
                return parseRenameOutput(await this.detector.runMarkedScriptInDistro(this.distro, script));
            }
            const from = join(this.nativeBase(), fromRel);
            const to = join(this.nativeBase(), toRel);
            if (lstatSync(to, { throwIfNoEntry: false })) return { kind: 'exists' };
            if (!lstatSync(from, { throwIfNoEntry: false })) return { kind: 'missing' };
            mkdirSync(dirname(to), { recursive: true });
            renameSync(from, to);
            return { kind: 'ok' };
        } catch (error) {
            return { kind: 'error', code: codeOf(error, this.isWsl ? 'EWSL' : 'EIO') };
        }
    }

    /** ディレクトリ内のサブディレクトリ名一覧（ファイルは除く） */
    async listDirs(relPath: string): Promise<string[]> {
        const abs = await this.resolveAbs(relPath);
        if (abs !== null) {
            if (!existsSync(abs)) {
                return [];
            }
            try {
                return readdirSync(abs, { withFileTypes: true })
                    .filter(d => d.isDirectory())
                    .map(d => d.name);
            } catch {
                return [];
            }
        }
        // コマンドモード
        try {
            const lp = await this.linuxPath(relPath);
            const buf = await this.detector.runInDistro(
                this.distro,
                `find ${shellQuote(lp)} -mindepth 1 -maxdepth 1 -type d -printf '%f\\n' 2>/dev/null || true`
            );
            return buf
                .toString('utf8')
                .split(/\r?\n/)
                .map(s => s.trim())
                .filter(s => s.length > 0);
        } catch {
            return [];
        }
    }

    /** ディレクトリ内のファイル名一覧（サブディレクトリは除く）。 */
    async listFiles(relPath: string): Promise<string[]> {
        const abs = await this.resolveAbs(relPath);
        if (abs !== null) {
            if (!existsSync(abs)) {
                return [];
            }
            try {
                return readdirSync(abs, { withFileTypes: true })
                    .filter(d => d.isFile())
                    .map(d => d.name);
            } catch {
                return [];
            }
        }
        // コマンドモード
        try {
            const lp = await this.linuxPath(relPath);
            const buf = await this.detector.runInDistro(
                this.distro,
                `find ${shellQuote(lp)} -mindepth 1 -maxdepth 1 -type f -printf '%f\\n' 2>/dev/null || true`
            );
            return buf
                .toString('utf8')
                .split(/\r?\n/)
                .map(s => s.trim())
                .filter(s => s.length > 0);
        } catch {
            return [];
        }
    }

    /** ディレクトリの再帰サイズ（バイト）とファイル数。存在しなければ {0,0}。 */
    async dirStats(relPath: string): Promise<DirStats> {
        const abs = await this.resolveAbs(relPath);
        if (abs !== null) {
            return recursiveDirStats(abs);
        }
        // コマンドモード: 通常のファイルだけのサイズの合計（バイト）/ ファイル数 /
        // フォルダ内ファイルの最終更新時刻の最大（秒）を取得する。起点のリンクはたどり、配下のリンクは数えない。
        try {
            const lp = await this.linuxPath(relPath);
            const buf = await this.detector.runInDistro(
                this.distro,
                `find -H ${shellQuote(lp)} -type f -printf '%s %T@\\n' 2>/dev/null | ` +
                    `awk '{ size += $1; count += 1; if ($2 > mtime) mtime = $2 } ` +
                    `END { printf "%.0f\\n%d\\n%.3f\\n", size, count, mtime }'`
            );
            const [sizeLine, countLine, mtimeLine] = buf.toString('utf8').split(/\r?\n/);
            const size = parseInt((sizeLine ?? '0').trim(), 10);
            const fileCount = parseInt((countLine ?? '0').trim(), 10);
            // %T@ は秒（小数あり）。ミリ秒に変換する。
            const mtimeSec = parseFloat((mtimeLine ?? '0').trim());
            return {
                size: Number.isFinite(size) ? size : 0,
                fileCount: Number.isFinite(fileCount) ? fileCount : 0,
                mtimeMs: Number.isFinite(mtimeSec) ? Math.round(mtimeSec * 1000) : 0,
            };
        } catch {
            return { size: 0, fileCount: 0, mtimeMs: 0 };
        }
    }

    /** ディレクトリの再帰サイズ（バイト）。存在しなければ 0。dirStats の薄いラッパー。 */
    async dirSize(relPath: string): Promise<number> {
        return (await this.dirStats(relPath)).size;
    }

    /** 単一ファイルのサイズ（バイト）とファイル数（存在すれば 1）。存在しなければ {0,0}。 */
    async fileStats(relPath: string): Promise<DirStats> {
        const abs = await this.resolveAbs(relPath);
        if (abs !== null) {
            try {
                const st = statSync(abs);
                return { size: st.size, fileCount: 1, mtimeMs: st.mtimeMs };
            } catch {
                return { size: 0, fileCount: 0, mtimeMs: 0 };
            }
        }
        // コマンドモード: stat -c %s（バイト数）・%Y（最終更新の秒）を取得。存在しなければサイズは -1。
        try {
            const lp = await this.linuxPath(relPath);
            const buf = await this.detector.runInDistro(
                this.distro,
                `stat -L -c '%s %Y' ${shellQuote(lp)} 2>/dev/null || echo '-1 0'`
            );
            const [sizeStr, mtimeStr] = buf.toString('utf8').trim().split(/\s+/);
            const size = parseInt((sizeStr ?? '-1').trim(), 10);
            const mtimeSec = parseInt((mtimeStr ?? '0').trim(), 10);
            const valid = Number.isFinite(size) && size >= 0;
            return {
                size: valid ? size : 0,
                fileCount: valid ? 1 : 0,
                mtimeMs: Number.isFinite(mtimeSec) ? mtimeSec * 1000 : 0,
            };
        } catch {
            return { size: 0, fileCount: 0, mtimeMs: 0 };
        }
    }

    /**
     * relPath がリンク（シンボリックリンク・ジャンクション）か、種別を判定できないものか。存在しない場合は false。
     * リンクの先は管理対象の外にあり得るため、配下を一覧・削除しない判断に使う。
     */
    async isLink(relPath: string): Promise<boolean> {
        if (!this.isWsl) return isLinkOrUnknown(join(this.nativeBase(), relPath));
        try {
            const script = buildIsLinkScript(await this.linuxPath(relPath));
            return splitHeader(await this.detector.runMarkedScriptInDistro(this.distro, script)).header !== 'N';
        } catch {
            return true;
        }
    }

    /**
     * ディレクトリをベストエフォートで削除する。
     * 使用中（ロック）などで一部が消せなくても、削除できたものは削除し、全削除できたかを返す。
     * 配下のリンクはリンク自体だけを外す。起点自体がリンクの場合は何も削除しない（removedAll は false）。
     */
    async removeDirBestEffort(relPath: string): Promise<{ removedAll: boolean }> {
        return { removedAll: await this.removeTree(relPath) };
    }

    /**
     * relPath を配下ごと削除し、すべて削除できた（もともと無かった場合を含む）かを返す。
     * WSL は Linux のシンボリックリンク・マウントの扱いを distro に任せるため、UNC ではなく distro 内の rm で削除する。
     */
    private async removeTree(relPath: string): Promise<boolean> {
        if (!this.isWsl) {
            return removeTreeBestEffort(join(this.nativeBase(), relPath));
        }
        const lp = await this.linuxPath(relPath);
        const out = await this.detector.runInDistro(this.distro, `p=${shellQuote(lp)}\n${WSL_REMOVE_TREE_SCRIPT}`);
        return out.toString('utf8').trim().split(/\r?\n/).pop() === 'R';
    }

    /** 大きなファイルを分けて読み、全体の sha256 を確かめる。読めなければ null。 */
    private async readLargeDistroFile(path: string, size: number): Promise<Buffer | null> {
        const parts: Buffer[] = [];
        for (let offset = 0; offset < size; offset += READ_BATCH_BYTES) {
            const script = buildReadChunkScript(path, offset, READ_BATCH_BYTES);
            const { header, rest } = splitHeader(await this.detector.runMarkedScriptInDistro(this.distro, script));
            if (header !== 'OK') return null;
            parts.push(Buffer.from(rest.toString('latin1'), 'base64'));
        }
        const bytes = Buffer.concat(parts);
        const sum = splitHeader(await this.detector.runMarkedScriptInDistro(this.distro, buildSumScript(path))).header;
        return sum === `OK ${revisionOf(bytes)}` ? bytes : null;
    }

    /** distro の中のファイルの本文をまとめて読む。読めなかったファイルは null。 */
    private async readDistroFiles(
        files: readonly { path: string; size: number }[]
    ): Promise<Map<string, Buffer | null>> {
        const results = new Map<string, Buffer | null>();
        let batch: string[] = [];
        let batchBytes = 0;
        const flush = async () => {
            if (batch.length === 0) return;
            const paths = batch;
            batch = [];
            batchBytes = 0;
            const reads = await this.readAbsoluteMany(paths);
            paths.forEach((path, index) => {
                const read = reads[index];
                results.set(path, read.kind === 'ok' ? read.bytes : null);
            });
        };
        for (const { path, size } of files) {
            if (size > READ_BATCH_BYTES) {
                results.set(path, await this.readLargeDistroFile(path, size));
                continue;
            }
            if (batch.length >= READ_BATCH_FILES || batchBytes + size > READ_BATCH_BYTES) await flush();
            batch.push(path);
            batchBytes += size;
        }
        await flush();
        return results;
    }

    /** distro の中の起点を ZIP へ入れるために一覧する。 */
    private async listDistroArchive(paths: readonly string[]): Promise<(ArchiveListEntry[] | null)[]> {
        const out = await this.detector.runMarkedScriptInDistro(this.distro, buildArchiveListScript(paths));
        return parseArchiveListOutput(out, paths.length);
    }

    /**
     * distro の中の起点（絶対パス）の配下を、ZIP へ入れるエントリとして返す。起点はリンクでもたどり、配下のリンクはリンクのまま入れる。
     * 読めないファイルがあれば例外を投げる。ZIP の中の名前は起点の name の下になる。
     */
    async distroArchiveItems(sources: readonly { source: string; name: string }[]): Promise<ArchiveItem[]> {
        const listings = await this.listDistroArchive(sources.map(source => source.source));
        const items: (ArchiveItem & { path: string; size: number })[] = [];
        sources.forEach(({ source, name }, index) => {
            const listing = listings[index];
            if (listing === null) throw new Error(`Failed to list ${source}`);
            for (const entry of listing) {
                items.push({
                    kind: entry.kind,
                    name: entry.rel === '' ? name : `${name}/${entry.rel}`,
                    mtimeMs: entry.mtimeMs,
                    mode: entry.mode,
                    path: entry.rel === '' ? source : `${source}/${entry.rel}`,
                    size: entry.size,
                    ...(entry.kind === 'link' ? { linkTarget: entry.linkTarget } : {}),
                });
            }
        });
        const files = items.filter(item => item.kind === 'file');
        const contents = await this.readDistroFiles(files);
        for (const file of files) {
            const bytes = contents.get(file.path);
            if (!bytes) throw new Error(`Failed to read ${file.path}`);
            file.bytes = bytes;
        }
        return items;
    }

    /** ZIP へ入れるファイルの本文と更新日時を読む。リンクはリンク先を読む。読めないファイルは結果に含めない。 */
    async readArchiveFiles(relPaths: readonly string[]): Promise<Map<string, ArchiveFile>> {
        const results = new Map<string, ArchiveFile>();
        if (!this.isWsl) {
            for (const rel of relPaths) {
                try {
                    const abs = join(this.nativeBase(), rel);
                    const [bytes, info] = await Promise.all([readFile(abs), stat(abs)]);
                    results.set(rel, { bytes, mtimeMs: info.mtimeMs });
                } catch {
                    // 読めないファイルは結果に含めない。
                }
            }
            return results;
        }
        const paths = await Promise.all(relPaths.map(rel => this.linuxPath(rel)));
        const listings = await this.listDistroArchive(paths);
        const files = paths.flatMap((path, index) => {
            const own = listings[index]?.find(entry => entry.rel === '' && entry.kind === 'file');
            return own ? [{ path, rel: relPaths[index], size: own.size, mtimeMs: own.mtimeMs }] : [];
        });
        const contents = await this.readDistroFiles(files);
        for (const { path, rel, mtimeMs } of files) {
            const bytes = contents.get(path);
            if (bytes) results.set(rel, { bytes, mtimeMs });
        }
        return results;
    }

    /**
     * 取り込みの内容を distro のスクリプトで destRel の配下へ置く。作業用ディレクトリへ送ってから sha256 を確かめて所定の場所へ移すので、
     * 送る途中で失敗すれば既存のものに触らず、移す途中で失敗すれば元に戻す。失敗すると例外を投げる。
     */
    async installFilesInDistro(
        destRel: string,
        items: readonly string[],
        replace: ReadonlySet<string>,
        files: readonly StagedFile[],
        options: StagedInstallOptions
    ): Promise<void> {
        const run = (script: string, input?: Buffer) =>
            this.detector.runMarkedScriptInDistro(this.distro, script, input);
        const begin = parseInstallBeginOutput(
            await run(buildInstallBeginScript(await this.linuxPath(destRel), options.stagingOutsideDest === true))
        );
        try {
            for (const batch of installBatches(files)) {
                const { script, input } = buildInstallWriteScript(begin.staging, batch);
                assertInstallWritten(await run(script, input));
            }
        } catch (error) {
            await run(buildInstallAbortScript(begin.staging)).catch(abortError => {
                console.error(`Failed to remove the staging directory ${begin.staging}:`, abortError);
            });
            throw error;
        }
        assertInstallCommitted(
            await run(
                buildInstallCommitScript({
                    staging: begin.staging,
                    dest: begin.dest,
                    items,
                    replace,
                    replaceLinks: options.replaceLinks === true,
                    verify: files.map(({ relPath, bytes, mtimeMs }) => ({
                        relPath,
                        sum: bytes === null ? null : revisionOf(bytes),
                        mtimeMs,
                    })),
                })
            )
        );
    }
}
