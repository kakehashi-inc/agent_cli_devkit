import { ChildProcess, execFile, spawn } from 'child_process';
import { homedir } from 'os';
import { AgentEnvironment } from '../../../../shared/agents/types';
import { shellQuotePosix, WSL_CLI_PATH_SETUP, wslCliTest, wslFindCliScript } from '../../../../shared/agents/wsl';
import { system32Command } from '../../../utils/system32Command';
import { decodeWslBuffer } from '../wsl/WslDetector';
import { nativeCliEnvironment } from './nativeCliEnvironment';

/**
 * agent CLI（claude / codex / agy / grok / opencode）をヘッドレス実行する共通基盤。
 *
 * 設計の要点:
 * - native（ホスト OS）と WSL の両方で同じインターフェースを提供する。
 *   - native: 実行ファイルを解決して直接起動する。
 *     Windows では npm / Volta 由来の `.cmd` シムが多く、Node は `.cmd` を
 *     直接 spawn できない（EINVAL）。`where` で実体を解決し、`.cmd` / `.bat` の
 *     場合のみ `cmd.exe /d /v:off /s /c` 経由で実行する。cmd.exe は引用符の内側でも `%VAR%` を展開するため、
 *     この経路では `%` を含む引数を拒否する（失敗理由は機械コード PERCENT_ARGUMENT_CODE）。
 *     Windows 付属のコマンド（cmd.exe / where.exe / taskkill.exe / wsl.exe）は System32 の絶対パスで起動する。
 *   - wsl: `wsl.exe -d <distro> --exec bash -lc "<WSL_CLI_PATH_SETUP>; cd ~; <CLI の解決>; <CLI のパス> <args>"`
 *     で実行する（login shell のため nvm 等で導入された CLI の PATH も解決される。.bashrc の PATH 追記が効かない
 *     ユーザー単位の導入先は WSL_CLI_PATH_SETUP が PATH の末尾に加える。`--exec` で既定シェルを介さないため、
 *     引数の `$` や引用符は bash だけが解釈する）。CLI は PATH から Windows 側のドライブ（/mnt/ 配下）を除いて探す。
 * - 作業ディレクトリはホームに固定する（native は cwd、WSL は `cd ~`）。アプリ自身の作業ディレクトリが
 *   CLI のプロジェクト判定（設定スコープの自動選択など）に影響しないようにするため。
 * - 引数はすべて validateArg で検査する（引用符・制御文字を含む入力は拒否）。
 *   shell を経由する経路があるため、ここを通らない実行は行わないこと。
 * - タイムアウトと出力上限の超過では、起動したプロセスを子孫ごと止める（Windows は `taskkill /T /F`。
 *   `.cmd` 経由では cmd.exe の子が CLI 本体のため）。止めた理由は stderr の先頭に入れて返す。
 *   プロセスの終了後はタイムアウトを止め、終了済みのプロセスには停止を送らない。
 * - CLI の存在確認は環境ごとにキャッシュする。実行可否は `<cli> --version`（checkCli）、
 *   コマンドの有無だけは CLI 本体を実行せず PATH の解決で確認する（resolveCli）。
 */

export interface CliRunResult {
    ok: boolean;
    exitCode: number | null;
    stdout: string;
    stderr: string;
}

export interface CliAvailability {
    available: boolean;
    version: string | null;
}

// 一覧系の既定タイムアウト。カタログ取得はマーケットプレイス更新を伴うことがあるため長め。
const DEFAULT_TIMEOUT_MS = 60_000;
// JSON カタログが大きくなり得るため余裕を持たせる（stdout と stderr の合計）。
const MAX_BUFFER = 32 * 1024 * 1024;
// プロセス終了後に出力の終端を待つ上限。出力を受け継いだ孫プロセスが残っても待ち続けない。
const STDIO_GRACE_MS = 2_000;
// cmd.exe 経由の実行で `%` を含む引数を拒否したときに stderr として返す機械コード。
const PERCENT_ARGUMENT_CODE = 'invalid-argument-percent';

/**
 * 実行引数の検査。二重引用符・改行・制御文字を含む引数は拒否する。
 * （Windows の cmd.exe 経由 / WSL の bash -lc 経由の両方で安全に引用できる範囲に限定する）
 */
