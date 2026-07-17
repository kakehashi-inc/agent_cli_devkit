import { existsSync, readFileSync } from 'fs';
import { basename, extname } from 'path';
import {
    OPENCODE_CLI_COMMAND,
    OPENCODE_CONFIG_REL,
    OPENCODE_DISABLED_NPM_PLUGINS_REL,
    OPENCODE_DISABLED_PLUGINS_REL,
    OPENCODE_PLUGIN_CAPABILITIES,
    OPENCODE_PLUGINS_REL,
    OPENCODE_WSL_CLI_TEST,
} from '../../../shared/agents/opencode/constants';
import type {
    OpenCodeEnvironment,
    OSType,
    PluginCatalogReport,
    PluginEntry,
    PluginEnvReport,
    PluginOpResult,
} from '../../../shared/agents/opencode/types';
import { parseJsoncObject, setTopLevelJsoncProperty } from '../../utils/jsoncEdit';
import { AgentCliRunner } from '../common/cli/AgentCliRunner';
import { HomeFs } from '../common/wsl/HomeFs';
import { WslDetector } from '../common/wsl/WslDetector';

type NpmPluginSpec = string | [string, Record<string, unknown>];

/** OpenCode のグローバル npm / ローカルファイルプラグインを管理する。 */
export class OpenCodePluginManager {
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

    private fsFor(env: OpenCodeEnvironment): HomeFs {
        return new HomeFs(env, this.detector);
    }

    async getEnvironments(): Promise<{ env: OpenCodeEnvironment; label: string }[]> {
        const result: { env: OpenCodeEnvironment; label: string }[] = [
            { env: { kind: 'native' }, label: this.nativeLabel() },
        ];
        const distros = await this.detector.getDistrosWithTest(OPENCODE_WSL_CLI_TEST);
        for (const distro of distros)
            result.push({ env: { kind: 'wsl', distro: distro.distro }, label: distro.distro });
        return result;
    }

    private isNpmPluginSpec(value: unknown): value is NpmPluginSpec {
        return (
            typeof value === 'string' ||
            (Array.isArray(value) &&
                value.length === 2 &&
                typeof value[0] === 'string' &&
                value[1] !== null &&
                typeof value[1] === 'object' &&
                !Array.isArray(value[1]))
        );
    }

    private pluginName(spec: NpmPluginSpec): string {
        return typeof spec === 'string' ? spec : spec[0];
    }

    private async readConfig(
        fs: HomeFs
    ): Promise<{ raw: string; root: Record<string, unknown>; plugins: NpmPluginSpec[] }> {
        const raw =
            (await fs.readText(OPENCODE_CONFIG_REL)) ?? '{\n  "$schema": "https://opencode.ai/config.json"\n}\n';
        const root = parseJsoncObject(raw);
        const plugins = Array.isArray(root.plugin) ? root.plugin.filter(item => this.isNpmPluginSpec(item)) : [];
        return { raw, root, plugins };
    }

    private async disabledNpm(fs: HomeFs): Promise<NpmPluginSpec[]> {
        const value = await fs.readJson<unknown>(OPENCODE_DISABLED_NPM_PLUGINS_REL);
        return Array.isArray(value) ? value.filter(item => this.isNpmPluginSpec(item)) : [];
    }

    private async localEntries(fs: HomeFs, rel: string, enabled: boolean): Promise<PluginEntry[]> {
        return (await fs.listFiles(rel))
            .filter(file => ['.js', '.ts'].includes(extname(file).toLowerCase()))
            .map(file => ({
                id: `local:${file}`,
                name: basename(file, extname(file)),
                version: null,
                marketplace: 'local',
                enabled,
            }));
    }

    async list(env: OpenCodeEnvironment): Promise<PluginEnvReport> {
        const cli = await this.runner.checkCli(env, OPENCODE_CLI_COMMAND);
        const base: PluginEnvReport = {
            env,
            label: env.kind === 'wsl' ? (env.distro ?? 'WSL') : this.nativeLabel(),
            cliAvailable: cli.available,
            cliVersion: cli.version,
            plugins: [],
            marketplaces: [],
            capabilities: OPENCODE_PLUGIN_CAPABILITIES,
        };
        if (!cli.available) return base;
        try {
            const fs = this.fsFor(env);
            const { plugins } = await this.readConfig(fs);
            const disabled = await this.disabledNpm(fs);
            const npmEntries: PluginEntry[] = [
                ...plugins.map(spec => ({
                    id: `npm:${this.pluginName(spec)}`,
                    name: this.pluginName(spec),
                    version: null,
                    marketplace: 'npm',
                    enabled: true,
                })),
                ...disabled.map(spec => ({
                    id: `npm:${this.pluginName(spec)}`,
                    name: this.pluginName(spec),
                    version: null,
                    marketplace: 'npm',
                    enabled: false,
                })),
            ];
            base.plugins = [
                ...npmEntries,
                ...(await this.localEntries(fs, OPENCODE_PLUGINS_REL, true)),
                ...(await this.localEntries(fs, OPENCODE_DISABLED_PLUGINS_REL, false)),
            ];
        } catch (error) {
            base.error = String(error);
        }
        return base;
    }

    async catalog(_env: OpenCodeEnvironment): Promise<PluginCatalogReport> {
        return { ok: true, entries: [] };
    }

