import { promises as nodeFs } from 'fs';
import { join } from 'path';
import { parse } from 'smol-toml';
import {
    CODEX_BUILTIN_MARKETPLACES,
    CODEX_CLI_COMMAND,
    CODEX_CONFIG_REL,
    CODEX_PLUGIN_CAPABILITIES,
    CODEX_REMOTE_PLUGIN_CATALOG_REL,
    CODEX_WSL_CLI_TEST,
} from '../../../shared/agents/codex/constants';
import {
    CodexEnvironment,
    OSType,
    PluginCatalogEntry,
    PluginCatalogReport,
    PluginEntry,
    PluginEnvReport,
    PluginMarketplaceEntry,
    PluginOpResult,
} from '../../../shared/agents/codex/types';
import { AgentCliRunner, validateArg, validateOperand } from '../common/cli/AgentCliRunner';
import { stripBom } from '../common/json/stripBom';
import { HomeFs } from '../common/wsl/HomeFs';
import { WslDetector } from '../common/wsl/WslDetector';
import { deepEqualLoose } from '../../utils/nestedValue';
import { sameTomlPath, scanTomlStatements } from '../../utils/tomlStatements';

const LIST_TIMEOUT_MS = 60_000;
const MUTATE_TIMEOUT_MS = 180_000;

// リモートプラグインカタログキャッシュの対応スキーマバージョン。
const REMOTE_CATALOG_SCHEMA_VERSION = 1;

// カタログ補完用のメタ情報（説明・ホームページ）。
interface PluginMeta {
    description: string | null;
    homepage: string | null;
}

// `plugin list --json` の 1 エントリから読み取るプラグインのソース情報。
interface PluginSource {
    // ローカル実体のパス（source.source = 'local'）。
    path: string | null;
    // リモートカタログ上の ID（source.source = 'remote'）。
    remoteId: string | null;
}

// TOML の basic string で名前付きのエスケープを持つ文字
const TOML_KEY_ESCAPES: Record<string, string> = {
    '\b': '\\b',
    '\t': '\\t',
    '\n': '\\n',
    '\f': '\\f',
    '\r': '\\r',
    '"': '\\"',
    '\\': '\\\\',
};

/** TOML のキー 1 つを表記する（bare で書けなければ basic string にエスケープして囲む）。 */
function tomlKey(key: string): string {
    if (/^[A-Za-z0-9_-]+$/.test(key)) {
        return key;
    }
    // eslint-disable-next-line no-control-regex -- TOML の basic string でエスケープが必要な制御文字を置き換えるため
    const escaped = key.replace(/[\\"\x00-\x1f\x7f]/g, c => {
        return TOML_KEY_ESCAPES[c] ?? `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`;
    });
    return `"${escaped}"`;
}

function isTomlTable(value: unknown): value is Record<string, unknown> {
    return (
        !!value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype
    );
}

/**
 * Codex のプラグイン管理。
 *
 * 設計の要点:
 * - 一覧・カタログは `codex plugin list --json`（installed / available）と
 *   `codex plugin marketplace list --json` の機械可読出力を共通型へ正規化する。
 *   config.toml の [marketplaces] には組み込みマーケット（openai-curated 等）が
 *   載らないことがあるため、一覧の正は常に CLI 出力とする。リモートカタログ
 *   （openai-curated-remote など）は marketplace list に現れないため、インストール済み
 *   プラグインの marketplaceName から削除不可のマーケットプレイスとして補う。
 * - CLI 出力のカタログには description が含まれないため best-effort で補完する。
 *   ローカルのプラグインは `source.path` のマニフェスト（ルートの plugin.json を正とし、
 *   OpenAI 固有の interface は extensions["com.openai"] → `.codex-plugin/plugin.json` の順）、
 *   リモートのプラグインは `source.id` をキーにリモートカタログのキャッシュから読む。
 * - カタログは pluginId で重複を除き、インストール不可（installPolicy=NOT_AVAILABLE）の
 *   未インストールエントリは返さない。
 * - 変更操作（add / remove / marketplace add / remove）はすべて `--json` 付きで
 *   ヘッドレス実行する。操作対象が - で始まる値はオプションと解釈されるため実行しない。
 *   enable/disable はサブコマンドが存在しないため、config.toml の `[plugins."<id>"] enabled`
 *   を直接編集する（値だけを変更し、編集結果を parse して検証してから書き込む）。
 *   この設定はローカルマーケットプレイスのプラグインにだけ効くため、リモートの
 *   プラグインは切り替えを受け付けない。
 * - 個別リポジトリの直接インストールは非対応。GUI は「マーケットプレイスとして追加 →
 *   含まれるプラグインを選択」の 2 段階で実現する（capabilities.directInstall=false）。
 */
