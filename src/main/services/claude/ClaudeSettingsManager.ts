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
    SettingsReadResult,
    SettingsValues,
    SettingsWriteResult,
} from '../../../shared/agents/claude/types';
import { HomeFs } from '../common/wsl/HomeFs';
import { WslDetector } from '../common/wsl/WslDetector';
import { deleteJsoncProperty, parseJsonc, setJsoncProperty } from '../../utils/jsoncEdit';
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
 * - テーブル保存（write）は、既存 JSON を読み込んでから登録項目だけを差分マージで反映する。
 *   - string / boolean: 値があればキーを設定、未設定（undefined / 空文字）ならキーを削除する。
 *   - envFlag（env 内の特定キー）: ON で env[envKey] = onValue（既定 '1'）を設定、OFF で当該キーを削除する。
 *     env 内の他キーには触れず、env が空になったら env キーごと削除する。
 * - 直接編集（writeRaw）は、構文チェック後に生 JSON テキストをそのまま書き込む（全責任はユーザー）。
 *
 * native / WSL の両方に対応する（HomeFs が native 絶対パス / WSL UNC / コマンドモードを吸収する）。
 * 実 OS パスへ到達できない WSL コマンドモードでも、readJson/writeText はコマンド経由で動作する。
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

    /** 管理対象の環境一覧（native + Claude 入り WSL distro）。AssetManager と同じ並び。 */
    async getEnvironments(): Promise<{ env: ClaudeEnvironment; label: string }[]> {
        const result: { env: ClaudeEnvironment; label: string }[] = [];
        result.push({ env: { kind: 'native' }, label: this.nativeLabel() });
        const distros = await this.detector.getDistrosWithTest(CLAUDE_WSL_CLI_TEST);
        for (const d of distros) {
            result.push({ env: { kind: 'wsl', distro: d.distro }, label: d.distro });
        }
        return result;
    }

    /**
     * 指定環境の settings.json を読み、登録項目の現在値と生 JSON を返す。
     * ファイルが無い場合は exists=false・values は型既定（envMap={}, それ以外 undefined）・raw=null。
     */
    async read(env: ClaudeEnvironment): Promise<SettingsReadResult> {
        const label = env.kind === 'wsl' ? (env.distro ?? '') : this.nativeLabel();
        const fs = this.fsFor(env);
        const rel = this.settingsRel();

        const raw = await fs.readText(rel);
        const exists = raw !== null;

        let parsed: Record<string, unknown> = {};
        if (exists) {
            try {
                const obj = parseJsonc(raw);
                if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
                    parsed = obj as Record<string, unknown>;
                }
            } catch {
                // 壊れた JSON の場合は値抽出を諦め、空として扱う（直接編集で修正可能）。
                parsed = {};
            }
        }

        const values: Record<string, SettingsFieldValue> = {};
        for (const field of SETTINGS_FIELDS) {
            values[field.key] = this.extractValue(field, getNestedValue(parsed, field.path.split('.')));
        }

        return { env, label, available: true, exists, values, fields: SETTINGS_FIELDS, raw: raw };
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
     * コメント・空行・インデント・キー順など、対象外の文字列は一切変更しない。
     *
     * 安全弁: 編集後テキストの parse 結果が「編集前の parse 結果へ意図した変更を適用した
     * 期待モデル」と deep 一致することを検証し、一致しない場合はファイルを書かずに失敗を返す。
     */
    async write(env: ClaudeEnvironment, values: SettingsValues): Promise<SettingsWriteResult> {
        const fs = this.fsFor(env);
        const rel = this.settingsRel();

        // 既存ファイルを読み込む（壊れている場合は安全のため上書きを拒否する）。
        const raw = await fs.readText(rel);
        let text = raw ?? '';
        const expected: Record<string, unknown> = {};
        if (text.trim().length > 0) {
            try {
                const parsed = parseJsonc(text);
                if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                    return { ok: false, message: 'invalid-existing-json' };
                }
                Object.assign(expected, parsed as Record<string, unknown>);
            } catch (error) {
                console.error(`Failed to parse existing settings.json (${JSON.stringify(env)}):`, error);
                return { ok: false, message: 'invalid-existing-json' };
            }
        } else {
            text = '{}\n';
        }

        // 登録項目だけをテキストと期待モデルの両方へ反映する。
        for (const field of SETTINGS_FIELDS) {
            if (!Object.prototype.hasOwnProperty.call(values, field.key)) continue;
            text = this.applyField(text, expected, field, values[field.key]);
        }

        // 検証: 編集後テキストが期待モデルと一致しなければ書き込まない。
        // 空オブジェクトは正規化で無視する（コメントだけが残った親はテキスト側に {} として残るため）。
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
            await fs.writeText(rel, text.endsWith('\n') ? text : `${text}\n`);
            return { ok: true };
        } catch (error) {
            console.error(`Failed to write settings.json (${JSON.stringify(env)}):`, error);
            return { ok: false, message: 'write-failed' };
        }
    }

    /**
     * 1 項目をテキストと期待モデルの両方へ反映し、更新後テキストを返す。
     * 値の設定/削除は path（ドット区切り、envFlag は末尾に envKey を連結）への操作に正規化する。
     */
    private applyField(
        text: string,
        model: Record<string, unknown>,
        field: SettingsFieldSpec,
        value: SettingsFieldValue
    ): string {
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
            // 未設定（undefined / 非数）はキー削除。数値は min/max でクランプして設定する。
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

        if (resolved === undefined) {
            deleteNestedValue(model, path, true);
            return deleteJsoncProperty(text, path);
        }
        setNestedValue(model, path, resolved);
        return setJsoncProperty(text, path, resolved);
    }

    /**
     * 直接編集の保存。生 JSON テキストを構文チェックしてそのまま書き込む。
     * 内容の妥当性（登録外項目の整合など）はユーザー責任とし、構文だけ検証する。
     */
    async writeRaw(env: ClaudeEnvironment, raw: string): Promise<SettingsWriteResult> {
        let parsed: unknown;
        try {
            parsed = JSON.parse(raw);
        } catch {
            return { ok: false, message: 'invalid-json' };
        }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return { ok: false, message: 'invalid-json' };
        }

        const fs = this.fsFor(env);
        const rel = this.settingsRel();
        // 末尾改行を保証しつつ、ユーザーの整形（インデント等）はそのまま尊重する。
        const content = raw.endsWith('\n') ? raw : `${raw}\n`;
        try {
            await fs.writeText(rel, content);
            return { ok: true };
        } catch (error) {
            console.error(`Failed to write settings.json raw (${JSON.stringify(env)}):`, error);
            return { ok: false, message: 'write-failed' };
        }
    }
}
