import { formatConfigDetail } from '../../../../shared/agents/configFileFailure';
import type {
    AgentEnvironment,
    MCPServerInfo,
    MCPServers,
    McpEnvInfo,
    McpFileProblem,
    OSType,
} from '../../../../shared/agents/types';
import {
    isServerBlockMovable,
    listServerNames,
    moveServerBlock,
    parseMcpServers,
    reorderServerBlocks,
} from '../../../utils/tomlEdit';
import { mcpDisplayConfig } from '../../../utils/mcpDisplayConfig';
import { TomlEditError, tomlSyntaxProblem } from '../../../utils/tomlSubtree';
import {
    commitConfigChanges,
    ConfigFileError,
    existsOrUnknown,
    fileError,
    problemOf,
    readConfigFile,
    type ConfigChange,
    type ConfigFile,
} from '../fs/configFile';
import { HomeFs } from '../wsl/HomeFs';
import { WslDetector } from '../wsl/WslDetector';

interface Options {
    configRel: string;
    // 無効化した MCP サーバーのブロックを退避するファイル。
    disabledRel: string;
    wslTest: string;
}

/**
 * TOML の設定ファイルの `[mcp_servers.<name>]` テーブルを管理する共通実装。
 * - 無効化は見出しのブロックごと退避ファイルへ移す。native とコマンドが導入された WSL distro を環境として扱う。
 * - 編集は文の走査で求めた範囲だけを切り貼りし、他のセクション、整形、コメントをバイト単位で保つ。
 * - 読み取りと解釈に失敗したら何も書かない。一覧は読めなかったファイルを problems で返す。
 * - 移動は 2 つのファイルの結果を計算し終えてから、移動先を先に書き込む。
 * - 親の本文に書かれた形（インラインテーブル、ドット記法）のサーバーは読み取り専用で一覧に出す。
 */
export class TomlMcpManager {
    constructor(
        private readonly detector: WslDetector,
        private readonly options: Options
    ) {}

    private nativeLabel(): string {
        const platform = process.platform as OSType;
        if (platform === 'win32') return 'Windows';
        if (platform === 'darwin') return 'macOS';
        return 'Linux';
    }

    private fsFor(env: AgentEnvironment): HomeFs {
        return new HomeFs(env, this.detector);
    }

    /** ファイルを厳密に読み、TOML として読めることを確かめる。 */
    private async readToml(fs: HomeFs, rel: string): Promise<ConfigFile> {
        const file = await readConfigFile(fs, rel);
        const problem = tomlSyntaxProblem(file.text);
        if (problem) throw fileError('invalid-file', rel, formatConfigDetail(problem));
        return file;
    }

    /** 管理対象の環境一覧（native + コマンドが導入された WSL distro）。refresh なら WSL distro の検出結果を破棄して検出し直す。 */
    async getEnvironments(refresh = false): Promise<McpEnvInfo[]> {
        if (refresh) this.detector.invalidate();
        const result: McpEnvInfo[] = [await this.buildEnvInfo({ kind: 'native' }, this.nativeLabel())];
        const distros = await this.detector.getDistrosWithTest(this.options.wslTest);
        for (const d of distros) {
            result.push(await this.buildEnvInfo({ kind: 'wsl', distro: d.distro }, d.distro));
        }
        return result;
    }

    private async buildEnvInfo(env: AgentEnvironment, label: string): Promise<McpEnvInfo> {
        const fs = this.fsFor(env);
        return {
            env,
            label,
            configPath: await fs.displayPath(this.options.configRel),
            configExists: await existsOrUnknown(fs, this.options.configRel),
            disabledConfigPath: await fs.displayPath(this.options.disabledRel),
        };
    }

    /** 有効/無効の MCP サーバー一覧を取得する（出現順を保持）。読めなかったファイルは problems に入れる。 */
    async getMCPServers(env: AgentEnvironment): Promise<MCPServers> {
        const fs = this.fsFor(env);
        const problems: McpFileProblem[] = [];
        const load = async (rel: string, enabled: boolean): Promise<MCPServerInfo[]> => {
            try {
                return this.buildInfos((await this.readToml(fs, rel)).text, enabled);
            } catch (error) {
                problems.push(problemOf(error, rel));
                return [];
            }
        };
        const enabled = await load(this.options.configRel, true);
        const disabled = await load(this.options.disabledRel, false);
        return { enabled, disabled, ...(problems.length > 0 ? { problems } : {}) };
    }

