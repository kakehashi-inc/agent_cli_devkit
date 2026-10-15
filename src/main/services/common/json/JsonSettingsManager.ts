import type {
    AgentEnvironment,
    OSType,
    SettingsFieldSpec,
    SettingsFieldValue,
    SettingsReadResult,
    SettingsValues,
    SettingsWriteResult,
} from '../../../../shared/agents/types';
import { settingsValueProblem } from '../../../../shared/agents/settingsValue';
import { deleteJsoncProperty, parseJsonc, parseJsoncObject, setJsoncProperty } from '../../../utils/jsoncEdit';
import {
    deepEqualLoose,
    deleteNestedValue,
    getNestedValue,
    setNestedValue,
    withoutEmptyObjects,
} from '../../../utils/nestedValue';
import { HomeFs } from '../wsl/HomeFs';
import { WslDetector } from '../wsl/WslDetector';
import { stripBom } from './stripBom';

interface Options {
    configRel: string;
    wslTest: string;
    // 指定すると、false を返す間は native 環境を一覧に出さない。
    nativeAvailable?: () => Promise<boolean>;
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
        const result: { env: AgentEnvironment; label: string }[] = [];
        if (!this.options.nativeAvailable || (await this.options.nativeAvailable())) {
            result.push({ env: { kind: 'native' }, label: this.nativeLabel() });
        }
        const distros = await this.detector.getDistrosWithTest(this.options.wslTest);
        for (const distro of distros)
            result.push({ env: { kind: 'wsl', distro: distro.distro }, label: distro.distro });
        return result;
    }

    private extract(field: SettingsFieldSpec, root: Record<string, unknown>): SettingsFieldValue {
        if (field.type === 'directEdit') return undefined;
        const value = getNestedValue(root, field.path.split('.'));
        if (field.type === 'boolean') return typeof value === 'boolean' ? value : undefined;
        if (field.type === 'number') return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
        if (field.type === 'enum') {
            // 型混在候補。scalar（boolean / 有限数 / 文字列）はそのまま、それ以外は未設定扱い。
            return typeof value === 'boolean' ||
                typeof value === 'string' ||
                (typeof value === 'number' && Number.isFinite(value))
                ? value
                : undefined;
        }
        return typeof value === 'string' ? value : undefined;
    }

    /**
     * 設定ファイルを読み、登録項目の現在値と生テキスト（先頭の BOM は除く）を返す。
     * 構文が壊れている場合は値を未設定として扱い、生テキストは直接編集で直せるようそのまま返す。
     */
    async read(env: AgentEnvironment): Promise<SettingsReadResult> {
        const fs = this.fsFor(env);
        const raw = stripBom(await fs.readText(this.options.configRel));
        let root: Record<string, unknown> = {};
        if (raw !== null && raw.trim().length > 0) {
            try {
                root = parseJsoncObject(raw);
            } catch {
                root = {};
            }
        }
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

    /**
     * 保存する値を項目の型に合わせる。型に合わない値と空文字は未設定（キー削除）とする。
     * 数値は変換せずにそのまま返す（registry の制約は保存時に確認する）。
     */
    private normalize(field: SettingsFieldSpec, value: SettingsFieldValue): SettingsFieldValue {
        if (field.type === 'number') return typeof value === 'number' ? value : undefined;
        if (field.type === 'boolean' && typeof value === 'boolean') return value;
        if (field.type === 'enum') {
            // 選択された候補の値を型のまま保存する。空文字は未設定として扱う。
            return typeof value === 'boolean' ||
                typeof value === 'number' ||
                (typeof value === 'string' && value.length > 0)
                ? value
                : undefined;
        }
        if (field.type === 'string' && typeof value === 'string' && value.length > 0) return value;
        return undefined;
    }

    /**
     * テーブル編集の保存。既存テキストへ登録項目だけを外科的に反映して書き戻す。
     * コメント・空行・インデントなど対象外の文字列は保持する。ファイルが無いか空白だけなら initial から始める。
     * registry の制約を満たさない値が含まれていれば、何も書かずに失敗を返す。
     *
     * 安全弁: 編集後テキストの parse 結果が「編集前の parse 結果へ意図した変更を適用した
     * 期待モデル」と deep 一致することを検証し、一致しない場合はファイルを書かずに失敗を返す。
     */
    async write(env: AgentEnvironment, values: SettingsValues): Promise<SettingsWriteResult> {
        const fs = this.fsFor(env);
        const existing = stripBom(await fs.readText(this.options.configRel));
        let text =
            existing !== null && existing.trim().length > 0
                ? existing
                : `${JSON.stringify(this.options.initial ?? {}, null, 2)}\n`;
        const expected: Record<string, unknown> = {};
        try {
            Object.assign(expected, parseJsoncObject(text));
        } catch {
            return { ok: false, message: 'invalid-existing-json' };
        }
        for (const field of this.options.fields) {
            if (field.type === 'directEdit' || !Object.prototype.hasOwnProperty.call(values, field.key)) continue;
            const value = this.normalize(field, values[field.key]);
            if (settingsValueProblem(field, value) !== null) return { ok: false, message: 'invalid-value' };
            const path = field.path.split('.');
            if (value === undefined) {
                deleteNestedValue(expected, path, true);
                text = deleteJsoncProperty(text, path);
            } else {
                setNestedValue(expected, path, value);
                text = setJsoncProperty(text, path, value);
            }
        }

        // 検証: 編集後テキストが期待モデルと一致しなければ書き込まない（空オブジェクトは無視して比較）。
        try {
            if (!deepEqualLoose(withoutEmptyObjects(parseJsonc(text)), withoutEmptyObjects(expected))) {
                console.error(`Settings edit verification mismatch (${JSON.stringify(env)})`);
                return { ok: false, message: 'verify-failed' };
            }
        } catch (error) {
            console.error(`Settings edit verification parse error (${JSON.stringify(env)}):`, error);
            return { ok: false, message: 'verify-failed' };
        }

        try {
            await fs.writeText(this.options.configRel, text.endsWith('\n') ? text : `${text}\n`);
            return { ok: true };
        } catch (error) {
            console.error(`Failed to write JSON settings (${JSON.stringify(env)}):`, error);
            return { ok: false, message: 'write-failed' };
        }
    }

    async writeRaw(env: AgentEnvironment, input: string): Promise<SettingsWriteResult> {
        const raw = stripBom(input);
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
