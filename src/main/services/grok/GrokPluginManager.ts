import { parse } from 'smol-toml';
import {
    GROK_BUILTIN_MARKETPLACES,
    GROK_CLI_COMMAND,
    GROK_CONFIG_REL,
    GROK_MARKETPLACE_CACHE_REL,
    GROK_MARKETPLACE_INDEX_FILES,
    GROK_PLUGIN_CAPABILITIES,
    GROK_SELECTABLE_EXTERNAL_MARKETPLACES,
    GROK_WSL_CLI_TEST,
} from '../../../shared/agents/grok/constants';
import {
    GrokEnvironment,
    OSType,
    PluginCatalogEntry,
    PluginCatalogReport,
    PluginEntry,
    PluginEnvReport,
    PluginMarketplaceEntry,
    PluginOpResult,
} from '../../../shared/agents/grok/types';
import { AgentCliRunner, validateOperand } from '../common/cli/AgentCliRunner';
import { stripBom } from '../common/json/stripBom';
import { HomeFs } from '../common/wsl/HomeFs';
import { WslDetector } from '../common/wsl/WslDetector';
import { deepEqualLoose } from '../../utils/nestedValue';
import { sameTomlPath, scanTomlStatements } from '../../utils/tomlStatements';

const LIST_TIMEOUT_MS = 60_000;
const MUTATE_TIMEOUT_MS = 180_000;

// config.toml の [plugins] にある有効/無効リスト
type PluginStateKey = 'enabled' | 'disabled';
const PLUGIN_STATE_KEYS: PluginStateKey[] = ['enabled', 'disabled'];

type PluginStateLists = Record<PluginStateKey, string[]>;

function asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** Grok の slugify と同じ規則で名前を変換する（ASCII 英字を小文字化し、空白の連続をハイフン 1 個にする）。 */
function slugify(name: string): string {
    return name
        .replace(/[A-Z]/g, c => c.toLowerCase())
        .split(/\s+/)
        .filter(part => part.length > 0)
        .join('-');
}

/** GitHub の Git URL（HTTPS / SSH / scp 形式）から小文字の `owner/repo` を取り出す。GitHub 以外は null。 */
function githubOwnerRepo(url: string): string | null {
    let s = url.trim();
    s = s.endsWith('/') ? s.slice(0, -1) : s;
    s = s.endsWith('.git') ? s.slice(0, -4) : s;
    let rest = s.toLowerCase();
    const scheme = ['https://', 'http://', 'ssh://'].find(p => rest.startsWith(p));
    if (scheme) {
        rest = rest.slice(scheme.length);
    }
    if (rest.startsWith('git@')) {
        rest = rest.slice('git@'.length);
    }
    if (rest.startsWith('www.')) {
        rest = rest.slice('www.'.length);
    }
    const host = ['github.com/', 'github.com:'].find(p => rest.startsWith(p));
    if (!host) {
        return null;
    }
    const ownerRepo = rest.slice(host.length);
    return ownerRepo.length > 0 ? ownerRepo : null;
}

/** Git URL を比較用に正規化する（スキーム・ユーザー・www.・末尾の / と .git を除き、scp 形式の : を / にする）。 */
function normalizeGitUrl(url: string): string {
    return url
        .trim()
        .toLowerCase()
        .replace(/\/+$/, '')
        .replace(/\.git$/, '')
        .replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
        .replace(/^[^@/]+@/, '')
        .replace(/^www\./, '')
        .replace(/^([^/:]+):(?!\d)/, '$1/');
}

/** Git の config テキストから [remote "origin"] の url を取り出す。 */
function originUrlOf(gitConfig: string): string | null {
    let inOrigin = false;
    for (const rawLine of gitConfig.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (line.startsWith('[')) {
            inOrigin = /^\[\s*remote\s+"origin"\s*\]$/.test(line);
            continue;
        }
        if (inOrigin) {
            const m = /^url\s*=\s*(.+)$/.exec(line);
            if (m) {
                return m[1].trim();
            }
        }
    }
    return null;
}

/** http / https の URL だけを返す（末尾の .git は除く）。 */
function httpUrl(value: unknown): string | null {
    if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) {
        return null;
    }
    return value.replace(/\.git$/, '');
}

