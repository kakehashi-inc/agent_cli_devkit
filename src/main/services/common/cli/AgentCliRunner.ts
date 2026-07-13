import { execFile } from 'child_process';
import { AgentEnvironment } from '../../../../shared/agents/types';
import { decodeWslBuffer } from '../wsl/WslDetector';

/**
 * agent CLI（claude / codex / grok）をヘッドレス実行する共通基盤。
 *
 * 設計の要点:
 * - native（ホスト OS）と WSL の両方で同じインターフェースを提供する。
 *   - native: 実行ファイルを解決して execFile で直接実行する。
 *     Windows では npm / Volta 由来の `.cmd` シムが多く、Node は `.cmd` を
 *     直接 spawn できない（EINVAL）。`where` で実体を解決し、`.cmd` / `.bat` の
 *     場合のみ `cmd.exe /d /s /c` 経由で実行する。
 *   - wsl: `wsl.exe -d <distro> -- bash -lc "<cmd>"` で実行する（login shell のため
 *     nvm 等で導入された CLI の PATH も解決される）。
 * - 引数はすべて validateArg で検査する（引用符・制御文字を含む入力は拒否）。
 *   shell を経由する経路があるため、ここを通らない実行は行わないこと。
 * - CLI の存在確認（`<cli> --version`）は環境ごとにキャッシュする。
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
// JSON カタログが大きくなり得るため余裕を持たせる。
const MAX_BUFFER = 32 * 1024 * 1024;

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

/** bash 用のシングルクオート囲み（' は '\'' に展開）。 */
function shellQuotePosix(arg: string): string {
    return `'${arg.replace(/'/g, `'\\''`)}'`;
}

function execFileBuffer(
    file: string,
    args: string[],
    options: { timeout: number; windowsVerbatimArguments?: boolean }
): Promise<{ code: number | null; stdout: Buffer; stderr: Buffer }> {
    return new Promise(resolve => {
        execFile(
            file,
            args,
            {
                encoding: 'buffer',
                windowsHide: true,
                maxBuffer: MAX_BUFFER,
                timeout: options.timeout,
                windowsVerbatimArguments: options.windowsVerbatimArguments,
            },
            (error, stdout, stderr) => {
                // execFile は非 0 終了で error を返すが、exitCode と出力から成否を判断したいので
                // ここでは reject しない（プロセス起動自体の失敗は code=null になる）。
                const code = error ? ((error as NodeJS.ErrnoException & { code?: unknown }).code ?? null) : 0;
                resolve({
                    code: typeof code === 'number' ? code : error ? null : 0,
                    stdout: stdout as Buffer,
                    stderr: stderr as Buffer,
                });
            }
        );
    });
}

export class AgentCliRunner {
    // 実行ファイルパスの解決キャッシュ（native のみ。キー = CLI 名）
    private readonly nativePathCache = new Map<string, string | null>();
    // CLI 存在確認キャッシュ（キー = envId + CLI 名）
    private readonly availabilityCache = new Map<string, CliAvailability>();

    private envKey(env: AgentEnvironment, cli: string): string {
        return env.kind === 'wsl' ? `wsl:${env.distro}:${cli}` : `native:${cli}`;
    }

    /**
     * native の実行ファイルパスを解決する。
     * Windows は `where`、それ以外は `command -v` を使う。見つからなければ null。
     */
    private async resolveNativePath(cli: string): Promise<string | null> {
        const cached = this.nativePathCache.get(cli);
        if (cached !== undefined) {
            return cached;
        }
        let resolved: string | null = null;
        if (process.platform === 'win32') {
            const { code, stdout } = await execFileBuffer('where.exe', [cli], { timeout: 10_000 });
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
            const { code, stdout } = await execFileBuffer('/bin/sh', ['-c', `command -v ${shellQuotePosix(cli)}`], {
                timeout: 10_000,
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
        let result: { code: number | null; stdout: Buffer; stderr: Buffer };
        if (process.platform === 'win32' && /\.(cmd|bat)$/i.test(path)) {
            // .cmd / .bat は cmd.exe /d /s /c 経由。引数は validateArg 済み（" を含まない）
            // なので、各引数を二重引用符で囲むだけで安全に渡せる。
            const inner = [`"${path}"`, ...args.map(a => `"${a}"`)].join(' ');
            result = await execFileBuffer('cmd.exe', ['/d', '/s', '/c', `"${inner}"`], {
                timeout,
                windowsVerbatimArguments: true,
            });
        } else {
            result = await execFileBuffer(path, args, { timeout });
        }
        return {
            ok: result.code === 0,
            exitCode: result.code,
            stdout: result.stdout.toString('utf8'),
            stderr: result.stderr.toString('utf8'),
        };
    }

    /** WSL distro 内でコマンドを実行する。 */
    private async runWsl(distro: string, cli: string, args: string[], timeout: number): Promise<CliRunResult> {
        const command = [cli, ...args.map(shellQuotePosix)].join(' ');
        const result = await execFileBuffer('wsl.exe', ['-d', distro, '--', 'bash', '-lc', command], { timeout });
        return {
            ok: result.code === 0,
            exitCode: result.code,
            stdout: decodeWslBuffer(result.stdout),
            stderr: decodeWslBuffer(result.stderr),
        };
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

    /** キャッシュを破棄して次回再解決させる。 */
    invalidate(): void {
        this.nativePathCache.clear();
        this.availabilityCache.clear();
    }
}
