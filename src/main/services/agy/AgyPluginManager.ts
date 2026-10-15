import {
    AGY_CLI_COMMAND,
    AGY_PLUGIN_CAPABILITIES,
    AGY_PLUGINS_REL,
    AGY_SHARED_CONFIG_JSON_REL,
    AGY_WSL_CLI_TEST,
} from '../../../shared/agents/agy/constants';
import type {
    AgyEnvironment,
    OSType,
    PluginCatalogReport,
    PluginEntry,
    PluginEnvReport,
    PluginOpResult,
} from '../../../shared/agents/agy/types';
import { AgentCliRunner, validateOperand } from '../common/cli/AgentCliRunner';
import { stripBom } from '../common/json/stripBom';
import { HomeFs } from '../common/wsl/HomeFs';
import { WslDetector } from '../common/wsl/WslDetector';

const MUTATE_TIMEOUT_MS = 180_000;

type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * JSON オブジェクトのファイルを読む。CLI と同じく先頭の UTF-8 BOM を許容する。
 * ファイルが無い・構文が壊れている・オブジェクトでない場合は null を返す。
 */
async function readJsonObject(fs: HomeFs, relPath: string): Promise<JsonObject | null> {
    const text = await fs.readText(relPath);
    if (text === null) return null;
    try {
        const parsed: unknown = JSON.parse(stripBom(text));
        return isJsonObject(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

/** config.json の plugins 配下にある指定 Plugin の enabled 値。登録が無ければ undefined。 */
function configuredEnabled(plugins: JsonObject | null, key: string): boolean | undefined {
    const entry = plugins?.[key];
    return isJsonObject(entry) && typeof entry.enabled === 'boolean' ? entry.enabled : undefined;
}

/**
 * Antigravity CLI の Gemini 共通グローバルプラグイン領域と `agy plugin` を管理する。
 * `agy plugin enable / disable / uninstall` は導入済みプラグインの名前（plugin.json の name）を受け取るため、
 * 操作の ID は name とする。config.json の plugins はインストール先のディレクトリ名をキーに有効状態を持つ。
 */
export class AgyPluginManager {
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

    /** refresh=true のときは CLI と WSL distro の検出結果を破棄してから環境を列挙する。 */
    async getEnvironments(refresh = false): Promise<{ env: AgyEnvironment; label: string }[]> {
        if (refresh) {
            this.runner.invalidate();
            this.detector.invalidate();
        }
        const result: { env: AgyEnvironment; label: string }[] = [
            { env: { kind: 'native' }, label: this.nativeLabel() },
        ];
        const distros = await this.detector.getDistrosWithTest(AGY_WSL_CLI_TEST);
        for (const distro of distros)
            result.push({ env: { kind: 'wsl', distro: distro.distro }, label: distro.distro });
        return result;
    }

    /**
     * 共通 Plugin ディレクトリを走査して導入済み Plugin を列挙する。
     * plugin.json（改名による無効化マーカー plugin.json.disabled を含む）を持つディレクトリを Plugin とみなす。
     * 有効状態は config.json の plugins.<ディレクトリ名>.enabled（無ければ plugins.<name>.enabled）を正とし、
     * 未登録の Plugin は CLI の初期値と同じくマニフェストの disabled 指定と無効化マーカーから判定する。
     * 名前（マニフェストに name が無ければディレクトリ名）を CLI に渡せない Plugin は、切り替え・削除できないものとして返す。
     */
    private async directoryPlugins(env: AgyEnvironment): Promise<PluginEntry[]> {
        const fs = new HomeFs(env, this.detector);
        const config = await readJsonObject(fs, AGY_SHARED_CONFIG_JSON_REL);
        const configuredPlugins = isJsonObject(config?.plugins) ? config.plugins : null;
        const entries: PluginEntry[] = [];
        for (const dir of await fs.listDirs(AGY_PLUGINS_REL)) {
            const manifestRel = `${AGY_PLUGINS_REL}/${dir}/plugin.json`;
            const activeManifest = await readJsonObject(fs, manifestRel);
            const manifest = activeManifest ?? (await readJsonObject(fs, `${manifestRel}.disabled`));
            if (manifest === null) continue;
            const installed = await readJsonObject(fs, `${AGY_PLUGINS_REL}/${dir}/installed_version.json`);
            const name = typeof manifest.name === 'string' && manifest.name.length > 0 ? manifest.name : dir;
            const manifestVersion = typeof manifest.version === 'string' ? manifest.version : null;
            const installedVersion = typeof installed?.version === 'string' ? installed.version : null;
            const enabled =
                configuredEnabled(configuredPlugins, dir) ??
                configuredEnabled(configuredPlugins, name) ??
                (activeManifest !== null && manifest.disabled !== true);
            entries.push({
                id: name,
                name,
                version: manifestVersion ?? installedVersion,
                marketplace: 'Gemini shared config',
                enabled,
                // CLI に渡せない名前（- で始まりオプションと解釈されるものなど）は、切り替え・削除の対象にしない。
                ...(validateOperand(name)
                    ? {}
                    : { toggleable: false, uninstallable: false, noteKey: 'agy.plugins.invalidNameNote' }),
            });
        }
        return entries;
    }

    async list(env: AgyEnvironment): Promise<PluginEnvReport> {
        const cli = await this.runner.checkCli(env, AGY_CLI_COMMAND);
        const base: PluginEnvReport = {
            env,
            label: env.kind === 'wsl' ? (env.distro ?? 'WSL') : this.nativeLabel(),
            cliAvailable: cli.available,
            cliVersion: cli.version,
            plugins: [],
            marketplaces: [],
            capabilities: AGY_PLUGIN_CAPABILITIES,
        };
        if (!cli.available) return base;
        try {
            // `agy plugin list` は import した Plugin しか列挙しないため、導入済み一覧はディレクトリ走査で作る。
            base.plugins = await this.directoryPlugins(env);
        } catch (error) {
            base.error = String(error);
        }
        return base;
    }

    async catalog(_env: AgyEnvironment): Promise<PluginCatalogReport> {
        return { ok: true, entries: [] };
    }

    /**
     * 変更操作の共通実行。操作対象（プラグイン名・ソース）が空、または - で始まる場合は
     * CLI のオプションとして解釈されるのを防ぐため実行しない。
     */
    private async mutate(env: AgyEnvironment, args: string[], target: string): Promise<PluginOpResult> {
        if (!validateOperand(target)) return { ok: false, message: `invalid argument: ${target}` };
        const result = await this.runner.run(env, AGY_CLI_COMMAND, args, MUTATE_TIMEOUT_MS);
        return result.ok
            ? { ok: true }
            : { ok: false, message: [result.stderr.trim(), result.stdout.trim()].filter(Boolean).join('\n') };
    }

    install(env: AgyEnvironment, id: string): Promise<PluginOpResult> {
        return this.installFromSource(env, id);
    }

    installFromSource(env: AgyEnvironment, source: string): Promise<PluginOpResult> {
        return this.mutate(env, ['plugin', 'install', source], source);
    }

    uninstall(env: AgyEnvironment, id: string): Promise<PluginOpResult> {
        return this.mutate(env, ['plugin', 'uninstall', id], id);
    }

    setEnabled(env: AgyEnvironment, id: string, enabled: boolean): Promise<PluginOpResult> {
        return this.mutate(env, ['plugin', enabled ? 'enable' : 'disable', id], id);
    }

    async addMarketplace(_env: AgyEnvironment, _source: string): Promise<PluginOpResult> {
        return { ok: false, message: 'unsupported' };
    }

    async removeMarketplace(_env: AgyEnvironment, _name: string): Promise<PluginOpResult> {
        return { ok: false, message: 'unsupported' };
    }
}
