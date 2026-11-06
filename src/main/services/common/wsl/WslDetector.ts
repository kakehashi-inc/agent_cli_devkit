import { execFile, spawn } from 'child_process';
import { WslDistroInfo, WslMissingCommands } from '../../../../shared/agents/types';
import { system32Command } from '../../../utils/system32Command';
import { buildMissingCommandsScript, parseMissingCommandsOutput } from './wslRequiredCommands';

// wsl.exe は System32 の絶対パスで起動する（PATH や作業ディレクトリにある同名のファイルを起動しない）。
const WSL_EXE = system32Command('wsl.exe');

// wsl.exe の出力として受け取る上限。超えた場合はエラーにする。
const WSL_MAX_OUTPUT_BYTES = 256 * 1024 * 1024;

// ログインシェルが出力するメッセージとスクリプトの出力を区切る目印
const OUTPUT_MARKER = '__AGENT_CLI_DEVKIT_OUTPUT__';
// スクリプトの出力と、その後にログインシェルが出力するメッセージ（.bash_logout など）を区切る目印
const OUTPUT_END_MARKER = '__AGENT_CLI_DEVKIT_OUTPUT_END__';

/**
 * execFile を Promise 化し、stdout を Buffer で受け取るヘルパー。
 * wsl -l -q の出力は UTF-16LE のため、文字列ではなく Buffer で扱う必要がある。
 * 出力が WSL_MAX_OUTPUT_BYTES を超えると reject する。
 */
function execFileBuffer(file: string, args: string[]): Promise<{ stdout: Buffer; stderr: Buffer }> {
    return new Promise((resolve, reject) => {
        execFile(
            file,
            args,
            { encoding: 'buffer', windowsHide: true, maxBuffer: WSL_MAX_OUTPUT_BYTES },
            (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve({ stdout: stdout as Buffer, stderr: stderr as Buffer });
            }
        );
    });
}

/**
 * スクリプトの前後に目印の出力を足す。終了コードはスクリプトのものを保つ。
 * ログインシェルの設定が変えたシェルオプションのうち、スクリプトの動作を変えるもの（errexit・nounset・noclobber）は戻す。
 */
export function withOutputMarkers(script: string): string {
    return [
        'set +e +u +C',
        `printf '%s\\n' ${OUTPUT_MARKER}`,
        script,
        'adk_rc=$?',
        `printf '%s' ${OUTPUT_END_MARKER}`,
        'exit $adk_rc',
        '',
    ].join('\n');
}

/**
 * withOutputMarkers と同じ目印で、スクリプトの全体を { } にまとめて bash に先に読ませる。続けて渡す入力は、
 * スクリプトの中のコマンドが読むもので、bash がコマンドとして解釈することはない（読み残しがあっても exit で終わる）。
 * 入力の途中で切れて } まで届かなければ構文エラーになり、何も実行されない。
 */
function withStreamedInput(script: string): string {
    return [
        'set +e +u +C',
        `printf '%s\\n' ${OUTPUT_MARKER}`,
        '{',
        script,
        'adk_rc=$?',
        `printf '%s' ${OUTPUT_END_MARKER}`,
        'exit $adk_rc',
        '}',
        '',
    ].join('\n');
}

/** 最初の目印より後の出力を返す。目印がなければ null。 */
function sliceAfterOutputMarker(out: Buffer): Buffer | null {
    const marker = Buffer.from(`${OUTPUT_MARKER}\n`);
    const at = out.indexOf(marker);
    return at === -1 ? null : out.subarray(at + marker.length);
}

/**
 * withOutputMarkers の前後の目印の間の出力を返す。先頭の目印がなければ null。
 * 終わりの目印がない場合は、requireEnd なら null、それ以外は先頭の目印より後のすべてを返す
 * （スクリプト自身が exit すると終わりの目印は出力されない）。
 */
function sliceMarkedOutput(out: Buffer, requireEnd: boolean): Buffer | null {
    const body = sliceAfterOutputMarker(out);
    if (body === null) return null;
    const end = body.lastIndexOf(OUTPUT_END_MARKER);
    if (end !== -1) return body.subarray(0, end);
    return requireEnd ? null : body;
}

/**
 * WSL 出力のデコード。wsl.exe は UTF-16LE、bash 出力は UTF-8 と環境で異なるため、
 * NUL バイトの密度から自動判定する。
 */
export function decodeWslBuffer(buf: Buffer): string {
    if (!buf || buf.length === 0) {
        return '';
    }
    let zeroCount = 0;
    const sampleLen = Math.min(buf.length, 2048);
    for (let i = 0; i < sampleLen; i++) {
        if (buf[i] === 0) {
            zeroCount++;
        }
    }
    const isUtf16le = zeroCount > sampleLen / 10; // NUL が多ければ UTF-16LE
    return buf.toString(isUtf16le ? 'utf16le' : 'utf8');
}