export class CodexPluginManager {
    private readonly detector: WslDetector;
    private readonly runner: AgentCliRunner;
    // 直近の一覧取得で判明したリモートプラグインの ID（環境キーごと）。
    private readonly remotePluginIds = new Map<string, Set<string>>();

    constructor(detector: WslDetector, runner: AgentCliRunner) {
        this.detector = detector;
        this.runner = runner;
    }

    private fsFor(env: CodexEnvironment): HomeFs {
        return new HomeFs(env, this.detector);
    }

    private nativeLabel(): string {
        const platform = process.platform as OSType;
        if (platform === 'win32') return 'Windows';
        if (platform === 'darwin') return 'macOS';
        return 'Linux';
    }

    private envKey(env: CodexEnvironment): string {
        return env.kind === 'wsl' ? `wsl:${env.distro ?? ''}` : 'native';
    }

    /**
     * 管理対象の環境一覧（native + Codex 入り WSL distro）。他機能と同じ並び。
     * refresh=true のときは CLI と WSL distro の検出結果を破棄してから列挙する。
     */
    async getEnvironments(refresh = false): Promise<{ env: CodexEnvironment; label: string }[]> {
        if (refresh) {
            this.runner.invalidate();
            this.detector.invalidate();
        }
        const result: { env: CodexEnvironment; label: string }[] = [];
        result.push({ env: { kind: 'native' }, label: this.nativeLabel() });
        const distros = await this.detector.getDistrosWithTest(CODEX_WSL_CLI_TEST);
        for (const d of distros) {
            result.push({ env: { kind: 'wsl', distro: d.distro }, label: d.distro });
        }
        return result;
    }

    private failureMessage(stdout: string, stderr: string): string {
        return [stderr.trim(), stdout.trim()].filter(s => s.length > 0).join('\n');
    }

    private asRecord(value: unknown): Record<string, unknown> {
        return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
    }

    private nonEmptyString(value: unknown): string | null {
        return typeof value === 'string' && value.length > 0 ? value : null;
    }

    /**
     * `plugin list --json` のエントリから source（ローカルパス / リモート ID）を読む。
     * git-subdir の path はリポジトリ内の相対パスで実体の場所ではないため、ローカルパスは local のものだけを使う。
     */
    private sourceOf(p: Record<string, unknown>): PluginSource {
        const source = this.asRecord(p.source);
        return {
            path: source.source === 'local' ? this.nonEmptyString(source.path) : null,
            remoteId: source.source === 'remote' ? this.nonEmptyString(source.id) : null,
        };
    }

    /** `codex plugin list --json` の installed 配列を共通型へ変換する。リモートの ID も集める。 */
    private parseInstalled(rec: Record<string, unknown>, remoteIds: Set<string>): PluginEntry[] {
        const entries: PluginEntry[] = [];
        for (const item of Array.isArray(rec.installed) ? rec.installed : []) {
            if (!item || typeof item !== 'object') {
                continue;
            }
            const p = item as Record<string, unknown>;
            const pluginId = typeof p.pluginId === 'string' ? p.pluginId : '';
            if (pluginId.length === 0) {
                continue;
            }
            const remote = this.sourceOf(p).remoteId !== null;
            if (remote) {
                remoteIds.add(pluginId);
            }
            entries.push({
                id: pluginId,
                name: typeof p.name === 'string' ? p.name : pluginId,
                version: typeof p.version === 'string' ? p.version : null,
                marketplace: typeof p.marketplaceName === 'string' ? p.marketplaceName : null,
                enabled: p.enabled === true,
                toggleable: !remote,
            });
        }
        return entries;
    }