export function validateArg(arg: string): boolean {
    if (arg.length === 0 || arg.length > 2048) {
        return false;
    }
    // eslint-disable-next-line no-control-regex -- 制御文字の混入をコマンド実行前に拒否するための検査
    if (/[\x00-\x1f\x7f]/.test(arg)) {
        return false;
    }
    if (arg.includes('"')) {
        return false;
    }
    return true;
}

/**
 * CLI の位置引数（プラグイン ID・ソース・マーケットプレイス名など）として渡せる値か。
 * validateArg の条件に加え、空白だけの値と、オプションとして解釈される `-` 始まりの値を拒否する。
 */
export function validateOperand(value: string): boolean {
    return validateArg(value) && value.trim().length > 0 && !value.startsWith('-');
}

/**
 * cmd.exe 経由で起動するプログラムへ渡す二重引用符囲み。引数は validateArg 済み（" を含まない）のため、
 * 閉じ引用符の直前に来る末尾の `\` だけを倍にする（そのままだと `\"` が引用符のエスケープとして解釈される）。
 */
function quoteForCmd(arg: string): string {
    return `"${arg.replace(/(\\+)$/, '$1$1')}"`;
}

type StopReason = 'timeout' | 'max-buffer';

interface ProcessResult {
    code: number | null;
    stdout: Buffer;
    stderr: Buffer;
    // タイムアウト・出力上限の超過で止めた場合の理由
    stopped: StopReason | null;
    // 起動自体の失敗（実行ファイルが無いなど）
    error: string | null;
}

/** プロセスを子孫ごと止める。Windows は taskkill /T /F、それ以外は SIGTERM を送る。 */
function stopProcessTree(child: ChildProcess): void {
    if (process.platform === 'win32' && child.pid !== undefined) {
        const args = ['/T', '/F', '/PID', String(child.pid)];
        execFile(system32Command('taskkill.exe'), args, { windowsHide: true }, error => {
            if (error) {
                child.kill();
            }
        });
        return;
    }
    child.kill();
}

/**
 * プロセスを起動し、終了コードと出力を返す（失敗しても reject しない）。
 * timeout を過ぎるか、出力の合計が MAX_BUFFER を超えたら、プロセスを子孫ごと止めて理由を返す。
 * プロセスの終了後は timeout を数えず、出力が MAX_BUFFER を超えても出力の受け取りを打ち切るだけにする
 * （終了済みのプロセスの PID は別のプロセスに再利用されている場合があるため、停止を送らない）。
 */
function runProcess(
    file: string,
    args: string[],
    options: { timeout: number; windowsVerbatimArguments?: boolean; cwd?: string; env?: NodeJS.ProcessEnv }
): Promise<ProcessResult> {
    return new Promise(resolve => {
        let child: ChildProcess;
        try {
            child = spawn(file, args, {
                windowsHide: true,
                windowsVerbatimArguments: options.windowsVerbatimArguments,
                cwd: options.cwd,
                env: options.env,
            });
        } catch (error) {
            resolve({
                code: null,
                stdout: Buffer.alloc(0),
                stderr: Buffer.alloc(0),
                stopped: null,
                error: String(error),
            });
            return;
        }
        const stdout: Buffer[] = [];
        const stderr: Buffer[] = [];
        let size = 0;
        let stopped: StopReason | null = null;
        let exitCode: number | null = null;
        let exited = false;
        let spawnError: string | null = null;
        let settled = false;
        let grace: NodeJS.Timeout | undefined;

        const stop = (reason: StopReason) => {
            if (stopped !== null) {
                return;
            }
            stopped = reason;
            if (!exited) {
                stopProcessTree(child);
                return;
            }
            child.stdout?.destroy();
            child.stderr?.destroy();
            finish();
        };
        const timer = setTimeout(() => stop('timeout'), options.timeout);
        const collect = (chunks: Buffer[]) => (chunk: Buffer) => {
            if (stopped === 'max-buffer') {
                return;
            }
            size += chunk.length;
            if (size > MAX_BUFFER) {
                stop('max-buffer');
                return;
            }
            chunks.push(chunk);
        };
        const finish = () => {
            if (settled) {
                return;
            }
            settled = true;
            clearTimeout(timer);
            clearTimeout(grace);
            resolve({
                code: stopped === null ? exitCode : null,
                stdout: Buffer.concat(stdout),
                stderr: Buffer.concat(stderr),
                stopped,
                error: spawnError,
            });
        };

        child.stdout?.on('data', collect(stdout));
        child.stderr?.on('data', collect(stderr));
        child.on('error', error => {
            spawnError = error.message;
            finish();
        });
        child.on('exit', code => {
            exitCode = code;
            exited = true;
            clearTimeout(timer);
            if (settled) {
                return;
            }
            grace = setTimeout(() => {
                child.stdout?.destroy();
                child.stderr?.destroy();
                finish();
            }, STDIO_GRACE_MS);
        });
        child.on('close', code => {
            exitCode = exitCode ?? code;
            finish();
        });
    });
}

