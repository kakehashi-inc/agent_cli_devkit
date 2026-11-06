import { CODEX_CONFIG_REL, CODEX_WSL_CLI_TEST, SETTINGS_FIELDS } from '../../../shared/agents/codex/constants';
import {
    CodexEnvironment,
    OSType,
    SettingsFieldSpec,
    SettingsFieldValue,
    SettingsRawResult,
    SettingsReadResult,
    SettingsValues,
    SettingsWriteResult,
} from '../../../shared/agents/codex/types';
import { settingsValueProblem } from '../../../shared/agents/settingsValue';
import {
    conflictResult,
    failureDetail,
    rawResultOf,
    readConfigFile,
    saveConfigText,
    saveDirectEdit,
    saveFailure,
    staleSettingsKeys,
    unreadableRawResult,
    withFinalEol,
    type ConfigFile,
} from '../common/fs/configFile';
import { HomeFs } from '../common/wsl/HomeFs';
import { WslDetector } from '../common/wsl/WslDetector';
import { deleteScalar, getScalar, setScalar } from '../../utils/tomlEdit';
import { parseToml, tomlSyntaxProblem } from '../../utils/tomlSubtree';
import { deepEqualLoose, deleteNestedValue, setNestedValue, withoutEmptyObjects } from '../../utils/nestedValue';

/**
 * Codex CLI の設定ファイル ~/.codex/config.toml を管理する。
 *
 * 設計の要点:
 * - 編集対象は SETTINGS_FIELDS（registry）のうち directEdit 以外で宣言した項目のみ。
 *   directEdit は一覧表示専用で、テーブル保存では構造値に一切触れない。
 * - テーブル保存（write）は tomlEdit の文の走査で対象キーの範囲だけを更新/削除する。他セクション・
 *   コメント・整形・改行コード・BOM は保持する。読めないファイルは read-failed、TOML として読めないファイルは
 *   invalid-existing-toml を返し、何も書かない。
 * - 直接編集（writeRaw）は、読み込んだ後にファイルが変わっていないことと TOML の構文を確かめて書き込む。
 *
 * native / WSL の両方に対応する（HomeFs が native 絶対パス / WSL の distro 内スクリプトを吸収する）。
 */
export class CodexConfigManager {
    private readonly detector: WslDetector;

    constructor(detector: WslDetector) {
        this.detector = detector;
    }

    private nativeLabel(): string {
        const platform = process.platform as OSType;
        if (platform === 'win32') return 'Windows';
        if (platform === 'darwin') return 'macOS';
        return 'Linux';
    }

    private fsFor(env: CodexEnvironment): HomeFs {
        return new HomeFs(env, this.detector);
    }

    /** 管理対象の環境一覧（native + Codex 入り WSL distro）。 */
    async getEnvironments(refresh = false): Promise<{ env: CodexEnvironment; label: string }[]> {
        if (refresh) this.detector.invalidate();
        const result: { env: CodexEnvironment; label: string }[] = [];
        result.push({ env: { kind: 'native' }, label: this.nativeLabel() });
        const distros = await this.detector.getDistrosWithTest(CODEX_WSL_CLI_TEST);
        for (const d of distros) {
            result.push({ env: { kind: 'wsl', distro: d.distro }, label: d.distro });
        }
        return result;
    }

    /**
     * 指定環境の config.toml を読み、登録項目の現在値を返す。ファイルの全文は返さない。
     * ファイルが無い場合は exists=false・値は未設定（undefined）。
     * 読めないファイルは readFailed、TOML として読めない内容は parseError を付けて返す。
     */
    async read(env: CodexEnvironment): Promise<SettingsReadResult> {
        const label = env.kind === 'wsl' ? (env.distro ?? '') : this.nativeLabel();
        const base = { env, label, available: true, fields: SETTINGS_FIELDS };

        let file: ConfigFile;
        try {
            file = await readConfigFile(this.fsFor(env), CODEX_CONFIG_REL);
        } catch (error) {
            return { ...base, exists: true, values: this.valuesOf(''), readFailed: failureDetail(error) };
        }

        const parseError = tomlSyntaxProblem(file.text);
        return {
            ...base,
            exists: file.exists,
            values: this.valuesOf(file.text),
            ...(parseError ? { parseError } : {}),
        };
    }

    /** 直接編集のために config.toml の全文（先頭の BOM は除く）を読む。ファイルが無ければ raw は null。 */
    async readRaw(env: CodexEnvironment): Promise<SettingsRawResult> {
        try {
            const file = await readConfigFile(this.fsFor(env), CODEX_CONFIG_REL);
            return rawResultOf(file, file.exists ? file.text : null);
        } catch (error) {
            return unreadableRawResult(error);
        }
    }

    private valuesOf(text: string): Record<string, SettingsFieldValue> {
        const values: Record<string, SettingsFieldValue> = {};
        for (const field of SETTINGS_FIELDS) {
            values[field.key] = this.extractValue(field, text);
        }
        return values;
    }

