import { existsSync, readFileSync, writeFileSync, unlinkSync, readdirSync, mkdirSync, statSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { AgentEnvironment } from '../../../../shared/agents/types';
import { recursiveDirStats, type DirStats } from '../../../utils/fsSize';
import { isLinkOrUnknown, removeTreeBestEffort } from '../fs/removeTreeBestEffort';
import { stripBom } from '../json/stripBom';
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

/**
 * AgentEnvironment（native / wsl）に対するファイル操作を抽象化する。
 *
 * - native: os.homedir() を基点に通常の fs を使用。
 * - wsl: \\wsl.localhost\<distro>\<home> もしくは \\wsl$\<distro>\<home> を UNC 基点として
 *        通常の fs を使用。どちらの UNC も到達できない場合は wsl コマンドモードへフォールバックする。
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
     * ZIP 圧縮・解凍など外部処理向けに実 OS パス（native 絶対パス / WSL UNC パス）を返す。
     * WSL でコマンドモードへフォールバックする（UNC 到達不可）場合は null。
     * その場合、呼び出し側は ZIP 操作不可として扱うこと。
     */
    async resolveRealPath(relPath: string): Promise<string | null> {
        return this.resolveAbs(relPath);
    }

    /** WSL コマンドモードで使う Linux 絶対パス */
    private async linuxPath(relPath: string): Promise<string> {
        const home = await this.detector.resolveHome(this.distro);
        return `${home}/${relPath}`;
    }

    /** 表示用のパス文字列（実際のアクセス可否に関わらず人間に分かる形） */
    async displayPath(relPath: string): Promise<string> {
        if (!this.isWsl) {
            return join(this.nativeBase(), relPath);
        }
        try {
            const home = await this.detector.resolveHome(this.distro);
            return `${home}/${relPath}`;
        } catch {
            return `~/${relPath}`;
        }
    }

    async exists(relPath: string): Promise<boolean> {
        const abs = await this.resolveAbs(relPath);
        if (abs !== null) {
            return existsSync(abs);
        }
        // コマンドモード
        try {
            await this.detector.runInDistro(this.distro, `test -e ${this.shellQuote(await this.linuxPath(relPath))}`);
            return true;
        } catch {
            return false;
        }
    }

    async readJson<T = unknown>(relPath: string): Promise<T | null> {
        const abs = await this.resolveAbs(relPath);
        try {
            if (abs !== null) {
                if (!existsSync(abs)) {
                    return null;
                }
                const content = readFileSync(abs, 'utf-8');
                return JSON.parse(stripBom(content)) as T;
            }
            // コマンドモード
            const lp = await this.linuxPath(relPath);
            const buf = await this.detector.runInDistro(this.distro, `cat ${this.shellQuote(lp)} 2>/dev/null || true`);
            const content = buf.toString('utf8');
            if (!content.trim()) {
                return null;
            }
            return JSON.parse(stripBom(content)) as T;
        } catch (error) {
            console.error(`Failed to read JSON from ${relPath} (${JSON.stringify(this.env)}):`, error);
            return null;
        }
    }

    async writeJson(relPath: string, data: unknown): Promise<void> {
        const content = JSON.stringify(data, null, 2);
        const abs = await this.resolveAbs(relPath);
        if (abs !== null) {
            mkdirSync(dirname(abs), { recursive: true });
            writeFileSync(abs, content, 'utf-8');
            return;
        }
        // コマンドモード: base64 で投入してエスケープ問題を回避
        const lp = await this.linuxPath(relPath);
        const b64 = Buffer.from(content, 'utf8').toString('base64');
        await this.detector.runInDistro(
            this.distro,
            `mkdir -p ${this.shellQuote(this.dirnamePosix(lp))} && printf %s ${this.shellQuote(b64)} | base64 -d > ${this.shellQuote(lp)}`
        );
    }

    /** 生のテキストファイルを読み込む（JSON.parse せず、trim もしない）。存在しなければ null。 */
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
            const buf = await this.detector.runInDistro(this.distro, `cat ${this.shellQuote(lp)}`);
            return buf.toString('utf8');
        } catch (error) {
            console.error(`Failed to read text from ${relPath} (${JSON.stringify(this.env)}):`, error);
            return null;
        }
    }

    /** 生のテキストを書き込む（content をそのまま、バイト忠実に。改行コードを保持）。 */
    async writeText(relPath: string, content: string): Promise<void> {
        const abs = await this.resolveAbs(relPath);
        if (abs !== null) {
            mkdirSync(dirname(abs), { recursive: true });
            writeFileSync(abs, content, 'utf-8');
            return;
        }
        // コマンドモード: base64 で投入してエスケープ問題・改行変換を回避
        const lp = await this.linuxPath(relPath);
        const b64 = Buffer.from(content, 'utf8').toString('base64');
        await this.detector.runInDistro(
            this.distro,
            `mkdir -p ${this.shellQuote(this.dirnamePosix(lp))} && printf %s ${this.shellQuote(b64)} | base64 -d > ${this.shellQuote(lp)}`
        );
    }

    async deleteFile(relPath: string): Promise<void> {
        const abs = await this.resolveAbs(relPath);
        if (abs !== null) {
            if (existsSync(abs)) {
                unlinkSync(abs);
            }
            return;
        }
        const lp = await this.linuxPath(relPath);
        await this.detector.runInDistro(this.distro, `rm -f ${this.shellQuote(lp)}`);
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
                `find ${this.shellQuote(lp)} -mindepth 1 -maxdepth 1 -type d -printf '%f\\n' 2>/dev/null || true`
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
                `find ${this.shellQuote(lp)} -mindepth 1 -maxdepth 1 -type f -printf '%f\\n' 2>/dev/null || true`
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
        // コマンドモード: du -sb（バイト）/ find ... -type f | wc -l（ファイル数）/
        // フォルダ内ファイルの最終更新時刻の最大（秒）を取得する。
        try {
            const lp = await this.linuxPath(relPath);
            const buf = await this.detector.runInDistro(
                this.distro,
                `du -sb ${this.shellQuote(lp)} 2>/dev/null | cut -f1 || echo 0; ` +
                    `find ${this.shellQuote(lp)} -type f 2>/dev/null | wc -l || echo 0; ` +
                    `find ${this.shellQuote(lp)} -type f -printf '%T@\\n' 2>/dev/null | sort -n | tail -1 || echo 0`
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
        // コマンドモード: stat -c %s（バイト数）・%Y（最終更新の秒）を取得。
        try {
            const lp = await this.linuxPath(relPath);
            const buf = await this.detector.runInDistro(
                this.distro,
                `stat -c '%s %Y' ${this.shellQuote(lp)} 2>/dev/null || echo '0 0'`
            );
            const [sizeStr, mtimeStr] = buf.toString('utf8').trim().split(/\s+/);
            const size = parseInt((sizeStr ?? '0').trim(), 10);
            const mtimeSec = parseInt((mtimeStr ?? '0').trim(), 10);
            const valid = Number.isFinite(size) && size > 0;
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
        const abs = await this.resolveAbs(relPath);
        if (abs !== null) {
            return isLinkOrUnknown(abs);
        }
        // コマンドモード
        try {
            const lp = await this.linuxPath(relPath);
            const out = await this.detector.runInDistro(
                this.distro,
                `if [ -L ${this.shellQuote(lp)} ]; then echo L; else echo N; fi`
            );
            return out.toString('utf8').trim() !== 'N';
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
        const out = await this.detector.runInDistro(this.distro, `p=${this.shellQuote(lp)}\n${WSL_REMOVE_TREE_SCRIPT}`);
        return out.toString('utf8').trim().split(/\r?\n/).pop() === 'R';
    }

    // ---- ヘルパー ----

    private shellQuote(s: string): string {
        // POSIX シェル向けのシングルクォートエスケープ
        return `'${s.replace(/'/g, `'\\''`)}'`;
    }

    private dirnamePosix(p: string): string {
        const idx = p.lastIndexOf('/');
        return idx <= 0 ? '/' : p.slice(0, idx);
    }
}