/**
 * Grok Build のプラグイン管理。
 *
 * 設計の要点:
 * - 一覧・カタログは `grok plugin list --json` / `grok plugin list --available --json` /
 *   `grok plugin marketplace list --json` を共通型へ正規化する。
 * - 有効/無効は CLI の出力に含まれないため、config.toml の [plugins] enabled / disabled から
 *   Grok と同じ規則（enabled に含まれ、かつ disabled に含まれない）で判定する。
 * - Grok は Claude Code のマーケットプレイス設定（~/.claude）も読み込んで一覧へ合成するため、
 *   config.toml の [[marketplace.sources]] に存在しないものは origin='external' として区別し、
 *   削除操作の対象にしない（CLI の remove は ~/.claude 側の設定ファイルも書き換えるため）。
 * - マーケットプレイスからのインストールは `<plugin>@<qualifier>` 形式で指定する。qualifier は
 *   Grok の addressable_qualifier と同じ規則（GitHub の Git ソースは `owner/repo`、それ以外の
 *   Git ソースは `git/<slug>`、ローカルソースは `local/<slug>`）で marketplace list から組み立てる。
 * - install は非対話で実行するため、CLI の信頼確認を省く `--trust` を付与する。uninstall は、同じリポジトリから
 *   導入された他のプラグインがあり、それらが確認済みの名前に含まれるときだけ、一緒に削除する `--confirm` を付与する。
 *   一覧の各プラグインには、それらの名前（plugin list --json の repo_key が同じもの）を添える。
 * - 操作対象（プラグイン名・ソース・マーケットプレイス名）が - で始まる値はオプションと解釈されるため実行しない。
 * - Grok のアンインストール（uninstall / marketplace remove）は config.toml の [plugins]
 *   enabled / disabled から名前を取り除かないため、成功後に削除されたプラグイン名を両方の
 *   リストから取り除く（再インストール時に無効のまま残るのを防ぐ）。
 * - カタログのリンク先は、マーケットプレイスの Git キャッシュにあるインデックス
 *   （.grok-plugin / .claude-plugin の marketplace.json）のプラグイン単位の URL を優先し、
 *   得られなければマーケットプレイスの Git URL を使う。
 */
export class GrokPluginManager {
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

    private fsFor(env: GrokEnvironment): HomeFs {
        return new HomeFs(env, this.detector);
    }

    /**
     * 管理対象の環境一覧（native + Grok 入り WSL distro）。他機能と同じ並び。
     * refresh=true のときは CLI と WSL distro の検出結果を破棄してから列挙する。
     */
    async getEnvironments(refresh = false): Promise<{ env: GrokEnvironment; label: string }[]> {
        if (refresh) {
            this.runner.invalidate();
            this.detector.invalidate();
        }
        const result: { env: GrokEnvironment; label: string }[] = [];
        result.push({ env: { kind: 'native' }, label: this.nativeLabel() });
        const distros = await this.detector.getDistrosWithTest(GROK_WSL_CLI_TEST);
        for (const d of distros) {
            result.push({ env: { kind: 'wsl', distro: d.distro }, label: d.distro });
        }
        return result;
    }

    private failureMessage(stdout: string, stderr: string): string {
        return [stderr.trim(), stdout.trim()].filter(s => s.length > 0).join('\n');
    }

    /** config.toml を読み込んでパースする。存在しない・読めない・壊れている場合は null。 */
    private async readConfig(env: GrokEnvironment): Promise<Record<string, unknown> | null> {
        try {
            const raw = stripBom(await this.fsFor(env).readText(GROK_CONFIG_REL));
            if (raw === null) {
                return null;
            }
            return asRecord(parse(raw));
        } catch (error) {
            console.error('Failed to read grok config.toml:', error);
            return null;
        }
    }

    /** config.toml の [[marketplace.sources]] に宣言されているソース名の一覧。 */
    private configSourceNames(config: Record<string, unknown> | null): Set<string> {
        const names = new Set<string>();
        const sources = asRecord(config?.marketplace)?.sources;
        if (!Array.isArray(sources)) {
            return names;
        }
        for (const src of sources) {
            const name = asRecord(src)?.name;
            if (typeof name === 'string') {
                names.add(name);
            }
        }
        return names;
    }

