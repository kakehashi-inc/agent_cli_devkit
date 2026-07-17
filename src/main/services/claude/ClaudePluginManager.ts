import {
    CLAUDE_BUILTIN_MARKETPLACES,
    CLAUDE_CLI_COMMAND,
    CLAUDE_PLUGIN_CAPABILITIES,
    CLAUDE_WSL_CLI_TEST,
} from '../../../shared/agents/claude/constants';
import {
    ClaudeEnvironment,
    OSType,
    PluginCatalogEntry,
    PluginCatalogReport,
    PluginEntry,
    PluginEnvReport,
    PluginMarketplaceEntry,
    PluginOpResult,
} from '../../../shared/agents/claude/types';
import { AgentCliRunner } from '../common/cli/AgentCliRunner';
import { WslDetector } from '../common/wsl/WslDetector';

// インストール等の変更操作は git clone を伴うため長め（Claude 内部の git タイムアウト既定
// 120 秒より長い 180 秒）。一覧はリモート更新を伴わないため短め。
const LIST_TIMEOUT_MS = 60_000;
const MUTATE_TIMEOUT_MS = 180_000;

/**
 * Claude Code のプラグイン管理。
 *
 * 設計の要点:
 * - 一覧・カタログは `claude plugin list --json` / `claude plugin marketplace list --json` の
 *   機械可読出力を共通型（PluginEnvReport 等）へ正規化する。内部ファイル
 *   （~/.claude/plugins/installed_plugins.json 等）は解析しない（形式変更に弱いため）。
 * - 変更操作は CLI をヘッドレス実行する（インストールの実処理＝clone / 検証 / 設定更新を
 *   CLI に任せる）。スコープは常に user（本アプリはホームディレクトリ管理ツールのため）。
 * - native / WSL の実行差は AgentCliRunner が吸収する。
 */
export class ClaudePluginManager {
    private readonly detector: WslDetector;
    private readonly runner: AgentCliRunner;

    constructor(detector: WslDetector, runner: AgentCliRunner) {
        this.detector = detector;
        this.runner = runner;
    }

    private nativeLabel(): string {
        const platform = process.platform as OSType;
        if (platform === 'win32') return 'Windows';
        if (platform === 'darwin') return 'macOS';
        return 'Linux';
    }

    /** 管理対象の環境一覧（native + Claude 入り WSL distro）。他機能と同じ並び。 */
    async getEnvironments(): Promise<{ env: ClaudeEnvironment; label: string }[]> {
        const result: { env: ClaudeEnvironment; label: string }[] = [];
        result.push({ env: { kind: 'native' }, label: this.nativeLabel() });
        const distros = await this.detector.getDistrosWithTest(CLAUDE_WSL_CLI_TEST);
        for (const d of distros) {
            result.push({ env: { kind: 'wsl', distro: d.distro }, label: d.distro });
        }
        return result;
    }

    /** CLI 出力から失敗時の詳細メッセージを組み立てる。 */
    private failureMessage(stdout: string, stderr: string): string {
        return [stderr.trim(), stdout.trim()].filter(s => s.length > 0).join('\n');
    }

    /** インストール済みプラグインとマーケットプレイスの一覧。 */
    async list(env: ClaudeEnvironment): Promise<PluginEnvReport> {
        const label = env.kind === 'wsl' ? (env.distro ?? '') : this.nativeLabel();
        const cli = await this.runner.checkCli(env, CLAUDE_CLI_COMMAND);
        const base: PluginEnvReport = {
            env,
            label,
            cliAvailable: cli.available,
            cliVersion: cli.version,
            plugins: [],
            marketplaces: [],
            capabilities: CLAUDE_PLUGIN_CAPABILITIES,
        };
        if (!cli.available) {
            return base;
        }

        const [listResult, marketResult] = await Promise.all([
            this.runner.run(env, CLAUDE_CLI_COMMAND, ['plugin', 'list', '--json'], LIST_TIMEOUT_MS),
            this.runner.run(env, CLAUDE_CLI_COMMAND, ['plugin', 'marketplace', 'list', '--json'], LIST_TIMEOUT_MS),
        ]);
        if (!listResult.ok || !marketResult.ok) {
            const failed = !listResult.ok ? listResult : marketResult;
            return { ...base, error: this.failureMessage(failed.stdout, failed.stderr) };
        }

        try {
            base.plugins = this.parsePlugins(listResult.stdout);
            base.marketplaces = this.parseMarketplaces(marketResult.stdout);
        } catch (error) {
            return { ...base, error: `failed to parse CLI output: ${String(error)}` };
        }
        return base;
    }