/**
 * WSL の利用可否と distro を検出する（agent 非依存の共通実装）。
 * - WSL は Windows のみ対象。
 * - 検出結果はキャッシュする（プロセス起動中は再検出しない）。
 * - 対象の distro は、受け取った判定コマンド（testExpr）が成功するものとする。判定コマンドは
 *   shared/agents/<agent>/constants.ts に定義する（例: CLAUDE_WSL_CLI_TEST）。
 * - wsl.exe は System32 の絶対パスで起動する。
 */
export class WslDetector {
    private available: boolean | null = null;
    // testExpr ごとの distro 一覧キャッシュ
    private distrosCache = new Map<string, WslDistroInfo[]>();
    private serenaDistrosCache: string[] | null = null;
    private homeCache = new Map<string, string>();
    // distro ごとに一度だけ調べた事実
    private distroFacts = new Map<string, Promise<unknown>>();

    /** 現在のプラットフォームが Windows か */
    isWindows(): boolean {
        return process.platform === 'win32';
    }

    /** WSL が利用可能か（Windows かつ wsl.exe が distro を列挙できる） */
    async isAvailable(): Promise<boolean> {
        if (this.available !== null) {
            return this.available;
        }
        if (!this.isWindows()) {
            this.available = false;
            return false;
        }
        try {
            const distros = await this.rawListDistros();
            this.available = distros.length > 0;
        } catch {
            this.available = false;
        }
        return this.available;
    }

    /**
     * wsl -l -q の出力（UTF-16LE + NUL 埋め）を復号して distro 名一覧を得る。
     */
    private async rawListDistros(): Promise<string[]> {
        const { stdout } = await execFileBuffer(WSL_EXE, ['-l', '-q']);
        const text = decodeWslBuffer(stdout);
        return text
            .split(/\r?\n/)
            .map(line => line.replace(/\0/g, '').trim())
            .filter(line => line.length > 0);
    }

    /**
     * distro の Linux ホームディレクトリを解決する（/home/<windowsuser> を仮定しない）。
     * '/' で始まる単一行だけを受け付け、それ以外は reject する。
     */
    async resolveHome(distro: string): Promise<string> {
        const cached = this.homeCache.get(distro);
        if (cached) {
            return cached;
        }
        const out = await this.runInDistro(distro, `printf '%s' "$HOME"`);
        // bash の出力は基本 UTF-8。NUL 密度判定で安全に復号する。
        const home = decodeWslBuffer(out).replace(/\0/g, '').trim();
        if (!/^\/[^\r\n]*$/.test(home)) {
            throw new Error(`Invalid home directory reported by WSL distro ${distro}`);
        }
        this.homeCache.set(distro, home);
        return home;
    }

