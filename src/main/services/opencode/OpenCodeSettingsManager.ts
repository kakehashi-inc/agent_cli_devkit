import {
    OPENCODE_CONFIG_CANDIDATES_REL,
    OPENCODE_CONFIG_SCHEMA_URL,
    OPENCODE_WSL_CLI_TEST,
    SETTINGS_FIELDS,
} from '../../../shared/agents/opencode/constants';
import type {
    OpenCodeEnvironment,
    SettingsFieldValue,
    SettingsRawResult,
    SettingsReadResult,
    SettingsValues,
    SettingsWriteResult,
} from '../../../shared/agents/opencode/types';
import { parseJsoncObject } from '../../utils/jsoncEdit';
import { failureDetail, readConfigFile, saveFailure, unreadableRawResult } from '../common/fs/configFile';
import { JsonSettingsManager } from '../common/json/JsonSettingsManager';
import type { AgentCliRunner } from '../common/cli/AgentCliRunner';
import { HomeFs } from '../common/wsl/HomeFs';
import { WslDetector } from '../common/wsl/WslDetector';
import { openCodeCliAvailable } from './openCodeCli';
import { resolveOpenCodeSettingsRel } from './openCodeConfigFile';

const MODEL_KEY = 'model';
// オブジェクト形式の model が持てるキー。
const MODEL_OBJECT_KEYS = new Set(['providerID', 'model', 'variant']);

/**
 * 設定ファイル上の model の形。
 * - object: { providerID, model, variant? } を文字列表記（providerID/model#variant）へ変換できる。
 * - unsupported: 文字列・変換できるオブジェクト以外。表で編集すると内容が失われる。
 */
type ModelState = { kind: 'absent' | 'string' | 'unsupported' } | { kind: 'object'; text: string };

/** 文字列表記の各部分として使える値か（空でなく、禁止文字を含まない文字列）。 */
function isPart(value: unknown, forbidden: RegExp): value is string {
    return typeof value === 'string' && value.length > 0 && !forbidden.test(value);
}

