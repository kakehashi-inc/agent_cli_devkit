import { GROK_CONFIG_REL, GROK_DISABLED_MCP_REL, GROK_WSL_CLI_TEST } from '../../../shared/agents/grok/constants';
import { GrokEnvironment, GrokMcpEnvInfo, MCPServerInfo, OSType } from '../../../shared/agents/grok/types';
import { HomeFs } from '../common/wsl/HomeFs';
import { WslDetector } from '../common/wsl/WslDetector';
import {
    extractServerBlock,
    insertServerBlock,
    listServerNames,
    parseMcpServers,
    reorderServerBlocks,
} from '../../utils/tomlEdit';

type MCPServers = { enabled: MCPServerInfo[]; disabled: MCPServerInfo[] };

/**
 * Grok CLI（~/.grok/config.toml）の MCP サーバーを管理する。
 * - 有効な MCP は config.toml の `[mcp_servers.<name>]` テーブル。
 * - 無効化した MCP は ~/.grok/config-disabled-mcp.toml へブロックごと退避する。
 * - config.toml の編集は行スライスで行い、他セクション（projects 等）・整形・コメントを保持する。
 * - native とすべての Grok 入り WSL distro を環境として扱う。
 */
export class GrokMcpManager {
    private readonly detector: WslDetector;

    constructor(detector: WslDetector) {
        this.detector = detector;
    }

    private nativeLabel(): string {
        const platform = process.platform as OSType;
        if (platform === 'win32') return 'Windows';
        if (platform === 'darwin') return 'macOS';
        return 'Linux';
    }

    private fsFor(env: GrokEnvironment): HomeFs {
        return new HomeFs(env, this.detector);
    }

    /** 管理対象の環境一覧（native + Grok 入り WSL distro）。 */
    async getEnvironments(): Promise<GrokMcpEnvInfo[]> {
        const result: GrokMcpEnvInfo[] = [];
        result.push(await this.buildEnvInfo({ kind: 'native' }, this.nativeLabel()));
        const distros = await this.detector.getDistrosWithTest(GROK_WSL_CLI_TEST);
        for (const d of distros) {
            result.push(await this.buildEnvInfo({ kind: 'wsl', distro: d.distro }, d.distro));
        }
        return result;
    }

    private async buildEnvInfo(env: GrokEnvironment, label: string): Promise<GrokMcpEnvInfo> {
        const fs = this.fsFor(env);
        const configPath = await fs.displayPath(GROK_CONFIG_REL);
        const disabledConfigPath = await fs.displayPath(GROK_DISABLED_MCP_REL);
        const configExists = await fs.exists(GROK_CONFIG_REL);
        return { env, label, configPath, configExists, disabledConfigPath };
    }

    /** 有効/無効の MCP サーバー一覧を取得する（出現順を保持）。 */
    async getMCPServers(env: GrokEnvironment): Promise<MCPServers> {
        const fs = this.fsFor(env);
        const configText = (await fs.readText(GROK_CONFIG_REL)) ?? '';
        const disabledText = (await fs.readText(GROK_DISABLED_MCP_REL)) ?? '';

        return {
            enabled: this.buildInfos(configText, true),
            disabled: this.buildInfos(disabledText, false),
        };
    }

    /** TOML テキストからサーバ情報を出現順に組み立てる。 */
    private buildInfos(tomlText: string, enabled: boolean): MCPServerInfo[] {
        if (!tomlText.trim()) {
            return [];
        }
        const configs = parseMcpServers(tomlText);
        const infos: MCPServerInfo[] = [];
        for (const name of listServerNames(tomlText)) {
            const config = configs[name];
            if (config) {
                infos.push({ name, config, enabled });
            }
        }
        return infos;
    }

    /** MCP サーバーを無効化（config.toml → disabled ファイルへブロック移動）。 */
    async disableMCPServer(env: GrokEnvironment, serverName: string): Promise<MCPServers> {
        const fs = this.fsFor(env);
        const configText = (await fs.readText(GROK_CONFIG_REL)) ?? '';
        const extracted = extractServerBlock(configText, serverName);
        if (!extracted) {
            throw new Error(`Server "${serverName}" not found in enabled config`);
        }

        // config.toml から当該ブロックを取り除いて書き戻す。
        await fs.writeText(GROK_CONFIG_REL, extracted.rest);

        // disabled ファイルへブロックを追記する。
        const disabledText = (await fs.readText(GROK_DISABLED_MCP_REL)) ?? '';
        const nextDisabled = insertServerBlock(disabledText, extracted.block);
        await fs.writeText(GROK_DISABLED_MCP_REL, nextDisabled);

        return this.getMCPServers(env);
    }

    /** MCP サーバーを有効化（disabled ファイル → config.toml へブロック移動）。 */
    async enableMCPServer(env: GrokEnvironment, serverName: string): Promise<MCPServers> {
        const fs = this.fsFor(env);
        const disabledText = (await fs.readText(GROK_DISABLED_MCP_REL)) ?? '';
        const extracted = extractServerBlock(disabledText, serverName);
        if (!extracted) {
            throw new Error(`Server "${serverName}" not found in disabled config`);
        }

        // config.toml へブロックを追記する。
        const configText = (await fs.readText(GROK_CONFIG_REL)) ?? '';
        const nextConfig = insertServerBlock(configText, extracted.block);
        await fs.writeText(GROK_CONFIG_REL, nextConfig);

        // disabled ファイルを更新（空になったら削除）。
        if (extracted.rest.trim().length === 0) {
            await fs.deleteFile(GROK_DISABLED_MCP_REL);
        } else {
            await fs.writeText(GROK_DISABLED_MCP_REL, extracted.rest);
        }

        return this.getMCPServers(env);
    }

    /** 有効な MCP サーバーの順序を変更する。 */
    async reorderMCPServers(env: GrokEnvironment, serverNames: string[]): Promise<MCPServers> {
        const fs = this.fsFor(env);
        const configText = (await fs.readText(GROK_CONFIG_REL)) ?? '';
        await fs.writeText(GROK_CONFIG_REL, reorderServerBlocks(configText, serverNames));
        return this.getMCPServers(env);
    }

    /** 無効な MCP サーバーの順序を変更する。 */
    async reorderDisabledMCPServers(env: GrokEnvironment, serverNames: string[]): Promise<MCPServers> {
        const fs = this.fsFor(env);
        const disabledText = (await fs.readText(GROK_DISABLED_MCP_REL)) ?? '';
        await fs.writeText(GROK_DISABLED_MCP_REL, reorderServerBlocks(disabledText, serverNames));
        return this.getMCPServers(env);
    }
}