    /** config.toml の [plugins] enabled / disabled（文字列要素のみ）。 */
    private pluginStateLists(config: Record<string, unknown>): PluginStateLists {
        const plugins = asRecord(config.plugins);
        const listOf = (key: PluginStateKey): string[] => {
            const value = plugins?.[key];
            return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
        };
        return { enabled: listOf('enabled'), disabled: listOf('disabled') };
    }

    /**
     * [plugins] enabled / disabled の要素がプラグイン名に該当するか。
     * 名前そのもの、またはインストール済みプラグインのスコープ（user）の ID `user/<hash>/<name>` が該当する。
     */
    private matchesPlugin(entry: string, name: string): boolean {
        if (entry === name) {
            return true;
        }
        const parts = entry.split('/');
        return parts.length === 3 && parts[0] === 'user' && parts[2] === name;
    }

    /**
     * marketplace list --json の 1 件からインストール指定子の qualifier を組み立てる。
     * - local: `local/<slug>`
     * - git:   GitHub は `owner/repo`、それ以外は `git/<slug>`
     */
    private qualifierFor(name: string, kind: string, source: Record<string, unknown>): string {
        if (kind === 'local') {
            return `local/${slugify(name)}`;
        }
        if (kind === 'git') {
            const url = typeof source.url === 'string' ? source.url : '';
            return githubOwnerRepo(url) ?? `git/${slugify(name)}`;
        }
        return name;
    }

    /** marketplace list --json をパースし、共通型と qualifier / Git URL のマップを返す。 */
    private parseMarketplaces(
        json: string,
        configNames: Set<string>
    ): { entries: PluginMarketplaceEntry[]; qualifiers: Map<string, string>; gitUrls: Map<string, string> } {
        const entries: PluginMarketplaceEntry[] = [];
        const qualifiers = new Map<string, string>();
        const gitUrls = new Map<string, string>();
        const parsed: unknown = JSON.parse(json);
        if (!Array.isArray(parsed)) {
            return { entries, qualifiers, gitUrls };
        }
        for (const item of parsed) {
            const m = asRecord(item);
            if (!m) {
                continue;
            }
            const name = typeof m.name === 'string' ? m.name : '';
            if (name.length === 0) {
                continue;
            }
            const kind = typeof m.kind === 'string' ? m.kind : 'unknown';
            const source = asRecord(m.source) ?? {};
            const detail =
                (typeof source.url === 'string' && source.url) ||
                (typeof source.path === 'string' && source.path) ||
                '';
            const origin = GROK_BUILTIN_MARKETPLACES.includes(name)
                ? 'builtin'
                : configNames.has(name)
                  ? 'user'
                  : 'external';
            // Claude 由来（external）の外部マーケットは、公式（claude-plugins-official）以外
            // インストール元として提示しない（ユーザーが Claude 用に追加したものであるため）。
            const selectable = origin !== 'external' || GROK_SELECTABLE_EXTERNAL_MARKETPLACES.includes(name);
            entries.push({ name, sourceKind: kind, sourceDetail: detail, origin, selectable });
            qualifiers.set(name, this.qualifierFor(name, kind, source));
            if (kind === 'git' && typeof source.url === 'string' && source.url.length > 0) {
                gitUrls.set(name, source.url);
            }
        }
        return { entries, qualifiers, gitUrls };
    }

    /** インストール済みプラグインとマーケットプレイスの一覧。 */
    async list(env: GrokEnvironment): Promise<PluginEnvReport> {
        const label = env.kind === 'wsl' ? (env.distro ?? '') : this.nativeLabel();
        const cli = await this.runner.checkCli(env, GROK_CLI_COMMAND);
        const base: PluginEnvReport = {
            env,
            label,
            cliAvailable: cli.available,
            cliVersion: cli.version,
            plugins: [],
            marketplaces: [],
            capabilities: GROK_PLUGIN_CAPABILITIES,
        };
        if (!cli.available) {
            return base;
        }

        const [listResult, marketResult, config] = await Promise.all([
            this.runner.run(env, GROK_CLI_COMMAND, ['plugin', 'list', '--json'], LIST_TIMEOUT_MS),
            this.runner.run(env, GROK_CLI_COMMAND, ['plugin', 'marketplace', 'list', '--json'], LIST_TIMEOUT_MS),
            this.readConfig(env),
        ]);
        if (!listResult.ok || !marketResult.ok) {
            const failed = !listResult.ok ? listResult : marketResult;
            return { ...base, error: this.failureMessage(failed.stdout, failed.stderr) };
        }

        try {
            base.plugins = this.parsePlugins(listResult.stdout, config ? this.pluginStateLists(config) : null);
            base.marketplaces = this.parseMarketplaces(marketResult.stdout, this.configSourceNames(config)).entries;
        } catch (error) {
            return { ...base, error: `failed to parse CLI output: ${String(error)}` };
        }
        return base;
    }

