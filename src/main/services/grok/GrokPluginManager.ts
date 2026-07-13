import { parse } from 'smol-toml';
import {
    GROK_BUILTIN_MARKETPLACES,
    GROK_CLI_COMMAND,
    GROK_CONFIG_REL,
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
import { AgentCliRunner } from '../common/cli/AgentCliRunner';
import { HomeFs } from '../common/wsl/HomeFs';
import { WslDetector } from '../common/wsl/WslDetector';

const LIST_TIMEOUT_MS = 60_000;
const MUTATE_TIMEOUT_MS = 180_000;

/**
 * Grok Build のプラグイン管理。
 *
 * 設計の要点:
 * - 一覧・カタログは `grok plugin list --json` / `grok plugin marketplace list --json` を
 *   共通型へ正規化する。
 * - Grok は Claude Code のマーケットプレイス設定を自動で読み込み一覧へ合成するため、
 *   config.toml の [[marketplace.sources]] に存在しないものは origin='external'
 *   （Grok 側から削除不可）として区別する。
 * - マーケットプレイスからのインストールは `<plugin>@<qualifier>` 形式が必要
 *   （表示名ではなく、local ソースは `local/<name>`、git ソースは `owner/repo`）。
 *   qualifier は marketplace list の kind / source から組み立てる。
 * - 非対話実行のため install は `--trust`（信頼確認は GUI 側で実施済み）、
 *   uninstall は `--confirm` を付与する。
 * - grok 0.2.93 の不具合への対処:
 *   1. `marketplace remove` がローカルソースを削除できない → 失敗時に config.toml の
 *      [[marketplace.sources]] から該当ブロックを直接除去するフォールバックを行う。
 *   2. uninstall 後に config.toml の [plugins] enabled 配列へ残骸が残る → 成功後に掃除する。
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

    /** 管理対象の環境一覧（native + Grok 入り WSL distro）。他機能と同じ並び。 */
    async getEnvironments(): Promise<{ env: GrokEnvironment; label: string }[]> {
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

    /** config.toml の [[marketplace.sources]] に宣言されているソース名の一覧。 */
    private async configSourceNames(env: GrokEnvironment): Promise<Set<string>> {
        const names = new Set<string>();
        try {
            const raw = await this.fsFor(env).readText(GROK_CONFIG_REL);
            if (raw === null) {
                return names;
            }
            const data: unknown = parse(raw);
            if (!data || typeof data !== 'object') {
                return names;
            }
            const marketplace = (data as Record<string, unknown>).marketplace;
            if (!marketplace || typeof marketplace !== 'object' || Array.isArray(marketplace)) {
                return names;
            }
            const sources = (marketplace as Record<string, unknown>).sources;
            if (!Array.isArray(sources)) {
                return names;
            }
            for (const src of sources) {
                if (src && typeof src === 'object' && typeof (src as Record<string, unknown>).name === 'string') {
                    names.add((src as Record<string, unknown>).name as string);
                }
            }
        } catch (error) {
            console.error('Failed to read grok config.toml marketplace sources:', error);
        }
        return names;
    }

    /**
     * marketplace list --json の 1 件からインストール指定子の qualifier を組み立てる。
     * - local: `local/<name>`
     * - git:   URL から `owner/repo` を抽出（抽出できなければ name を使う）
     */
    private qualifierFor(name: string, kind: string, source: Record<string, unknown>): string {
        if (kind === 'local') {
            return `local/${name}`;
        }
        const url = typeof source.url === 'string' ? source.url : '';
        const match = url.match(/[/:]([^/:]+)\/([^/]+?)(?:\.git)?$/);
        if (match) {
            return `${match[1]}/${match[2]}`;
        }
        return name;
    }

    /** marketplace list --json をパースし、共通型と qualifier / homepage マップを返す。 */
    private parseMarketplaces(
        json: string,
        configNames: Set<string>
    ): { entries: PluginMarketplaceEntry[]; qualifiers: Map<string, string>; homepages: Map<string, string> } {
        const entries: PluginMarketplaceEntry[] = [];
        const qualifiers = new Map<string, string>();
        const homepages = new Map<string, string>();
        const parsed: unknown = JSON.parse(json);
        if (!Array.isArray(parsed)) {
            return { entries, qualifiers, homepages };
        }
        for (const item of parsed) {
            if (!item || typeof item !== 'object') {
                continue;
            }
            const m = item as Record<string, unknown>;
            const name = typeof m.name === 'string' ? m.name : '';
            if (name.length === 0) {
                continue;
            }
            const kind = typeof m.kind === 'string' ? m.kind : 'unknown';
            const source =
                m.source && typeof m.source === 'object' && !Array.isArray(m.source)
                    ? (m.source as Record<string, unknown>)
                    : {};
            const detail =
                (typeof source.url === 'string' && source.url) || (typeof source.path === 'string' && source.path) || '';
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
            // grok のカタログにはプラグイン単位の URL が無いため、マーケットプレイスの
            // Git リポジトリ URL をリンク先として使う。
            if (typeof source.url === 'string' && /^https?:\/\//.test(source.url)) {
                homepages.set(name, source.url.replace(/\.git$/, ''));
            }
        }
        return { entries, qualifiers, homepages };
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

        const [listResult, marketResult, configNames] = await Promise.all([
            this.runner.run(env, GROK_CLI_COMMAND, ['plugin', 'list', '--json'], LIST_TIMEOUT_MS),
            this.runner.run(env, GROK_CLI_COMMAND, ['plugin', 'marketplace', 'list', '--json'], LIST_TIMEOUT_MS),
            this.configSourceNames(env),
        ]);
        if (!listResult.ok || !marketResult.ok) {
            const failed = !listResult.ok ? listResult : marketResult;
            return { ...base, error: this.failureMessage(failed.stdout, failed.stderr) };
        }

        try {
            base.plugins = this.parsePlugins(listResult.stdout);
            base.marketplaces = this.parseMarketplaces(marketResult.stdout, configNames).entries;
        } catch (error) {
            return { ...base, error: `failed to parse CLI output: ${String(error)}` };
        }
        return base;
    }

    /** `grok plugin list --json` の出力を共通型へ変換する。 */
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
            const p = item as Record<string, unknown>;
            const name = typeof p.name === 'string' ? p.name : '';
            if (name.length === 0) {
                continue;
            }
            entries.push({
                // grok のアンインストールはプラグイン名指定
                id: name,
                name,
                version: typeof p.version === 'string' ? p.version : null,
                marketplace: typeof p.marketplace === 'string' ? p.marketplace : null,
                enabled: p.status !== 'disabled',
            });
        }
        return entries;
    }

    /**
     * マーケットプレイスのカタログ。インストール指定子（id）は `<plugin>@<qualifier>` を
     * ここで組み立てて返す（qualifier は marketplace list から導出）。
     */
    async catalog(env: GrokEnvironment): Promise<PluginCatalogReport> {
        const [availResult, marketResult, configNames] = await Promise.all([
            this.runner.run(env, GROK_CLI_COMMAND, ['plugin', 'list', '--available', '--json'], LIST_TIMEOUT_MS),
            this.runner.run(env, GROK_CLI_COMMAND, ['plugin', 'marketplace', 'list', '--json'], LIST_TIMEOUT_MS),
            this.configSourceNames(env),
        ]);
        if (!availResult.ok || !marketResult.ok) {
            const failed = !availResult.ok ? availResult : marketResult;
            return { ok: false, entries: [], message: this.failureMessage(failed.stdout, failed.stderr) };
        }
        try {
            const { entries: markets, qualifiers, homepages } = this.parseMarketplaces(marketResult.stdout, configNames);
            // インストール元として選択可能なマーケットプレイスのプラグインのみカタログへ載せる
            // （Claude 由来の外部マーケットのプラグインを Grok のインストール候補にしない）。
            const selectableNames = new Set(markets.filter(m => m.selectable).map(m => m.name));
            const parsed: unknown = JSON.parse(availResult.stdout);
            if (!Array.isArray(parsed)) {
                return { ok: true, entries: [] };
            }
            const entries: PluginCatalogEntry[] = [];
            for (const item of parsed) {
                if (!item || typeof item !== 'object') {
                    continue;
                }
                const p = item as Record<string, unknown>;
                const name = typeof p.name === 'string' ? p.name : '';
                if (name.length === 0) {
                    continue;
                }
                const marketplace = typeof p.marketplace === 'string' ? p.marketplace : '';
                if (!selectableNames.has(marketplace)) {
                    continue;
                }
                const qualifier = qualifiers.get(marketplace) ?? marketplace;
                entries.push({
                    id: `${name}@${qualifier}`,
                    name,
                    description: typeof p.description === 'string' ? p.description : null,
                    marketplace,
                    installed: p.status === 'installed',
                    homepage: homepages.get(marketplace) ?? null,
                });
            }
            return { ok: true, entries };
        } catch (error) {
            return { ok: false, entries: [], message: `failed to parse CLI output: ${String(error)}` };
        }
    }

    /** マーケットプレイスからインストールする。id は catalog が返した `<plugin>@<qualifier>`。 */
    async install(env: GrokEnvironment, id: string): Promise<PluginOpResult> {
        // 信頼確認は GUI 側で実施済みのため --trust で非対話実行する。
        const result = await this.runner.run(
            env,
            GROK_CLI_COMMAND,
            ['plugin', 'install', id, '--trust'],
            MUTATE_TIMEOUT_MS
        );
        if (result.ok) {
            return { ok: true };
        }
        return { ok: false, message: this.failureMessage(result.stdout, result.stderr) };
    }

    /** 個別リポジトリ / ローカルパスから直接インストールする（@ref / #subdir 対応）。 */
    async installFromSource(env: GrokEnvironment, source: string): Promise<PluginOpResult> {
        return this.install(env, source);
    }

    /** プラグインの有効/無効を切り替える。 */
    async setEnabled(env: GrokEnvironment, id: string, enabled: boolean): Promise<PluginOpResult> {
        const result = await this.runner.run(
            env,
            GROK_CLI_COMMAND,
            ['plugin', enabled ? 'enable' : 'disable', id],
            MUTATE_TIMEOUT_MS
        );
        if (result.ok) {
            return { ok: true };
        }
        return { ok: false, message: this.failureMessage(result.stdout, result.stderr) };
    }

    /** プラグインをアンインストールする（config.toml の enabled 残骸も掃除する）。 */
    async uninstall(env: GrokEnvironment, id: string): Promise<PluginOpResult> {
        const result = await this.runner.run(
            env,
            GROK_CLI_COMMAND,
            ['plugin', 'uninstall', id, '--confirm'],
            MUTATE_TIMEOUT_MS
        );
        if (!result.ok) {
            return { ok: false, message: this.failureMessage(result.stdout, result.stderr) };
        }
        // grok 0.2.93 は uninstall 後も [plugins] enabled 配列に名前が残ることがあるため掃除する。
        await this.cleanupEnabledEntry(env, id);
        return { ok: true };
    }

    /** config.toml の [plugins] enabled 配列から指定プラグイン名を取り除く。 */
    private async cleanupEnabledEntry(env: GrokEnvironment, pluginName: string): Promise<void> {
        try {
            const fs = this.fsFor(env);
            const raw = await fs.readText(GROK_CONFIG_REL);
            if (raw === null) {
                return;
            }
            const data: unknown = parse(raw);
            if (!data || typeof data !== 'object') {
                return;
            }
            const plugins = (data as Record<string, unknown>).plugins;
            if (!plugins || typeof plugins !== 'object' || Array.isArray(plugins)) {
                return;
            }
            const enabled = (plugins as Record<string, unknown>).enabled;
            if (!Array.isArray(enabled) || !enabled.includes(pluginName)) {
                return;
            }
            const next = enabled.filter(n => n !== pluginName);
            const nextValue = `[${next.map(n => JSON.stringify(n)).join(', ')}]`;
            // [plugins] テーブル内の enabled 行だけを書き換える（他の行・コメントは保持）。
            const lines = raw.split('\n');
            let inPlugins = false;
            for (let i = 0; i < lines.length; i++) {
                const trimmed = lines[i].replace(/\r$/, '').trim();
                if (trimmed.startsWith('[')) {
                    inPlugins = trimmed === '[plugins]';
                    continue;
                }
                if (inPlugins && /^enabled\s*=/.test(trimmed)) {
                    const eol = lines[i].endsWith('\r') ? '\r' : '';
                    lines[i] = `enabled = ${nextValue}${eol}`;
                    await fs.writeText(GROK_CONFIG_REL, lines.join('\n'));
                    return;
                }
            }
        } catch (error) {
            // 掃除は best-effort（本体のアンインストールは成功している）。
            console.error('Failed to clean up grok [plugins] enabled entry:', error);
        }
    }

    /** マーケットプレイスソースを追加する（Git URL / owner/repo / ローカルパス）。 */
    async addMarketplace(env: GrokEnvironment, source: string): Promise<PluginOpResult> {
        const result = await this.runner.run(
            env,
            GROK_CLI_COMMAND,
            ['plugin', 'marketplace', 'add', source],
            MUTATE_TIMEOUT_MS
        );
        if (result.ok) {
            return { ok: true };
        }
        return { ok: false, message: this.failureMessage(result.stdout, result.stderr) };
    }

    /**
     * マーケットプレイスソースを削除する。
     * grok 0.2.93 はローカルソースの remove に失敗する不具合があるため、CLI が失敗した場合は
     * config.toml の [[marketplace.sources]] から該当ブロックを直接除去するフォールバックを行う。
     */
    async removeMarketplace(env: GrokEnvironment, name: string): Promise<PluginOpResult> {
        const result = await this.runner.run(
            env,
            GROK_CLI_COMMAND,
            ['plugin', 'marketplace', 'remove', name],
            MUTATE_TIMEOUT_MS
        );
        if (result.ok) {
            return { ok: true };
        }
        const removed = await this.removeSourceFromConfig(env, name);
        if (removed) {
            return { ok: true };
        }
        return { ok: false, message: this.failureMessage(result.stdout, result.stderr) };
    }

    /** config.toml から name が一致する [[marketplace.sources]] ブロックを取り除く。 */
    private async removeSourceFromConfig(env: GrokEnvironment, name: string): Promise<boolean> {
        try {
            const fs = this.fsFor(env);
            const raw = await fs.readText(GROK_CONFIG_REL);
            if (raw === null) {
                return false;
            }
            const lines = raw.split('\n');
            const isBoundary = (line: string) => line.replace(/\r$/, '').trim().startsWith('[');
            const isSourcesHeader = (line: string) => line.replace(/\r$/, '').trim() === '[[marketplace.sources]]';
            for (let start = 0; start < lines.length; start++) {
                if (!isSourcesHeader(lines[start])) {
                    continue;
                }
                let end = start + 1;
                while (end < lines.length && !isBoundary(lines[end])) {
                    end++;
                }
                const block = lines.slice(start + 1, end);
                const nameRe = /^name\s*=\s*(["'])(.*)\1\s*$/;
                const hasName = block.some(line => {
                    const m = line.replace(/\r$/, '').trim().match(nameRe);
                    return m !== null && m[2] === name;
                });
                if (!hasName) {
                    continue;
                }
                // ブロック（見出し行含む）と直前の連続空行を取り除く。
                let removeStart = start;
                while (removeStart > 0 && lines[removeStart - 1].replace(/\r$/, '').trim() === '') {
                    removeStart--;
                }
                const next = [...lines.slice(0, removeStart), ...lines.slice(end)];
                await fs.writeText(GROK_CONFIG_REL, next.join('\n'));
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to remove grok marketplace source from config.toml:', error);
            return false;
        }
    }
}