    /** registry の定義に応じて config.toml から値を抽出する（型が合わなければ undefined）。 */
    private extractValue(field: SettingsFieldSpec, text: string): SettingsFieldValue {
        if (field.type === 'directEdit') {
            return undefined;
        }
        const value = getScalar(text, field.path);
        if (value === undefined) {
            return undefined;
        }
        if (field.type === 'boolean') {
            return typeof value === 'boolean' ? value : undefined;
        }
        if (field.type === 'number') {
            return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
        }
        if (field.type === 'enum') {
            // getScalar は scalar のみ返す。型混在候補はそのまま（boolean / number / string）表示する。
            return value;
        }
        // string
        return typeof value === 'string' ? value : undefined;
    }

    /**
     * テーブル編集の保存。既存 TOML に対し、登録項目の値の範囲だけを反映する。
     * 値が undefined / 空文字なら削除、それ以外は型に応じて設定する。空でないファイルは改行で終える。
     * 保存する項目の現在の値が読み込んだ時点の値（base）と違えば、conflict を返して何も書かない。他の項目の変更はそのまま残す。
     *
     * 安全弁: 編集後 TOML の parse 結果が「編集前の parse 結果へ意図した変更を適用した
     * 期待モデル」と deep 一致することを検証し、一致しない場合はファイルを書かずに失敗を返す。
     * （dotted key 記法やインラインテーブルで書かれた既存値との衝突はここで検出される。）
     */
    async write(env: CodexEnvironment, values: SettingsValues, base: SettingsValues): Promise<SettingsWriteResult> {
        const fs = this.fsFor(env);
        let file: ConfigFile;
        try {
            file = await readConfigFile(fs, CODEX_CONFIG_REL);
        } catch (error) {
            return saveFailure(error, CODEX_CONFIG_REL);
        }
        let text = file.text;

        const expected: Record<string, unknown> = {};
        if (text.trim().length > 0) {
            try {
                Object.assign(expected, parseToml(text));
            } catch {
                return { ok: false, message: 'invalid-existing-toml' };
            }
        }
        const stale = staleSettingsKeys(values, base, this.valuesOf(text));
        if (stale.length > 0) return conflictResult(stale);

        // 受け付けない値があれば何も書かない。
        for (const field of SETTINGS_FIELDS) {
            if (!Object.prototype.hasOwnProperty.call(values, field.key)) continue;
            const result = this.applyField(text, expected, field, values[field.key]);
            if (result === null) {
                return { ok: false, message: 'invalid-value' };
            }
            text = result;
        }

        // 検証: 編集後 TOML が期待モデルと一致しなければ書き込まない（空テーブルは無視して比較）。
        try {
            if (!deepEqualLoose(withoutEmptyObjects(parseToml(text)), withoutEmptyObjects(expected))) {
                console.error(`Config edit verification mismatch (${JSON.stringify(env)})`);
                return { ok: false, message: 'verify-failed' };
            }
        } catch (error) {
            console.error(`Config edit verification parse error (${JSON.stringify(env)}):`, error);
            return { ok: false, message: 'verify-failed' };
        }

        return saveConfigText(fs, file, withFinalEol(text, file.eol));
    }

    /**
     * 1 項目をテキストと期待モデルの両方へ反映し、更新後テキストを返す。
     * registry の制約を満たさない数値（範囲の外・数値として読めない値・整数項目の小数）は反映せず null を返す。
     */
    private applyField(
        text: string,
        model: Record<string, unknown>,
        field: SettingsFieldSpec,
        value: SettingsFieldValue
    ): string | null {
        if (field.type === 'directEdit') {
            return text;
        }
        let resolved: string | number | boolean | undefined;
        if (field.type === 'boolean') {
            resolved = typeof value === 'boolean' ? value : undefined;
        } else if (field.type === 'enum') {
            // 選択された候補の値を型のまま反映する。空文字は未設定として扱う。
            resolved =
                typeof value === 'boolean' ||
                typeof value === 'number' ||
                (typeof value === 'string' && value.length > 0)
                    ? value
                    : undefined;
        } else if (field.type === 'number') {
            // 数値以外（未設定）はキー削除。数値は registry の制約（範囲・整数）を満たすものだけをそのまま設定する。
            if (typeof value === 'number') {
                if (settingsValueProblem(field, value) !== null) {
                    return null;
                }
                resolved = value;
            } else {
                resolved = undefined;
            }
        } else {
            // string: 空文字 / undefined はキー削除、それ以外は設定。
            resolved = typeof value === 'string' && value.length > 0 ? value : undefined;
        }

        const path = field.path.split('.');
        if (resolved === undefined) {
            // TOML の削除は空になったテーブル見出しを残すため、期待モデルも親を残す。
            deleteNestedValue(model, path, false);
            return deleteScalar(text, field.path);
        }
        setNestedValue(model, path, resolved);
        return setScalar(text, field.path, resolved);
    }

    /**
     * 直接編集の保存。baseRevision は読み込んだ時点の revision で、ファイルが変わっていれば conflict を返す。
     * 改行はファイルの改行へ揃え、TOML の構文だけを検証する。
     */
    async writeRaw(env: CodexEnvironment, input: string, baseRevision: string): Promise<SettingsWriteResult> {
        return saveDirectEdit(this.fsFor(env), CODEX_CONFIG_REL, input, baseRevision, text =>
            tomlSyntaxProblem(text) ? 'invalid-toml' : null
        );
    }
}
