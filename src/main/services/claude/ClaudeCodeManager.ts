import {
    CLAUDE_CODE_CONFIG_FILENAME,
    CLAUDE_CODE_DISABLED_FILENAME,
    CLAUDE_WSL_CLI_TEST,
} from '../../../shared/agents/claude/constants';
import {
    ClaudeCodeEnvInfo,
    ClaudeEnvironment,
    MCPServerConfig,
    MCPServerInfo,
    MCPServers,
    McpFileProblem,
    OSType,
} from '../../../shared/agents/claude/types';
import { mcpDisplayConfig } from '../../utils/mcpDisplayConfig';
import { commitConfigChanges, problemOf } from '../common/fs/configFile';
import {
    jsonServerMap,
    moveJsonEntry,
    readStrictJsonFile,
    reorderJsonEntries,
    sidecarChange,
    type JsonFileState,
} from '../common/json/jsonConfigFile';
import { HomeFs } from '../common/wsl/HomeFs';
import { WslDetector } from '../common/wsl/WslDetector';
import { resolveClaudeGlobalConfigRel } from './claudeGlobalConfig';

const MCP_SERVERS_KEY = 'mcpServers';

/**
 * Claude Code (CLI) のプロファイル MCP を管理する。
 * - グローバル MCP は全体設定ファイル（resolveClaudeGlobalConfigRel が選ぶ ~/.claude.json か ~/.claude/.config.json）の
 *   トップレベル mcpServers。
 * - 無効化した MCP は ~/.claude-disabled-mcp.json（sidecar）へ退避。
 * - native とすべての Claude 入り WSL distro を環境として扱う。
 * - プロジェクト単位 MCP（projects[path].mcpServers）は対象外。
 * - 全体設定ファイルは多数のトップレベルキーを持つ。編集は mcpServers の該当エントリの文字列だけに行い、その他のキー、
 *   順序、整形、大きな数値はバイト単位で保つ。
 * - 未作成のファイルだけを空のオブジェクトとして扱う。読み取りと解釈に失敗したら何も書かない。
 */
export class ClaudeCodeManager {
    private readonly detector: WslDetector;

    constructor(detector: WslDetector) {
        this.detector = detector;
    }

    /** native の OS ラベル */
    private nativeLabel(): string {
        const platform = process.platform as OSType;
        if (platform === 'win32') return 'Windows';
        if (platform === 'darwin') return 'macOS';
        return 'Linux';
    }

    private fsFor(env: ClaudeEnvironment): HomeFs {
        return new HomeFs(env, this.detector);
    }

    /**
     * 管理対象の環境一覧（native + Claude 入り WSL distro）。refresh なら WSL distro の検出結果を破棄して検出し直す。
     */
    async getEnvironments(refresh = false): Promise<ClaudeCodeEnvInfo[]> {
        if (refresh) this.detector.invalidate();
        const result: ClaudeCodeEnvInfo[] = [];

        const nativeEnv: ClaudeEnvironment = { kind: 'native' };
        result.push(await this.buildEnvInfo(nativeEnv, this.nativeLabel()));

        const distros = await this.detector.getDistrosWithTest(CLAUDE_WSL_CLI_TEST);
        for (const d of distros) {
            const env: ClaudeEnvironment = { kind: 'wsl', distro: d.distro };
            result.push(await this.buildEnvInfo(env, d.distro));
        }

        return result;
    }

    /** 全体設定ファイルを選べなければ既定のファイル名を示し、一覧の段階で理由を出せるよう存在するものとして返す。 */
    private async buildEnvInfo(env: ClaudeEnvironment, label: string): Promise<ClaudeCodeEnvInfo> {
        const fs = this.fsFor(env);
        let configRel: string = CLAUDE_CODE_CONFIG_FILENAME;
        let configExists = true;
        try {
            configRel = await resolveClaudeGlobalConfigRel(fs);
            configExists = await fs.exists(configRel);
        } catch (error) {
            console.error(`Failed to inspect the Claude Code config (${JSON.stringify(env)}):`, error);
        }
        const configPath = await fs.displayPath(configRel);
        const disabledConfigPath = await fs.displayPath(CLAUDE_CODE_DISABLED_FILENAME);
        return { env, label, configPath, configExists, disabledConfigPath };
    }

