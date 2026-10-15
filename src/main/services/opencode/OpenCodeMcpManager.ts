import {
    OPENCODE_DISABLED_MCP_REL,
    OPENCODE_MCP_SERVERS_PATH,
    OPENCODE_WSL_CLI_TEST,
} from '../../../shared/agents/opencode/constants';
import type {
    MCPServerConfig,
    MCPServerInfo,
    MCPServers,
    OpenCodeEnvironment,
    OpenCodeMcpEnvInfo,
    OSType,
} from '../../../shared/agents/opencode/types';
import { deleteJsoncProperty, parseJsoncObject, setJsoncProperty } from '../../utils/jsoncEdit';
import { getNestedValue } from '../../utils/nestedValue';
import type { AgentCliRunner } from '../common/cli/AgentCliRunner';
import { HomeFs } from '../common/wsl/HomeFs';
import { WslDetector } from '../common/wsl/WslDetector';
import { openCodeCliAvailable } from './openCodeCli';
import { resolveOpenCodeConfigRel } from './openCodeConfigFile';

type ServerMap = Record<string, MCPServerConfig>;

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function withTrailingNewline(text: string): string {
    return text.endsWith('\n') ? text : `${text}\n`;
}

/**
 * OpenCode のグローバル設定ファイル（opencode.json / opencode.jsonc）の mcp.servers にある MCP サーバーを管理する。
 * 他 agent と同じく、無効化はフラグ（disabled）の書き換えではなく、エントリごと opencode-disabled-mcp.json の
 * mcp.servers へ移す。両ファイルとも JSONC として差分編集し、mcp.timeout などサーバー以外の内容とコメントを保持する。
 */
export class OpenCodeMcpManager {
    constructor(
        private readonly detector: WslDetector,
        private readonly runner: AgentCliRunner
    ) {}

    private nativeLabel(): string {
        const platform = process.platform as OSType;
        if (platform === 'win32') return 'Windows';
        if (platform === 'darwin') return 'macOS';
        return 'Linux';
    }

    private fsFor(env: OpenCodeEnvironment): HomeFs {
        return new HomeFs(env, this.detector);
    }

    async getEnvironments(): Promise<OpenCodeMcpEnvInfo[]> {
        const result: OpenCodeMcpEnvInfo[] = [];
        if (await openCodeCliAvailable(this.runner, { kind: 'native' })) {
            result.push(await this.envInfo({ kind: 'native' }, this.nativeLabel()));
        }
        for (const distro of await this.detector.getDistrosWithTest(OPENCODE_WSL_CLI_TEST)) {
            const env: OpenCodeEnvironment = { kind: 'wsl', distro: distro.distro };
            if (await openCodeCliAvailable(this.runner, env)) result.push(await this.envInfo(env, distro.distro));
        }
        return result;
    }

    private async envInfo(env: OpenCodeEnvironment, label: string): Promise<OpenCodeMcpEnvInfo> {
        const fs = this.fsFor(env);
        const configRel = await resolveOpenCodeConfigRel(fs);
        return {
            env,
            label,
            configPath: await fs.displayPath(configRel),
            configExists: await fs.exists(configRel),
            disabledConfigPath: await fs.displayPath(OPENCODE_DISABLED_MCP_REL),
        };
    }

    /** JSONC テキストを読む。ファイルが無い・空白だけの場合は空オブジェクトとして扱う。 */
    private async readRaw(fs: HomeFs, rel: string): Promise<string> {
        const text = await fs.readText(rel);
        return text !== null && text.trim().length > 0 ? text : '{}\n';
    }

    /** mcp.servers のうちオブジェクトのエントリだけを記載順に返す。 */
    private serverMap(raw: string): ServerMap {
        const value = getNestedValue(parseJsoncObject(raw), OPENCODE_MCP_SERVERS_PATH);
        const result: ServerMap = {};
        if (!isRecord(value)) return result;
        for (const [name, config] of Object.entries(value)) {
            if (isRecord(config)) result[name] = config as MCPServerConfig;
        }
        return result;
    }

    /** mcp.servers を置き換えたテキストを返す。空になった場合は mcp.servers を削除する（空の mcp も消える）。 */
    private withServers(raw: string, servers: ServerMap): string {
        return Object.keys(servers).length === 0
            ? deleteJsoncProperty(raw, OPENCODE_MCP_SERVERS_PATH)
            : setJsoncProperty(raw, OPENCODE_MCP_SERVERS_PATH, servers);
    }

