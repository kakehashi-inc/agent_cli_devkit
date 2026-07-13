import { promises as nodeFs } from 'fs';
import { join } from 'path';
import {
    CODEX_BUILTIN_MARKETPLACES,
    CODEX_CLI_COMMAND,
    CODEX_CONFIG_REL,
    CODEX_PLUGIN_CAPABILITIES,
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
import { AgentCliRunner, validateArg } from '../common/cli/AgentCliRunner';
import { HomeFs } from '../common/wsl/HomeFs';
import { WslDetector } from '../common/wsl/WslDetector';

const LIST_TIMEOUT_MS = 60_000;
const MUTATE_TIMEOUT_MS = 180_000;

/**
 * Codex のプラグイン管理。
 *
 * 設計の要点:
 * - 一覧・カタログは `codex plugin list --json`（installed / available）と
 *   `codex plugin marketplace list --json` の機械可読出力を共通型へ正規化する。
 *   config.toml の [marketplaces] には組み込みマーケット（openai-curated 等）が
 *   載らないことがあるため、一覧の正は常に CLI 出力とする。
 * - CLI 出力のカタログには description が含まれないため、各エントリの
 *   `source.path`（マーケットプレイススナップショット内のプラグイン実体）にある
 *   `.codex-plugin/plugin.json` から description / homepage を best-effort で補完する。
 * - 変更操作（add / remove / marketplace add / remove）はすべて `--json` 付きで
 *   ヘッドレス実行する。enable/disable はサブコマンドが存在しないため、
 *   config.toml の `[plugins."<id>"] enabled` を直接編集する（対象行のみ変更）。
 * - 個別リポジトリの直接インストールは非対応。GUI は「マーケットプレイスとして追加 →
 *   含まれるプラグインを選択」の 2 段階で実現する（capabilities.directInstall=false）。
 */
export class CodexPluginManager {
    private readonly detector: WslDetector;
    private readonly runner: AgentCliRunner;

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

    /** 管理対象の環境一覧（native + Codex 入り WSL distro）。他機能と同じ並び。 */
    async getEnvironments(): Promise<{ env: CodexEnvironment; label: string }[]> {
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

    /** `codex plugin list --json` の installed 配列を共通型へ変換する。 */
    private parseInstalled(rec: Record<string, unknown>): PluginEntry[] {
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
            entries.push({
                id: pluginId,
                name: typeof p.name === 'string' ? p.name : pluginId,
                version: typeof p.version === 'string' ? p.version : null,
                marketplace: typeof p.marketplaceName === 'string' ? p.marketplaceName : null,
                enabled: p.enabled === true,
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
            const listParsed: unknown = JSON.parse(listResult.stdout);
            if (listParsed && typeof listParsed === 'object' && !Array.isArray(listParsed)) {
                base.plugins = this.parseInstalled(listParsed as Record<string, unknown>);
            }
            const marketParsed: unknown = JSON.parse(marketResult.stdout);
            if (marketParsed && typeof marketParsed === 'object' && !Array.isArray(marketParsed)) {
                base.marketplaces = this.parseMarketplaces(marketParsed as Record<string, unknown>);
            }
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
            entries.push({
                name,
                // marketplace list --json は {name, root} のみ。種別は root から判別できないため
                // 表示は root パスをそのまま使う。
                sourceKind: 'snapshot',
                sourceDetail: typeof m.root === 'string' ? m.root : '',
                origin: CODEX_BUILTIN_MARKETPLACES.includes(name) ? 'builtin' : 'user',
                selectable: true,
            });
        }
        return entries;
    }

    /**
     * カタログエントリの `source.path`（プラグイン実体）にある `.codex-plugin/plugin.json` の
     * 読み取り候補パスを返す。WSL は UNC（\\wsl.localhost / \\wsl$）で読む。
     */
    private manifestCandidates(env: CodexEnvironment, sourcePath: string): string[] {
        if (env.kind === 'wsl') {
            if (!env.distro || !sourcePath.startsWith('/')) {
                return [];
            }
            const winRel = `${sourcePath}/.codex-plugin/plugin.json`.replace(/\//g, '\\');
            return [`\\\\wsl.localhost\\${env.distro}${winRel}`, `\\\\wsl$\\${env.distro}${winRel}`];
        }
        return [join(sourcePath, '.codex-plugin', 'plugin.json')];
    }

    /** plugin.json から description / homepage を best-effort で読む。失敗時は null。 */
    private async readManifestMeta(
        env: CodexEnvironment,
        sourcePath: string
    ): Promise<{ description: string | null; homepage: string | null } | null> {
        for (const candidate of this.manifestCandidates(env, sourcePath)) {
            try {
                const raw = await nodeFs.readFile(candidate, 'utf8');
                const manifest: unknown = JSON.parse(raw);
                if (!manifest || typeof manifest !== 'object') {
                    return null;
                }
                const m = manifest as Record<string, unknown>;
                const iface =
                    m.interface && typeof m.interface === 'object' && !Array.isArray(m.interface)
                        ? (m.interface as Record<string, unknown>)
                        : {};
                const description =
                    (typeof m.description === 'string' && m.description) ||
                    (typeof iface.shortDescription === 'string' && iface.shortDescription) ||
                    null;
                const homepage =
                    (typeof m.homepage === 'string' && m.homepage) ||
                    (typeof iface.websiteURL === 'string' && iface.websiteURL) ||
                    (typeof m.repository === 'string' && m.repository) ||
                    null;
                return { description, homepage };
            } catch {
                // 候補パスの読み取り失敗は次の候補へ（全滅なら補完なし）。
            }
        }
        return null;
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
            const sourcePaths = new Map<string, string>(); // id -> plugin 実体パス
            // installed / available の両方を候補として返し、installed フラグで区別する
            // （GUI 側は未インストールのみ表示に使うが、重複インストール防止の判定にも使う）。
            const push = (item: unknown, installed: boolean) => {
                if (!item || typeof item !== 'object') {
                    return;
                }
                const p = item as Record<string, unknown>;
                const pluginId = typeof p.pluginId === 'string' ? p.pluginId : '';
                if (pluginId.length === 0) {
                    return;
                }
                const source =
                    p.source && typeof p.source === 'object' && !Array.isArray(p.source)
                        ? (p.source as Record<string, unknown>)
                        : {};
                if (typeof source.path === 'string' && source.path.length > 0) {
                    sourcePaths.set(pluginId, source.path);
                }
                entries.push({
                    id: pluginId,
                    name: typeof p.name === 'string' ? p.name : pluginId,
                    description: typeof p.description === 'string' ? p.description : null,
                    marketplace: typeof p.marketplaceName === 'string' ? p.marketplaceName : '',
                    installed: installed || p.installed === true,
                    homepage: null,
                });
            };
            for (const item of Array.isArray(rec.available) ? rec.available : []) {
                push(item, false);
            }
            for (const item of Array.isArray(rec.installed) ? rec.installed : []) {
                push(item, true);
            }
            // CLI 出力に description が無いため、plugin.json から補完する（並列・best-effort）。
            await Promise.all(
                entries.map(async entry => {
                    const sourcePath = sourcePaths.get(entry.id);
                    if (!sourcePath || (entry.description && entry.homepage)) {
                        return;
                    }
                    const meta = await this.readManifestMeta(env, sourcePath);
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

    private async mutate(env: CodexEnvironment, args: string[]): Promise<PluginOpResult> {
        const result = await this.runner.run(env, CODEX_CLI_COMMAND, args, MUTATE_TIMEOUT_MS);
        if (result.ok) {
            return { ok: true };
        }
        return { ok: false, message: this.failureMessage(result.stdout, result.stderr) };
    }

    /** プラグインをインストールする。id は "<plugin>@<marketplace>"。 */
    async install(env: CodexEnvironment, id: string): Promise<PluginOpResult> {
        return this.mutate(env, ['plugin', 'add', id, '--json']);
    }

    /** プラグインをアンインストールする。 */
    async uninstall(env: CodexEnvironment, id: string): Promise<PluginOpResult> {
        return this.mutate(env, ['plugin', 'remove', id, '--json']);
    }

    /**
     * プラグインの有効/無効を切り替える。
     * codex には enable/disable サブコマンドが無いため、config.toml の
     * `[plugins."<id>"] enabled` を直接編集する（対象テーブルの enabled 行のみ変更し、
     * 他のセクション・コメント・整形は保持する）。
     */
    async setEnabled(env: CodexEnvironment, id: string, enabled: boolean): Promise<PluginOpResult> {
        if (!validateArg(id)) {
            return { ok: false, message: `invalid plugin id: ${id}` };
        }
        try {
            const fs = this.fsFor(env);
            const raw = (await fs.readText(CODEX_CONFIG_REL)) ?? '';
            const next = this.applyEnabledLine(raw, id, enabled);
            await fs.writeText(CODEX_CONFIG_REL, next);
            return { ok: true };
        } catch (error) {
            console.error('Failed to toggle codex plugin enabled state:', error);
            return { ok: false, message: String(error) };
        }
    }

    /** config.toml テキスト内の `[plugins."<id>"]` テーブルの enabled 行を更新/挿入する。 */
    private applyEnabledLine(toml: string, id: string, enabled: boolean): string {
        const header = `[plugins."${id}"]`;
        const lines = toml.length === 0 ? [] : toml.split('\n');
        const isBoundary = (line: string) => line.replace(/\r$/, '').trim().startsWith('[');
        const headerIdx = lines.findIndex(line => line.replace(/\r$/, '').trim() === header);

        if (headerIdx === -1) {
            // テーブルが無い → 末尾に追記する。
            while (lines.length > 0 && lines[lines.length - 1].replace(/\r$/, '').trim() === '') {
                lines.pop();
            }
            if (lines.length > 0) {
                lines.push('');
            }
            lines.push(header);
            lines.push(`enabled = ${enabled}`);
            lines.push('');
            return lines.join('\n');
        }

        let end = headerIdx + 1;
        while (end < lines.length && !isBoundary(lines[end])) {
            end++;
        }
        for (let i = headerIdx + 1; i < end; i++) {
            if (/^enabled\s*=/.test(lines[i].replace(/\r$/, '').trim())) {
                const eol = lines[i].endsWith('\r') ? '\r' : '';
                lines[i] = `enabled = ${enabled}${eol}`;
                return lines.join('\n');
            }
        }
        lines.splice(headerIdx + 1, 0, `enabled = ${enabled}`);
        return lines.join('\n');
    }

    /** マーケットプレイスを追加する（ローカルパス / owner/repo[@ref] / Git URL）。 */
    async addMarketplace(env: CodexEnvironment, source: string): Promise<PluginOpResult> {
        return this.mutate(env, ['plugin', 'marketplace', 'add', source, '--json']);
    }

    /** マーケットプレイスを削除する。 */
    async removeMarketplace(env: CodexEnvironment, name: string): Promise<PluginOpResult> {
        return this.mutate(env, ['plugin', 'marketplace', 'remove', name]);
    }
}
