import { execFile } from 'child_process';
import {
    closeSync,
    lstatSync,
    openSync,
    readdirSync,
    readSync,
    realpathSync,
    rmdirSync,
    statSync,
    unlinkSync,
} from 'fs';
import { homedir, tmpdir } from 'os';
import { join, posix } from 'path';
import type { AgentEnvironment } from '../../../../shared/agents/types';
import { recursiveDirStats } from '../../../utils/fsSize';
import { removeTreeBestEffort } from '../fs/removeTreeBestEffort';
import type { WslDetector } from '../wsl/WslDetector';

/** 一覧のエントリ種別。シンボリックリンク・ジャンクション・特殊ファイルは 'other'（辿らない）。 */
export type ProbeEntryType = 'file' | 'dir' | 'other';

/** ディレクトリ直下のエントリ 1 件。 */
export interface ProbeEntry {
    name: string;
    // 環境内の絶対パス（native は OS のパス、WSL は Linux のパス）
    path: string;
    type: ProbeEntryType;
    // file はファイルサイズ、dir は配下ファイルの合計サイズ（リンクは辿らない）、other は 0。
    size: number;
    // file は 1、dir は配下のファイル数、other は 0。
    fileCount: number;
    // 最終更新日時（エポックミリ秒）。dir は自身と配下ファイルのうち最も新しい日時。
    mtimeMs: number;
    // 実行ユーザーの所有物か（POSIX は uid の一致で判定する）。Windows は所有者を調べる低コストな手段が無いため
    // 常に true とし、他のユーザーのものを消さない保証はファイルの ACL（他のユーザーには削除権限が無いこと）に任せる。
    ownedBySelf: boolean;
}

/** listNested で得たエントリ 1 件（サイズ・件数は集計しない）。 */
export interface ProbeNestedEntry {
    // root からの相対パス（区切りは '/'。root 自身は ''）
    rel: string;
    // 環境内の絶対パス
    path: string;
    type: ProbeEntryType;
    // 実行ユーザーの所有物か（ProbeEntry.ownedBySelf と同じ判定）。
    ownedBySelf: boolean;
}

/** ロックファイルの状態。判定できない場合は安全側に倒して 'held' とする。 */
export type LockState = 'free' | 'held' | 'missing';

/** readNested で読み取ったファイル。読み取れなかった場合 text は null。 */
export interface NestedFile {
    path: string;
    text: string | null;
}

export interface NestedFiles {
    files: NestedFile[];
}

/**
 * 削除の対象。type は削除のしかた。
 * - 'file': ファイルを削除する。
 * - 'dir': ディレクトリを配下ごと削除する（配下のリンクはリンク自体だけを外す）。
 * - 'empty-dir': 空のディレクトリだけを削除する（空でなければ残す）。
 */
export interface RemoveTarget {
    path: string;
    type: 'file' | 'dir' | 'empty-dir';
}

/**
 * クリーンアップの判定と削除のために、ホーム外（OS の一時フォルダなど）を含む絶対パスを環境ごとに扱う。
 * プロセスは調べず、ロックの保持・書き込みオープンの可否・ファイルの内容・日時だけを判定材料にする。
 * 一覧・集計・削除のいずれも、シンボリックリンク・ジャンクションを辿らない。指定したディレクトリ自体がリンクなら
 * 配下を一覧せず、削除もしない。配下のリンクは種別 'other' として一覧し、ディレクトリごとの削除ではリンク自体だけを外す。
 * 判定に失敗した場合は「使用中」「ロック保持中」など削除しない側の結果を返す。
 */