    private async writeConfig(fs: HomeFs, configRel: string, raw: string, servers: ServerMap): Promise<void> {
        await fs.writeText(configRel, withTrailingNewline(this.withServers(raw, servers)));
    }

    /** 無効化ファイルを書き換える。中身が空のオブジェクトになったらファイルごと削除する。 */
    private async writeDisabled(fs: HomeFs, raw: string, servers: ServerMap): Promise<void> {
        const next = this.withServers(raw, servers);
        if (Object.keys(parseJsoncObject(next)).length === 0) {
            await fs.deleteFile(OPENCODE_DISABLED_MCP_REL);
        } else {
            await fs.writeText(OPENCODE_DISABLED_MCP_REL, withTrailingNewline(next));
        }
    }

    private infos(servers: ServerMap, enabled: boolean): MCPServerInfo[] {
        return Object.entries(servers).map(([name, config]) => ({ name, config, enabled }));
    }

    async getMCPServers(env: OpenCodeEnvironment): Promise<MCPServers> {
        try {
            const fs = this.fsFor(env);
            const configRaw = await this.readRaw(fs, await resolveOpenCodeConfigRel(fs));
            const disabledRaw = await this.readRaw(fs, OPENCODE_DISABLED_MCP_REL);
            return {
                enabled: this.infos(this.serverMap(configRaw), true),
                disabled: this.infos(this.serverMap(disabledRaw), false),
            };
        } catch (error) {
            console.error(`Failed to read OpenCode MCP config (${JSON.stringify(env)}):`, error);
            return { enabled: [], disabled: [] };
        }
    }

    /** MCP サーバーを無効化する（設定ファイル → 無効化ファイルへエントリを移す）。 */
    async disableMCPServer(env: OpenCodeEnvironment, serverName: string): Promise<MCPServers> {
        const fs = this.fsFor(env);
        const configRel = await resolveOpenCodeConfigRel(fs);
        const configRaw = await this.readRaw(fs, configRel);
        const disabledRaw = await this.readRaw(fs, OPENCODE_DISABLED_MCP_REL);
        const servers = this.serverMap(configRaw);
        const target = servers[serverName];
        if (!target) throw new Error(`Server "${serverName}" not found in enabled config`);
        const disabled = this.serverMap(disabledRaw);
        delete servers[serverName];
        disabled[serverName] = target;
        await this.writeConfig(fs, configRel, configRaw, servers);
        await this.writeDisabled(fs, disabledRaw, disabled);
        return this.getMCPServers(env);
    }

    /** MCP サーバーを有効化する（無効化ファイル → 設定ファイルへエントリを移す）。 */
    async enableMCPServer(env: OpenCodeEnvironment, serverName: string): Promise<MCPServers> {
        const fs = this.fsFor(env);
        const configRel = await resolveOpenCodeConfigRel(fs);
        const configRaw = await this.readRaw(fs, configRel);
        const disabledRaw = await this.readRaw(fs, OPENCODE_DISABLED_MCP_REL);
        const disabled = this.serverMap(disabledRaw);
        const target = disabled[serverName];
        if (!target) throw new Error(`Server "${serverName}" not found in disabled config`);
        const servers = this.serverMap(configRaw);
        delete disabled[serverName];
        servers[serverName] = target;
        await this.writeConfig(fs, configRel, configRaw, servers);
        await this.writeDisabled(fs, disabledRaw, disabled);
        return this.getMCPServers(env);
    }

    /** names の順にエントリを並べ替える（names にないものは末尾に元の順で残す）。 */
    private orderByNames(servers: ServerMap, names: string[]): ServerMap {
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

    async reorderMCPServers(env: OpenCodeEnvironment, serverNames: string[]): Promise<MCPServers> {
        const fs = this.fsFor(env);
        const configRel = await resolveOpenCodeConfigRel(fs);
        const configRaw = await this.readRaw(fs, configRel);
        await this.writeConfig(fs, configRel, configRaw, this.orderByNames(this.serverMap(configRaw), serverNames));
        return this.getMCPServers(env);
    }

    async reorderDisabledMCPServers(env: OpenCodeEnvironment, serverNames: string[]): Promise<MCPServers> {
        const fs = this.fsFor(env);
        const disabledRaw = await this.readRaw(fs, OPENCODE_DISABLED_MCP_REL);
        await this.writeDisabled(fs, disabledRaw, this.orderByNames(this.serverMap(disabledRaw), serverNames));
        return this.getMCPServers(env);
    }
}