    private async readConfig(fs: HomeFs): Promise<JsonFileState> {
        return readStrictJsonFile(fs, await resolveClaudeGlobalConfigRel(fs));
    }

    private readDisabled(fs: HomeFs): Promise<JsonFileState> {
        return readStrictJsonFile(fs, CLAUDE_CODE_DISABLED_FILENAME);
    }

    private infos(servers: Record<string, MCPServerConfig>, enabled: boolean): MCPServerInfo[] {
        return Object.entries(servers).map(([name, config]) => ({ name, config: mcpDisplayConfig(config), enabled }));
    }

    /**
     * 有効/無効の MCP サーバー一覧を取得する。読めなかったファイルは problems に入れる。
     */
    async getMCPServers(env: ClaudeEnvironment): Promise<MCPServers> {
        const fs = this.fsFor(env);
        const problems: McpFileProblem[] = [];
        const load = async (read: () => Promise<JsonFileState>, rel: string, enabled: boolean) => {
            try {
                return this.infos(jsonServerMap((await read()).root, [MCP_SERVERS_KEY]), enabled);
            } catch (error) {
                problems.push(problemOf(error, rel));
                return [];
            }
        };
        const enabled = await load(() => this.readConfig(fs), CLAUDE_CODE_CONFIG_FILENAME, true);
        const disabled = await load(() => this.readDisabled(fs), CLAUDE_CODE_DISABLED_FILENAME, false);
        return { enabled, disabled, ...(problems.length > 0 ? { problems } : {}) };
    }

    /**
     * MCP サーバーを無効化（全体設定ファイルから sidecar へ移動）。
     * 全体設定ファイルの mcpServers は空になっても残す。
     */
    async disableMCPServer(env: ClaudeEnvironment, serverName: string): Promise<MCPServers> {
        const fs = this.fsFor(env);
        const config = await this.readConfig(fs);
        const disabled = await this.readDisabled(fs);
        const moved = moveJsonEntry(config, disabled, [MCP_SERVERS_KEY, serverName], { cascade: false });
        await commitConfigChanges(fs, [
            { file: disabled.file, next: moved.target },
            { file: config.file, next: moved.source },
        ]);
        return this.getMCPServers(env);
    }

    /**
     * MCP サーバーを有効化（sidecar から全体設定ファイルへ移動）。sidecar が空になったら削除する。
     */
    async enableMCPServer(env: ClaudeEnvironment, serverName: string): Promise<MCPServers> {
        const fs = this.fsFor(env);
        const disabled = await this.readDisabled(fs);
        const config = await this.readConfig(fs);
        const moved = moveJsonEntry(disabled, config, [MCP_SERVERS_KEY, serverName], { cascade: true });
        await commitConfigChanges(fs, [
            { file: config.file, next: moved.target },
            sidecarChange(disabled.file, moved.source),
        ]);
        return this.getMCPServers(env);
    }

    /**
     * 有効な MCP サーバーの順序を変更する。対象がなければ何も書かない。
     */
    async reorderMCPServers(env: ClaudeEnvironment, serverNames: string[]): Promise<MCPServers> {
        const fs = this.fsFor(env);
        const config = await this.readConfig(fs);
        const next = reorderJsonEntries(config, [MCP_SERVERS_KEY], serverNames);
        await commitConfigChanges(fs, [{ file: config.file, next }]);
        return this.getMCPServers(env);
    }

    /**
     * 無効な MCP サーバーの順序を変更する。対象がなければ何も書かない。
     */
    async reorderDisabledMCPServers(env: ClaudeEnvironment, serverNames: string[]): Promise<MCPServers> {
        const fs = this.fsFor(env);
        const disabled = await this.readDisabled(fs);
        const next = reorderJsonEntries(disabled, [MCP_SERVERS_KEY], serverNames);
        await commitConfigChanges(fs, [{ file: disabled.file, next }]);
        return this.getMCPServers(env);
    }
}