    /**
     * `grok plugin list --json` の出力を共通型へ変換する。
     * stateLists が null（config.toml を読めない）の場合は、インストール時に自動で有効化される
     * CLI の既定動作に合わせて有効として扱う。同じ repo_key の他のプラグイン名を sameRepoPlugins に添える。
     */
    private parsePlugins(json: string, stateLists: PluginStateLists | null): PluginEntry[] {
        const parsed: unknown = JSON.parse(json);
        if (!Array.isArray(parsed)) {
            return [];
        }
        const items = parsed
            .map(asRecord)
            .filter((p): p is Record<string, unknown> => p !== null && typeof p.name === 'string' && p.name.length > 0);
        const entries: PluginEntry[] = [];
        for (const p of items) {
            const name = p.name as string;
            const enabled = stateLists
                ? stateLists.enabled.some(e => this.matchesPlugin(e, name)) &&
                  !stateLists.disabled.some(d => this.matchesPlugin(d, name))
                : true;
            const sameRepo =
                typeof p.repo_key === 'string'
                    ? [
                          ...new Set(
                              items
                                  .filter(other => other.repo_key === p.repo_key && other.name !== name)
                                  .map(other => other.name as string)
                          ),
                      ]
                    : [];
            entries.push({
                // grok のアンインストール・有効/無効切り替えはプラグイン名指定
                id: name,
                name,
                version: typeof p.version === 'string' ? p.version : null,
                marketplace: typeof p.marketplace === 'string' ? p.marketplace : null,
                enabled,
                ...(sameRepo.length > 0 ? { sameRepoPlugins: sameRepo } : {}),
            });
        }
        return entries;
    }

    /**
     * マーケットプレイスのカタログ。インストール指定子（id）は `<plugin>@<qualifier>` を
     * ここで組み立てて返す（qualifier は marketplace list から導出）。
     */
    async catalog(env: GrokEnvironment): Promise<PluginCatalogReport> {
        const [availResult, marketResult, config] = await Promise.all([
            this.runner.run(env, GROK_CLI_COMMAND, ['plugin', 'list', '--available', '--json'], LIST_TIMEOUT_MS),
            this.runner.run(env, GROK_CLI_COMMAND, ['plugin', 'marketplace', 'list', '--json'], LIST_TIMEOUT_MS),
            this.readConfig(env),
        ]);
        if (!availResult.ok || !marketResult.ok) {
            const failed = !availResult.ok ? availResult : marketResult;
            return { ok: false, entries: [], message: this.failureMessage(failed.stdout, failed.stderr) };
        }
        try {
            const {
                entries: markets,
                qualifiers,
                gitUrls,
            } = this.parseMarketplaces(marketResult.stdout, this.configSourceNames(config));
            // インストール元として選択可能なマーケットプレイスのプラグインのみカタログへ載せる
            // （Claude 由来の外部マーケットのプラグインを Grok のインストール候補にしない）。
            const selectableNames = new Set(markets.filter(m => m.selectable).map(m => m.name));
            const parsed: unknown = JSON.parse(availResult.stdout);
            if (!Array.isArray(parsed)) {
                return { ok: true, entries: [] };
            }
            const selectableGitUrls = new Map([...gitUrls].filter(([name]) => selectableNames.has(name)));
            const pluginHomepages = await this.pluginHomepages(env, selectableGitUrls);
            const entries: PluginCatalogEntry[] = [];
            for (const item of parsed) {
                const p = asRecord(item);
                if (!p) {
                    continue;
                }
                const name = typeof p.name === 'string' ? p.name : '';
                if (name.length === 0) {
                    continue;
                }
                const marketplace = typeof p.marketplace === 'string' ? p.marketplace : '';
                if (!selectableNames.has(marketplace)) {
                    continue;
                }
                const qualifier = qualifiers.get(marketplace) ?? marketplace;
                const marketUrl = gitUrls.get(marketplace);
                entries.push({
                    id: `${name}@${qualifier}`,
                    name,
                    description: typeof p.description === 'string' ? p.description : null,
                    marketplace,
                    installed: p.status === 'installed',
                    homepage:
                        pluginHomepages.get(marketplace)?.get(name) ??
                        (marketUrl !== undefined ? httpUrl(marketUrl) : null),
                });
            }
            return { ok: true, entries };
        } catch (error) {
            return { ok: false, entries: [], message: `failed to parse CLI output: ${String(error)}` };
        }
    }