    /** TOML テキストからサーバ情報を出現順に組み立てる。移動できない形のサーバーは読み取り専用にする。 */
    private buildInfos(tomlText: string, enabled: boolean): MCPServerInfo[] {
        const configs = parseMcpServers(tomlText);
        const names = [...new Set([...listServerNames(tomlText), ...Object.keys(configs)])];
        const infos: MCPServerInfo[] = [];
        for (const name of names) {
            const config = configs[name];
            if (config) {
                infos.push({
                    name,
                    config: mcpDisplayConfig(config),
                    enabled,
                    ...(isServerBlockMovable(tomlText, name) ? {} : { readOnly: true }),
                });
            }
        }
        return infos;
    }

    /**
     * source のサーバーを target へ移す 2 つの変更を移動先、移動元の順に返す。ファイルには書かない。
     * サーバーがなければ entry-not-found、移動できない形なら read-only-entry、移動先に別の定義があれば already-defined、
     * 編集結果の検証に失敗したら edit-failed を投げる。
     */
    private moveChanges(source: ConfigFile, target: ConfigFile, name: string): [ConfigChange, ConfigChange] {
        if (!parseMcpServers(source.text)[name]) throw new ConfigFileError('entry-not-found', name);
        if (!isServerBlockMovable(source.text, name)) throw new ConfigFileError('read-only-entry', name);
        let moved: { from: string; to: string } | null;
        try {
            moved = moveServerBlock(source.text, target.text, name);
        } catch (error) {
            if (error instanceof TomlEditError) {
                throw fileError(error.code === 'already-defined' ? 'already-defined' : 'edit-failed', target.rel, name);
            }
            throw error;
        }
        if (!moved) throw new ConfigFileError('entry-not-found', name);
        return [
            { file: target, next: moved.to },
            { file: source, next: moved.from },
        ];
    }

    /** MCP サーバーを無効化（設定ファイル → 退避ファイルへブロック移動）。 */
    async disableMCPServer(env: AgentEnvironment, serverName: string): Promise<MCPServers> {
        const fs = this.fsFor(env);
        const config = await this.readToml(fs, this.options.configRel);
        const disabled = await this.readToml(fs, this.options.disabledRel);
        await commitConfigChanges(fs, this.moveChanges(config, disabled, serverName));
        return this.getMCPServers(env);
    }

    /** MCP サーバーを有効化（退避ファイル → 設定ファイルへブロック移動）。退避ファイルが空になれば削除する。 */
    async enableMCPServer(env: AgentEnvironment, serverName: string): Promise<MCPServers> {
        const fs = this.fsFor(env);
        const disabled = await this.readToml(fs, this.options.disabledRel);
        const config = await this.readToml(fs, this.options.configRel);
        const [toConfig, fromDisabled] = this.moveChanges(disabled, config, serverName);
        const emptied = (fromDisabled.next as string).trim().length === 0;
        await commitConfigChanges(fs, [toConfig, emptied ? { file: disabled, next: null } : fromDisabled]);
        return this.getMCPServers(env);
    }

    private async reorder(env: AgentEnvironment, rel: string, serverNames: string[]): Promise<MCPServers> {
        const fs = this.fsFor(env);
        const file = await this.readToml(fs, rel);
        let next: string;
        try {
            next = reorderServerBlocks(file.text, serverNames);
        } catch (error) {
            if (error instanceof TomlEditError) {
                throw fileError('edit-failed', rel, formatConfigDetail({ code: 'edit-rejected', line: error.line }));
            }
            throw error;
        }
        await commitConfigChanges(fs, [{ file, next }]);
        return this.getMCPServers(env);
    }

    /** 有効な MCP サーバーの順序を変更する。対象がなければ何も書かない。 */
    reorderMCPServers(env: AgentEnvironment, serverNames: string[]): Promise<MCPServers> {
        return this.reorder(env, this.options.configRel, serverNames);
    }

    /** 無効な MCP サーバーの順序を変更する。対象がなければ何も書かない。 */
    reorderDisabledMCPServers(env: AgentEnvironment, serverNames: string[]): Promise<MCPServers> {
        return this.reorder(env, this.options.disabledRel, serverNames);
    }
}
