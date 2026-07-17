import type {
    AgentEnvironment,
    OSType,
    SettingsFieldSpec,
    SettingsFieldValue,
    SettingsReadResult,
    SettingsValues,
    SettingsWriteResult,
} from '../../../../shared/agents/types';
import { deleteTopLevelJsoncProperty, parseJsoncObject, setTopLevelJsoncProperty } from '../../../utils/jsoncEdit';
import { HomeFs } from '../wsl/HomeFs';
import { WslDetector } from '../wsl/WslDetector';

interface Options {
    configRel: string;
    wslTest: string;
    fields: SettingsFieldSpec[];
    initial?: Record<string, unknown>;
}

/** JSON / JSONC 設定のスカラー差分編集と raw 編集を提供する。 */
export class JsonSettingsManager {
    constructor(
        private readonly detector: WslDetector,
        private readonly options: Options
    ) {}

    private nativeLabel(): string {
        const platform = process.platform as OSType;
        if (platform === 'win32') return 'Windows';
        if (platform === 'darwin') return 'macOS';
        return 'Linux';
    }

    private fsFor(env: AgentEnvironment): HomeFs {
        return new HomeFs(env, this.detector);
    }

    async getEnvironments(): Promise<{ env: AgentEnvironment; label: string }[]> {
        const result: { env: AgentEnvironment; label: string }[] = [
            { env: { kind: 'native' }, label: this.nativeLabel() },
        ];
        const distros = await this.detector.getDistrosWithTest(this.options.wslTest);
        for (const distro of distros)
            result.push({ env: { kind: 'wsl', distro: distro.distro }, label: distro.distro });
        return result;
    }

    private extract(field: SettingsFieldSpec, root: Record<string, unknown>): SettingsFieldValue {
        if (field.type === 'directEdit') return undefined;
        const value = root[field.path];
        if (field.type === 'boolean') return typeof value === 'boolean' ? value : undefined;
        if (field.type === 'number') return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
        return typeof value === 'string' ? value : undefined;
    }

    async read(env: AgentEnvironment): Promise<SettingsReadResult> {
        const fs = this.fsFor(env);
        const raw = await fs.readText(this.options.configRel);
        let root: Record<string, unknown> = {};
        if (raw !== null && raw.trim().length > 0) root = parseJsoncObject(raw);
        const values: Record<string, SettingsFieldValue> = {};
        for (const field of this.options.fields) values[field.key] = this.extract(field, root);
        return {
            env,
            label: env.kind === 'wsl' ? (env.distro ?? 'WSL') : this.nativeLabel(),
            available: true,
            exists: raw !== null,
            values,
            fields: this.options.fields,
            raw: raw ?? `${JSON.stringify(this.options.initial ?? {}, null, 2)}\n`,
        };
    }

    private normalize(field: SettingsFieldSpec, value: SettingsFieldValue): SettingsFieldValue {
        if (field.type === 'number' && typeof value === 'number' && Number.isFinite(value)) {
            let next = value;
            if (field.min !== undefined) next = Math.max(field.min, next);
            if (field.max !== undefined) next = Math.min(field.max, next);
            return field.integer ? Math.trunc(next) : next;
        }
        if (field.type === 'boolean' && typeof value === 'boolean') return value;
        if (field.type === 'string' && typeof value === 'string' && value.length > 0) return value;
        return undefined;
    }

    async write(env: AgentEnvironment, values: SettingsValues): Promise<SettingsWriteResult> {
        const fs = this.fsFor(env);
        const existing = await fs.readText(this.options.configRel);
        let text = existing ?? `${JSON.stringify(this.options.initial ?? {}, null, 2)}\n`;
        try {
            parseJsoncObject(text);
        } catch {
            return { ok: false, message: 'invalid-existing-json' };
        }
        for (const field of this.options.fields) {
            if (field.type === 'directEdit' || !Object.prototype.hasOwnProperty.call(values, field.key)) continue;
            const value = this.normalize(field, values[field.key]);
            text =
                value === undefined
                    ? deleteTopLevelJsoncProperty(text, field.path)
                    : setTopLevelJsoncProperty(text, field.path, value);
        }
        try {
            await fs.writeText(this.options.configRel, text.endsWith('\n') ? text : `${text}\n`);
            return { ok: true };
        } catch (error) {
            console.error(`Failed to write JSON settings (${JSON.stringify(env)}):`, error);
            return { ok: false, message: 'write-failed' };
        }
    }

    async writeRaw(env: AgentEnvironment, raw: string): Promise<SettingsWriteResult> {
        try {
            parseJsoncObject(raw);
        } catch {
            return { ok: false, message: 'invalid-json' };
        }
        try {
            await this.fsFor(env).writeText(this.options.configRel, raw.endsWith('\n') ? raw : `${raw}\n`);
            return { ok: true };
        } catch (error) {
            console.error(`Failed to write raw JSON settings (${JSON.stringify(env)}):`, error);
            return { ok: false, message: 'write-failed' };
        }
    }
}
