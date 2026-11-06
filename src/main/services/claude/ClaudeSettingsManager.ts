import {
    CLAUDE_CODE_SETTINGS_FILENAME,
    CLAUDE_DIR,
    CLAUDE_WSL_CLI_TEST,
    SETTINGS_FIELDS,
} from '../../../shared/agents/claude/constants';
import {
    ClaudeEnvironment,
    OSType,
    SettingsFieldSpec,
    SettingsFieldValue,
    SettingsParseError,
    SettingsRawResult,
    SettingsReadResult,
    SettingsValues,
    SettingsWriteResult,
} from '../../../shared/agents/claude/types';
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
import { deleteJsoncProperty, JSON_ROOT_ERROR, jsonSyntaxProblem, setJsoncProperty } from '../../utils/jsoncEdit';
import {
    deepEqualLoose,
    deleteNestedValue,
    getNestedValue,
    setNestedValue,
    withoutEmptyObjects,
} from '../../utils/nestedValue';

/**
 * Claude Code (CLI) の設定ファイル ~/.claude/settings.json を管理する。
 *
 * 設計の要点:
 * - 編集対象は SETTINGS_FIELDS（registry）のうち directEdit 以外で宣言した項目のみ。
 *   directEdit は一覧表示専用で、テーブル保存では構造値に一切触れない。
 * - テーブル保存（write）は、既存 JSON を厳密に読み込んでから登録項目だけを差分マージで反映する。
 *   読めないファイルは read-failed、CLI が読めない内容（コメントや末尾カンマを含む）は invalid-existing-json を返し、何も書かない。
 *   - string / boolean: 値があればキーを設定、未設定（undefined / 空文字）ならキーを削除する。
 *   - envFlag（env 内の特定キー）: ON で env[envKey] = onValue（既定 '1'）を設定、OFF で当該キーを削除する。
 *     env 内の他キーには触れず、env が空になったら env キーごと削除する。
 * - 直接編集（writeRaw）は、読み込んだ後にファイルが変わっていないことと JSON の構文を確かめて書き込む。
 *   内容の妥当性はユーザー責任とする。
 *
 * native / WSL の両方に対応する（HomeFs が native 絶対パス / WSL の distro 内スクリプトを吸収する）。
 */
export class ClaudeSettingsManager {
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

    private fsFor(env: ClaudeEnvironment): HomeFs {
        return new HomeFs(env, this.detector);
    }

    /** settings.json の HOME 相対パス（'.claude/settings.json'）。 */
    private settingsRel(): string {
        return `${CLAUDE_DIR}/${CLAUDE_CODE_SETTINGS_FILENAME}`;
    }

    /** 管理対象の環境一覧（native + Claude 入り WSL distro）。refresh なら WSL distro の検出結果を破棄して検出し直す。 */
    async getEnvironments(refresh = false): Promise<{ env: ClaudeEnvironment; label: string }[]> {
        if (refresh) this.detector.invalidate();
        const result: { env: ClaudeEnvironment; label: string }[] = [];
        result.push({ env: { kind: 'native' }, label: this.nativeLabel() });
        const distros = await this.detector.getDistrosWithTest(CLAUDE_WSL_CLI_TEST);
        for (const d of distros) {
            result.push({ env: { kind: 'wsl', distro: d.distro }, label: d.distro });
        }
        return result;
    }

    /**
     * 指定環境の settings.json を読み、登録項目の現在値を返す。
     * ファイルが無い場合は exists=false・values は型既定（envMap={}, それ以外 undefined）。
     * 読めないファイルは readFailed、CLI が読めない内容（コメントや末尾カンマを含む）は parseError を付けて返す。
     */
    async read(env: ClaudeEnvironment): Promise<SettingsReadResult> {
        const label = env.kind === 'wsl' ? (env.distro ?? '') : this.nativeLabel();
        const base = { env, label, available: true, fields: SETTINGS_FIELDS };

        let file: ConfigFile;
        try {
            file = await readConfigFile(this.fsFor(env), this.settingsRel());
        } catch (error) {
            return { ...base, exists: true, values: this.valuesOf({}), readFailed: failureDetail(error) };
        }

        let parsed: Record<string, unknown> = {};
        let parseError: SettingsParseError | undefined;
        if (file.text.trim().length > 0) {
            try {
                parsed = this.parseStrictRoot(file.text);
            } catch (error) {
                parseError = jsonSyntaxProblem(error, file.text);
            }
        }

        return {
            ...base,
            exists: file.exists,
            values: this.valuesOf(parsed),
            ...(parseError ? { parseError } : {}),
        };
    }

    /** 直接編集のために settings.json の全文（先頭の BOM は除く）を読む。ファイルが無ければ raw は null。 */
    async readRaw(env: ClaudeEnvironment): Promise<SettingsRawResult> {
        try {
            const file = await readConfigFile(this.fsFor(env), this.settingsRel());
            return rawResultOf(file, file.exists ? file.text : null);
        } catch (error) {
            return unreadableRawResult(error);
        }
    }