    /** distro 内で判定コマンド（test 式など）が成功するか */
    async testInDistro(distro: string, testExpr: string): Promise<boolean> {
        try {
            await execFileBuffer(WSL_EXE, ['-d', distro, '--exec', 'bash', '-lc', testExpr]);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 判定コマンド（testExpr）が成功する WSL distro の一覧を返す。
     * 各 agent の CLI 導入判定（例: `test -f ~/.claude.json`）に使う。
     * Windows 以外、または WSL 未導入の場合は空配列。
     */
    async getDistrosWithTest(testExpr: string): Promise<WslDistroInfo[]> {
        const cached = this.distrosCache.get(testExpr);
        if (cached !== undefined) {
            return cached;
        }
        if (!(await this.isAvailable())) {
            this.distrosCache.set(testExpr, []);
            return [];
        }

        const result: WslDistroInfo[] = [];
        try {
            const distros = await this.rawListDistros();
            for (const distro of distros) {
                const has = await this.testInDistro(distro, testExpr);
                if (!has) {
                    continue;
                }
                let home = '';
                try {
                    home = await this.resolveHome(distro);
                } catch {
                    home = '';
                }
                result.push({ distro, home });
            }
        } catch (error) {
            console.error('Failed to enumerate WSL distros:', error);
        }

        this.distrosCache.set(testExpr, result);
        return result;
    }

    /** distro 内に ~/.serena ディレクトリが存在するか */
    async hasSerena(distro: string): Promise<boolean> {
        return this.testInDistro(distro, 'test -d ~/.serena');
    }

    /**
     * ~/.serena を持つ WSL distro 名の一覧を返す（agent CLI の有無とは独立に検出）。
     * Windows 以外、または WSL 未導入の場合は空配列。
     */
    async getSerenaDistros(): Promise<string[]> {
        if (this.serenaDistrosCache !== null) {
            return this.serenaDistrosCache;
        }
        if (!(await this.isAvailable())) {
            this.serenaDistrosCache = [];
            return this.serenaDistrosCache;
        }

        const result: string[] = [];
        try {
            const distros = await this.rawListDistros();
            for (const distro of distros) {
                if (await this.hasSerena(distro)) {
                    result.push(distro);
                }
            }
        } catch (error) {
            console.error('Failed to enumerate WSL Serena distros:', error);
        }

        this.serenaDistrosCache = result;
        return result;
    }

    /**
     * distro 内で bash コマンドを実行し、ログインシェルの出力を除いた stdout を Buffer で返す。
     * `--exec` で既定シェルを介さずに bash を起動するため、command 内の `$` や引用符は bash だけが解釈する。
     * 終了コードが 0 以外の場合、出力が上限を超えた場合、command まで実行が届かなかった場合は reject する。
     */
    async runInDistro(distro: string, command: string): Promise<Buffer> {
        const { stdout } = await execFileBuffer(WSL_EXE, [
            '-d',
            distro,
            '--exec',
            'bash',
            '-lc',
            withOutputMarkers(command),
        ]);
        const output = sliceMarkedOutput(stdout, false);
        if (output === null) {
            throw new Error(`The output marker was not found in the WSL command output (${distro})`);
        }
        return output;
    }

    /**
     * distro 内のログインシェル（bash -l）へ標準入力でスクリプトを渡して実行し、stdout を Buffer で返す。
     * スクリプトを wsl.exe の引数として渡さないため、変数参照・引用符・長さの制約を受けずにそのまま実行できる。
     * 終了コードが 0 以外の場合と、出力が上限を超えた場合は reject する。
     */
    runScriptInDistro(distro: string, script: string | Buffer): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const child = spawn(WSL_EXE, ['-d', distro, '--exec', 'bash', '-l', '-s'], { windowsHide: true });
            const stdout: Buffer[] = [];
            const stderr: Buffer[] = [];
            let received = 0;
            let overflowed = false;
            const collect = (chunks: Buffer[]) => (chunk: Buffer) => {
                received += chunk.length;
                if (received > WSL_MAX_OUTPUT_BYTES) {
                    overflowed = true;
                    child.kill();
                    return;
                }
                chunks.push(chunk);
            };
            child.stdout.on('data', collect(stdout));
            child.stderr.on('data', collect(stderr));
            child.on('error', reject);
            child.on('close', code => {
                if (overflowed) {
                    reject(
                        Object.assign(new Error('WSL script output exceeded the limit'), {
                            code: 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER',
                        })
                    );
                    return;
                }
                if (code === 0) {
                    resolve(Buffer.concat(stdout));
                    return;
                }
                const detail = decodeWslBuffer(Buffer.concat(stderr)).trim();
                reject(new Error(`WSL script exited with code ${code}${detail ? `: ${detail}` : ''}`));
            });
            // 子プロセスが入力を読み切る前に終了した場合の EPIPE は close 側で扱う。
            child.stdin.on('error', () => undefined);
            child.stdin.end(script);
        });
    }

    /**
     * runScriptInDistro と同じ方法でスクリプトを実行し、ログインシェルの出力を除いた stdout を返す。
     * input を渡すと、スクリプトの後ろに続けて標準入力へ流す（bash は 1 バイトずつ読むので、大きな本文をスクリプトの中に書かない）。
     * 前後の目印がそろわない場合（スクリプトが最後まで実行されなかった場合）は reject する。
     */
    async runMarkedScriptInDistro(distro: string, script: string, input?: Buffer): Promise<Buffer> {
        const stdin = input
            ? Buffer.concat([Buffer.from(withStreamedInput(script), 'utf8'), input])
            : withOutputMarkers(script);
        const output = sliceMarkedOutput(await this.runScriptInDistro(distro, stdin), true);
        if (output === null) {
            throw Object.assign(new Error(`The output markers were not found in the WSL script output (${distro})`), {
                code: 'EWSLOUTPUT',
            });
        }
        return output;
    }

    /**
     * エージェントを使っている distro のうち、必須のコマンドが足りないものを返す。
     * agentTests はエージェントを使っているかの判定式で、distro ごとに一度だけ調べる。bash の無い distro は対象にしない。
     */
    async getMissingCommands(agentTests: readonly string[]): Promise<WslMissingCommands[]> {
        if (!(await this.isAvailable())) return [];
        const results: WslMissingCommands[] = [];
        for (const distro of await this.rawListDistros()) {
            try {
                const commands = await this.factOfDistro(distro, 'missing-commands', async () =>
                    parseMissingCommandsOutput(
                        await this.runMarkedScriptInDistro(distro, buildMissingCommandsScript(agentTests))
                    )
                );
                if (commands.length > 0) results.push({ distro, commands });
            } catch {
                // bash の無い distro と、起動できない distro は対象にしない。
            }
        }
        return results;
    }

    /** distro の事実を一度だけ調べ、次の invalidate まで結果を保持する。調べられなかった場合は保持しない。 */
    factOfDistro<T>(distro: string, fact: string, load: () => Promise<T>): Promise<T> {
        const key = `${distro}\u0000${fact}`;
        const known = this.distroFacts.get(key);
        if (known) return known as Promise<T>;
        const loading = load();
        this.distroFacts.set(key, loading);
        loading.catch(() => {
            if (this.distroFacts.get(key) === loading) this.distroFacts.delete(key);
        });
        return loading;
    }

    /** キャッシュを破棄して次回再検出させる */
    invalidate(): void {
        this.available = null;
        this.distrosCache.clear();
        this.serenaDistrosCache = null;
        this.homeCache.clear();
        this.distroFacts.clear();
    }
}
