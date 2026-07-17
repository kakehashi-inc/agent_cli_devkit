import type {
    AgentEnvironment,
    MCPServerConfig,
    MCPServerInfo,
    MCPServers,
    McpEnvInfo,
    OSType,
} from '../../../../shared/agents/types';
import { deleteTopLevelJsoncProperty, parseJsoncObject, setTopLevelJsoncProperty } from '../../../utils/jsoncEdit';
import { HomeFs } from '../wsl/HomeFs';
import { WslDetector } from '../wsl/WslDetector';

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
 * 他 agent（Claude / Codex / Grok）と同じく、無効化はフラグ書き換えではなく
 * エントリごと disabled ファイルへ移動する方式で行う。
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
        const result = [await this.buildEnvInfo({ kind: 'native' }, this.nativeLabel())];
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
            configExists: await fs.exists(this.options.configRel),
            disabledConfigPath: await fs.displayPath(this.options.disabledRel),
        };
    }

    private async readConfig(env: AgentEnvironment): Promise<{ fs: HomeFs; raw: string }> {
        const fs = this.fsFor(env);
        const raw = (await fs.readText(this.options.configRel)) ?? '{}\n';
        return { fs, raw };
    }

    private serverMap(root: unknown): Record<string, MCPServerConfig> {
        if (!root || typeof root !== 'object' || Array.isArray(root)) return {};
        const value = (root as Record<string, unknown>)[this.options.rootKey];
        if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
        const result: Record<string, MCPServerConfig> = {};
        for (const [name, config] of Object.entries(value)) {
            if (config && typeof config === 'object' && !Array.isArray(config)) {
                result[name] = config as MCPServerConfig;
            }
        }
        return result;
    }

    private async readDisabledMap(fs: HomeFs): Promise<Record<string, MCPServerConfig>> {
        const root = await fs.readJson<Record<string, unknown>>(this.options.disabledRel);
        return this.serverMap(root);
    }

    private infos(servers: Record<string, MCPServerConfig>, enabled: boolean): MCPServerInfo[] {
        return Object.entries(servers).map(([name, config]) => ({ name, config, enabled }));
    }

    async getMCPServers(env: AgentEnvironment): Promise<MCPServers> {
        try {
            const { fs, raw } = await this.readConfig(env);
            return {
                enabled: this.infos(this.serverMap(parseJsoncObject(raw)), true),
                disabled: this.infos(await this.readDisabledMap(fs), false),
            };
        } catch (error) {
            console.error(`Failed to read MCP config (${JSON.stringify(env)}):`, error);
            return { enabled: [], disabled: [] };
        }
    }

    /** 設定ファイルの rootKey 配下を丸ごと書き換える（JSONC のコメント・他キーは保持）。 */
    private async writeConfigServers(fs: HomeFs, raw: string, servers: Record<string, MCPServerConfig>): Promise<void> {
        const next =
            Object.keys(servers).length === 0
                ? deleteTopLevelJsoncProperty(raw, this.options.rootKey)
                : setTopLevelJsoncProperty(raw, this.options.rootKey, servers);
        await fs.writeText(this.options.configRel, next.endsWith('\n') ? next : `${next}\n`);
    }

    /** disabled ファイルを書き換える（空になったらファイルごと削除）。 */
    private async writeDisabledServers(fs: HomeFs, servers: Record<string, MCPServerConfig>): Promise<void> {
        if (Object.keys(servers).length === 0) {
            await fs.deleteFile(this.options.disabledRel);
        } else {
            await fs.writeJson(this.options.disabledRel, { [this.options.rootKey]: servers });
        }
    }

    /** MCP サーバーを無効化（設定ファイル → disabled ファイルへエントリ移動）。 */
    async disableMCPServer(env: AgentEnvironment, serverName: string): Promise<MCPServers> {
        const { fs, raw } = await this.readConfig(env);
        const servers = this.serverMap(parseJsoncObject(raw));
        const target = servers[serverName];
        if (!target) throw new Error(`Server "${serverName}" not found in enabled config`);
        delete servers[serverName];
        await this.writeConfigServers(fs, raw, servers);

        const disabled = await this.readDisabledMap(fs);
        disabled[serverName] = target;
        await this.writeDisabledServers(fs, disabled);
        return this.getMCPServers(env);
    }

    /** MCP サーバーを有効化（disabled ファイル → 設定ファイルへエントリ移動）。 */
    async enableMCPServer(env: AgentEnvironment, serverName: string): Promise<MCPServers> {
        const { fs, raw } = await this.readConfig(env);
        const disabled = await this.readDisabledMap(fs);
        const target = disabled[serverName];
        if (!target) throw new Error(`Server "${serverName}" not found in disabled config`);
        delete disabled[serverName];

        const servers = this.serverMap(parseJsoncObject(raw));
        servers[serverName] = target;
        await this.writeConfigServers(fs, raw, servers);
        await this.writeDisabledServers(fs, disabled);
        return this.getMCPServers(env);
    }

    /** names の順にエントリを並べ替える（names にないものは末尾に元の順で残す）。 */
    private orderByNames(servers: Record<string, MCPServerConfig>, names: string[]): Record<string, MCPServerConfig> {
        const remaining = new Map(Object.entries(servers));
        const ordered: [string, MCPServerConfig][] = [];
        for (const name of names) {
            const config = remaining.get(name);
            if (config) {
                ordered.push([name, config]);
                remaining.delete(name);
            }
        }
        ordered.push(...remaining.entries());
        return Object.fromEntries(ordered);
    }

    async reorderMCPServers(env: AgentEnvironment, serverNames: string[]): Promise<MCPServers> {
        const { fs, raw } = await this.readConfig(env);
        const servers = this.serverMap(parseJsoncObject(raw));
        await this.writeConfigServers(fs, raw, this.orderByNames(servers, serverNames));
        return this.getMCPServers(env);
    }

    async reorderDisabledMCPServers(env: AgentEnvironment, serverNames: string[]): Promise<MCPServers> {
        const fs = this.fsFor(env);
        const disabled = await this.readDisabledMap(fs);
        await this.writeDisabledServers(fs, this.orderByNames(disabled, serverNames));
        return this.getMCPServers(env);
    }
}
