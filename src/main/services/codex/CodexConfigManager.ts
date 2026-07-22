import { parse } from 'smol-toml';
import { CODEX_CONFIG_REL, CODEX_WSL_CLI_TEST, SETTINGS_FIELDS } from '../../../shared/agents/codex/constants';
import {
    CodexEnvironment,
    OSType,
    SettingsFieldSpec,
    SettingsFieldValue,
    SettingsReadResult,
    SettingsValues,
    SettingsWriteResult,
} from '../../../shared/agents/codex/types';
import { HomeFs } from '../common/wsl/HomeFs';
import { WslDetector } from '../common/wsl/WslDetector';
import { deleteScalar, getScalar, setScalar } from '../../utils/tomlEdit';
import { deepEqualLoose, deleteNestedValue, setNestedValue, withoutEmptyObjects } from '../../utils/nestedValue';

/**
 * Codex CLI の設定ファイル ~/.codex/config.toml を管理する。
 *
 * 設計の要点:
 * - 編集対象は SETTINGS_FIELDS（registry）のうち directEdit 以外で宣言した項目のみ。
 *   directEdit は一覧表示専用で、テーブル保存では構造値に一切触れない。
 * - テーブル保存（write）は tomlEdit の行スライスで対象キーだけを更新/削除する。他セクション・
 *   コメント・整形は保持する。
 * - 直接編集（writeRaw）は smol-toml の parse で構文検証後、生テキストをそのまま書き込む。
 *
 * native / WSL の両方に対応する（HomeFs が native 絶対パス / WSL UNC / コマンドモードを吸収する）。
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
    async getEnvironments(): Promise<{ env: CodexEnvironment; label: string }[]> {
        const result: { env: CodexEnvironment; label: string }[] = [];
        result.push({ env: { kind: 'native' }, label: this.nativeLabel() });
        const distros = await this.detector.getDistrosWithTest(CODEX_WSL_CLI_TEST);
        for (const d of distros) {
            result.push({ env: { kind: 'wsl', distro: d.distro }, label: d.distro });
        }
        return result;
    }

    /**
     * 指定環境の config.toml を読み、登録項目の現在値と生 TOML を返す。
     * ファイルが無い場合は exists=false・raw=null・値は未設定（undefined）。
     */
    async read(env: CodexEnvironment): Promise<SettingsReadResult> {
        const label = env.kind === 'wsl' ? (env.distro ?? '') : this.nativeLabel();
        const fs = this.fsFor(env);

        const raw = await fs.readText(CODEX_CONFIG_REL);
        const exists = raw !== null;
        const text = raw ?? '';

        const values: Record<string, SettingsFieldValue> = {};
        for (const field of SETTINGS_FIELDS) {
            values[field.key] = this.extractValue(field, text);
        }

        return { env, label, available: true, exists, values, fields: SETTINGS_FIELDS, raw: raw };
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
     * テーブル編集の保存。既存 TOML に対し、登録項目だけを行スライスで反映する。
     * 値が undefined / 空文字なら削除、それ以外は型に応じて設定する。
     *
     * 安全弁: 編集後 TOML の parse 結果が「編集前の parse 結果へ意図した変更を適用した
     * 期待モデル」と deep 一致することを検証し、一致しない場合はファイルを書かずに失敗を返す。
     * （dotted key 記法やインラインテーブルで書かれた既存値との衝突はここで検出される。）
     */
    async write(env: CodexEnvironment, values: SettingsValues): Promise<SettingsWriteResult> {
        const fs = this.fsFor(env);
        let text = (await fs.readText(CODEX_CONFIG_REL)) ?? '';

        const expected: Record<string, unknown> = {};
        if (text.trim().length > 0) {
            try {
                Object.assign(expected, parse(text));
            } catch {
                return { ok: false, message: 'invalid-existing-toml' };
            }
        }

        for (const field of SETTINGS_FIELDS) {
            if (!Object.prototype.hasOwnProperty.call(values, field.key)) continue;
            text = this.applyField(text, expected, field, values[field.key]);
        }

        // 検証: 編集後 TOML が期待モデルと一致しなければ書き込まない（空テーブルは無視して比較）。
        try {
            if (!deepEqualLoose(withoutEmptyObjects(parse(text)), withoutEmptyObjects(expected))) {
                console.error(`Config edit verification mismatch (${JSON.stringify(env)})`);
                return { ok: false, message: 'verify-failed' };
            }
        } catch (error) {
            console.error(`Config edit verification parse error (${JSON.stringify(env)}):`, error);
            return { ok: false, message: 'verify-failed' };
        }

        try {
            await fs.writeText(CODEX_CONFIG_REL, text);
            return { ok: true };
        } catch (error) {
            console.error(`Failed to write config.toml (${JSON.stringify(env)}):`, error);
            return { ok: false, message: 'write-failed' };
        }
    }

    /** 1 項目をテキストと期待モデルの両方へ反映し、更新後テキストを返す。 */
    private applyField(
        text: string,
        model: Record<string, unknown>,
        field: SettingsFieldSpec,
        value: SettingsFieldValue
    ): string {
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
            if (typeof value === 'number' && Number.isFinite(value)) {
                let n = value;
                if (typeof field.min === 'number' && n < field.min) {
                    n = field.min;
                }
                if (typeof field.max === 'number' && n > field.max) {
                    n = field.max;
                }
                if (field.integer) n = Math.trunc(n);
                resolved = n;
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
     * 直接編集の保存。生 TOML を構文チェックしてそのまま書き込む。
     */
    async writeRaw(env: CodexEnvironment, raw: string): Promise<SettingsWriteResult> {
        try {
            parse(raw);
        } catch {
            return { ok: false, message: 'invalid-toml' };
        }

        const fs = this.fsFor(env);
        const content = raw.endsWith('\n') ? raw : `${raw}\n`;
        try {
            await fs.writeText(CODEX_CONFIG_REL, content);
            return { ok: true };
        } catch (error) {
            console.error(`Failed to write config.toml raw (${JSON.stringify(env)}):`, error);
            return { ok: false, message: 'write-failed' };
        }
    }
}