    /** インストール済みプラグインとマーケットプレイスの一覧。 */
    async list(env: CodexEnvironment): Promise<PluginEnvReport> {
        const label = env.kind === 'wsl' ? (env.distro ?? '') : this.nativeLabel();
        const cli = await this.runner.checkCli(env, CODEX_CLI_COMMAND);
        const base: PluginEnvReport = {
            env,
            label,
            cliAvailable: cli.available,
            cliVersion: cli.version,
            plugins: [],
            marketplaces: [],
            capabilities: CODEX_PLUGIN_CAPABILITIES,
        };
        if (!cli.available) {
            return base;
        }

        const [listResult, marketResult] = await Promise.all([
            this.runner.run(env, CODEX_CLI_COMMAND, ['plugin', 'list', '--json'], LIST_TIMEOUT_MS),
            this.runner.run(env, CODEX_CLI_COMMAND, ['plugin', 'marketplace', 'list', '--json'], LIST_TIMEOUT_MS),
        ]);
        if (!listResult.ok || !marketResult.ok) {
            const failed = !listResult.ok ? listResult : marketResult;
            return { ...base, error: this.failureMessage(failed.stdout, failed.stderr) };
        }

        try {
            const remoteIds = new Set<string>();
            const listParsed: unknown = JSON.parse(listResult.stdout);
            if (listParsed && typeof listParsed === 'object' && !Array.isArray(listParsed)) {
                base.plugins = this.parseInstalled(listParsed as Record<string, unknown>, remoteIds);
            }
            this.remotePluginIds.set(this.envKey(env), remoteIds);
            const marketParsed: unknown = JSON.parse(marketResult.stdout);
            if (marketParsed && typeof marketParsed === 'object' && !Array.isArray(marketParsed)) {
                base.marketplaces = this.parseMarketplaces(marketParsed as Record<string, unknown>);
            }
            base.marketplaces.push(...this.unlistedMarketplaces(base.plugins, base.marketplaces));
        } catch (error) {
            return { ...base, error: `failed to parse CLI output: ${String(error)}` };
        }
        return base;
    }

    /** `codex plugin marketplace list --json` の出力を共通型へ変換する。 */
    private parseMarketplaces(rec: Record<string, unknown>): PluginMarketplaceEntry[] {
        const entries: PluginMarketplaceEntry[] = [];
        for (const item of Array.isArray(rec.marketplaces) ? rec.marketplaces : []) {
            if (!item || typeof item !== 'object') {
                continue;
            }
            const m = item as Record<string, unknown>;
            const name = typeof m.name === 'string' ? m.name : '';
            if (name.length === 0) {
                continue;
            }
            // marketplace list --json は {name, root} と、config.toml の [marketplaces] に登録されたものだけ
            // marketplaceSource {sourceType, source} を返す。登録元があればそれを、無ければ root パスを表示する。
            const registered = this.asRecord(m.marketplaceSource);
            const sourceType = this.nonEmptyString(registered.sourceType);
            const source = this.nonEmptyString(registered.source);
            entries.push({
                name,
                sourceKind: sourceType ?? 'snapshot',
                sourceDetail: source ?? (typeof m.root === 'string' ? m.root : ''),
                origin: CODEX_BUILTIN_MARKETPLACES.includes(name) ? 'builtin' : 'user',
                selectable: true,
            });
        }
        return entries;
    }

    /**
     * インストール済みプラグインが参照しているのに marketplace list に無いマーケットプレイス
     * （リモートカタログ）を返す。設定済みソースではないため CLI から削除できず、削除不可とする。
     */
    private unlistedMarketplaces(plugins: PluginEntry[], listed: PluginMarketplaceEntry[]): PluginMarketplaceEntry[] {
        const known = new Set(listed.map(m => m.name));
        const result: PluginMarketplaceEntry[] = [];
        for (const plugin of plugins) {
            if (!plugin.marketplace || known.has(plugin.marketplace)) {
                continue;
            }
            known.add(plugin.marketplace);
            result.push({
                name: plugin.marketplace,
                sourceKind: 'remote',
                sourceDetail: '',
                origin: 'builtin',
                selectable: true,
            });
        }
        return result;
    }