/** runProcess の結果を CliRunResult にする。止めた理由・起動失敗は stderr の先頭に入れる。 */
function toCliResult(
    cli: string,
    result: ProcessResult,
    timeout: number,
    decode: (buf: Buffer) => string
): CliRunResult {
    const notes: string[] = [];
    if (result.stopped === 'timeout') {
        notes.push(`${cli}: timed out after ${Math.round(timeout / 1000)} s; the process was stopped.`);
    } else if (result.stopped === 'max-buffer') {
        notes.push(`${cli}: output exceeded ${MAX_BUFFER / (1024 * 1024)} MB; the rest of the output was not read.`);
    }
    if (result.error !== null) {
        notes.push(`${cli}: ${result.error}`);
    }
    const stderr = decode(result.stderr);
    return {
        ok: result.code === 0,
        exitCode: result.code,
        stdout: decode(result.stdout),
        stderr: [...notes, stderr].filter(s => s.length > 0).join('\n'),
    };
}

export class AgentCliRunner {
    // 実行ファイルパスの解決キャッシュ（native のみ。キー = CLI 名）
    private readonly nativePathCache = new Map<string, string | null>();
    // CLI 存在確認キャッシュ（キー = envId + CLI 名）
    private readonly availabilityCache = new Map<string, CliAvailability>();
    // コマンド解決キャッシュ（キー = envId + CLI 名）
    private readonly resolveCache = new Map<string, boolean>();

    private envKey(env: AgentEnvironment, cli: string): string {
        return env.kind === 'wsl' ? `wsl:${env.distro}:${cli}` : `native:${cli}`;
    }

    /**
     * native の実行ファイルパスを解決する。
     * Windows は `where`、それ以外は標準の導入先を PATH に補って `command -v` を使う。見つからなければ null。
     */
    private async resolveNativePath(cli: string): Promise<string | null> {
        const cached = this.nativePathCache.get(cli);
        if (cached !== undefined) {
            return cached;
        }
        let resolved: string | null = null;
        if (process.platform === 'win32') {
            const { code, stdout } = await runProcess(system32Command('where.exe'), [cli], { timeout: 10_000 });
            if (code === 0) {
                const candidates = stdout
                    .toString('utf8')
                    .split(/\r?\n/)
                    .map(l => l.trim())
                    .filter(l => l.length > 0);
                // where は PATH 順で複数返し、先頭が拡張子なしの POSIX スクリプト
                // （npm / Volta が併置する bash 用シム）のことがある。Windows で実行可能な
                // 拡張子（.exe / .cmd / .bat）を持つものだけを候補にする。
                resolved = candidates.find(c => /\.(exe|cmd|bat)$/i.test(c)) ?? null;
            }
        } else {
            const { code, stdout } = await runProcess('/bin/sh', ['-c', `command -v ${shellQuotePosix(cli)}`], {
                timeout: 10_000,
                env: nativeCliEnvironment(),
            });
            if (code === 0) {
                const first = stdout.toString('utf8').trim();
                resolved = first.length > 0 ? first : null;
            }
        }
        this.nativePathCache.set(cli, resolved);
        return resolved;
    }

    /** native でコマンドを実行する。 */
    private async runNative(cli: string, args: string[], timeout: number): Promise<CliRunResult> {
        const path = await this.resolveNativePath(cli);
        if (!path) {
            return { ok: false, exitCode: null, stdout: '', stderr: `${cli}: command not found` };
        }
        let result: ProcessResult;
        if (process.platform === 'win32' && /\.(cmd|bat)$/i.test(path)) {
            // .cmd / .bat は cmd.exe 経由。cmd.exe は引用符の内側でも %VAR% を展開し、確実に
            // 打ち消す書き方が無いため、% を含む引数は渡さない。
            if (args.some(a => a.includes('%'))) {
                return { ok: false, exitCode: null, stdout: '', stderr: PERCENT_ARGUMENT_CODE };
            }
            const inner = [quoteForCmd(path), ...args.map(quoteForCmd)].join(' ');
            result = await runProcess(system32Command('cmd.exe'), ['/d', '/v:off', '/s', '/c', `"${inner}"`], {
                timeout,
                windowsVerbatimArguments: true,
                cwd: homedir(),
            });
        } else {
            result = await runProcess(path, args, { timeout, cwd: homedir(), env: nativeCliEnvironment() });
        }
        return toCliResult(cli, result, timeout, buf => buf.toString('utf8'));
    }