    /**
     * マーケットプレイスの Git キャッシュ（~/.grok/marketplace-cache/<hash>/）にあるインデックスから
     * マーケットプレイス名 → （プラグイン名 → URL）のマップを作る。キャッシュとマーケットプレイスは
     * リモート URL（.git/config の origin）で対応付ける。取得は best-effort（失敗分は含めない）。
     */
    private async pluginHomepages(
        env: GrokEnvironment,
        gitUrls: Map<string, string>
    ): Promise<Map<string, Map<string, string>>> {
        const result = new Map<string, Map<string, string>>();
        if (gitUrls.size === 0) {
            return result;
        }
        const marketByUrl = new Map<string, string>();
        for (const [market, url] of gitUrls) {
            marketByUrl.set(normalizeGitUrl(url), market);
        }
        try {
            const fs = this.fsFor(env);
            // 先頭が . のディレクトリは Grok が再取得中に使う一時ディレクトリのため対象外。
            const dirs = (await fs.listDirs(GROK_MARKETPLACE_CACHE_REL)).filter(d => !d.startsWith('.'));
            await Promise.all(
                dirs.map(async dir => {
                    const base = `${GROK_MARKETPLACE_CACHE_REL}/${dir}`;
                    try {
                        const gitConfig = await fs.readText(`${base}/.git/config`);
                        const origin = gitConfig !== null ? originUrlOf(gitConfig) : null;
                        const market = origin !== null ? marketByUrl.get(normalizeGitUrl(origin)) : undefined;
                        if (market === undefined || result.has(market)) {
                            return;
                        }
                        const homepages = await this.readIndexHomepages(fs, base);
                        if (homepages.size > 0) {
                            result.set(market, homepages);
                        }
                    } catch (error) {
                        console.error(`Failed to read grok marketplace cache ${dir}:`, error);
                    }
                })
            );
        } catch (error) {
            console.error('Failed to list grok marketplace cache:', error);
        }
        return result;
    }

    /**
     * マーケットプレイスのインデックスからプラグイン名 → URL を読む。インデックスは Grok と同じ優先順
     * （.grok-plugin/marketplace.json → .grok-plugin/plugin.json → .claude-plugin/ の同名ファイル）で
     * 最初に見つかったものを使う。URL は homepage、無ければ source の Git URL / GitHub リポジトリ。
     */
    private async readIndexHomepages(fs: HomeFs, marketplaceRel: string): Promise<Map<string, string>> {
        const homepages = new Map<string, string>();
        for (const file of GROK_MARKETPLACE_INDEX_FILES) {
            const text = await fs.readText(`${marketplaceRel}/${file}`);
            if (text === null) {
                continue;
            }
            const plugins = asRecord(JSON.parse(text))?.plugins;
            if (!Array.isArray(plugins)) {
                return homepages;
            }
            for (const item of plugins) {
                const entry = asRecord(item);
                const name = entry?.name;
                if (!entry || typeof name !== 'string' || name.length === 0) {
                    continue;
                }
                const source = asRecord(entry.source);
                const repo = typeof source?.repo === 'string' ? `https://github.com/${source.repo}` : null;
                const url = httpUrl(entry.homepage) ?? httpUrl(source?.url) ?? repo;
                if (url !== null) {
                    homepages.set(name, url);
                }
            }
            return homepages;
        }
        return homepages;
    }