    private validPackage(source: string): boolean {
        return /^(?:@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*)(?:@[^\s/]+)?$/i.test(source);
    }

    private async writeNpm(fs: HomeFs, active: NpmPluginSpec[], disabled: NpmPluginSpec[]): Promise<void> {
        const { raw, root } = await this.readConfig(fs);
        const unsupported = Array.isArray(root.plugin) ? root.plugin.filter(item => !this.isNpmPluginSpec(item)) : [];
        const next = setTopLevelJsoncProperty(raw, 'plugin', [...active, ...unsupported]);
        await fs.writeText(OPENCODE_CONFIG_REL, next.endsWith('\n') ? next : `${next}\n`);
        await fs.writeJson(OPENCODE_DISABLED_NPM_PLUGINS_REL, disabled);
    }

    async install(env: OpenCodeEnvironment, id: string): Promise<PluginOpResult> {
        return this.installFromSource(env, id);
    }

    async installFromSource(env: OpenCodeEnvironment, source: string): Promise<PluginOpResult> {
        const trimmed = source.trim();
        const fs = this.fsFor(env);
        try {
            if (['.js', '.ts'].includes(extname(trimmed).toLowerCase()) && existsSync(trimmed)) {
                const file = basename(trimmed);
                await fs.writeText(`${OPENCODE_PLUGINS_REL}/${file}`, readFileSync(trimmed, 'utf8'));
                await fs.deleteFile(`${OPENCODE_DISABLED_PLUGINS_REL}/${file}`);
                return { ok: true };
            }
            if (!this.validPackage(trimmed)) return { ok: false, message: 'invalid-plugin-source' };
            const { plugins } = await this.readConfig(fs);
            const disabled = await this.disabledNpm(fs);
            await this.writeNpm(
                fs,
                plugins.some(item => this.pluginName(item) === trimmed) ? plugins : [...plugins, trimmed],
                disabled.filter(item => this.pluginName(item) !== trimmed)
            );
            return { ok: true };
        } catch (error) {
            return { ok: false, message: String(error) };
        }
    }

    async uninstall(env: OpenCodeEnvironment, id: string): Promise<PluginOpResult> {
        const fs = this.fsFor(env);
        try {
            if (id.startsWith('local:')) {
                const file = id.slice('local:'.length);
                if (file.includes('/') || file.includes('\\') || file.includes('..'))
                    return { ok: false, message: 'invalid-id' };
                await fs.deleteFile(`${OPENCODE_PLUGINS_REL}/${file}`);
                await fs.deleteFile(`${OPENCODE_DISABLED_PLUGINS_REL}/${file}`);
                return { ok: true };
            }
            const name = id.startsWith('npm:') ? id.slice('npm:'.length) : id;
            if (!this.validPackage(name)) return { ok: false, message: 'invalid-id' };
            const { plugins } = await this.readConfig(fs);
            const disabled = await this.disabledNpm(fs);
            await this.writeNpm(
                fs,
                plugins.filter(item => this.pluginName(item) !== name),
                disabled.filter(item => this.pluginName(item) !== name)
            );
            return { ok: true };
        } catch (error) {
            return { ok: false, message: String(error) };
        }
    }

    async setEnabled(env: OpenCodeEnvironment, id: string, enabled: boolean): Promise<PluginOpResult> {
        const fs = this.fsFor(env);
        try {
            if (id.startsWith('local:')) {
                const file = id.slice('local:'.length);
                if (file.includes('/') || file.includes('\\') || file.includes('..'))
                    return { ok: false, message: 'invalid-id' };
                const from = `${enabled ? OPENCODE_DISABLED_PLUGINS_REL : OPENCODE_PLUGINS_REL}/${file}`;
                const to = `${enabled ? OPENCODE_PLUGINS_REL : OPENCODE_DISABLED_PLUGINS_REL}/${file}`;
                const content = await fs.readText(from);
                if (content === null) return { ok: false, message: 'not-found' };
                await fs.writeText(to, content);
                await fs.deleteFile(from);
                return { ok: true };
            }
            const name = id.startsWith('npm:') ? id.slice('npm:'.length) : id;
            if (!this.validPackage(name)) return { ok: false, message: 'invalid-id' };
            const { plugins } = await this.readConfig(fs);
            const disabled = await this.disabledNpm(fs);
            const activeSpec = plugins.find(item => this.pluginName(item) === name);
            const disabledSpec = disabled.find(item => this.pluginName(item) === name);
            if (!activeSpec && !disabledSpec) {
                return { ok: false, message: 'not-found' };
            }
            await this.writeNpm(
                fs,
                enabled
                    ? activeSpec
                        ? plugins
                        : [...plugins, disabledSpec ?? name]
                    : plugins.filter(item => this.pluginName(item) !== name),
                enabled
                    ? disabled.filter(item => this.pluginName(item) !== name)
                    : disabledSpec
                      ? disabled
                      : [...disabled, activeSpec ?? name]
            );
            return { ok: true };
        } catch (error) {
            return { ok: false, message: String(error) };
        }
    }

    async addMarketplace(_env: OpenCodeEnvironment, _source: string): Promise<PluginOpResult> {
        return { ok: false, message: 'unsupported' };
    }

    async removeMarketplace(_env: OpenCodeEnvironment, _name: string): Promise<PluginOpResult> {
        return { ok: false, message: 'unsupported' };
    }
}