function modelState(root: Record<string, unknown>): ModelState {
    if (!Object.prototype.hasOwnProperty.call(root, MODEL_KEY)) return { kind: 'absent' };
    const value = root[MODEL_KEY];
    if (typeof value === 'string') return { kind: 'string' };
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return { kind: 'unsupported' };
    const record = value as Record<string, unknown>;
    if (Object.keys(record).some(key => !MODEL_OBJECT_KEYS.has(key))) return { kind: 'unsupported' };
    const { providerID, model, variant } = record;
    if (!isPart(providerID, /[/#]/) || !isPart(model, /#/)) return { kind: 'unsupported' };
    if (variant !== undefined && !isPart(variant, /#/)) return { kind: 'unsupported' };
    return { kind: 'object', text: `${providerID}/${model}${variant === undefined ? '' : `#${variant}`}` };
}

/** 画面に見せる model の値。オブジェクト形式は文字列表記、編集できない形は未設定にする。 */
function withDisplayedModel(
    root: Record<string, unknown>,
    values: Record<string, SettingsFieldValue>
): Record<string, SettingsFieldValue> {
    const state = modelState(root);
    if (state.kind === 'object') return { ...values, [MODEL_KEY]: state.text };
    if (state.kind === 'unsupported') return { ...values, [MODEL_KEY]: undefined };
    return values;
}

/**
 * OpenCode のグローバル設定ファイル（opencode.json / opencode.jsonc。両方あれば OpenCode が値を優先する
 * opencode.jsonc）を環境ごとに解決して編集する。
 * model はオブジェクト形式でも文字列表記で表示し、利用者が値を変えて保存したときだけ文字列で上書きする。
 * 文字列表記へ変換できないオブジェクトなどは、表では読み取り専用（直接編集）として扱う。
 */
export class OpenCodeSettingsManager {
    constructor(
        private readonly detector: WslDetector,
        private readonly runner: AgentCliRunner
    ) {}

    private managerWith(configRel: string): JsonSettingsManager {
        return new JsonSettingsManager(this.detector, {
            configRel,
            wslTest: OPENCODE_WSL_CLI_TEST,
            nativeAvailable: () => openCodeCliAvailable(this.runner, { kind: 'native' }),
            wslAvailable: env => openCodeCliAvailable(this.runner, env),
            fields: SETTINGS_FIELDS,
            initial: { $schema: OPENCODE_CONFIG_SCHEMA_URL },
            displayValues: withDisplayedModel,
        });
    }

    private async configRel(env: OpenCodeEnvironment): Promise<string> {
        return resolveOpenCodeSettingsRel(new HomeFs(env, this.detector));
    }

    /** 設定ファイルの model の形。ファイルが無い・壊れている場合は absent とする。 */
    private parseModelState(text: string | null): ModelState {
        if (text === null || text.trim().length === 0) return { kind: 'absent' };
        try {
            return modelState(parseJsoncObject(text));
        } catch {
            return { kind: 'absent' };
        }
    }

    async getEnvironments(): Promise<{ env: OpenCodeEnvironment; label: string }[]> {
        return this.managerWith(OPENCODE_CONFIG_CANDIDATES_REL[0]).getEnvironments();
    }

    /**
     * 設定ファイルを読み、表の値と注記を返す。
     * opencode.jsonc を編集対象にしていて opencode.json もある場合は、OpenCode が両方を読み込み opencode.json だけに
     * ある設定も有効になる（表には出ない）ため、ファイル全体への注記を付ける。
     * ファイルの有無を確かめられない環境は readFailed を付けて返す。
     */
    async read(env: OpenCodeEnvironment): Promise<SettingsReadResult> {
        const fs = new HomeFs(env, this.detector);
        const [jsonRel, jsoncRel] = OPENCODE_CONFIG_CANDIDATES_REL;
        let rel: string;
        let jsonAlsoExists: boolean;
        try {
            rel = await resolveOpenCodeSettingsRel(fs);
            jsonAlsoExists = rel === jsoncRel && (await fs.exists(jsonRel));
        } catch (error) {
            return this.managerWith(jsonRel).unreadable(env, failureDetail(error));
        }
        const base = await this.managerWith(rel).read(env);
        const result: SettingsReadResult = jsonAlsoExists ? { ...base, fileNotice: 'notice.jsonAlsoExists' } : base;
        if (result.readFailed !== undefined || !result.exists) return result;
        let state: ModelState;
        try {
            state = this.parseModelState((await readConfigFile(fs, rel)).text);
        } catch (error) {
            return this.managerWith(rel).unreadable(env, failureDetail(error));
        }
        if (state.kind === 'object') {
            return { ...result, notices: { ...result.notices, [MODEL_KEY]: 'notice.modelObjectForm' } };
        }
        if (state.kind === 'unsupported') {
            return {
                ...result,
                fields: result.fields.map(field =>
                    field.key === MODEL_KEY ? { ...field, type: 'directEdit' as const } : field
                ),
                notices: { ...result.notices, [MODEL_KEY]: 'notice.modelUnsupported' },
            };
        }
        return result;
    }

    /** 直接編集のために設定ファイルの全文を読む。 */
    async readRaw(env: OpenCodeEnvironment): Promise<SettingsRawResult> {
        try {
            return await this.managerWith(await this.configRel(env)).readRaw(env);
        } catch (error) {
            return unreadableRawResult(error);
        }
    }

    async write(env: OpenCodeEnvironment, values: SettingsValues, base: SettingsValues): Promise<SettingsWriteResult> {
        let rel: string = OPENCODE_CONFIG_CANDIDATES_REL[0];
        const next = { ...values };
        try {
            rel = await this.configRel(env);
            if (Object.prototype.hasOwnProperty.call(next, MODEL_KEY)) {
                const file = await readConfigFile(new HomeFs(env, this.detector), rel);
                const state = this.parseModelState(file.exists ? file.text : null);
                // 読み取り専用の形と、オブジェクト形式を同じ内容のまま送られた場合は model に触れない。
                if (state.kind === 'unsupported' || (state.kind === 'object' && next[MODEL_KEY] === state.text))
                    delete next[MODEL_KEY];
            }
            return await this.managerWith(rel).write(env, next, base);
        } catch (error) {
            return saveFailure(error, rel);
        }
    }

    async writeRaw(env: OpenCodeEnvironment, raw: string, baseRevision: string): Promise<SettingsWriteResult> {
        let rel: string = OPENCODE_CONFIG_CANDIDATES_REL[0];
        try {
            rel = await this.configRel(env);
        } catch (error) {
            return saveFailure(error, rel);
        }
        return this.managerWith(rel).writeRaw(env, raw, baseRevision);
    }
}
