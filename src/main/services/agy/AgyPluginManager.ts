import {
    AGY_CLI_COMMAND,
    AGY_PLUGIN_CAPABILITIES,
    AGY_PLUGINS_REL,
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
import { AgentCliRunner } from '../common/cli/AgentCliRunner';
import { HomeFs } from '../common/wsl/HomeFs';
import { WslDetector } from '../common/wsl/WslDetector';

const MUTATE_TIMEOUT_MS = 180_000;

/** Antigravity CLI の Gemini 共通グローバルプラグイン領域と `agy plugin` を管理する。 */
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

    async getEnvironments(): Promise<{ env: AgyEnvironment; label: string }[]> {
        const result: { env: AgyEnvironment; label: string }[] = [
            { env: { kind: 'native' }, label: this.nativeLabel() },
        ];
        const distros = await this.detector.getDistrosWithTest(AGY_WSL_CLI_TEST);
        for (const distro of distros)
            result.push({ env: { kind: 'wsl', distro: distro.distro }, label: distro.distro });
        return result;
    }

    private async directoryPlugins(env: AgyEnvironment): Promise<PluginEntry[]> {
        const fs = new HomeFs(env, this.detector);
        const entries: PluginEntry[] = [];
        for (const dir of await fs.listDirs(AGY_PLUGINS_REL)) {
            const manifestRel = `${AGY_PLUGINS_REL}/${dir}/plugin.json`;
            const enabled = await fs.exists(manifestRel);
            const manifest =
                (await fs.readJson<Record<string, unknown>>(manifestRel)) ??
                (await fs.readJson<Record<string, unknown>>(`${manifestRel}.disabled`));
            if (manifest === null) continue;
            const installed = await fs.readJson<Record<string, unknown>>(
                `${AGY_PLUGINS_REL}/${dir}/installed_version.json`
            );
            const name = typeof manifest?.name === 'string' ? manifest.name : dir;
            const manifestVersion = typeof manifest?.version === 'string' ? manifest.version : null;
            const installedVersion = typeof installed?.version === 'string' ? installed.version : null;
            entries.push({
                id: name,
                name,
                version: manifestVersion ?? installedVersion,
                marketplace: 'Gemini shared config',
                enabled,
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
            // Directory discovery also includes bundled/shared Gemini plugins that `agy plugin list` omits.
            base.plugins = await this.directoryPlugins(env);
        } catch (error) {
            base.error = String(error);
        }
        return base;
    }

    async catalog(_env: AgyEnvironment): Promise<PluginCatalogReport> {
        return { ok: true, entries: [] };
    }

    private async mutate(env: AgyEnvironment, args: string[]): Promise<PluginOpResult> {
        const result = await this.runner.run(env, AGY_CLI_COMMAND, args, MUTATE_TIMEOUT_MS);
        return result.ok
            ? { ok: true }
            : { ok: false, message: [result.stderr.trim(), result.stdout.trim()].filter(Boolean).join('\n') };
    }

    install(env: AgyEnvironment, id: string): Promise<PluginOpResult> {
        return this.installFromSource(env, id);
    }

    installFromSource(env: AgyEnvironment, source: string): Promise<PluginOpResult> {
        return this.mutate(env, ['plugin', 'install', source]);
    }

    uninstall(env: AgyEnvironment, id: string): Promise<PluginOpResult> {
        return this.mutate(env, ['plugin', 'uninstall', id]);
    }

    setEnabled(env: AgyEnvironment, id: string, enabled: boolean): Promise<PluginOpResult> {
        return this.mutate(env, ['plugin', enabled ? 'enable' : 'disable', id]);
    }

    async addMarketplace(_env: AgyEnvironment, _source: string): Promise<PluginOpResult> {
        return { ok: false, message: 'unsupported' };
    }

    async removeMarketplace(_env: AgyEnvironment, _name: string): Promise<PluginOpResult> {
        return { ok: false, message: 'unsupported' };
    }
}