    /** テキストを厳密な JSON として解釈する。オブジェクト以外のルートは例外を投げる。 */
    private parseStrictRoot(text: string): Record<string, unknown> {
        const parsed: unknown = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error(JSON_ROOT_ERROR);
        }
        return parsed as Record<string, unknown>;
    }

    private valuesOf(parsed: Record<string, unknown>): Record<string, SettingsFieldValue> {
        const values: Record<string, SettingsFieldValue> = {};
        for (const field of SETTINGS_FIELDS) {
            values[field.key] = this.extractValue(field, getNestedValue(parsed, field.path.split('.')));
        }
        return values;
    }

    /** registry の定義に応じて settings.json から値を抽出する。 */
    private extractValue(field: SettingsFieldSpec, raw: unknown): SettingsFieldValue {
        if (field.type === 'directEdit') {
            return undefined;
        }
        if (field.type === 'envFlag') {
            // 既定の ON 値は true、未知の保存値は文字列のまま返して表示・保持する。
            if (raw && typeof raw === 'object' && !Array.isArray(raw) && field.envKey) {
                const value = (raw as Record<string, unknown>)[field.envKey];
                if (value === undefined) return false;
                if (value === (field.onValue ?? '1')) return true;
                return typeof value === 'string' ? value : String(value);
            }
            return false;
        }
        if (field.type === 'boolean') {
            return typeof raw === 'boolean' ? raw : undefined;
        }
        if (field.type === 'number') {
            // 数値以外（キーが無い場合の undefined を含む）は未設定として扱う。
            return typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined;
        }
        if (field.type === 'enum') {
            // 型混在候補。scalar（boolean / 有限数 / 文字列）はそのまま、それ以外は未設定扱い。
            return typeof raw === 'boolean' ||
                typeof raw === 'string' ||
                (typeof raw === 'number' && Number.isFinite(raw))
                ? raw
                : undefined;
        }
        // string
        return typeof raw === 'string' ? raw : undefined;
    }

    /**
     * テーブル編集の保存。既存テキストへ登録項目だけを外科的に反映して書き戻す。
     * 空行・インデント・キー順・改行コード・BOM など、対象外の文字列は変更しない。
     * 保存する項目の現在の値が読み込んだ時点の値（base）と違えば、conflict を返して何も書かない。他の項目の変更はそのまま残す。
     *
     * 安全弁: 編集後テキストの parse 結果が「編集前の parse 結果へ意図した変更を適用した
     * 期待モデル」と deep 一致することを検証し、一致しない場合はファイルを書かずに失敗を返す。
     */
    async write(env: ClaudeEnvironment, values: SettingsValues, base: SettingsValues): Promise<SettingsWriteResult> {
        const fs = this.fsFor(env);
        const rel = this.settingsRel();

        // 既存ファイルを読み込む（読めない場合と壊れている場合は安全のため上書きを拒否する）。
        let file: ConfigFile;
        try {
            file = await readConfigFile(fs, rel);
        } catch (error) {
            return saveFailure(error, rel);
        }
        let text = file.text;
        const expected: Record<string, unknown> = {};
        if (text.trim().length > 0) {
            try {
                Object.assign(expected, this.parseStrictRoot(text));
            } catch (error) {
                console.error(`Failed to parse existing settings.json (${JSON.stringify(env)}):`, error);
                return { ok: false, message: 'invalid-existing-json' };
            }
        } else {
            text = `{}${file.eol}`;
        }
        const stale = staleSettingsKeys(values, base, this.valuesOf(expected));
        if (stale.length > 0) return conflictResult(stale);

        // 登録項目だけをテキストと期待モデルの両方へ反映する。受け付けない値があれば何も書かない。
        for (const field of SETTINGS_FIELDS) {
            if (!Object.prototype.hasOwnProperty.call(values, field.key)) continue;
            const result = this.applyField(text, expected, field, values[field.key]);
            if (result === null) {
                return { ok: false, message: 'invalid-value' };
            }
            text = result;
        }

        // 検証: 編集後テキストが期待モデルと一致しなければ書き込まない。
        // 空オブジェクトは正規化で無視する（コメントだけが残った親はテキスト側に {} として残るため）。
        try {
            if (!deepEqualLoose(withoutEmptyObjects(JSON.parse(text)), withoutEmptyObjects(expected))) {
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
     * 1 項目をテキストと期待モデルの両方へ反映し、更新後テキストを返す。
     * 値の設定/削除は path（ドット区切り、envFlag は末尾に envKey を連結）への操作に正規化する。
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
        let path = field.path.split('.');
        let resolved: unknown;
        if (field.type === 'envFlag') {
            // env オブジェクト内の対象キー（envKey）のみを操作する。
            // ON: env[envKey] = onValue（既定 '1'）。OFF: 当該キーを削除（env が空になれば env ごと削除）。
            if (!field.envKey) {
                return text;
            }
            path = [...path, field.envKey];
            if (value === true) {
                resolved = field.onValue ?? '1';
            } else if (typeof value === 'string' && value.length > 0) {
                resolved = value;
            } else {
                resolved = undefined;
            }
        } else if (field.type === 'boolean') {
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

        if (resolved === undefined) {
            deleteNestedValue(model, path, true);
            return deleteJsoncProperty(text, path);
        }
        setNestedValue(model, path, resolved);
        return setJsoncProperty(text, path, resolved);
    }

    /**
     * 直接編集の保存。baseRevision は読み込んだ時点の revision で、ファイルが変わっていれば conflict を返す。
     * 改行はファイルの改行へ揃え、厳密な JSON の構文だけを検証する。内容の妥当性（登録外項目の整合など）はユーザー責任とする。
     */
    async writeRaw(env: ClaudeEnvironment, input: string, baseRevision: string): Promise<SettingsWriteResult> {
        return saveDirectEdit(this.fsFor(env), this.settingsRel(), input, baseRevision, text => {
            try {
                this.parseStrictRoot(text);
                return null;
            } catch {
                return 'invalid-json';
            }
        });
    }
}
