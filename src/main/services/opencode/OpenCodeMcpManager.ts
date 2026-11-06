import {
    OPENCODE_CONFIG_CANDIDATES_REL,
    OPENCODE_DISABLED_MCP_REL,
    OPENCODE_MCP_SERVERS_PATH,
    OPENCODE_WSL_CLI_TEST,
} from '../../../shared/agents/opencode/constants';
import type {
    MCPServerInfo,
    MCPServers,
    McpFileProblem,
    OpenCodeEnvironment,
    OpenCodeMcpEnvInfo,
    OSType,
} from '../../../shared/agents/opencode/types';
import { readJsoncScope, removeJsoncProperty, setJsoncRaw } from '../../utils/jsoncEdit';
import { mcpDisplayConfig } from '../../utils/mcpDisplayConfig';
import { deepEqualLoose, getNestedValue } from '../../utils/nestedValue';
import type { AgentCliRunner } from '../common/cli/AgentCliRunner';
import {
    commitConfigChanges,
    ConfigFileError,
    existsOrUnknown,
    fileError,
    problemOf,
    type ConfigChange,
} from '../common/fs/configFile';
import {
    guardEdit,
    jsonServerMap,
    readJsoncFile,
    reorderJsonEntries,
    sidecarChange,
    type JsonFileState,
} from '../common/json/jsonConfigFile';
import { HomeFs } from '../common/wsl/HomeFs';
import { WslDetector } from '../common/wsl/WslDetector';
import { openCodeCliAvailable } from './openCodeCli';
import { candidateRelOf, fileNameOf, resolveOpenCodeConfigRel } from './openCodeConfigFile';

// 無効化ファイルで、各サーバーの元のファイルを記録するトップレベルのキー。
// { origins: { <name>: { file: <実効の定義があったファイル名>, shadowed?: { <ファイル名>: <隠れていた定義> } } } }
const ORIGINS_KEY = 'origins';
const ORIGIN_FILE_KEY = 'file';
const ORIGIN_SHADOWED_KEY = 'shadowed';

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * OpenCode のグローバル設定ファイル（opencode.json と opencode.jsonc）の mcp.servers にある MCP サーバーを管理する。
 * - OpenCode は両方のファイルを候補順に読むので、一覧は両方を読み、実効の値を最後のファイルの定義とし、定義元を definedIn で返す。
 * - 無効化はフラグ（disabled）の書き換えではなく、定義のあるすべてのファイルからエントリを除く（1 つでも残ると有効なまま）。
 *   実効の定義を opencode-disabled-mcp.json の mcp.servers へ、元のファイル名と隠れていた定義を origins へ移す。
 * - 有効化は記録された元のファイルへ戻す。記録がなければ resolveOpenCodeConfigRel の最初の候補へ書く。
 * - 編集は対象のエントリの文字列だけに行い、mcp.timeout などサーバー以外の内容、コメント、整形を保つ。
 * - どれかのファイルの読み取りか解釈に失敗したら何も書かない。一覧は読めなかったファイルを problems で返す。
 */
export class OpenCodeMcpManager {
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

    async getEnvironments(): Promise<OpenCodeMcpEnvInfo[]> {
        const result: OpenCodeMcpEnvInfo[] = [];
        if (await openCodeCliAvailable(this.runner, { kind: 'native' })) {
            result.push(await this.envInfo({ kind: 'native' }, this.nativeLabel()));
        }
        for (const distro of await this.detector.getDistrosWithTest(OPENCODE_WSL_CLI_TEST)) {
            const env: OpenCodeEnvironment = { kind: 'wsl', distro: distro.distro };
            if (await openCodeCliAvailable(this.runner, env)) result.push(await this.envInfo(env, distro.distro));
        }
        return result;
    }

    /** configPath は存在する設定ファイルの表示パスをすべて並べる。どちらも無ければ最初の候補を示す。 */
    private async envInfo(env: OpenCodeEnvironment, label: string): Promise<OpenCodeMcpEnvInfo> {
        const fs = this.fsFor(env);
        const existing: string[] = [];
        for (const rel of OPENCODE_CONFIG_CANDIDATES_REL) {
            if (await existsOrUnknown(fs, rel)) existing.push(rel);
        }
        const shown = existing.length > 0 ? existing : [OPENCODE_CONFIG_CANDIDATES_REL[0]];
        const configPaths = await Promise.all(shown.map(rel => fs.displayPath(rel)));
        return {
            env,
            label,
            configPath: configPaths.join(', '),
            configExists: existing.length > 0,
            disabledConfigPath: await fs.displayPath(OPENCODE_DISABLED_MCP_REL),
        };
    }

    private serverPath(name: string): string[] {
        return [...OPENCODE_MCP_SERVERS_PATH, name];
    }

