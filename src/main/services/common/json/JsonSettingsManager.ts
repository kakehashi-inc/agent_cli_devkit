import type {
    AgentEnvironment,
    OSType,
    SettingsFieldSpec,
    SettingsFieldValue,
    SettingsParseError,
    SettingsRawResult,
    SettingsReadResult,
    SettingsValues,
    SettingsWriteResult,
} from '../../../../shared/agents/types';
import { settingsValueProblem } from '../../../../shared/agents/settingsValue';
import {
    deleteJsoncProperty,
    jsonSyntaxProblem,
    parseJsonc,
    parseJsoncObject,
    setJsoncProperty,
} from '../../../utils/jsoncEdit';
import {
    deepEqualLoose,
    deleteNestedValue,
    getNestedValue,
    setNestedValue,
    withoutEmptyObjects,
} from '../../../utils/nestedValue';
import {
    conflictResult,
    failureDetail,
    normalizeEol,
    rawResultOf,
    readConfigFile,
    saveConfigText,
    saveDirectEdit,
    saveFailure,
    staleSettingsKeys,
    unreadableRawResult,
    withFinalEol,
    type ConfigFile,
} from '../fs/configFile';
import { HomeFs } from '../wsl/HomeFs';
import { WslDetector } from '../wsl/WslDetector';

interface Options {
    configRel: string;
    wslTest: string;
    // 指定すると、false を返す間は native 環境を一覧に出さない。
    nativeAvailable?: () => Promise<boolean>;
    wslAvailable?: (env: AgentEnvironment) => Promise<boolean>;
    fields: SettingsFieldSpec[];
    initial?: Record<string, unknown>;
    // 画面に見せる現在の値を、ファイルの内容から補正する。保存時の値の比較も補正した値で行う。
    displayValues?: (
        root: Record<string, unknown>,
        values: Record<string, SettingsFieldValue>
    ) => Record<string, SettingsFieldValue>;
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
        for (const distro of distros) {
            const env: AgentEnvironment = { kind: 'wsl', distro: distro.distro };
            if (!this.options.wslAvailable || (await this.options.wslAvailable(env))) {
                result.push({ env, label: distro.distro });
            }
        }
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

    private resultBase(env: AgentEnvironment) {
        return {
            env,
            label: env.kind === 'wsl' ? (env.distro ?? 'WSL') : this.nativeLabel(),
            available: true,
            fields: this.options.fields,
        };
    }

    private valuesOf(root: Record<string, unknown>): Record<string, SettingsFieldValue> {
        const values: Record<string, SettingsFieldValue> = {};
        for (const field of this.options.fields) values[field.key] = this.extract(field, root);
        return values;
    }

    private displayValuesOf(root: Record<string, unknown>): Record<string, SettingsFieldValue> {
        const values = this.valuesOf(root);
        return this.options.displayValues ? this.options.displayValues(root, values) : values;
    }

    /** 設定ファイルを読めなかったときの読み取り結果。 */
    unreadable(env: AgentEnvironment, detail: string): SettingsReadResult {
        return { ...this.resultBase(env), exists: true, values: this.valuesOf({}), readFailed: detail };
    }

    /** 未作成のファイルと空白だけのファイルを保存するときの最初の内容。 */
    private initialText(): string {
        return `${JSON.stringify(this.options.initial ?? {}, null, 2)}\n`;
    }

    /** 設定ファイルを読み、登録項目の現在値を返す。読めないファイルは readFailed、構文が壊れている場合は parseError を付ける。 */
    async read(env: AgentEnvironment): Promise<SettingsReadResult> {
        let file: ConfigFile;
        try {
            file = await readConfigFile(this.fsFor(env), this.options.configRel);
        } catch (error) {
            return this.unreadable(env, failureDetail(error));
        }
        let root: Record<string, unknown> = {};
        let parseError: SettingsParseError | undefined;
        if (file.text.trim().length > 0) {
            try {
                root = parseJsoncObject(file.text);
            } catch (error) {
                parseError = jsonSyntaxProblem(error, file.text);
            }
        }
        return {
            ...this.resultBase(env),
            exists: file.exists,
            values: this.displayValuesOf(root),
            ...(parseError ? { parseError } : {}),
        };
    }

    /** 直接編集のために設定ファイルの全文（先頭の BOM は除く）を読む。ファイルが無ければ最初の内容を返す。 */
    async readRaw(env: AgentEnvironment): Promise<SettingsRawResult> {
        try {
            const file = await readConfigFile(this.fsFor(env), this.options.configRel);
            return rawResultOf(file, file.exists ? file.text : this.initialText());
        } catch (error) {
            return unreadableRawResult(error);
        }
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
     * コメント・空行・インデント・改行コード・BOM など対象外の文字列は保持する。ファイルが無いか空白だけなら initial から始める。
     * 読めないファイルは read-failed、解釈できないファイルは invalid-existing-json を返し、何も書かない。
     * registry の制約を満たさない値が含まれていれば、何も書かずに失敗を返す。
     * 保存する項目の現在の値が読み込んだ時点の値（base）と違えば、conflict を返して何も書かない。他の項目の変更はそのまま残す。
     *
     * 安全弁: 編集後テキストの parse 結果が「編集前の parse 結果へ意図した変更を適用した
     * 期待モデル」と deep 一致することを検証し、一致しない場合はファイルを書かずに失敗を返す。
     */
    async write(env: AgentEnvironment, values: SettingsValues, base: SettingsValues): Promise<SettingsWriteResult> {
        const fs = this.fsFor(env);
        let file: ConfigFile;
        try {
            file = await readConfigFile(fs, this.options.configRel);
        } catch (error) {
            return saveFailure(error, this.options.configRel);
        }
        let text = file.text.trim().length > 0 ? file.text : normalizeEol(this.initialText(), file.eol);
        const expected: Record<string, unknown> = {};
        try {
            Object.assign(expected, parseJsoncObject(text));
        } catch {
            return { ok: false, message: 'invalid-existing-json' };
        }
        const stale = staleSettingsKeys(values, base, this.displayValuesOf(expected));
        if (stale.length > 0) return conflictResult(stale);
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

        return saveConfigText(fs, file, withFinalEol(text, file.eol));
    }

    /**
     * 直接編集の保存。baseRevision は読み込んだ時点の revision で、ファイルが変わっていれば conflict を返す。
     * 改行はファイルの改行へ揃え、JSONC の構文だけを検証する。
     */
    async writeRaw(env: AgentEnvironment, input: string, baseRevision: string): Promise<SettingsWriteResult> {
        return saveDirectEdit(this.fsFor(env), this.options.configRel, input, baseRevision, text => {
            try {
                parseJsoncObject(text);
                return null;
            } catch {
                return 'invalid-json';
            }
        });
    }
}
