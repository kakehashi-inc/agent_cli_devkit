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
                const obj = JSON.parse(raw);
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
            values[field.key] = this.extractValue(field, parsed[field.path]);
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
        // string
        return typeof raw === 'string' ? raw : undefined;
    }

    /**
     * テーブル編集の保存。既存 JSON を読み込み、登録項目だけを差分マージして書き戻す。
     * 登録外のトップレベルキーには触れない。
     */
    async write(env: ClaudeEnvironment, values: SettingsValues): Promise<SettingsWriteResult> {
        const fs = this.fsFor(env);
        const rel = this.settingsRel();

        // 既存ファイルを読み込む（壊れている場合は安全のため上書きを拒否する）。
        const raw = await fs.readText(rel);
        let obj: Record<string, unknown> = {};
        if (raw !== null && raw.trim().length > 0) {
            try {
                const parsed = JSON.parse(raw);
                if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                    return { ok: false, message: 'invalid-existing-json' };
                }
                obj = parsed as Record<string, unknown>;
            } catch (error) {
                console.error(`Failed to parse existing settings.json (${JSON.stringify(env)}):`, error);
                return { ok: false, message: 'invalid-existing-json' };
            }
        }

        // 登録項目だけを反映する。
        for (const field of SETTINGS_FIELDS) {
            if (!Object.prototype.hasOwnProperty.call(values, field.key)) continue;
            this.applyField(obj, field, values[field.key]);
        }

        const content = `${JSON.stringify(obj, null, 2)}\n`;
        try {
            await fs.writeText(rel, content);
            return { ok: true };
        } catch (error) {
            console.error(`Failed to write settings.json (${JSON.stringify(env)}):`, error);
            return { ok: false, message: 'write-failed' };
        }
    }

    /** 1 項目を既存オブジェクトへ反映する（型ごとの上書き/削除ルール）。 */
    private applyField(obj: Record<string, unknown>, field: SettingsFieldSpec, value: SettingsFieldValue): void {
        if (field.type === 'directEdit') {
            return;
        }
        const path = field.path;
        if (field.type === 'envFlag') {
            // env オブジェクト内の対象キー（envKey）のみを操作する。
            // ON: env[envKey] = onValue（既定 '1'）を設定。OFF: 当該キーを削除。
            // env 内の他キーには触れず、env が空になったら env キーごと削除する。
            if (!field.envKey) {
                return;
            }
            const current = obj[path];
            const envObj: Record<string, unknown> =
                current && typeof current === 'object' && !Array.isArray(current)
                    ? (current as Record<string, unknown>)
                    : {};
            if (value === true) {
                envObj[field.envKey] = field.onValue ?? '1';
            } else if (typeof value === 'string' && value.length > 0) {
                envObj[field.envKey] = value;
            } else {
                delete envObj[field.envKey];
            }
            if (Object.keys(envObj).length === 0) {
                delete obj[path]; // env が空になったらキーごと削除（空オブジェクトを残さない）
            } else {
                obj[path] = envObj;
            }
            return;
        }
        if (field.type === 'boolean') {
            if (typeof value === 'boolean') {
                obj[path] = value;
            } else {
                delete obj[path];
            }
            return;
        }
        if (field.type === 'number') {
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
                obj[path] = n;
            } else {
                delete obj[path];
            }
            return;
        }
        // string: 空文字 / undefined はキー削除、それ以外は設定。
        if (typeof value === 'string' && value.length > 0) {
            obj[path] = value;
        } else {
            delete obj[path];
        }
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