    /** すべての候補を候補順に読む。読めないか解釈できないファイルがあれば例外を投げる。 */
    private async readCandidates(fs: HomeFs): Promise<JsonFileState[]> {
        const states: JsonFileState[] = [];
        for (const rel of OPENCODE_CONFIG_CANDIDATES_REL) states.push(await readJsoncFile(fs, rel));
        return states;
    }

    private readDisabled(fs: HomeFs): Promise<JsonFileState> {
        return readJsoncFile(fs, OPENCODE_DISABLED_MCP_REL);
    }

    /** 退避中のサーバーの元のファイル名の一覧（実効の定義があったファイルを先頭にする）。記録がなければ空。 */
    private recordedFiles(root: Record<string, unknown>, name: string): string[] {
        const origin = getNestedValue(root, [ORIGINS_KEY, name]);
        if (!isRecord(origin) || candidateRelOf(origin[ORIGIN_FILE_KEY]) === undefined) return [];
        const shadowed = origin[ORIGIN_SHADOWED_KEY];
        const shadowedFiles = isRecord(shadowed) ? Object.keys(shadowed) : [];
        return [origin[ORIGIN_FILE_KEY] as string, ...shadowedFiles.filter(file => candidateRelOf(file) !== undefined)];
    }

    /** 有効なサーバーの一覧を候補順に集める。同じ名前の値は後のファイルの定義で置き換わる。 */
    private async listEnabled(fs: HomeFs, problems: McpFileProblem[]): Promise<MCPServerInfo[]> {
        const servers = new Map<string, MCPServerInfo>();
        for (const rel of OPENCODE_CONFIG_CANDIDATES_REL) {
            try {
                const { root } = await readJsoncFile(fs, rel);
                for (const [name, config] of Object.entries(jsonServerMap(root, OPENCODE_MCP_SERVERS_PATH))) {
                    const definedIn = [...(servers.get(name)?.definedIn ?? []), fileNameOf(rel)];
                    servers.set(name, { name, config: mcpDisplayConfig(config), enabled: true, definedIn });
                }
            } catch (error) {
                problems.push(problemOf(error, rel));
            }
        }
        return [...servers.values()];
    }

    private async listDisabled(fs: HomeFs, problems: McpFileProblem[]): Promise<MCPServerInfo[]> {
        try {
            const { root } = await this.readDisabled(fs);
            return Object.entries(jsonServerMap(root, OPENCODE_MCP_SERVERS_PATH)).map(([name, config]) => {
                const definedIn = this.recordedFiles(root, name);
                return {
                    name,
                    config: mcpDisplayConfig(config),
                    enabled: false,
                    ...(definedIn.length > 0 ? { definedIn } : {}),
                };
            });
        } catch (error) {
            problems.push(problemOf(error, OPENCODE_DISABLED_MCP_REL));
            return [];
        }
    }

    async getMCPServers(env: OpenCodeEnvironment): Promise<MCPServers> {
        const fs = this.fsFor(env);
        const problems: McpFileProblem[] = [];
        const enabled = await this.listEnabled(fs, problems);
        const disabled = await this.listDisabled(fs, problems);
        return { enabled, disabled, ...(problems.length > 0 ? { problems } : {}) };
    }

    /** text の path の値が expected と一致することを確かめる。違えば edit-failed を投げる。 */
    private assertDefinition(rel: string, text: string, path: string[], expected: unknown): void {
        const scope = readJsoncScope(text, path);
        if (!scope.present || !deepEqualLoose(scope.value, expected)) {
            throw fileError('edit-failed', rel, path[path.length - 1]);
        }
    }

    /** 無効化ファイルへ書く元のファイルの記録（JSON の原文）。隠れていた定義は原文のまま含める。 */
    private originRaw(definers: JsonFileState[], path: string[]): string {
        const effective = definers[definers.length - 1];
        const shadowed = definers
            .slice(0, -1)
            .map(
                state =>
                    `${JSON.stringify(fileNameOf(state.file.rel))}: ${readJsoncScope(state.file.text, path).rawText}`
            );
        const fields = [
            `${JSON.stringify(ORIGIN_FILE_KEY)}: ${JSON.stringify(fileNameOf(effective.file.rel))}`,
            ...(shadowed.length > 0 ? [`${JSON.stringify(ORIGIN_SHADOWED_KEY)}: { ${shadowed.join(', ')} }`] : []),
        ];
        return `{ ${fields.join(', ')} }`;
    }

