import {
    CLAUDE_BUILTIN_MARKETPLACES,
    CLAUDE_CLI_COMMAND,
    CLAUDE_LISTED_PLUGIN_SCOPES,
    CLAUDE_NON_MARKETPLACE_PLUGIN_ORIGINS,
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
import { AgentCliRunner, validateOperand } from '../common/cli/AgentCliRunner';
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
 *   一覧も user スコープと claude.ai 同期分（CLAUDE_LISTED_PLUGIN_SCOPES）に絞る。
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

    /**
     * 管理対象の環境一覧（native + Claude 入り WSL distro）。他機能と同じ並び。
     * refresh=true のときは CLI と WSL distro の検出結果を破棄してから列挙する。
     */
    async getEnvironments(refresh = false): Promise<{ env: ClaudeEnvironment; label: string }[]> {
        if (refresh) {
            this.runner.invalidate();
            this.detector.invalidate();
        }
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

    /** プラグイン ID（<name>@<origin>）の @ 以降を返す。@ が無ければ null。 */
    private originOf(id: string): string | null {
        const at = id.lastIndexOf('@');
        return at > 0 ? id.slice(at + 1) : null;
    }

    /** マーケットプレイス以外の由来（synced / skills-dir 等）のプラグインか。 */
    private isNonMarketplacePlugin(id: string): boolean {
        const origin = this.originOf(id);
        return origin !== null && CLAUDE_NON_MARKETPLACE_PLUGIN_ORIGINS.includes(origin);
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

    /**
     * `claude plugin list --json` の出力を共通型へ変換する。
     * 出力はインストール（スコープ）ごとに 1 要素で、他プロジェクトの project / local スコープも
     * 含むため、CLAUDE_LISTED_PLUGIN_SCOPES のスコープだけを残す（同一 ID の重複も防ぐ）。
     */
    private parsePlugins(json: string): PluginEntry[] {
        const parsed: unknown = JSON.parse(json);
        if (!Array.isArray(parsed)) {
            return [];
        }
        const entries: PluginEntry[] = [];
        const seen = new Set<string>();
        for (const item of parsed) {
            if (!item || typeof item !== 'object') {
                continue;
            }
            const rec = item as Record<string, unknown>;
            const id = typeof rec.id === 'string' ? rec.id : '';
            const scope = typeof rec.scope === 'string' ? rec.scope : '';
            if (id.length === 0 || !CLAUDE_LISTED_PLUGIN_SCOPES.includes(scope) || seen.has(id)) {
                continue;
            }
            seen.add(id);
            const at = id.lastIndexOf('@');
            entries.push({
                id,
                name: at > 0 ? id.slice(0, at) : id,
                version: typeof rec.version === 'string' ? rec.version : null,
                marketplace: at > 0 ? id.slice(at + 1) : null,
                enabled: rec.enabled === true,
                scope,
                uninstallable: !this.isNonMarketplacePlugin(id),
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
            // github / git で ref を固定している場合は #<ref> を付ける（marketplace add と同じ表記）。
            const detail =
                (typeof rec.repo === 'string' && rec.repo) ||
                (typeof rec.url === 'string' && rec.url) ||
                (typeof rec.path === 'string' && rec.path) ||
                (typeof rec.installLocation === 'string' && rec.installLocation) ||
                '';
            const ref = typeof rec.ref === 'string' && rec.ref.length > 0 ? rec.ref : null;
            entries.push({
                name,
                sourceKind: typeof rec.source === 'string' ? rec.source : 'unknown',
                sourceDetail: ref && detail ? `${detail}#${ref}` : detail,
                origin: CLAUDE_BUILTIN_MARKETPLACES.includes(name) ? 'builtin' : 'user',
                selectable: true,
            });
        }
        return entries;
    }

    /** Git URL をブラウザで開ける https URL に整える（.git 除去、SSH 形式は https へ変換）。 */
    private browsableUrl(gitUrl: string): string | null {
        let url = gitUrl.replace(/\.git$/, '');
        const sshMatch = url.match(/^git@([^:]+):(.+)$/);
        if (sshMatch) {
            url = `https://${sshMatch[1]}/${sshMatch[2]}`;
        }
        return /^https?:\/\//.test(url) ? url : null;
    }

    /**
     * `claude plugin marketplace list --json` の出力から、GitHub 上のマーケットプレイスの
     * リポジトリ URL と ref を名前ごとに引ける表を作る（相対パス source のリンク導出用）。
     */
    private marketplaceRepoMap(json: string): Map<string, { url: string; ref: string }> {
        const map = new Map<string, { url: string; ref: string }>();
        const parsed: unknown = JSON.parse(json);
        if (!Array.isArray(parsed)) {
            return map;
        }
        for (const item of parsed) {
            if (!item || typeof item !== 'object') {
                continue;
            }
            const rec = item as Record<string, unknown>;
            if (typeof rec.name !== 'string') {
                continue;
            }
            let url: string | null = null;
            if (rec.source === 'github' && typeof rec.repo === 'string') {
                url = `https://github.com/${rec.repo}`;
            } else if (rec.source === 'git' && typeof rec.url === 'string') {
                url = this.browsableUrl(rec.url);
            }
            if (url && url.includes('github.com')) {
                map.set(rec.name, { url, ref: typeof rec.ref === 'string' && rec.ref ? rec.ref : 'HEAD' });
            }
        }
        return map;
    }

    /**
     * カタログエントリの source からブラウザで開ける URL を導出する。
     * - github: https://github.com/<repo>
     * - url / git-subdir: Git URL の .git を除去（SSH は https へ変換）。github の
     *   サブディレクトリは /tree/<ref>/<path> を付ける。
     * - 相対パス（文字列。マーケットプレイスのルートからの相対）: マーケットプレイスが GitHub 上に
     *   あれば <リポジトリ URL>/tree/<ref>/<path>。
     */
    private homepageFrom(source: unknown, market: { url: string; ref: string } | undefined): string | null {
        if (typeof source === 'string') {
            const path = source.replace(/^\.\//, '').replace(/\/+$/, '');
            if (!market || path.length === 0 || path.startsWith('..')) {
                return null;
            }
            return `${market.url}/tree/${market.ref}/${path}`;
        }
        if (!source || typeof source !== 'object' || Array.isArray(source)) {
            return null;
        }
        const s = source as Record<string, unknown>;
        if (s.source === 'github' && typeof s.repo === 'string') {
            return `https://github.com/${s.repo}`;
        }
        const url = typeof s.url === 'string' ? this.browsableUrl(s.url) : null;
        if (!url) {
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
        const [result, marketResult] = await Promise.all([
            this.runner.run(env, CLAUDE_CLI_COMMAND, ['plugin', 'list', '--available', '--json'], LIST_TIMEOUT_MS),
            this.runner.run(env, CLAUDE_CLI_COMMAND, ['plugin', 'marketplace', 'list', '--json'], LIST_TIMEOUT_MS),
        ]);
        if (!result.ok) {
            return { ok: false, entries: [], message: this.failureMessage(result.stdout, result.stderr) };
        }
        // マーケットプレイス一覧は相対パス source のリンク導出にだけ使う。取得・解析に失敗しても
        // カタログ自体は返す（該当エントリのリンクが無くなるだけ）。
        let markets = new Map<string, { url: string; ref: string }>();
        if (marketResult.ok) {
            try {
                markets = this.marketplaceRepoMap(marketResult.stdout);
            } catch (error) {
                console.warn('Failed to parse marketplace list for catalog links:', error);
            }
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
                const marketplace = typeof a.marketplaceName === 'string' ? a.marketplaceName : '';
                entries.push({
                    id: pluginId,
                    name: typeof a.name === 'string' ? a.name : pluginId,
                    description: typeof a.description === 'string' ? a.description : null,
                    marketplace,
                    installed: installedIds.has(pluginId),
                    homepage: this.homepageFrom(a.source, markets.get(marketplace)),
                });
            }
            return { ok: true, entries };
        } catch (error) {
            return { ok: false, entries: [], message: `failed to parse CLI output: ${String(error)}` };
        }
    }

    /**
     * 変更操作の共通実行（成功判定と失敗メッセージの整形）。
     * 操作対象（プラグイン ID・ソース・マーケットプレイス名）が空、または - で始まる場合は
     * CLI のオプションとして解釈されるのを防ぐため実行しない。
     */
    private async mutate(env: ClaudeEnvironment, args: string[], target: string): Promise<PluginOpResult> {
        if (!validateOperand(target)) {
            return { ok: false, message: `invalid argument: ${target}` };
        }
        const result = await this.runner.run(env, CLAUDE_CLI_COMMAND, args, MUTATE_TIMEOUT_MS);
        if (result.ok) {
            return { ok: true };
        }
        return { ok: false, message: this.failureMessage(result.stdout, result.stderr) };
    }

    /** プラグインをインストールする（user スコープ）。id は "<plugin>@<marketplace>"。 */
    async install(env: ClaudeEnvironment, id: string): Promise<PluginOpResult> {
        return this.mutate(env, ['plugin', 'install', id], id);
    }

    /**
     * プラグインをアンインストールする（user スコープ）。
     * synced / skills-dir などマーケットプレイス以外の由来はインストール記録が無く CLI では
     * 削除できないため、CLI を実行せずに失敗を返す（無効化は setEnabled で行える）。
     */
    async uninstall(env: ClaudeEnvironment, id: string): Promise<PluginOpResult> {
        if (this.isNonMarketplacePlugin(id)) {
            return {
                ok: false,
                message:
                    `"${id}" is not a marketplace install and cannot be uninstalled. ` +
                    'Disable it instead (synced plugins can also be turned off on claude.ai).',
            };
        }
        return this.mutate(env, ['plugin', 'uninstall', id], id);
    }

    /**
     * プラグインの有効/無効を切り替える。
     * マーケットプレイス由来は --scope user を明示する（省略時は実行時のカレントディレクトリの
     * project / local 設定から書き込み先が自動判定されるため）。synced 等は CLI が user 設定の
     * enabledPlugins へ書き込むため、スコープを付けずに実行する。
     */
    async setEnabled(env: ClaudeEnvironment, id: string, enabled: boolean): Promise<PluginOpResult> {
        const args = ['plugin', enabled ? 'enable' : 'disable', id];
        if (!this.isNonMarketplacePlugin(id)) {
            args.push('--scope', 'user');
        }
        return this.mutate(env, args, id);
    }

    /** マーケットプレイスを追加する（owner/repo・Git URL・ローカルパス・リモート URL）。 */
    async addMarketplace(env: ClaudeEnvironment, source: string): Promise<PluginOpResult> {
        return this.mutate(env, ['plugin', 'marketplace', 'add', source], source);
    }

    /** マーケットプレイスを削除する（そのマーケットプレイス由来のプラグインも削除される）。 */
    async removeMarketplace(env: ClaudeEnvironment, name: string): Promise<PluginOpResult> {
        return this.mutate(env, ['plugin', 'marketplace', 'remove', name], name);
    }
}