export interface CleanupProbe {
    // 環境の OS（WSL は linux）
    readonly os: 'win32' | 'darwin' | 'linux';
    homeDir(): Promise<string>;
    join(base: string, ...parts: string[]): string;
    /** OS の一時フォルダ（重複を除いた存在するもの。先頭が既定の一時フォルダ）。 */
    tempDirs(): Promise<string[]>;
    /** 環境変数の値。未設定なら ''。 */
    envVar(name: string): Promise<string>;
    /** dir 直下のエントリのうち、名前が match を満たすものを集計付きで返す。dir が無い・リンクの場合は空配列。 */
    list(dir: string, match: (name: string) => boolean): Promise<ProbeEntry[]>;
    /**
     * root からちょうど depth 階層下にあるエントリの種別と所有者を返す（depth=0 は root 自身）。
     * サイズ・件数は集計しない。root を含め、リンク・ジャンクションの先は辿らない。一覧できない場合は空配列。
     */
    listNested(root: string, depth: number): Promise<ProbeNestedEntry[]>;
    /**
     * listNested と同じ一覧を返すが、一覧できなかった場合（読み取りの失敗、depth が 1 以上で root がリンクの場合）は
     * null を返す。root が存在しない場合は空配列。対象なしと判定不能を区別したいときに使う。
     */
    tryListNested(root: string, depth: number): Promise<ProbeNestedEntry[] | null>;
    /** 各ファイルの先頭 bytes バイト。通常ファイルでない・読めない場合は null。 */
    readHeads(paths: string[], bytes: number): Promise<(Buffer | null)[]>;
    /** root から depth 階層下の各ディレクトリについて、suffix のパスにある通常ファイルを読む（先頭 maxBytes まで）。 */
    readNested(root: string, depth: number, suffix: string[], maxBytes: number): Promise<NestedFiles>;
    /** ロックファイルが他から保持されているか。 */
    lockStates(paths: string[]): Promise<LockState[]>;
    /** ファイルを書き込みで開けない（実行中・他で使用中）か。存在しない場合は false。 */
    filesInUse(paths: string[]): Promise<boolean[]>;
    /**
     * 対象を削除し、それぞれ削除できた（もともと無かった場合を含む）かを返す。
     * 対象自体がリンクの場合と、種別が変わっていた対象は削除しない。
     */
    remove(targets: RemoveTarget[]): Promise<boolean[]>;
    /**
     * remove と同じく削除し、対象ごとに削除できずに残ったパスを返す（すべて削除できた対象は空配列）。
     * ディレクトリはOS のファイルロックなどで残った配下のファイル・ディレクトリを並べ、残ったものを特定できない場合は対象自体のパスにする。
     */
    removeReporting(targets: RemoveTarget[]): Promise<string[][]>;
}

/** 環境（native / WSL distro）に対応する CleanupProbe を作る。 */
export function createCleanupProbe(env: AgentEnvironment, detector: WslDetector): CleanupProbe {
    if (env.kind === 'wsl') {
        if (!env.distro) {
            throw new Error('WSL environment requires a distro name');
        }
        return new WslCleanupProbe(env.distro, detector);
    }
    return new NativeCleanupProbe();
}

// ============================================================
// POSIX シェル（WSL distro 内 / native の macOS・Linux）で使う判定スクリプト
// ============================================================