    /**
     * 変更操作の共通実行（成功判定と失敗メッセージの整形）。
     * 操作対象（プラグイン名・ソース・マーケットプレイス名）が空、または - で始まる場合は
     * CLI のオプションとして解釈されるのを防ぐため実行しない。
     */
    private async mutate(env: GrokEnvironment, args: string[], target: string): Promise<PluginOpResult> {
        if (!validateOperand(target)) {
            return { ok: false, message: `invalid argument: ${target}` };
        }
        const result = await this.runner.run(env, GROK_CLI_COMMAND, args, MUTATE_TIMEOUT_MS);
        if (result.ok) {
            return { ok: true };
        }
        return { ok: false, message: this.failureMessage(result.stdout, result.stderr) };
    }

    /** マーケットプレイスからインストールする。id は catalog が返した `<plugin>@<qualifier>`。 */
    async install(env: GrokEnvironment, id: string): Promise<PluginOpResult> {
        // CLI の信頼確認は対話入力を求めるため、--trust で省いて実行する。
        return this.mutate(env, ['plugin', 'install', id, '--trust'], id);
    }

    /** 個別リポジトリ / ローカルパスから直接インストールする（@ref / #subdir 対応）。 */
    async installFromSource(env: GrokEnvironment, source: string): Promise<PluginOpResult> {
        return this.install(env, source);
    }

    /** プラグインの有効/無効を切り替える。 */
    async setEnabled(env: GrokEnvironment, id: string, enabled: boolean): Promise<PluginOpResult> {
        return this.mutate(env, ['plugin', enabled ? 'enable' : 'disable', id], id);
    }

    /**
     * プラグインをアンインストールする（config.toml の enabled / disabled に残る名前も取り除く）。
     * confirmedNames は、一緒に削除されることを利用者が確認した、同じリポジトリの他のプラグイン名。
     * 削除の直前に同じリポジトリから導入された他のプラグインを調べ直し、すべてが confirmedNames に含まれるときだけ
     * --confirm を付けてそれらも一緒に削除する。含まれない名前があれば実行せず needs-reconfirm を返す。
     * 他のプラグインが見つからなければ --confirm を付けず、CLI 自身の確認（同じリポジトリに他のプラグインがあれば
     * 削除しない）に任せる。
     */
    async uninstall(env: GrokEnvironment, id: string, confirmedNames: string[] = []): Promise<PluginOpResult> {
        if (!validateOperand(id)) {
            return { ok: false, message: `invalid argument: ${id}` };
        }
        // 取り除く名前（同じリポジトリの他のプラグインを含む）を削除前に集める。
        const removedNames = await this.repoPluginNames(env, id);
        const others = removedNames.filter(name => name !== id);
        if (others.some(name => !confirmedNames.includes(name))) {
            return { ok: false, message: 'needs-reconfirm' };
        }
        const args = ['plugin', 'uninstall', id, ...(others.length > 0 ? ['--confirm'] : [])];
        const result = await this.mutate(env, args, id);
        if (!result.ok) {
            return result;
        }
        await this.removePluginStateEntries(env, removedNames);
        return { ok: true };
    }

    /** `grok plugin list --json` のインストール済みエントリ。取得・パースに失敗した場合は空配列。 */
    private async installedPluginItems(env: GrokEnvironment): Promise<Record<string, unknown>[]> {
        const result = await this.runner.run(env, GROK_CLI_COMMAND, ['plugin', 'list', '--json'], LIST_TIMEOUT_MS);
        if (!result.ok) {
            return [];
        }
        try {
            const parsed: unknown = JSON.parse(result.stdout);
            if (!Array.isArray(parsed)) {
                return [];
            }
            return parsed.map(asRecord).filter((p): p is Record<string, unknown> => p !== null);
        } catch {
            return [];
        }
    }

    /** 指定プラグインと同じリポジトリ（repo_key）からインストールされたプラグイン名の一覧（自身を含む）。 */
    private async repoPluginNames(env: GrokEnvironment, name: string): Promise<string[]> {
        const items = await this.installedPluginItems(env);
        const repoKey = items.find(p => p.name === name && typeof p.repo_key === 'string')?.repo_key;
        const names = items
            .filter(p => repoKey !== undefined && p.repo_key === repoKey && typeof p.name === 'string')
            .map(p => p.name as string);
        return [...new Set([name, ...names])];
    }