    /**
     * プラグイン実体（`source.path`）のマニフェストの読み取り候補パスを返す。
     * WSL は UNC（\\wsl.localhost / \\wsl$）で読む。
     */
    private manifestCandidates(env: CodexEnvironment, sourcePath: string, manifestRel: string): string[] {
        if (env.kind === 'wsl') {
            if (!env.distro || !sourcePath.startsWith('/')) {
                return [];
            }
            const winRel = `${sourcePath}/${manifestRel}`.replace(/\//g, '\\');
            return [`\\\\wsl.localhost\\${env.distro}${winRel}`, `\\\\wsl$\\${env.distro}${winRel}`];
        }
        return [join(sourcePath, ...manifestRel.split('/'))];
    }

    /** マニフェスト JSON を読む。どの候補パスでも読めなければ null。 */
    private async readManifest(
        env: CodexEnvironment,
        sourcePath: string,
        manifestRel: string
    ): Promise<Record<string, unknown> | null> {
        for (const candidate of this.manifestCandidates(env, sourcePath, manifestRel)) {
            try {
                const parsed: unknown = JSON.parse(stripBom(await nodeFs.readFile(candidate, 'utf8')));
                return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
                    ? (parsed as Record<string, unknown>)
                    : null;
            } catch {
                // 候補パスの読み取り失敗は次の候補へ（全滅なら null）。
            }
        }
        return null;
    }

    /**
     * ローカルのプラグイン実体から description / homepage を best-effort で読む。失敗時は null。
     * 名前・説明などの識別情報はルートの plugin.json を正とし、無ければ互換マニフェスト
     * `.codex-plugin/plugin.json` を使う。OpenAI 固有の interface（shortDescription / websiteURL）は
     * ルートの extensions["com.openai"] があればそれを、無ければ互換マニフェストのものを使う。
     */
    private async readManifestMeta(env: CodexEnvironment, sourcePath: string): Promise<PluginMeta | null> {
        const [root, overlay] = await Promise.all([
            this.readManifest(env, sourcePath, 'plugin.json'),
            this.readManifest(env, sourcePath, '.codex-plugin/plugin.json'),
        ]);
        const identity = root ?? overlay;
        if (!identity) {
            return null;
        }
        // extensions["com.openai"] がオブジェクトなら、互換マニフェストとは統合せずこちらだけを使う。
        const extension = this.asRecord(root?.extensions)['com.openai'];
        const hasExtension = !!extension && typeof extension === 'object' && !Array.isArray(extension);
        const iface = this.asRecord(hasExtension ? this.asRecord(extension).interface : overlay?.interface);
        const repository =
            this.nonEmptyString(identity.repository) ?? this.nonEmptyString(this.asRecord(identity.repository).url);
        return {
            description: this.nonEmptyString(identity.description) ?? this.nonEmptyString(iface.shortDescription),
            homepage: this.nonEmptyString(identity.homepage) ?? this.nonEmptyString(iface.websiteURL) ?? repository,
        };
    }

    /**
     * リモートプラグインカタログのキャッシュから、リモート ID → description / homepage の対応を読む。
     * 対応スキーマ以外・読み取り不可（WSL コマンドモードを含む）は空として扱う（best-effort）。
     */
    private async readRemoteCatalogMeta(env: CodexEnvironment): Promise<Map<string, PluginMeta>> {
        const result = new Map<string, PluginMeta>();
        const fs = this.fsFor(env);
        const files = (await fs.listFiles(CODEX_REMOTE_PLUGIN_CATALOG_REL)).filter(name => name.endsWith('.json'));
        for (const file of files) {
            try {
                const abs = await fs.resolveRealPath(`${CODEX_REMOTE_PLUGIN_CATALOG_REL}/${file}`);
                if (!abs) {
                    continue;
                }
                const cache = this.asRecord(JSON.parse(await nodeFs.readFile(abs, 'utf8')));
                if (cache.schema_version !== REMOTE_CATALOG_SCHEMA_VERSION || !Array.isArray(cache.plugins)) {
                    continue;
                }
                for (const item of cache.plugins) {
                    const plugin = this.asRecord(item);
                    const id = this.nonEmptyString(plugin.id);
                    if (!id || result.has(id)) {
                        continue;
                    }
                    const release = this.asRecord(plugin.release);
                    const iface = this.asRecord(release.interface);
                    result.set(id, {
                        description:
                            this.nonEmptyString(release.description) ?? this.nonEmptyString(iface.short_description),
                        homepage: this.nonEmptyString(iface.website_url),
                    });
                }
            } catch {
                // キャッシュが読めない・壊れている場合は補完なし。
            }
        }
        return result;
    }

    /** マーケットプレイスのカタログ（インストール可能なプラグイン一覧）。 */
    async catalog(env: CodexEnvironment): Promise<PluginCatalogReport> {
        const result = await this.runner.run(
            env,
            CODEX_CLI_COMMAND,
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
            const entries: PluginCatalogEntry[] = [];
            const sources = new Map<string, PluginSource>(); // id -> プラグインのソース情報
            // installed / available の両方を候補として返し、installed フラグで区別する
            // （GUI 側は未インストールのみ表示に使うが、重複インストール防止の判定にも使う）。
            // 同じ pluginId が複数あるときは先に現れたもの（インストール済みを優先）を残す。
            const push = (item: unknown, installed: boolean) => {
                if (!item || typeof item !== 'object') {
                    return;
                }
                const p = item as Record<string, unknown>;
                const pluginId = typeof p.pluginId === 'string' ? p.pluginId : '';
                if (pluginId.length === 0 || sources.has(pluginId)) {
                    return;
                }
                const isInstalled = installed || p.installed === true;
                // 管理者の設定などでインストールできないものは候補にしない。
                if (!isInstalled && p.installPolicy === 'NOT_AVAILABLE') {
                    return;
                }
                sources.set(pluginId, this.sourceOf(p));
                entries.push({
                    id: pluginId,
                    name: typeof p.name === 'string' ? p.name : pluginId,
                    description: typeof p.description === 'string' ? p.description : null,
                    marketplace: typeof p.marketplaceName === 'string' ? p.marketplaceName : '',
                    installed: isInstalled,
                    homepage: null,
                });
            };
            for (const item of Array.isArray(rec.installed) ? rec.installed : []) {
                push(item, true);
            }
            for (const item of Array.isArray(rec.available) ? rec.available : []) {
                push(item, false);
            }
            // CLI 出力に description が無いため、マニフェストとリモートカタログから補完する（並列・best-effort）。
            const hasRemote = [...sources.values()].some(s => s.remoteId !== null);
            const remoteMeta = hasRemote ? await this.readRemoteCatalogMeta(env) : new Map<string, PluginMeta>();
            await Promise.all(
                entries.map(async entry => {
                    if (entry.description && entry.homepage) {
                        return;
                    }
                    const source = sources.get(entry.id);
                    const meta = source?.path
                        ? await this.readManifestMeta(env, source.path)
                        : source?.remoteId
                          ? (remoteMeta.get(source.remoteId) ?? null)
                          : null;
                    if (meta) {
                        entry.description = entry.description ?? meta.description;
                        entry.homepage = meta.homepage;
                    }
                })
            );
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
    private async mutate(env: CodexEnvironment, args: string[], target: string): Promise<PluginOpResult> {
        if (!validateOperand(target)) {
            return { ok: false, message: `invalid argument: ${target}` };
        }
        const result = await this.runner.run(env, CODEX_CLI_COMMAND, args, MUTATE_TIMEOUT_MS);
        if (result.ok) {
            return { ok: true };
        }
        return { ok: false, message: this.failureMessage(result.stdout, result.stderr) };
    }

    /** プラグインをインストールする。id は "<plugin>@<marketplace>"。 */
    async install(env: CodexEnvironment, id: string): Promise<PluginOpResult> {
        return this.mutate(env, ['plugin', 'add', id, '--json'], id);
    }

    /** プラグインをアンインストールする。 */
    async uninstall(env: CodexEnvironment, id: string): Promise<PluginOpResult> {
        return this.mutate(env, ['plugin', 'remove', id, '--json'], id);
    }

    /**
     * プラグインの有効/無効を切り替える。
     * codex には enable/disable サブコマンドが無いため、config.toml の `plugins."<id>".enabled` の値だけを
     * 直接編集する（他のセクション・コメント・整形は保持する）。編集結果を parse し、enabled 以外が
     * 変わっていないことを確かめてから書き込み、確かめられない場合は書き込まずに失敗を返す。
     * この設定はローカルマーケットプレイスのプラグインにだけ効くため、リモートのプラグインは書き込まずに失敗を返す。
     */
    async setEnabled(env: CodexEnvironment, id: string, enabled: boolean): Promise<PluginOpResult> {
        if (!validateArg(id)) {
            return { ok: false, message: `invalid plugin id: ${id}` };
        }
        if (this.remotePluginIds.get(this.envKey(env))?.has(id)) {
            return {
                ok: false,
                message: `${id} is a remote plugin. Codex applies [plugins."<id>"] enabled only to local-marketplace plugins; uninstall it instead.`,
            };
        }
        try {
            const fs = this.fsFor(env);
            const raw = stripBom(await fs.readText(CODEX_CONFIG_REL)) ?? '';
            const next = this.applyEnabled(raw, id, enabled);
            if (next !== raw) {
                await fs.writeText(CODEX_CONFIG_REL, next);
            }
            return { ok: true };
        } catch (error) {
            console.error('Failed to toggle codex plugin enabled state:', error);
            return {
                ok: false,
                message: `config.toml was not changed: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    }

    /**
     * config.toml テキストの `plugins."<id>".enabled` を設定したテキストを返す。
     * 既存の enabled（見出し・ドット記法・インラインテーブルのいずれでも）は値だけを置き換え、無ければ
     * `[plugins."<id>"]` 見出しの直後・インラインテーブルの先頭へ加えるか、末尾に見出しごと追記する。
     * 編集前のテキストが TOML として読めない場合、plugins / plugins."<id>" がテーブルでない場合、
     * 編集結果が「enabled だけを変えた内容」と一致しない場合は例外を投げる。
     */
    private applyEnabled(toml: string, id: string, enabled: boolean): string {
        const expected = parse(toml) as Record<string, unknown>;
        const plugins = expected.plugins ?? (expected.plugins = {});
        if (!isTomlTable(plugins)) {
            throw new Error('"plugins" is not a table');
        }
        const entry = plugins[id] ?? (plugins[id] = {});
        if (!isTomlTable(entry)) {
            throw new Error(`plugins.${tomlKey(id)} is not a table`);
        }
        entry.enabled = enabled;

        const layout = scanTomlStatements(toml);
        const target = ['plugins', id];
        const value = String(enabled);
        const eol = toml.includes('\r\n') ? '\r\n' : '\n';
        // 行の終端に文を差し込む（最終行が改行で終わっていなければ改行を補う）。
        const insertLine = (at: number, line: string) =>
            `${toml.slice(0, at)}${at === toml.length && at > 0 && !toml.endsWith('\n') ? eol : ''}${line}${eol}${toml.slice(at)}`;

        let next: string;
        const current = layout.assignments.find(a => sameTomlPath(a.path, [...target, 'enabled']));
        const header = layout.headers.find(h => !h.array && sameTomlPath(h.path, target));
        const inline = layout.assignments.find(a => a.inlineOpen !== null && sameTomlPath(a.path, target));
        const dotted = layout.assignments.find(
            a => a.table !== null && a.lineEnd !== null && a.path.length > 2 && sameTomlPath(a.path.slice(0, 2), target)
        );
        if (current) {
            next = `${toml.slice(0, current.valueStart)}${value}${toml.slice(current.valueEnd)}`;
        } else if (header) {
            next = insertLine(header.lineEnd, `enabled = ${value}`);
        } else if (inline && inline.inlineOpen !== null) {
            const open = inline.inlineOpen;
            next =
                toml.slice(open + 1, inline.valueEnd - 1).trim().length === 0
                    ? `${toml.slice(0, open)}{ enabled = ${value} }${toml.slice(inline.valueEnd)}`
                    : `${toml.slice(0, open + 1)} enabled = ${value},${toml.slice(open + 1)}`;
        } else if (dotted && dotted.table !== null && dotted.lineEnd !== null && dotted.table.length <= 2) {
            // ドット記法で定義されたテーブルには、同じ書き方の enabled を直後の行に加える。
            const key = [...target, 'enabled'].slice(dotted.table.length).map(tomlKey).join('.');
            next = insertLine(dotted.lineEnd, `${key} = ${value}`);
        } else {
            const base = toml.replace(/\s+$/, '');
            const block = `[plugins.${tomlKey(id)}]${eol}enabled = ${value}${eol}`;
            next = base.length > 0 ? `${base}${eol}${eol}${block}` : block;
        }
        let written: unknown;
        try {
            written = parse(next);
        } catch {
            written = undefined;
        }
        if (written === undefined || !deepEqualLoose(written, expected)) {
            throw new Error(
                `plugins.${tomlKey(id)} is written in a form that cannot be edited safely; edit it directly`
            );
        }
        return next;
    }

    /** マーケットプレイスを追加する（ローカルパス / owner/repo[@ref] / HTTPS・SSH Git URL）。 */
    async addMarketplace(env: CodexEnvironment, source: string): Promise<PluginOpResult> {
        return this.mutate(env, ['plugin', 'marketplace', 'add', source, '--json'], source);
    }

    /** マーケットプレイスを削除する。 */
    async removeMarketplace(env: CodexEnvironment, name: string): Promise<PluginOpResult> {
        return this.mutate(env, ['plugin', 'marketplace', 'remove', name, '--json'], name);
    }
}