/** POSIX シェル向けのシングルクォートエスケープ。 */
function shellQuote(value: string): string {
    return `'${value.replace(/'/g, `'\\''`)}'`;
}

// ロックファイルの状態を free / held / missing で出力するシェル関数。
// flock(1) が無い環境（macOS など）は perl の flock で判定し、どちらも無ければ held とする。
const LOCK_STATE_FN = [
    'lock_state() {',
    '    if [ -L "$1" ]; then echo held; return; fi',
    '    if [ ! -e "$1" ]; then echo missing; return; fi',
    '    if command -v flock >/dev/null 2>&1; then',
    '        if flock -n "$1" true 2>/dev/null; then echo free; else echo held; fi',
    '    elif command -v perl >/dev/null 2>&1; then',
    `        if perl -MFcntl=:flock -e 'open(my $f, "<", $ARGV[0]) or exit 2; exit(flock($f, LOCK_EX | LOCK_NB) ? 0 : 1)' "$1" 2>/dev/null; then echo free; else echo held; fi`,
    '    else',
    '        echo held',
    '    fi',
    '}',
].join('\n');

/** 出力行を LockState 配列へ変換する。行が足りない・不明な値は held とする。 */
function parseLockStates(text: string, count: number): LockState[] {
    const lines = text.split(/\r?\n/).map(line => line.trim());
    return Array.from({ length: count }, (_, i) =>
        lines[i] === 'free' ? 'free' : lines[i] === 'missing' ? 'missing' : 'held'
    );
}

// ============================================================
// native（Windows / macOS / Linux）
// ============================================================

class NativeCleanupProbe implements CleanupProbe {
    readonly os: 'win32' | 'darwin' | 'linux' =
        process.platform === 'win32' ? 'win32' : process.platform === 'darwin' ? 'darwin' : 'linux';

    async homeDir(): Promise<string> {
        return homedir();
    }

    join(base: string, ...parts: string[]): string {
        return join(base, ...parts);
    }

    async tempDirs(): Promise<string[]> {
        const configured = this.os === 'win32' ? [tmpdir(), process.env.TEMP, process.env.TMP] : [tmpdir(), '/tmp'];
        const seen = new Set<string>();
        const result: string[] = [];
        for (const dir of configured) {
            if (!dir) continue;
            let real: string;
            try {
                // 短い名前（8.3 形式）や区切りの違いを正規化して重複を除く。
                real = realpathSync.native(dir);
                if (!statSync(real).isDirectory()) continue;
            } catch {
                continue;
            }
            const key = this.os === 'win32' ? real.toLowerCase() : real;
            if (seen.has(key)) continue;
            seen.add(key);
            result.push(real);
        }
        return result;
    }

    async envVar(name: string): Promise<string> {
        return process.env[name] ?? '';
    }

    async list(dir: string, match: (name: string) => boolean): Promise<ProbeEntry[]> {
        if (!this.isRealDir(dir)) return [];
        let names: string[];
        try {
            names = readdirSync(dir);
        } catch {
            return [];
        }
        const uid = typeof process.getuid === 'function' ? process.getuid() : null;
        const entries: ProbeEntry[] = [];
        for (const name of names) {
            if (!match(name)) continue;
            const path = join(dir, name);
            let st;
            try {
                st = lstatSync(path);
            } catch {
                continue;
            }
            const base = { name, path, ownedBySelf: uid === null || st.uid === uid };
            if (st.isSymbolicLink()) {
                entries.push({ ...base, type: 'other', size: 0, fileCount: 0, mtimeMs: st.mtimeMs });
            } else if (st.isDirectory()) {
                const inner = recursiveDirStats(path);
                entries.push({
                    ...base,
                    type: 'dir',
                    size: inner.size,
                    fileCount: inner.fileCount,
                    mtimeMs: Math.max(st.mtimeMs, inner.mtimeMs),
                });
            } else if (st.isFile()) {
                entries.push({ ...base, type: 'file', size: st.size, fileCount: 1, mtimeMs: st.mtimeMs });
            } else {
                entries.push({ ...base, type: 'other', size: 0, fileCount: 0, mtimeMs: st.mtimeMs });
            }
        }
        return entries;
    }

    async listNested(root: string, depth: number): Promise<ProbeNestedEntry[]> {
        return this.walkNested(root, depth, false) ?? [];
    }

    async tryListNested(root: string, depth: number): Promise<ProbeNestedEntry[] | null> {
        return this.walkNested(root, depth, true);
    }

    /**
     * root から depth 階層下のエントリを一覧する。strict のときは、読み取れないものが 1 つでもあれば null を返す
     * （strict でなければ読み取れないものを飛ばす）。root が存在しない場合はどちらも空配列。
     */
    private walkNested(root: string, depth: number, strict: boolean): ProbeNestedEntry[] | null {
        const uid = typeof process.getuid === 'function' ? process.getuid() : null;
        let failed = false;
        const describe = (rel: string, path: string): ProbeNestedEntry | null => {
            let st;
            try {
                st = lstatSync(path);
            } catch (error) {
                const code = (error as NodeJS.ErrnoException).code;
                if (code !== 'ENOENT' && code !== 'ENOTDIR') failed = true;
                return null;
            }
            const type: ProbeEntryType = st.isSymbolicLink()
                ? 'other'
                : st.isDirectory()
                  ? 'dir'
                  : st.isFile()
                    ? 'file'
                    : 'other';
            return { rel, path, type, ownedBySelf: uid === null || st.uid === uid };
        };
        const self = describe('', root);
        if (!self) return strict && failed ? null : [];
        if (depth <= 0) return [self];
        if (self.type !== 'dir') return strict ? null : [];
        let level = [self];
        for (let i = 1; i <= depth; i++) {
            const next: ProbeNestedEntry[] = [];
            for (const dir of level) {
                let names: string[];
                try {
                    names = readdirSync(dir.path);
                } catch {
                    if (strict) return null;
                    continue;
                }
                for (const name of names) {
                    const entry = describe(dir.rel ? `${dir.rel}/${name}` : name, join(dir.path, name));
                    if (strict && failed) return null;
                    if (entry && (i === depth || entry.type === 'dir')) next.push(entry);
                }
            }
            level = next;
        }
        return level;
    }

    async readHeads(paths: string[], bytes: number): Promise<(Buffer | null)[]> {
        return paths.map(path => this.readRegularFile(path, bytes));
    }

    async readNested(root: string, depth: number, suffix: string[], maxBytes: number): Promise<NestedFiles> {
        if (!this.isRealDir(root)) {
            return { files: [] };
        }
        let level = [root];
        for (let i = 0; i < depth; i++) {
            const next: string[] = [];
            for (const dir of level) {
                let names: string[];
                try {
                    names = readdirSync(dir);
                } catch {
                    continue;
                }
                for (const name of names) {
                    const child = join(dir, name);
                    if (this.isRealDir(child)) next.push(child);
                }
            }
            level = next;
        }
        const files: NestedFile[] = [];
        for (const dir of level) {
            const parents = suffix.slice(0, -1);
            let current = dir;
            let reachable = true;
            for (const segment of parents) {
                current = join(current, segment);
                if (!this.isRealDir(current)) {
                    reachable = false;
                    break;
                }
            }
            if (!reachable) continue;
            const path = join(current, suffix[suffix.length - 1]);
            let st;
            try {
                st = lstatSync(path);
            } catch {
                continue;
            }
            if (!st.isFile()) continue;
            const head = this.readRegularFile(path, maxBytes);
            files.push({ path, text: head ? head.toString('utf8') : null });
        }
        return { files };
    }

    async lockStates(paths: string[]): Promise<LockState[]> {
        if (paths.length === 0) return [];
        if (this.os !== 'win32') {
            const script = [LOCK_STATE_FN, ...paths.map(path => `lock_state ${shellQuote(path)}`)].join('\n');
            try {
                return parseLockStates(await runPosixShell(script), paths.length);
            } catch (error) {
                console.error('Failed to check lock files:', error);
                return paths.map(() => 'held');
            }
        }
        // Windows: LockFileEx で排他ロックされた範囲は他のハンドルから読めない（EBUSY / EPERM）。
        return paths.map(path => {
            let st;
            try {
                st = lstatSync(path);
            } catch {
                return 'missing';
            }
            if (st.isSymbolicLink() || !st.isFile()) return 'held';
            let fd: number | null = null;
            try {
                fd = openSync(path, 'r');
                readSync(fd, Buffer.alloc(1), 0, 1, 0);
                return 'free';
            } catch {
                return 'held';
            } finally {
                if (fd !== null) closeSync(fd);
            }
        });
    }

    async filesInUse(paths: string[]): Promise<boolean[]> {
        return paths.map(path => {
            let st;
            try {
                st = lstatSync(path);
            } catch {
                return false;
            }
            if (st.isSymbolicLink() || !st.isFile()) return true;
            // 書き込みオープンは内容・日時を変えない。実行中の実行ファイルは Windows では EBUSY、
            // Linux では ETXTBSY で失敗する。それ以外の失敗も削除しない側に倒す。
            let fd: number | null = null;
            try {
                fd = openSync(path, 'r+');
                return false;
            } catch {
                return true;
            } finally {
                if (fd !== null) closeSync(fd);
            }
        });
    }

    async remove(targets: RemoveTarget[]): Promise<boolean[]> {
        return (await this.removeReporting(targets)).map(left => left.length === 0);
    }

    async removeReporting(targets: RemoveTarget[]): Promise<string[][]> {
        return targets.map(target => {
            let st;
            try {
                st = lstatSync(target.path);
            } catch (error) {
                const code = (error as NodeJS.ErrnoException).code;
                return code === 'ENOENT' || code === 'ENOTDIR' ? [] : [target.path];
            }
            if (st.isSymbolicLink()) return [target.path];
            try {
                if (target.type === 'dir') {
                    if (!st.isDirectory()) return [target.path];
                    const failed: string[] = [];
                    if (removeTreeBestEffort(target.path, failed)) return [];
                    return failed.length > 0 ? failed : [target.path];
                }
                if (target.type === 'empty-dir') {
                    if (!st.isDirectory()) return [target.path];
                    rmdirSync(target.path);
                } else {
                    if (!st.isFile()) return [target.path];
                    unlinkSync(target.path);
                }
            } catch {
                return [target.path];
            }
            try {
                lstatSync(target.path);
                return [target.path];
            } catch {
                return [];
            }
        });
    }

    /** シンボリックリンク・ジャンクションではない実ディレクトリか。 */
    private isRealDir(path: string): boolean {
        try {
            const st = lstatSync(path);
            return st.isDirectory() && !st.isSymbolicLink();
        } catch {
            return false;
        }
    }

    /** 通常ファイルの先頭 bytes バイトを読む。リンク・読めない場合は null。 */
    private readRegularFile(path: string, bytes: number): Buffer | null {
        let fd: number | null = null;
        try {
            const st = lstatSync(path);
            if (!st.isFile()) return null;
            fd = openSync(path, 'r');
            const buffer = Buffer.alloc(Math.min(bytes, st.size));
            const read = readSync(fd, buffer, 0, buffer.length, 0);
            return buffer.subarray(0, read);
        } catch {
            return null;
        } finally {
            if (fd !== null) closeSync(fd);
        }
    }
}

/** native の POSIX シェルでスクリプトを実行し、stdout を返す。 */
function runPosixShell(script: string): Promise<string> {
    return new Promise((resolve, reject) => {
        execFile('/bin/sh', ['-c', script], { encoding: 'utf8' }, (error, stdout) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(stdout);
        });
    });
}

// ============================================================
// WSL distro（すべて distro 内のコマンドで判定・削除する）
// ============================================================

// ログインシェルが出力するメッセージとスクリプトの出力を区切る目印
const OUTPUT_MARKER = '__AGENT_CLI_DEVKIT_OUTPUT__';

class WslCleanupProbe implements CleanupProbe {
    readonly os = 'linux' as const;

    constructor(
        private readonly distro: string,
        private readonly detector: WslDetector
    ) {}

    /** スクリプトを distro 内で実行し、目印より後の出力を返す。 */
    private async run(script: string): Promise<Buffer> {
        const out = await this.detector.runScriptInDistro(
            this.distro,
            `set +e\nprintf '%s\\n' ${OUTPUT_MARKER}\n${script}\nexit 0\n`
        );
        const marker = Buffer.from(`${OUTPUT_MARKER}\n`);
        const at = out.indexOf(marker);
        return at === -1 ? Buffer.alloc(0) : out.subarray(at + marker.length);
    }

    async homeDir(): Promise<string> {
        return this.detector.resolveHome(this.distro);
    }

    join(base: string, ...parts: string[]): string {
        return posix.join(base, ...parts);
    }

    async tempDirs(): Promise<string[]> {
        try {
            const out = await this.run(`printf '%s\\n' /tmp "\${TMPDIR-}"`);
            const dirs = out
                .toString('utf8')
                .split(/\r?\n/)
                .map(line => line.trim().replace(/\/+$/, ''))
                .filter(line => line.startsWith('/'));
            return [...new Set(dirs)];
        } catch (error) {
            console.error(`Failed to resolve temp directories (${this.distro}):`, error);
            return [];
        }
    }

    async envVar(name: string): Promise<string> {
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return '';
        try {
            return (await this.run(`printf '%s' "\${${name}-}"`)).toString('utf8');
        } catch (error) {
            console.error(`Failed to read ${name} (${this.distro}):`, error);
            return '';
        }
    }

    async list(dir: string, match: (name: string) => boolean): Promise<ProbeEntry[]> {
        let raw: Buffer;
        try {
            raw = await this.run(
                [
                    `d=${shellQuote(dir)}`,
                    `printf 'U\\t%s\\0' "$(id -u)"`,
                    `[ -d "$d" ] && [ ! -L "$d" ] && find -P "$d" -mindepth 1 -maxdepth 1 -printf '%y\\t%U\\t%T@\\t%s\\t%f\\0' 2>/dev/null`,
                ].join('\n')
            );
        } catch (error) {
            console.error(`Failed to list ${dir} (${this.distro}):`, error);
            return [];
        }
        let uid = '';
        const entries: ProbeEntry[] = [];
        for (const record of raw.toString('utf8').split('\0')) {
            if (record.startsWith('U\t')) {
                uid = record.slice(2).trim();
                continue;
            }
            const fields = splitFields(record, 5);
            if (!fields) continue;
            const [kind, owner, mtime, size, name] = fields;
            if (!match(name)) continue;
            const type: ProbeEntryType = kind === 'f' ? 'file' : kind === 'd' ? 'dir' : 'other';
            const mtimeSec = Number.parseFloat(mtime);
            entries.push({
                name,
                path: posix.join(dir, name),
                type,
                size: type === 'file' ? Number.parseInt(size, 10) || 0 : 0,
                fileCount: type === 'file' ? 1 : 0,
                mtimeMs: Number.isFinite(mtimeSec) ? Math.round(mtimeSec * 1000) : 0,
                ownedBySelf: uid.length > 0 && owner === uid,
            });
        }
        await this.fillDirStats(entries.filter(entry => entry.type === 'dir'));
        return entries;
    }

    async listNested(root: string, depth: number): Promise<ProbeNestedEntry[]> {
        return (await this.walkNested(root, depth))?.entries ?? [];
    }

    async tryListNested(root: string, depth: number): Promise<ProbeNestedEntry[] | null> {
        const result = await this.walkNested(root, depth);
        return result?.complete ? result.entries : null;
    }

    /**
     * root から depth 階層下のエントリを一覧する。complete は読み取れないものが無かったか
     * （false のとき entries は読み取れた分だけ）。コマンド自体が失敗した場合は null。
     */
    private async walkNested(
        root: string,
        depth: number
    ): Promise<{ entries: ProbeNestedEntry[]; complete: boolean } | null> {
        const level = Math.max(0, Math.floor(depth));
        let raw: Buffer;
        try {
            // -P: 起点を含めてシンボリックリンクを辿らない。末尾の S レコードで一覧の成否を伝える
            // （missing=root が無い、link=depth が 1 以上で root がリンクか、ディレクトリではない、数値=find の終了コード）。
            raw = await this.run(
                [
                    `r=${shellQuote(root)}`,
                    `printf 'U\\t%s\\0' "$(id -u)"`,
                    `if [ ! -e "$r" ] && [ ! -L "$r" ]; then printf 'S\\tmissing\\0'`,
                    `elif [ ${level} -gt 0 ] && { [ -L "$r" ] || [ ! -d "$r" ]; }; then printf 'S\\tlink\\0'`,
                    `else find -P "$r" -mindepth ${level} -maxdepth ${level} -printf '%y\\t%U\\t%P\\0' 2>/dev/null; printf 'S\\t%s\\0' "$?"; fi`,
                ].join('\n')
            );
        } catch (error) {
            console.error(`Failed to list ${root} (${this.distro}):`, error);
            return null;
        }
        let uid = '';
        let status = '';
        const entries: ProbeNestedEntry[] = [];
        for (const record of raw.toString('utf8').split('\0')) {
            if (record.startsWith('U\t')) {
                uid = record.slice(2).trim();
                continue;
            }
            if (record.startsWith('S\t')) {
                status = record.slice(2).trim();
                continue;
            }
            const first = record.indexOf('\t');
            const second = first === -1 ? -1 : record.indexOf('\t', first + 1);
            if (second === -1) continue;
            const kind = record.slice(0, first);
            const owner = record.slice(first + 1, second);
            const rel = record.slice(second + 1);
            if ((level === 0) !== (rel.length === 0)) continue;
            entries.push({
                rel,
                path: rel ? posix.join(root, rel) : root,
                type: kind === 'f' ? 'file' : kind === 'd' ? 'dir' : 'other',
                ownedBySelf: uid.length > 0 && owner === uid,
            });
        }
        return { entries, complete: status === 'missing' || status === '0' };
    }

    /** ディレクトリの合計サイズ・ファイル数・配下で最も新しい日時を 1 回のコマンドで集計して反映する。 */
    private async fillDirStats(dirs: ProbeEntry[]): Promise<void> {
        if (dirs.length === 0) return;
        const awk = `awk '{ s += $1; c++; if ($2 > m) m = $2 } END { printf "%.0f\\t%d\\t%.3f\\n", s, c, m }'`;
        let lines: string[];
        try {
            const out = await this.run(
                dirs
                    .map(dir => `find ${shellQuote(dir.path)} -type f -printf '%s %T@\\n' 2>/dev/null | ${awk}`)
                    .join('\n')
            );
            lines = out.toString('utf8').split(/\r?\n/);
        } catch (error) {
            console.error(`Failed to measure directories (${this.distro}):`, error);
            return;
        }
        dirs.forEach((dir, i) => {
            const [size, count, newest] = (lines[i] ?? '').split('\t');
            const newestSec = Number.parseFloat(newest ?? '');
            dir.size = Number.parseInt(size ?? '', 10) || 0;
            dir.fileCount = Number.parseInt(count ?? '', 10) || 0;
            if (Number.isFinite(newestSec)) {
                dir.mtimeMs = Math.max(dir.mtimeMs, Math.round(newestSec * 1000));
            }
        });
    }

    async readHeads(paths: string[], bytes: number): Promise<(Buffer | null)[]> {
        if (paths.length === 0) return [];
        let lines: string[];
        try {
            const out = await this.run(
                paths
                    .map(path => {
                        const p = shellQuote(path);
                        return (
                            `if [ -f ${p} ] && [ ! -L ${p} ]; then printf 'Y'; ` +
                            `head -c ${bytes} -- ${p} 2>/dev/null | base64 | tr -d '\\n'; ` +
                            `else printf 'N'; fi; printf '\\n'`
                        );
                    })
                    .join('\n')
            );
            lines = out.toString('utf8').split(/\r?\n/);
        } catch (error) {
            console.error(`Failed to read files (${this.distro}):`, error);
            return paths.map(() => null);
        }
        return paths.map((_, i) => {
            const line = lines[i] ?? '';
            return line.startsWith('Y') ? Buffer.from(line.slice(1), 'base64') : null;
        });
    }

    async readNested(root: string, depth: number, suffix: string[], maxBytes: number): Promise<NestedFiles> {
        const level = depth + suffix.length;
        let raw: Buffer;
        try {
            raw = await this.run(
                [
                    `r=${shellQuote(root)}`,
                    `if [ -d "$r" ] && [ ! -L "$r" ]; then printf 'Y\\0'; else printf 'N\\0'; exit 0; fi`,
                    `find -P "$r" -mindepth ${level} -maxdepth ${level} -type f -path ${shellQuote(`*/${suffix.join('/')}`)} -print0 2>/dev/null |`,
                    `while IFS= read -r -d '' f; do printf '%s\\t' "$f"; head -c ${maxBytes} -- "$f" 2>/dev/null | base64 | tr -d '\\n'; printf '\\0'; done`,
                ].join('\n')
            );
        } catch (error) {
            console.error(`Failed to read ${root} (${this.distro}):`, error);
            // コマンドを実行できなかった場合は、読み取れたファイルが無いものとして返す（対象が無い場合と区別しない）。
            return { files: [] };
        }
        const records = raw.toString('utf8').split('\0');
        if (records[0] !== 'Y') {
            return { files: [] };
        }
        const files: NestedFile[] = [];
        for (const record of records.slice(1)) {
            const tab = record.lastIndexOf('\t');
            if (tab <= 0) continue;
            files.push({
                path: record.slice(0, tab),
                text: Buffer.from(record.slice(tab + 1), 'base64').toString('utf8'),
            });
        }
        return { files };
    }

    async lockStates(paths: string[]): Promise<LockState[]> {
        if (paths.length === 0) return [];
        try {
            const out = await this.run(
                [LOCK_STATE_FN, ...paths.map(path => `lock_state ${shellQuote(path)}`)].join('\n')
            );
            return parseLockStates(out.toString('utf8'), paths.length);
        } catch (error) {
            console.error(`Failed to check lock files (${this.distro}):`, error);
            return paths.map(() => 'held');
        }
    }

    async filesInUse(paths: string[]): Promise<boolean[]> {
        if (paths.length === 0) return [];
        // 追記モードで開いて閉じるだけ（内容・日時は変わらない）。実行中の実行ファイルは ETXTBSY で失敗する。
        const script = paths
            .map(path => {
                const p = shellQuote(path);
                return (
                    `if [ ! -e ${p} ] && [ ! -L ${p} ]; then echo 0; ` +
                    `elif [ -f ${p} ] && [ ! -L ${p} ] && ( : >> ${p} ) 2>/dev/null; then echo 0; ` +
                    `else echo 1; fi`
                );
            })
            .join('\n');
        try {
            const lines = (await this.run(script)).toString('utf8').split(/\r?\n/);
            return paths.map((_, i) => lines[i]?.trim() !== '0');
        } catch (error) {
            console.error(`Failed to check files in use (${this.distro}):`, error);
            return paths.map(() => true);
        }
    }

    async remove(targets: RemoveTarget[]): Promise<boolean[]> {
        return (await this.removeReporting(targets)).map(left => left.length === 0);
    }

    async removeReporting(targets: RemoveTarget[]): Promise<string[][]> {
        if (targets.length === 0) return [];
        // rm は配下のシンボリックリンクを辿らない。--one-file-system（GNU coreutils）があれば別のファイルシステムへも降りない。
        // 対象ごとに R（削除できた）か K（残った）を出力し、残ったディレクトリは配下に残った末端
        // （ファイル・リンク・空のディレクトリ）を P<パス> として続ける。区切りは NUL。
        const script = [
            'if rm --help 2>&1 | grep -q -- --one-file-system; then one_fs=--one-file-system; else one_fs=; fi',
            'rm_one() {',
            `    if [ ! -e "$1" ] && [ ! -L "$1" ]; then printf 'R\\0'; return; fi`,
            `    if [ -L "$1" ]; then printf 'K\\0'; return; fi`,
            '    if [ "$2" = dir ]; then',
            `        if [ ! -d "$1" ]; then printf 'K\\0'; return; fi`,
            '        rm -rf $one_fs -- "$1" 2>/dev/null',
            '    elif [ "$2" = empty-dir ]; then',
            `        if [ ! -d "$1" ]; then printf 'K\\0'; return; fi`,
            '        rmdir -- "$1" 2>/dev/null',
            '    else',
            `        if [ ! -f "$1" ]; then printf 'K\\0'; return; fi`,
            '        rm -f -- "$1" 2>/dev/null',
            '    fi',
            `    if [ ! -e "$1" ] && [ ! -L "$1" ]; then printf 'R\\0'; return; fi`,
            `    printf 'K\\0'`,
            '    if [ "$2" = dir ] && [ -d "$1" ] && [ ! -L "$1" ]; then',
            `        find -P "$1" -xdev -mindepth 1 \\( -type d -empty -o ! -type d \\) -printf 'P%p\\0' 2>/dev/null`,
            '    fi',
            '}',
            ...targets.map(target => `rm_one ${shellQuote(target.path)} ${target.type}`),
        ].join('\n');
        let records: string[];
        try {
            records = (await this.run(script)).toString('utf8').split('\0');
        } catch (error) {
            console.error(`Failed to remove cleanup targets (${this.distro}):`, error);
            return targets.map(target => [target.path]);
        }
        // 対象ごとの残ったパス。null は残ったが配下の末端を特定できていない対象。
        const results: (string[] | null)[] = [];
        for (const record of records) {
            if (record === 'R') {
                results.push([]);
            } else if (record === 'K') {
                results.push(null);
            } else if (record.startsWith('P') && results.length > 0) {
                const last = results.length - 1;
                results[last] = [...(results[last] ?? []), record.slice(1)];
            }
        }
        // 残ったものを特定できなかった対象と、結果が出力されなかった対象は対象自体のパスにする。
        return targets.map((target, i) => results[i] ?? [target.path]);
    }
}

/** タブ区切りの先頭 count-1 個を区切り、残り（名前などタブを含み得る値）を最後の要素にまとめる。 */
function splitFields(record: string, count: number): string[] | null {
    const fields: string[] = [];
    let rest = record;
    for (let i = 0; i < count - 1; i++) {
        const tab = rest.indexOf('\t');
        if (tab === -1) return null;
        fields.push(rest.slice(0, tab));
        rest = rest.slice(tab + 1);
    }
    fields.push(rest);
    return rest.length > 0 ? fields : null;
}