    /** 指定マーケットプレイスからインストールされたプラグイン名の一覧。 */
    private async marketplacePluginNames(env: GrokEnvironment, marketplace: string): Promise<string[]> {
        const items = await this.installedPluginItems(env);
        return items
            .filter(p => p.marketplace === marketplace && typeof p.name === 'string')
            .map(p => p.name as string);
    }

    /**
     * config.toml の [plugins] enabled / disabled 配列から指定プラグインの要素を取り除く。
     * 代入の書き方（[plugins] テーブル内・引用符付きのキー・ルートの `plugins.enabled`・インラインテーブル）を
     * 問わず、対象の配列の値だけを 1 行の配列に書き換え、キーの表記・他の行・コメントは保持する
     * （配列の内側に書かれたコメントは書き換えで失われる）。
     * 書き換え後の TOML が「対象要素の除去だけを適用した内容」と一致しない場合は書き込まない。
     */
    private async removePluginStateEntries(env: GrokEnvironment, names: string[]): Promise<void> {
        try {
            const fs = this.fsFor(env);
            const raw = stripBom(await fs.readText(GROK_CONFIG_REL));
            if (raw === null) {
                return;
            }
            const before = asRecord(parse(raw));
            const plugins = asRecord(before?.plugins);
            if (!before || !plugins) {
                return;
            }
            const isTarget = (value: unknown): boolean =>
                typeof value === 'string' && names.some(n => this.matchesPlugin(value, n));

            const expectedPlugins: Record<string, unknown> = { ...plugins };
            // 後ろの代入から置き換えて、前の代入の位置をずらさない。
            const assignments = scanTomlStatements(raw).assignments.sort((a, b) => b.valueStart - a.valueStart);
            let text = raw;
            let changed = false;
            for (const assignment of assignments) {
                const key = PLUGIN_STATE_KEYS.find(k => sameTomlPath(assignment.path, ['plugins', k]));
                const current = key ? plugins[key] : undefined;
                if (!key || !Array.isArray(current) || !current.some(isTarget)) {
                    continue;
                }
                const next = current.filter(v => !isTarget(v));
                const value = `[${next.map(v => JSON.stringify(v)).join(', ')}]`;
                text = `${text.slice(0, assignment.valueStart)}${value}${text.slice(assignment.valueEnd)}`;
                expectedPlugins[key] = next;
                changed = true;
            }
            if (!changed) {
                return;
            }
            if (!deepEqualLoose(parse(text), { ...before, plugins: expectedPlugins })) {
                console.error('Skipped cleaning grok [plugins] entries: edit verification mismatch');
                return;
            }
            await fs.writeText(GROK_CONFIG_REL, text);
        } catch (error) {
            // 掃除は best-effort（本体のアンインストールは成功している）。
            console.error('Failed to clean up grok [plugins] enabled / disabled entries:', error);
        }
    }

    /** マーケットプレイスソースを追加する（Git URL / owner/repo / ローカルパス）。 */
    async addMarketplace(env: GrokEnvironment, source: string): Promise<PluginOpResult> {
        return this.mutate(env, ['plugin', 'marketplace', 'add', source], source);
    }

    /**
     * マーケットプレイスソースを削除する。CLI はそのソースからインストールしたプラグインも
     * アンインストールするため、それらの名前も config.toml の enabled / disabled から取り除く。
     */
    async removeMarketplace(env: GrokEnvironment, name: string): Promise<PluginOpResult> {
        // ~/.grok/config.toml に登録されたもの以外（組み込み・Claude 設定由来）は削除しない。
        // Claude 由来のソースを CLI で削除すると ~/.claude の設定ファイルまで書き換わるため。
        const configNames = this.configSourceNames(await this.readConfig(env));
        if (GROK_BUILTIN_MARKETPLACES.includes(name) || !configNames.has(name)) {
            return { ok: false, message: `"${name}" is not a marketplace added in Grok's config.toml.` };
        }
        const removedNames = await this.marketplacePluginNames(env, name);
        const result = await this.mutate(env, ['plugin', 'marketplace', 'remove', name], name);
        if (!result.ok) {
            return result;
        }
        if (removedNames.length > 0) {
            await this.removePluginStateEntries(env, removedNames);
        }
        return { ok: true };
    }
}