    /** `claude plugin list --json` の出力を共通型へ変換する。 */
    private parsePlugins(json: string): PluginEntry[] {
        const parsed: unknown = JSON.parse(json);
        if (!Array.isArray(parsed)) {
            return [];
        }
        const entries: PluginEntry[] = [];
        for (const item of parsed) {
            if (!item || typeof item !== 'object') {
                continue;
            }
            const rec = item as Record<string, unknown>;
            const id = typeof rec.id === 'string' ? rec.id : '';
            if (id.length === 0) {
                continue;
            }
            const at = id.indexOf('@');
            entries.push({
                id,
                name: at > 0 ? id.slice(0, at) : id,
                version: typeof rec.version === 'string' ? rec.version : null,
                marketplace: at > 0 ? id.slice(at + 1) : null,
                enabled: rec.enabled === true,
                scope: typeof rec.scope === 'string' ? rec.scope : undefined,
            });
        }
        return entries;
    }

    /** `claude plugin marketplace list --json` の出力を共通型へ変換する。 */
    private parseMarketplaces(json: string): PluginMarketplaceEntry[] {
        const parsed: unknown = JSON.parse(json);
        if (!Array.isArray(parsed)) {
            return [];
        }
        const entries: PluginMarketplaceEntry[] = [];
        for (const item of parsed) {
            if (!item || typeof item !== 'object') {
                continue;
            }
            const rec = item as Record<string, unknown>;
            const name = typeof rec.name === 'string' ? rec.name : '';
            if (name.length === 0) {
                continue;
            }
            // 表示用ソース: github は repo、それ以外は url / path / installLocation の順で採用する。
            const detail =
                (typeof rec.repo === 'string' && rec.repo) ||
                (typeof rec.url === 'string' && rec.url) ||
                (typeof rec.path === 'string' && rec.path) ||
                (typeof rec.installLocation === 'string' && rec.installLocation) ||
                '';
            entries.push({
                name,
                sourceKind: typeof rec.source === 'string' ? rec.source : 'unknown',
                sourceDetail: detail,
                origin: CLAUDE_BUILTIN_MARKETPLACES.includes(name) ? 'builtin' : 'user',
                selectable: true,
            });
        }
        return entries;
    }

    /**
     * カタログエントリの source からブラウザで開ける URL を導出する。
     * - github: https://github.com/<repo>
     * - url / git-subdir: Git URL の .git を除去（SSH は https へ変換）。github の
     *   サブディレクトリは /tree/<ref>/<path> を付ける。
     */
    private homepageFrom(source: unknown): string | null {
        if (!source || typeof source !== 'object' || Array.isArray(source)) {
            return null;
        }
        const s = source as Record<string, unknown>;
        if (s.source === 'github' && typeof s.repo === 'string') {
            return `https://github.com/${s.repo}`;
        }
        let url = typeof s.url === 'string' ? s.url : null;
        if (!url) {
            return null;
        }
        url = url.replace(/\.git$/, '');
        const sshMatch = url.match(/^git@([^:]+):(.+)$/);
        if (sshMatch) {
            url = `https://${sshMatch[1]}/${sshMatch[2]}`;
        }
        if (!/^https?:\/\//.test(url)) {
            return null;
        }
        const path = typeof s.path === 'string' ? s.path : null;
        if (path && url.includes('github.com')) {
            const ref = typeof s.ref === 'string' ? s.ref : typeof s.sha === 'string' ? s.sha : 'HEAD';
            return `${url}/tree/${ref}/${path}`;
        }
        return url;
    }