    /**
     * WSL distro 内でコマンドを実行する。CLI は wslFindCliScript で解決したパスで起動し、見つからなければ
     * 終了コード 127 で失敗する。解決したパスは二重引用符を使えないため、IFS を空にしパス名展開を止めて
     * 単語分割・展開されないようにする（引数はシングルクオートで囲むため影響を受けない）。
     */
    private async runWsl(distro: string, cli: string, args: string[], timeout: number): Promise<CliRunResult> {
        const script = [
            WSL_CLI_PATH_SETUP,
            'cd ~ || exit 1',
            wslFindCliScript(cli),
            `if [ \${#c} -eq 0 ]; then echo ${shellQuotePosix(`${cli}: command not found`)} >&2; exit 127; fi`,
            `IFS=; set -f; $c ${args.map(shellQuotePosix).join(' ')}`,
        ].join('; ');
        const result = await runProcess(system32Command('wsl.exe'), ['-d', distro, '--exec', 'bash', '-lc', script], {
            timeout,
        });
        return toCliResult(cli, result, timeout, decodeWslBuffer);
    }

    /**
     * 指定環境で agent CLI を実行する。
     * 引数のいずれかが validateArg を通らない場合は実行せず失敗を返す。
     */
    async run(env: AgentEnvironment, cli: string, args: string[], timeoutMs?: number): Promise<CliRunResult> {
        for (const arg of args) {
            if (!validateArg(arg)) {
                return { ok: false, exitCode: null, stdout: '', stderr: `invalid argument: ${arg}` };
            }
        }
        const timeout = timeoutMs ?? DEFAULT_TIMEOUT_MS;
        try {
            if (env.kind === 'wsl') {
                if (!env.distro) {
                    return { ok: false, exitCode: null, stdout: '', stderr: 'missing distro' };
                }
                return await this.runWsl(env.distro, cli, args, timeout);
            }
            return await this.runNative(cli, args, timeout);
        } catch (error) {
            return { ok: false, exitCode: null, stdout: '', stderr: String(error) };
        }
    }

    /**
     * 指定環境で CLI が実行可能かを `--version` で確認する（結果はキャッシュ）。
     */
    async checkCli(env: AgentEnvironment, cli: string): Promise<CliAvailability> {
        const key = this.envKey(env, cli);
        const cached = this.availabilityCache.get(key);
        if (cached !== undefined) {
            return cached;
        }
        const result = await this.run(env, cli, ['--version'], 30_000);
        const availability: CliAvailability = {
            available: result.ok,
            version: result.ok ? result.stdout.trim().split(/\r?\n/)[0] || null : null,
        };
        this.availabilityCache.set(key, availability);
        return availability;
    }

    /**
     * 指定環境でコマンドが解決できるかを、CLI 本体を実行せずに確認する（結果はキャッシュ）。
     * native は where / command -v、WSL は wslCliTest（実行時と同じ PATH・同じ規則で、Windows 側のドライブにある
     * ものを除く）を login shell で評価して引く。
     */
    async resolveCli(env: AgentEnvironment, cli: string): Promise<boolean> {
        const key = this.envKey(env, cli);
        const cached = this.resolveCache.get(key);
        if (cached !== undefined) {
            return cached;
        }
        let found = false;
        try {
            if (env.kind === 'wsl') {
                if (env.distro) {
                    const { code } = await runProcess(
                        system32Command('wsl.exe'),
                        ['-d', env.distro, '--exec', 'bash', '-lc', wslCliTest(cli)],
                        { timeout: 30_000 }
                    );
                    found = code === 0;
                }
            } else {
                found = (await this.resolveNativePath(cli)) !== null;
            }
        } catch {
            found = false;
        }
        this.resolveCache.set(key, found);
        return found;
    }

    /** キャッシュを破棄して次回再解決させる。 */
    invalidate(): void {
        this.resolveCache.clear();
        this.nativePathCache.clear();
        this.availabilityCache.clear();
    }
}
