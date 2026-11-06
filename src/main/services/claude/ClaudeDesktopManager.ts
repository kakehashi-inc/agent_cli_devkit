import { existsSync } from 'fs';
import { join } from 'path';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import {
    ClaudeDesktopInfo,
    MCPServerInfo,
    MCPServers,
    McpFileProblem,
    OSType,
} from '../../../shared/agents/claude/types';
import {
    CLAUDE_CONFIG_PATHS,
    CLAUDE_CONFIG_FILENAME,
    CLAUDE_CONFIG_DISABLED_FILENAME,
    getClaudeExecutablePaths,
} from '../../../shared/agents/claude/constants';
import { mcpDisplayConfig } from '../../utils/mcpDisplayConfig';
import { absolutePathStore, commitConfigChanges, problemOf } from '../common/fs/configFile';
import {
    jsonServerMap,
    moveJsonEntry,
    readStrictJsonFile,
    reorderJsonEntries,
    sidecarChange,
} from '../common/json/jsonConfigFile';

const execAsync = promisify(exec);

const MCP_SERVERS_KEY = 'mcpServers';

/**
 * Claude Desktop の MCP サーバーの設定ファイルを管理する。
 * 編集は mcpServers の該当エントリの文字列だけに行い、他のキーと整形を保つ。
 * 未作成のファイルだけを空のオブジェクトとして扱い、読み取りと解釈に失敗したら何も書かない。
 */
export class ClaudeDesktopManager {
    private platform: OSType;
    private configDir: string;
    private configPath: string;
    private disabledConfigPath: string;
    private claudeExecutable?: string;

    constructor() {
        this.platform = process.platform as OSType;
        this.configDir = CLAUDE_CONFIG_PATHS[this.platform];
        this.configPath = join(this.configDir, CLAUDE_CONFIG_FILENAME);
        this.disabledConfigPath = join(this.configDir, CLAUDE_CONFIG_DISABLED_FILENAME);

        const execPaths = getClaudeExecutablePaths();
        for (const execPath of execPaths) {
            if (existsSync(execPath)) {
                this.claudeExecutable = execPath;
                break;
            }
        }
    }

    /**
     * Claude Desktopの情報を取得
     */
    getClaudeDesktopInfo(): ClaudeDesktopInfo {
        return {
            configPath: this.configPath,
            configExists: existsSync(this.configPath),
            disabledConfigPath: this.disabledConfigPath,
            claudeExecutable: this.claudeExecutable,
        };
    }

    /**
     * MCPサーバーのリストを取得。環境変数などの値は含めず、一覧に出す項目だけを返す。読めなかったファイルは problems に入れる。
     */
    async getMCPServers(): Promise<MCPServers> {
        const problems: McpFileProblem[] = [];
        const load = async (path: string, enabled: boolean): Promise<MCPServerInfo[]> => {
            try {
                const { root } = await readStrictJsonFile(absolutePathStore, path);
                return Object.entries(jsonServerMap(root, [MCP_SERVERS_KEY])).map(([name, config]) => ({
                    name,
                    config: mcpDisplayConfig(config),
                    enabled,
                }));
            } catch (error) {
                problems.push(problemOf(error, path));
                return [];
            }
        };
        const enabled = await load(this.configPath, true);
        const disabled = await load(this.disabledConfigPath, false);
        return { enabled, disabled, ...(problems.length > 0 ? { problems } : {}) };
    }

    /**
     * MCPサーバーを無効化（移動先を先に書き込む。有効設定の mcpServers は空になっても残す）
     */
    async disableMCPServer(serverName: string): Promise<void> {
        const config = await readStrictJsonFile(absolutePathStore, this.configPath);
        const disabled = await readStrictJsonFile(absolutePathStore, this.disabledConfigPath);
        const moved = moveJsonEntry(config, disabled, [MCP_SERVERS_KEY, serverName], { cascade: false });
        await commitConfigChanges(absolutePathStore, [
            { file: disabled.file, next: moved.target },
            { file: config.file, next: moved.source },
        ]);
    }

    /**
     * MCPサーバーを有効化（移動先を先に書き込む。無効設定が空になればファイルを削除する）
     */
    async enableMCPServer(serverName: string): Promise<void> {
        const disabled = await readStrictJsonFile(absolutePathStore, this.disabledConfigPath);
        const config = await readStrictJsonFile(absolutePathStore, this.configPath);
        const moved = moveJsonEntry(disabled, config, [MCP_SERVERS_KEY, serverName], { cascade: true });
        await commitConfigChanges(absolutePathStore, [
            { file: config.file, next: moved.target },
            sidecarChange(disabled.file, moved.source),
        ]);
    }

    private async reorder(path: string, serverNames: string[]): Promise<void> {
        const state = await readStrictJsonFile(absolutePathStore, path);
        const next = reorderJsonEntries(state, [MCP_SERVERS_KEY], serverNames);
        await commitConfigChanges(absolutePathStore, [{ file: state.file, next }]);
    }

    /**
     * MCPサーバーの順序を変更（有効）。対象がなければ何も書かない。
     */
    reorderMCPServers(serverNames: string[]): Promise<void> {
        return this.reorder(this.configPath, serverNames);
    }

    /**
     * MCPサーバーの順序を変更（無効）。対象がなければ何も書かない。
     */
    reorderDisabledMCPServers(serverNames: string[]): Promise<void> {
        return this.reorder(this.disabledConfigPath, serverNames);
    }

    /**
     * Claude Desktopが実行中か確認
     */
    private async isClaudeRunning(): Promise<boolean> {
        try {
            if (this.platform === 'win32') {
                const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq Claude.exe" /NH');
                return stdout.includes('Claude.exe');
            } else {
                await execAsync('pgrep -x -i "claude"');
                return true;
            }
            return false;
        } catch {
            return false;
        }
    }

    /**
     * Claude Desktopプロセスを終了
     */
    private async killClaudeDesktop(): Promise<void> {
        // 終了シグナルを送信
        try {
            if (this.platform === 'win32') {
                await execAsync('taskkill /IM Claude.exe');
            } else {
                await execAsync('pkill -x -i "claude"');
            }
        } catch {
            // プロセスが既に存在しない場合などは無視
        }

        // プロセス終了を待機（最大10秒）
        const startTime = Date.now();
        const timeout = 10000;

        while (Date.now() - startTime < timeout) {
            const isRunning = await this.isClaudeRunning();
            if (!isRunning) {
                return;
            }
            // 500ms待機
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.warn('Claude Desktop did not exit within timeout');
    }

    /**
     * Claude Desktopを起動
     */
    private async startClaudeDesktop(): Promise<void> {
        if (!this.claudeExecutable) {
            throw new Error('Claude Desktop executable not found');
        }

        if (this.platform === 'darwin') {
            spawn('open', ['-a', this.claudeExecutable], { detached: true, stdio: 'ignore' }).unref();
        } else {
            // Windows and Linux
            spawn(this.claudeExecutable, [], { detached: true, stdio: 'ignore' }).unref();
        }
    }

    /**
     * Claude Desktopを再起動
     */
    async restartClaudeDesktop(): Promise<void> {
        await this.killClaudeDesktop();
        await this.startClaudeDesktop();
    }
}