    /** マーケットプレイスのカタログ（インストール可能なプラグイン一覧）。 */
    async catalog(env: ClaudeEnvironment): Promise<PluginCatalogReport> {
        const result = await this.runner.run(
            env,
            CLAUDE_CLI_COMMAND,
            ['plugin', 'list', '--available', '--json'],
            LIST_TIMEOUT_MS
        );
        if (!result.ok) {
            return { ok: false, entries: [], message: this.failureMessage(result.stdout, result.stderr) };
        }
        try {
            const parsed: unknown = JSON.parse(result.stdout);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                return { ok: true, entries: [] };
            }
            const rec = parsed as Record<string, unknown>;
            const installedIds = new Set<string>(
                (Array.isArray(rec.installed) ? rec.installed : [])
                    .map(item => (item && typeof item === 'object' ? (item as Record<string, unknown>).id : undefined))
                    .filter((id): id is string => typeof id === 'string')
            );
            const entries: PluginCatalogEntry[] = [];
            for (const item of Array.isArray(rec.available) ? rec.available : []) {
                if (!item || typeof item !== 'object') {
                    continue;
                }
                const a = item as Record<string, unknown>;
                const pluginId = typeof a.pluginId === 'string' ? a.pluginId : '';
                if (pluginId.length === 0) {
                    continue;
                }
                entries.push({
                    id: pluginId,
                    name: typeof a.name === 'string' ? a.name : pluginId,
                    description: typeof a.description === 'string' ? a.description : null,
                    marketplace: typeof a.marketplaceName === 'string' ? a.marketplaceName : '',
                    installed: installedIds.has(pluginId),
                    homepage: this.homepageFrom(a.source),
                });
            }
            return { ok: true, entries };
        } catch (error) {
            return { ok: false, entries: [], message: `failed to parse CLI output: ${String(error)}` };
        }
    }

    /** 変更操作の共通実行（成功判定と失敗メッセージの整形）。 */
    private async mutate(env: ClaudeEnvironment, args: string[]): Promise<PluginOpResult> {
        const result = await this.runner.run(env, CLAUDE_CLI_COMMAND, args, MUTATE_TIMEOUT_MS);
        if (result.ok) {
            return { ok: true };
        }
        return { ok: false, message: this.failureMessage(result.stdout, result.stderr) };
    }

    /** プラグインをインストールする（user スコープ）。id は "<plugin>@<marketplace>"。 */
    async install(env: ClaudeEnvironment, id: string): Promise<PluginOpResult> {
        return this.mutate(env, ['plugin', 'install', id]);
    }

    /** プラグインをアンインストールする（user スコープ）。 */
    async uninstall(env: ClaudeEnvironment, id: string): Promise<PluginOpResult> {
        return this.mutate(env, ['plugin', 'uninstall', id]);
    }

    /** プラグインの有効/無効を切り替える。 */
    async setEnabled(env: ClaudeEnvironment, id: string, enabled: boolean): Promise<PluginOpResult> {
        return this.mutate(env, ['plugin', enabled ? 'enable' : 'disable', id]);
    }

    /** マーケットプレイスを追加する（owner/repo・Git URL・ローカルパス・リモート URL）。 */
    async addMarketplace(env: ClaudeEnvironment, source: string): Promise<PluginOpResult> {
        return this.mutate(env, ['plugin', 'marketplace', 'add', source]);
    }

    /** マーケットプレイスを削除する（そのマーケットプレイス由来のプラグインも削除される）。 */
    async removeMarketplace(env: ClaudeEnvironment, name: string): Promise<PluginOpResult> {
        return this.mutate(env, ['plugin', 'marketplace', 'remove', name]);
    }
}