    /**
     * MCP サーバーを無効化する。定義のあるすべてのファイルからエントリを除き、実効の定義と元のファイルを無効化ファイルへ移す。
     * 無効化ファイルを先に書き込むので、途中で失敗しても定義は消えない。
     */
    async disableMCPServer(env: OpenCodeEnvironment, serverName: string): Promise<MCPServers> {
        const fs = this.fsFor(env);
        const states = await this.readCandidates(fs);
        const disabled = await this.readDisabled(fs);
        const path = this.serverPath(serverName);
        const definers = states.filter(state => isRecord(getNestedValue(state.root, path)));
        const effective = definers[definers.length - 1];
        if (!effective) throw new ConfigFileError('entry-not-found', serverName);

        const changes = guardEdit(disabled.file.rel, (): ConfigChange[] => {
            const definition = readJsoncScope(effective.file.text, path);
            const current = readJsoncScope(disabled.file.text, path);
            if (current.present && !deepEqualLoose(current.value, definition.value)) {
                throw fileError('already-defined', disabled.file.rel, serverName);
            }
            const nextDisabled = setJsoncRaw(
                setJsoncRaw(disabled.file.text, path, definition.rawText),
                [ORIGINS_KEY, serverName],
                this.originRaw(definers, path)
            );
            this.assertDefinition(disabled.file.rel, nextDisabled, path, definition.value);
            return [
                { file: disabled.file, next: nextDisabled },
                ...definers.map(state => ({
                    file: state.file,
                    next: removeJsoncProperty(state.file.text, path, { cascade: true }),
                })),
            ];
        });
        await commitConfigChanges(fs, changes);
        return this.getMCPServers(env);
    }

    /** 元のファイルへ戻す内容（相対パス → 定義の原文）。記録がなければ最初の候補へ実効の定義だけを戻す。 */
    private async restoreTargets(fs: HomeFs, disabled: JsonFileState, name: string): Promise<Map<string, string>> {
        const definition = readJsoncScope(disabled.file.text, this.serverPath(name));
        const [file, ...shadowed] = this.recordedFiles(disabled.root, name);
        const targets = new Map<string, string>();
        targets.set(candidateRelOf(file) ?? (await resolveOpenCodeConfigRel(fs)), definition.rawText);
        for (const shadowedFile of shadowed) {
            const scope = readJsoncScope(disabled.file.text, [ORIGINS_KEY, name, ORIGIN_SHADOWED_KEY, shadowedFile]);
            targets.set(candidateRelOf(shadowedFile) as string, scope.rawText);
        }
        return targets;
    }

    /**
     * MCP サーバーを有効化する。記録された元のファイルへ定義を戻す。記録がなければ最初の候補へ書く。
     * 設定ファイルを先に書き込むので、途中で失敗しても定義は消えない。
     */
    async enableMCPServer(env: OpenCodeEnvironment, serverName: string): Promise<MCPServers> {
        const fs = this.fsFor(env);
        const states = await this.readCandidates(fs);
        const disabled = await this.readDisabled(fs);
        const path = this.serverPath(serverName);
        if (!isRecord(getNestedValue(disabled.root, path))) {
            throw new ConfigFileError('entry-not-found', serverName);
        }
        const targets = await this.restoreTargets(fs, disabled, serverName);
        const changes = guardEdit(disabled.file.rel, (): ConfigChange[] => {
            const restored = [...targets].map(([rel, raw]): ConfigChange => {
                const state = states.find(item => item.file.rel === rel) as JsonFileState;
                const value = readJsoncScope(`{"v": ${raw}}`, ['v']).value;
                const current = readJsoncScope(state.file.text, path);
                if (current.present && !deepEqualLoose(current.value, value)) {
                    throw fileError('already-defined', rel, serverName);
                }
                const next = current.present ? state.file.text : setJsoncRaw(state.file.text, path, raw);
                this.assertDefinition(rel, next, path, value);
                return { file: state.file, next };
            });
            const nextDisabled = removeJsoncProperty(
                removeJsoncProperty(disabled.file.text, path, { cascade: true }),
                [ORIGINS_KEY, serverName],
                { cascade: true }
            );
            return [...restored, sidecarChange(disabled.file, nextDisabled)];
        });
        await commitConfigChanges(fs, changes);
        return this.getMCPServers(env);
    }

    /** ファイルごとに、そのファイルの mcp.servers を names の順に並べ替える。対象がなければ何も書かない。 */
    async reorderMCPServers(env: OpenCodeEnvironment, serverNames: string[]): Promise<MCPServers> {
        const fs = this.fsFor(env);
        const states = await this.readCandidates(fs);
        await commitConfigChanges(
            fs,
            states.map(state => ({
                file: state.file,
                next: reorderJsonEntries(state, OPENCODE_MCP_SERVERS_PATH, serverNames),
            }))
        );
        return this.getMCPServers(env);
    }

    async reorderDisabledMCPServers(env: OpenCodeEnvironment, serverNames: string[]): Promise<MCPServers> {
        const fs = this.fsFor(env);
        const disabled = await this.readDisabled(fs);
        const next = reorderJsonEntries(disabled, OPENCODE_MCP_SERVERS_PATH, serverNames);
        await commitConfigChanges(fs, [{ file: disabled.file, next }]);
        return this.getMCPServers(env);
    }
}
