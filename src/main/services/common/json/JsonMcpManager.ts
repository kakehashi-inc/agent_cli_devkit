import type {
    AgentEnvironment,
    MCPServerConfig,
    MCPServerInfo,
    MCPServers,
    McpEnvInfo,
    McpFileProblem,
    OSType,
} from '../../../../shared/agents/types';
import { mcpDisplayConfig } from '../../../utils/mcpDisplayConfig';
import { commitConfigChanges, existsOrUnknown, problemOf } from '../fs/configFile';
import { HomeFs } from '../wsl/HomeFs';
import { WslDetector } from '../wsl/WslDetector';
import {
    jsonServerMap,
    moveJsonEntry,
    readJsoncFile,
    reorderJsonEntries,
    sidecarChange,
    type JsonFileState,
} from './jsonConfigFile';

interface Options {
    configRel: string;
    // 無効化した MCP サーバーのエントリを退避する sidecar ファイル。
    // 構造は設定ファイルと同じ { [rootKey]: { <name>: config } }。
    disabledRel: string;
    rootKey: string;
    wslTest: string;
}

/**
 * JSON / JSONC のトップレベルオブジェクトにある MCP 定義を管理する共通実装。
 * 無効化はフラグの書き換えではなく、エントリごと disabled ファイルへ移す。
 * 編集は対象のエントリの文字列だけに行い、コメント、整形、他のキーを保つ。
 * 読み取りと解釈に失敗したら何も書かない。一覧は読めなかったファイルを problems で返す。
 */
export class JsonMcpManager {
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

    async getEnvironments(): Promise<McpEnvInfo[]> {
        const result: McpEnvInfo[] = [await this.buildEnvInfo({ kind: 'native' }, this.nativeLabel())];
        const distros = await this.detector.getDistrosWithTest(this.options.wslTest);
        for (const distro of distros) {
            result.push(await this.buildEnvInfo({ kind: 'wsl', distro: distro.distro }, distro.distro));
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

    private infos(servers: Record<string, MCPServerConfig>, enabled: boolean): MCPServerInfo[] {
        return Object.entries(servers).map(([name, config]) => ({ name, config: mcpDisplayConfig(config), enabled }));
    }

    private entryPath(name: string): string[] {
        return [this.options.rootKey, name];
    }

    async getMCPServers(env: AgentEnvironment): Promise<MCPServers> {
        const fs = this.fsFor(env);
        const problems: McpFileProblem[] = [];
        const load = async (rel: string, enabled: boolean): Promise<MCPServerInfo[]> => {
            try {
                const { root } = await readJsoncFile(fs, rel);
                return this.infos(jsonServerMap(root, [this.options.rootKey]), enabled);
            } catch (error) {
                problems.push(problemOf(error, rel));
                return [];
            }
        };
        const enabled = await load(this.options.configRel, true);
        const disabled = await load(this.options.disabledRel, false);
        return { enabled, disabled, ...(problems.length > 0 ? { problems } : {}) };
    }

    private async readBoth(fs: HomeFs): Promise<{ config: JsonFileState; disabled: JsonFileState }> {
        return {
            config: await readJsoncFile(fs, this.options.configRel),
            disabled: await readJsoncFile(fs, this.options.disabledRel),
        };
    }

    /** MCP サーバーを無効化（設定ファイル → disabled ファイルへエントリ移動）。 */
    async disableMCPServer(env: AgentEnvironment, serverName: string): Promise<MCPServers> {
        const fs = this.fsFor(env);
        const { config, disabled } = await this.readBoth(fs);
        const moved = moveJsonEntry(config, disabled, this.entryPath(serverName), { cascade: true });
        await commitConfigChanges(fs, [
            { file: disabled.file, next: moved.target },
            { file: config.file, next: moved.source },
        ]);
        return this.getMCPServers(env);
    }

    /** MCP サーバーを有効化（disabled ファイル → 設定ファイルへエントリ移動）。disabled ファイルが空になれば削除する。 */
    async enableMCPServer(env: AgentEnvironment, serverName: string): Promise<MCPServers> {
        const fs = this.fsFor(env);
        const { config, disabled } = await this.readBoth(fs);
        const moved = moveJsonEntry(disabled, config, this.entryPath(serverName), { cascade: true });
        await commitConfigChanges(fs, [
            { file: config.file, next: moved.target },
            sidecarChange(disabled.file, moved.source),
        ]);
        return this.getMCPServers(env);
    }

    private async reorder(env: AgentEnvironment, rel: string, serverNames: string[]): Promise<MCPServers> {
        const fs = this.fsFor(env);
        const state = await readJsoncFile(fs, rel);
        const next = reorderJsonEntries(state, [this.options.rootKey], serverNames);
        await commitConfigChanges(fs, [{ file: state.file, next }]);
        return this.getMCPServers(env);
    }

    /** names の順にエントリを並べ替える（names にないものは末尾に元の順で残す）。対象がなければ何も書かない。 */
    reorderMCPServers(env: AgentEnvironment, serverNames: string[]): Promise<MCPServers> {
        return this.reorder(env, this.options.configRel, serverNames);
    }

    /** names の順に退避中のエントリを並べ替える。対象がなければ何も書かない。 */
    reorderDisabledMCPServers(env: AgentEnvironment, serverNames: string[]): Promise<MCPServers> {
        return this.reorder(env, this.options.disabledRel, serverNames);
    }
}
