import {
    existsSync,
    lstatSync,
    mkdirSync,
    mkdtempSync,
    readdirSync,
    readFileSync,
    realpathSync,
    renameSync,
    statSync,
} from 'fs';
import { copyFile, cp, lstat } from 'fs/promises';
import { basename, dirname, extname, isAbsolute, join, resolve } from 'path';
import {
    OPENCODE_CLI_COMMAND,
    OPENCODE_CLI_CONFIG_REL,
    OPENCODE_CONFIG_DIR,
    OPENCODE_CONFIG_SCHEMA_URL,
    OPENCODE_DISABLED_PLUGINS_DIR,
    OPENCODE_DISABLED_PLUGINS_REL,
    OPENCODE_PLUGIN_CAPABILITIES,
    OPENCODE_PLUGINS_DIR,
    OPENCODE_WSL_CLI_TEST,
} from '../../../shared/agents/opencode/constants';
import type {
    OpenCodeEnvironment,
    OSType,
    PluginCatalogReport,
    PluginEntry,
    PluginEnvReport,
    PluginOpResult,
} from '../../../shared/agents/opencode/types';
import { deleteJsoncProperty, parseJsoncObject, setJsoncProperty } from '../../utils/jsoncEdit';
import { deepEqualLoose } from '../../utils/nestedValue';
import { AgentCliRunner } from '../common/cli/AgentCliRunner';
import { removeTreeBestEffort } from '../common/fs/removeTreeBestEffort';
import { HomeFs } from '../common/wsl/HomeFs';
import { WslDetector } from '../common/wsl/WslDetector';
import { openCodeCliAvailable } from './openCodeCli';
import { resolveOpenCodeConfigRel } from './openCodeConfigFile';

// plugins 配列の要素。指定子の文字列か、オプション付きの { package, options }。
type PluginItem = string | { package: string; options?: Record<string, unknown> };

interface JsoncState {
    rel: string;
    raw: string;
    // plugins 配列の全要素（解釈できない要素も位置を保って保持する）
    items: unknown[];
}

interface DisabledState extends JsoncState {
    // 指定子 → 無効化した時点の plugins 配列の並び（無効化中の他の要素も記録した位置に戻したもの）。
    // 配列でない値は位置の記録が無いものとして扱う。
    positions: Record<string, unknown>;
}

// 実体（ファイル・フォルダー）の識別子と、比較用のパス。
interface EntryIdentity {
    dev: bigint;
    ino: bigint;
    key: string;
}

const PLUGINS_KEY = ['plugins'];
const POSITIONS_KEY = 'positions';
const CONFIG_ID_PREFIX = 'config:';
const TUI_ID_PREFIX = 'cli:';
const LOCAL_ID_PREFIX = 'local:';
const LOCAL_PLUGIN_EXTENSIONS = ['.ts', '.js'];
const LOCAL_PLUGIN_DIRS = [OPENCODE_PLUGINS_DIR, OPENCODE_DISABLED_PLUGINS_DIR];
// ローカルプラグインの導入時に、コピーと旧版の退避に使う一時フォルダー名の接頭辞（plugins の隣に作る）。
const STAGING_PREFIX = '.plugin-install-';
// プラグインパッケージのフォルダーとみなす目印（OpenCode は package.json か server / index / tui のモジュールを読む）
const PLUGIN_DIRECTORY_MARKERS = [
    'package.json',
    ...['index', 'server', 'tui'].flatMap(name => LOCAL_PLUGIN_EXTENSIONS.map(ext => `${name}${ext}`)),
];
// `opencode plugin add` はパッケージの取得と導入まで行うため長めに待つ。
const INSTALL_TIMEOUT_MS = 5 * 60_000;

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function withTrailingNewline(text: string): string {
    return text.endsWith('\n') ? text : `${text}\n`;
}

/**
 * 実パスを比較用の文字列にする。Windows は `\\?\` 接頭辞と WSL の別名（`\\wsl$` / `\\wsl.localhost`）を揃え、
 * 大文字小文字を区別しない。
 */
function comparablePath(path: string): string {
    const resolved = resolve(path).replace(/[\\/]+$/, '');
    if (process.platform !== 'win32') return resolved;
    return resolved
        .replace(/^\\\\\?\\UNC\\/i, '\\\\')
        .replace(/^\\\\\?\\/, '')
        .replace(/^\\\\wsl\$\\/i, '\\\\wsl.localhost\\')
        .toLowerCase();
}

/** path の実体の識別子。取得できなければ null。 */
function identityOf(path: string): EntryIdentity | null {
    try {
        const st = statSync(path, { bigint: true });
        return { dev: st.dev, ino: st.ino, key: comparablePath(path) };
    } catch {
        return null;
    }
}

/**
 * 同じ実体か。デバイスとファイル ID で比べ（UNC の別名 `\\localhost\C$\...` を経由しても一致する）、
 * ファイル ID を返さないファイルシステム（ino が 0）では比較用のパスだけで比べる。
 */
function sameEntry(a: EntryIdentity, b: EntryIdentity): boolean {
    return a.key === b.key || (a.ino !== 0n && a.dev === b.dev && a.ino === b.ino);
}

/** 実パス path 自身から根までの各フォルダーの識別子（取得できないものは除く）。 */
function identityChain(path: string): EntryIdentity[] {
    const chain: EntryIdentity[] = [];
    for (let current = path; ; current = dirname(current)) {
        const identity = identityOf(current);
        if (identity) chain.push(identity);
        if (dirname(current) === current) return chain;
    }
}

/** ファイルが使用中か、アクセスが拒否されたため、OS が移動・削除を拒んだことを表すエラーか。 */
function isLockedError(error: unknown): boolean {
    const code = (error as NodeJS.ErrnoException).code;
    return code === 'EPERM' || code === 'EBUSY' || code === 'EACCES';
}

/**
 * OpenCode のグローバルプラグインを管理する。
 * - 設定ファイル（opencode.json / opencode.jsonc）の `plugins` 配列のパッケージ指定（npm・Git）とローカルパス指定。
 *   導入は `opencode plugin add` で行い、無効化した要素は opencode-disabled-plugins.json へ退避する
 *   （OpenCode は先頭から評価し後ろの指定が勝つため、有効化では無効化した時点の並びに沿った位置へ戻す。
 *   無効化中の他の要素も並びに含めて記録するため、複数の要素を無効化してから任意の順に有効化しても元の並びに戻る）。
 *   退避ファイルが壊れている場合は、一覧では空として扱って警告を添え、退避ファイルを書き換える操作と導入は行わない。
 *   有効化の指示（`-<ID>`・`*`・`<接頭辞>.*`・組み込み ID `opencode.*`）は一覧に出さず、位置を保って残す。
 * - ターミナル UI の設定（cli.json）の `plugins` 配列（`opencode plugin add` が TUI 専用のパッケージを追加する先）:
 *   読み取り専用で一覧に出し、有効化・無効化・削除は行わない。
 * - ~/.config/opencode/plugins 直下の .ts / .js ファイルとプラグインフォルダー:
 *   無効化すると plugins-disabled へ移動する。導入はコピーを一時フォルダーに作ってから置き換え、
 *   失敗したときは旧版を残す。導入元がシンボリックリンク・ジャンクションの場合は導入しない。
 */
export class OpenCodePluginManager {
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

    async getEnvironments(): Promise<{ env: OpenCodeEnvironment; label: string }[]> {
        const result: { env: OpenCodeEnvironment; label: string }[] = [];
        if (await openCodeCliAvailable(this.runner, { kind: 'native' })) {
            result.push({ env: { kind: 'native' }, label: this.nativeLabel() });
        }
        const distros = await this.detector.getDistrosWithTest(OPENCODE_WSL_CLI_TEST);
        for (const distro of distros) {
            const env: OpenCodeEnvironment = { kind: 'wsl', distro: distro.distro };
            if (await openCodeCliAvailable(this.runner, env)) result.push({ env, label: distro.distro });
        }
        return result;
    }

    // ---- plugins 配列 ----

    private isPluginItem(value: unknown): value is PluginItem {
        if (typeof value === 'string') return value.length > 0;
        return (
            isRecord(value) &&
            typeof value.package === 'string' &&
            value.package.length > 0 &&
            (value.options === undefined || isRecord(value.options))
        );
    }

    private target(item: PluginItem): string {
        return typeof item === 'string' ? item : item.package;
    }

    /** 有効化の指示（`-<ID>`・`*`・`<接頭辞>.*`・組み込み ID）か。`opencode plugin list` と同じ判定。 */
    private isDirective(target: string): boolean {
        return target.startsWith('-') || target === '*' || target.endsWith('.*') || target.startsWith('opencode.');
    }

    /** OpenCode がローカルパスとして扱う指定（file:// URL・相対パス・絶対パス）か。 */
    private isPathTarget(target: string): boolean {
        return (
            target.startsWith('file://') ||
            target.startsWith('./') ||
            target.startsWith('../') ||
            target.startsWith('/') ||
            target.startsWith('\\\\') ||
            /^[A-Za-z]:[\\/]/.test(target)
        );
    }

    /** npm 互換の Git 指定（github: などの短縮形・git+ssh / git+https・Git ホストの URL・owner/repo）か。 */
    private isGitTarget(target: string): boolean {
        return (
            /^(?:git\+|git:\/\/|git@|github:|gitlab:|bitbucket:|gist:|https?:\/\/)/i.test(target) ||
            /^[^@./\s][^/\s:]*\/[^/\s]+$/.test(target)
        );
    }

    /** npm 指定からパッケージ名とバージョン指定を分離する（`@scope/name@1.2.3` → `@scope/name` / `1.2.3`）。 */
    private splitPackage(target: string): { name: string; version: string | null } {
        const at = target.indexOf('@', target.startsWith('@') ? 1 : 0);
        if (at <= 0) return { name: target, version: null };
        return { name: target.slice(0, at), version: target.slice(at + 1) || null };
    }

    /** Git 指定からリポジトリ名（`::path:` 指定があればそのフォルダー名）と参照（# 以降）を取り出す。 */
    private splitGit(target: string): { name: string; version: string | null } {
        const [location, fragment = ''] = target.split('#', 2);
        const [ref, ...selectors] = fragment.split('::');
        const subPath = selectors.find(selector => selector.startsWith('path:'))?.slice('path:'.length);
        const source = (subPath || location).replace(/[\\/]+$/, '');
        const name = basename(source.replace(/\.git$/i, '').replace(/^.*:/, '')) || target;
        return { name, version: ref || null };
    }

    private configEntry(item: PluginItem, enabled: boolean, idPrefix = CONFIG_ID_PREFIX): PluginEntry {
        const target = this.target(item);
        const id = `${idPrefix}${target}`;
        if (this.isPathTarget(target)) {
            const path = target.replace(/^file:\/\//, '').replace(/[\\/]+$/, '');
            return { id, name: basename(path, extname(path)) || target, version: null, marketplace: 'file', enabled };
        }
        if (this.isGitTarget(target)) {
            return { id, ...this.splitGit(target), marketplace: 'git', enabled };
        }
        return { id, ...this.splitPackage(target), marketplace: 'npm', enabled };
    }

    /** 指示や解釈できない要素を除いた、一覧に出すプラグインの要素。 */
    private listedItems(items: unknown[]): PluginItem[] {
        return items
            .filter((item): item is PluginItem => this.isPluginItem(item))
            .filter(item => !this.isDirective(this.target(item)));
    }

    private async readState(fs: HomeFs, rel: string): Promise<JsoncState> {
        const text = await fs.readText(rel);
        const raw = text !== null && text.trim().length > 0 ? text : '{}\n';
        const plugins = parseJsoncObject(raw).plugins;
        return { rel, raw, items: Array.isArray(plugins) ? plugins : [] };
    }

    private async readConfig(fs: HomeFs): Promise<JsoncState> {
        const state = await this.readState(fs, await resolveOpenCodeConfigRel(fs));
        // 新規作成するファイルには公式スキーマの参照を入れる。
        if (state.raw === '{}\n') state.raw = `${JSON.stringify({ $schema: OPENCODE_CONFIG_SCHEMA_URL }, null, 2)}\n`;
        return state;
    }

    /** 退避ファイルを読む。JSONC として読めない場合は null。 */
    private async readDisabled(fs: HomeFs): Promise<DisabledState | null> {
        try {
            const state = await this.readState(fs, OPENCODE_DISABLED_PLUGINS_REL);
            const positions = parseJsoncObject(state.raw)[POSITIONS_KEY];
            return { ...state, positions: isRecord(positions) ? positions : {} };
        } catch (error) {
            console.warn(`Failed to read ${OPENCODE_DISABLED_PLUGINS_REL}:`, error);
            return null;
        }
    }

    /** cli.json の plugins 配列の要素。無い・読めない場合は空。 */
    private async readTuiItems(fs: HomeFs): Promise<unknown[]> {
        try {
            return (await this.readState(fs, OPENCODE_CLI_CONFIG_REL)).items;
        } catch (error) {
            console.warn(`Failed to read ${OPENCODE_CLI_CONFIG_REL}:`, error);
            return [];
        }
    }

    /** plugins 配列を置き換えたテキストを返す。空になった場合は plugins を削除する。 */
    private withItems(raw: string, items: unknown[]): string {
        return items.length === 0 ? deleteJsoncProperty(raw, PLUGINS_KEY) : setJsoncProperty(raw, PLUGINS_KEY, items);
    }

    private async writeConfig(fs: HomeFs, state: JsoncState, items: unknown[]): Promise<void> {
        await fs.writeText(state.rel, withTrailingNewline(this.withItems(state.raw, items)));
    }

    /**
     * 退避ファイルを書き換える。位置の記録は退避中の要素の分だけを残し、
     * 中身が空のオブジェクトになったらファイルごと削除する。
     */
    private async writeDisabled(
        fs: HomeFs,
        state: DisabledState,
        items: unknown[],
        positions: Record<string, unknown>
    ): Promise<void> {
        const kept = Object.fromEntries(
            Object.entries(positions).filter(([target]) => items.some(item => this.matches(item, target)))
        );
        const withItems = this.withItems(state.raw, items);
        const next =
            Object.keys(kept).length === 0
                ? deleteJsoncProperty(withItems, [POSITIONS_KEY])
                : setJsoncProperty(withItems, [POSITIONS_KEY], kept);
        if (Object.keys(parseJsoncObject(next)).length === 0) await fs.deleteFile(state.rel);
        else await fs.writeText(state.rel, withTrailingNewline(next));
    }

    /** 指定子が target の要素か（指示や解釈できない要素は対象外）。 */
    private matches(item: unknown, target: string): boolean {
        return this.isPluginItem(item) && this.target(item) === target;
    }

    /**
     * order（無効化した時点の並び）での位置に沿って、target の要素 moving を current へ挿入した配列を返す。
     * order の target 以外の要素を current の要素と先頭から順に対応付け、order にある target の要素ごとに、
     * order で手前にある要素のうち current に残っている最も近いものの直後へ置く。手前に残っている要素が無ければ、
     * order の先頭にあった要素は先頭へ、それ以外は後ろにある要素のうち current に残っている最も近いものの直前へ置き、
     * それも無ければ末尾へ置く。order が配列でない（記録が無い）ときは末尾へ置き、order にある target の要素より
     * moving が多い分は、order の最後の target の要素と同じ位置へ続ける。
     */
    private insertByOrder(current: unknown[], moving: unknown[], order: unknown, target: string): unknown[] {
        if (!Array.isArray(order)) return [...current, ...moving];
        // order の各要素に対応する current の位置（target の要素と、current に残っていない要素は -1）
        const matched: number[] = [];
        let from = 0;
        for (const item of order) {
            const index = this.matches(item, target)
                ? -1
                : current.findIndex((candidate, i) => i >= from && deepEqualLoose(candidate, item));
            matched.push(index);
            if (index >= 0) from = index + 1;
        }
        // order にある target の要素ごとの挿入位置（current の何番目の要素の直前か）
        const points: number[] = [];
        order.forEach((item, k) => {
            if (!this.matches(item, target)) return;
            const before = matched.slice(0, k).filter(index => index >= 0);
            if (before.length > 0) points.push(before[before.length - 1] + 1);
            else if (order.slice(0, k).every(other => this.matches(other, target))) points.push(0);
            else points.push(matched.slice(k + 1).find(index => index >= 0) ?? current.length);
        });
        const pointOf = (i: number) => points[Math.min(i, points.length - 1)] ?? current.length;
        const result: unknown[] = [];
        for (let i = 0; i <= current.length; i++) {
            moving.forEach((item, m) => {
                if (pointOf(m) === i) result.push(item);
            });
            if (i < current.length) result.push(current[i]);
        }
        return result;
    }

    /**
     * items に、無効化中の要素をそれぞれの記録した並びに沿って戻した並び（無効化した時点の並びとして記録する）。
     * 位置の記録が無い要素は、戻す位置が分からないため含めない。
     */
    private mergedOrder(items: unknown[], disabled: DisabledState): unknown[] {
        const targets = new Set(
            disabled.items.filter((item): item is PluginItem => this.isPluginItem(item)).map(item => this.target(item))
        );
        let merged = items;
        for (const target of targets) {
            const order = disabled.positions[target];
            if (!Array.isArray(order)) continue;
            const moving = disabled.items.filter(item => this.matches(item, target));
            merged = this.insertByOrder(merged, moving, order, target);
        }
        return merged;
    }

    // ---- ローカルプラグイン ----

    private localRel(dir: string, name?: string): string {
        return name === undefined ? `${OPENCODE_CONFIG_DIR}/${dir}` : `${OPENCODE_CONFIG_DIR}/${dir}/${name}`;
    }

    private isLocalPluginFile(name: string): boolean {
        return LOCAL_PLUGIN_EXTENSIONS.includes(extname(name).toLowerCase());
    }

    private async localEntries(fs: HomeFs, dir: string, enabled: boolean): Promise<PluginEntry[]> {
        const files = (await fs.listFiles(this.localRel(dir))).filter(name => this.isLocalPluginFile(name));
        const folders = await fs.listDirs(this.localRel(dir));
        return [...files, ...folders]
            .sort((a, b) => a.localeCompare(b))
            .map(name => ({
                id: `${LOCAL_ID_PREFIX}${dir}/${name}`,
                name: this.isLocalPluginFile(name) ? basename(name, extname(name)) : name,
                version: null,
                marketplace: 'local',
                enabled,
            }));
    }

    /** `local:<dir>/<name>` を検証して分解する。管理対象外のフォルダーやパス区切りを含む名前は拒否する。 */
    private parseLocalId(id: string): { dir: string; name: string } | null {
        const rest = id.slice(LOCAL_ID_PREFIX.length);
        const slash = rest.indexOf('/');
        if (slash <= 0) return null;
        const dir = rest.slice(0, slash);
        const name = rest.slice(slash + 1);
        if (!LOCAL_PLUGIN_DIRS.includes(dir)) return null;
        if (name.length === 0 || name.includes('/') || name.includes('\\') || name.includes('..')) return null;
        return { dir, name };
    }

    private async isLocalFolder(fs: HomeFs, dir: string, name: string): Promise<boolean> {
        return (await fs.listDirs(this.localRel(dir))).includes(name);
    }

    /**
     * ローカルプラグイン（ファイルまたはフォルダー）を削除し、すべて削除できたか（使用中などで残った分が無いか）を返す。
     * フォルダー内のシンボリックリンク・ジャンクションはリンク自体だけを外し、リンク先には触れない
     * （WSL は distro 内のコマンドで削除する）。
     */
    private async removeLocal(fs: HomeFs, dir: string, name: string): Promise<boolean> {
        const rel = this.localRel(dir, name);
        if (await this.isLocalFolder(fs, dir, name)) return (await fs.removeDirBestEffort(rel)).removedAll;
        try {
            await fs.deleteFile(rel);
            return true;
        } catch (error) {
            if (isLockedError(error)) return false;
            throw error;
        }
    }

    // ---- 一覧 ----

    async list(env: OpenCodeEnvironment): Promise<PluginEnvReport> {
        const cliAvailable = await openCodeCliAvailable(this.runner, env);
        const base: PluginEnvReport = {
            env,
            label: env.kind === 'wsl' ? (env.distro ?? 'WSL') : this.nativeLabel(),
            cliAvailable,
            cliVersion: null,
            plugins: [],
            marketplaces: [],
            capabilities: OPENCODE_PLUGIN_CAPABILITIES,
        };
        if (!cliAvailable) return base;
        try {
            const fs = this.fsFor(env);
            const config = await this.readConfig(fs);
            const disabled = await this.readDisabled(fs);
            if (!disabled) base.warningKey = 'opencode.plugins.disabledFileInvalid';
            const tuiItems = await this.readTuiItems(fs);
            const entries = [
                ...this.listedItems(config.items).map(item => this.configEntry(item, true)),
                ...this.listedItems(disabled?.items ?? []).map(item => this.configEntry(item, false)),
                ...this.listedItems(tuiItems).map(item => ({
                    ...this.configEntry(item, true, TUI_ID_PREFIX),
                    uninstallable: false,
                    toggleable: false,
                    noteKey: 'opencode.plugins.tuiNote',
                })),
                ...(await this.localEntries(fs, OPENCODE_PLUGINS_DIR, true)),
                ...(await this.localEntries(fs, OPENCODE_DISABLED_PLUGINS_DIR, false)),
            ];
            // 同じ指定子が重複していても 1 行にまとめる（先に現れた有効側を残す）。
            base.plugins = entries.filter(
                (entry, index) => entries.findIndex(other => other.id === entry.id) === index
            );
        } catch (error) {
            base.error = String(error);
        }
        return base;
    }

    async catalog(_env: OpenCodeEnvironment): Promise<PluginCatalogReport> {
        return { ok: true, entries: [] };
    }

    // ---- 導入 ----

    async install(env: OpenCodeEnvironment, id: string): Promise<PluginOpResult> {
        return this.installFromSource(env, id);
    }

    /**
     * ローカルの .ts / .js ファイルとプラグインフォルダーは plugins へコピーする（同名の既存分は置き換える）。
     * パッケージ（npm・Git）は `opencode plugin add` で取得して plugins 配列へ追加する。
     * 退避ファイルが壊れている場合は、導入後に退避分を整理できないためパッケージの導入を行わない。
     */
    async installFromSource(env: OpenCodeEnvironment, source: string): Promise<PluginOpResult> {
        const trimmed = source.trim();
        const fs = this.fsFor(env);
        try {
            if (isAbsolute(trimmed) && existsSync(trimmed)) return await this.installLocal(fs, trimmed);
            if (isAbsolute(trimmed) || this.isPathTarget(trimmed)) return { ok: false, message: 'not-found' };
            if (trimmed.length === 0 || trimmed.startsWith('-') || /\s/.test(trimmed)) {
                return { ok: false, message: 'invalid-plugin-source' };
            }
            if (!(await openCodeCliAvailable(this.runner, env))) return { ok: false, message: 'cli-unavailable' };
            const disabled = await this.readDisabled(fs);
            if (!disabled) return { ok: false, message: 'invalid-disabled-file' };
            const result = await this.runner.run(
                env,
                OPENCODE_CLI_COMMAND,
                ['plugin', 'add', trimmed],
                INSTALL_TIMEOUT_MS
            );
            if (!result.ok) return { ok: false, message: (result.stderr || result.stdout).trim() };
            // 無効化して退避していた同じ指定子は、導入により設定へ戻ったため退避先から外す。
            if (disabled.items.some(item => this.matches(item, trimmed))) {
                await this.writeDisabled(
                    fs,
                    disabled,
                    disabled.items.filter(item => !this.matches(item, trimmed)),
                    disabled.positions
                );
            }
            return { ok: true };
        } catch (error) {
            return { ok: false, message: String(error) };
        }
    }

    /**
     * ローカルのファイルまたはフォルダーを plugins へコピーし、無効化中の同名分を削除する。
     * - 導入元自体がシンボリックリンク・ジャンクションの場合は導入しない（invalid-plugin-source）。
     * - 導入元と導入先は実体（デバイスとファイル ID）で比べる（ジャンクション・subst ドライブ・UNC の別名を経由しても
     *   同じ実体と分かる）。導入先そのものなら already-exists、導入元が plugins かその上位のフォルダー（一時フォルダーと
     *   導入先を内側に含む）か、導入元が既存の導入先の内側にあるなら source-overlaps として何もしない。
     * - フォルダーの中のシンボリックリンク・ジャンクションは辿らず、コピーもしない。リンク先は導入元の外や導入元自身を
     *   指し得て、辿ると導入元の外の内容を取り込み、自身を指すリンクでは終わりなくコピーが続くため。
     * - コピーは plugins の隣の一時フォルダーに作ってから置き換え、途中で失敗したときは旧版を残す。
     *   使用中などで既存の導入先を移動できなかったときは move-in-use を返す。
     */
    private async installLocal(fs: HomeFs, sourcePath: string): Promise<PluginOpResult> {
        const name = basename(sourcePath.replace(/[\\/]+$/, ''));
        if (lstatSync(sourcePath).isSymbolicLink()) return { ok: false, message: 'invalid-plugin-source' };
        const isDirectory = statSync(sourcePath).isDirectory();
        if (!isDirectory && !this.isLocalPluginFile(name)) return { ok: false, message: 'invalid-plugin-source' };
        if (isDirectory && !PLUGIN_DIRECTORY_MARKERS.some(marker => readdirSync(sourcePath).includes(marker))) {
            return { ok: false, message: 'invalid-plugin-source' };
        }
        const pluginsAbs = await fs.resolveRealPath(this.localRel(OPENCODE_PLUGINS_DIR));
        if (pluginsAbs === null) {
            // WSL のパスへ到達できない（コマンドモード）場合は、ファイルの内容の書き込みだけで導入する。
            if (isDirectory) return { ok: false, message: 'unavailable' };
            await fs.writeText(this.localRel(OPENCODE_PLUGINS_DIR, name), readFileSync(sourcePath, 'utf8'));
            await this.removeLocal(fs, OPENCODE_DISABLED_PLUGINS_DIR, name);
            return { ok: true };
        }
        mkdirSync(pluginsAbs, { recursive: true });
        const pluginsReal = realpathSync.native(pluginsAbs);
        const target = join(pluginsReal, name);
        const targetExists = lstatSync(target, { throwIfNoEntry: false }) !== undefined;
        const sourceReal = realpathSync.native(sourcePath);
        const source = identityOf(sourceReal);
        if (!source) return { ok: false, message: 'not-found' };
        // 導入先がリンクのときはリンク先の実体と比べる（statSync はリンクを辿る）。
        const existing = identityOf(target);
        if (existing && sameEntry(existing, source)) return { ok: false, message: 'already-exists' };
        if (
            identityChain(pluginsReal).some(folder => sameEntry(folder, source)) ||
            (existing && identityChain(dirname(sourceReal)).some(folder => sameEntry(folder, existing)))
        ) {
            return { ok: false, message: 'source-overlaps' };
        }

        const staging = mkdtempSync(join(dirname(pluginsReal), STAGING_PREFIX));
        // 旧版を元の場所へ戻せなかったときは、旧版を失わないよう一時フォルダーを残す。
        let keepStaging = false;
        try {
            const copy = join(staging, name);
            if (isDirectory) {
                await cp(sourcePath, copy, {
                    recursive: true,
                    filter: async path => !(await lstat(path)).isSymbolicLink(),
                });
            } else {
                await copyFile(sourcePath, copy);
            }
            const previous = join(staging, `${name}.previous`);
            try {
                if (targetExists) renameSync(target, previous);
            } catch (error) {
                if (isLockedError(error)) return { ok: false, message: 'move-in-use' };
                throw error;
            }
            try {
                renameSync(copy, target);
            } catch (error) {
                if (targetExists) {
                    try {
                        renameSync(previous, target);
                    } catch {
                        keepStaging = true;
                        throw new Error(`${String(error)} (the previous version was kept at ${previous})`);
                    }
                }
                if (isLockedError(error)) return { ok: false, message: 'move-in-use' };
                throw error;
            }
        } finally {
            // 一時フォルダー（置き換えた旧版を含む）を片付ける。使用中で残った分は導入結果に影響しない。
            if (!keepStaging && !removeTreeBestEffort(staging)) {
                console.warn(`Failed to remove every file in ${staging}`);
            }
        }
        if (!(await this.removeLocal(fs, OPENCODE_DISABLED_PLUGINS_DIR, name))) {
            console.warn(`Failed to remove every file of the disabled copy of ${name}`);
        }
        return { ok: true };
    }

    // ---- 削除・有効化 ----

    async uninstall(env: OpenCodeEnvironment, id: string): Promise<PluginOpResult> {
        const fs = this.fsFor(env);
        try {
            if (id.startsWith(TUI_ID_PREFIX)) return { ok: false, message: 'read-only' };
            if (id.startsWith(LOCAL_ID_PREFIX)) {
                const local = this.parseLocalId(id);
                if (!local) return { ok: false, message: 'invalid-id' };
                return (await this.removeLocal(fs, local.dir, local.name))
                    ? { ok: true }
                    : { ok: false, message: 'in-use' };
            }
            if (!id.startsWith(CONFIG_ID_PREFIX)) return { ok: false, message: 'invalid-id' };
            const target = id.slice(CONFIG_ID_PREFIX.length);
            const config = await this.readConfig(fs);
            const disabled = await this.readDisabled(fs);
            if (!disabled) return { ok: false, message: 'invalid-disabled-file' };
            const inConfig = config.items.some(item => this.matches(item, target));
            const inDisabled = disabled.items.some(item => this.matches(item, target));
            if (!inConfig && !inDisabled) return { ok: false, message: 'not-found' };
            if (inConfig) {
                await this.writeConfig(
                    fs,
                    config,
                    config.items.filter(item => !this.matches(item, target))
                );
            }
            if (inDisabled) {
                await this.writeDisabled(
                    fs,
                    disabled,
                    disabled.items.filter(item => !this.matches(item, target)),
                    disabled.positions
                );
            }
            return { ok: true };
        } catch (error) {
            return { ok: false, message: String(error) };
        }
    }

    async setEnabled(env: OpenCodeEnvironment, id: string, enabled: boolean): Promise<PluginOpResult> {
        const fs = this.fsFor(env);
        try {
            if (id.startsWith(TUI_ID_PREFIX)) return { ok: false, message: 'read-only' };
            if (id.startsWith(LOCAL_ID_PREFIX)) return await this.setLocalEnabled(fs, id, enabled);
            if (!id.startsWith(CONFIG_ID_PREFIX)) return { ok: false, message: 'invalid-id' };
            const target = id.slice(CONFIG_ID_PREFIX.length);
            const config = await this.readConfig(fs);
            const disabled = await this.readDisabled(fs);
            if (!disabled) return { ok: false, message: 'invalid-disabled-file' };
            const from = enabled ? disabled : config;
            const moving = from.items.filter(item => this.matches(item, target));
            if (moving.length === 0) {
                const alreadyThere = (enabled ? config : disabled).items.some(item => this.matches(item, target));
                return alreadyThere ? { ok: true } : { ok: false, message: 'not-found' };
            }
            const remaining = from.items.filter(item => !this.matches(item, target));
            // 他の要素（有効化の指示を含む）の順序は変えない。無効化ではその時点の並びを記録し、有効化でそれに沿って戻す。
            if (enabled) {
                const restored = this.insertByOrder(config.items, moving, disabled.positions[target], target);
                await this.writeConfig(fs, config, restored);
                await this.writeDisabled(fs, disabled, remaining, disabled.positions);
            } else {
                await this.writeDisabled(fs, disabled, [...disabled.items, ...moving], {
                    ...disabled.positions,
                    [target]: this.mergedOrder(config.items, disabled),
                });
                await this.writeConfig(fs, config, remaining);
            }
            return { ok: true };
        } catch (error) {
            return { ok: false, message: String(error) };
        }
    }

    /**
     * ローカルプラグインを plugins と plugins-disabled の間で移動する。
     * 使用中などで移動できなかったときは move-in-use を返し、移動元を残す。
     */
    private async setLocalEnabled(fs: HomeFs, id: string, enabled: boolean): Promise<PluginOpResult> {
        const local = this.parseLocalId(id);
        if (!local) return { ok: false, message: 'invalid-id' };
        if ((local.dir !== OPENCODE_DISABLED_PLUGINS_DIR) === enabled) return { ok: true };
        const toDir = enabled ? OPENCODE_PLUGINS_DIR : OPENCODE_DISABLED_PLUGINS_DIR;
        const from = this.localRel(local.dir, local.name);
        const to = this.localRel(toDir, local.name);
        if (await fs.exists(to)) return { ok: false, message: 'already-exists' };
        if (await this.isLocalFolder(fs, local.dir, local.name)) {
            const fromAbs = await fs.resolveRealPath(from);
            const toAbs = await fs.resolveRealPath(to);
            if (fromAbs === null || toAbs === null) return { ok: false, message: 'unavailable' };
            mkdirSync(dirname(toAbs), { recursive: true });
            try {
                renameSync(fromAbs, toAbs);
            } catch (error) {
                if (isLockedError(error)) return { ok: false, message: 'move-in-use' };
                throw error;
            }
            return { ok: true };
        }
        const content = await fs.readText(from);
        if (content === null) return { ok: false, message: 'not-found' };
        await fs.writeText(to, content);
        try {
            await fs.deleteFile(from);
        } catch (error) {
            await fs.deleteFile(to);
            if (isLockedError(error)) return { ok: false, message: 'move-in-use' };
            throw error;
        }
        return { ok: true };
    }

    async addMarketplace(_env: OpenCodeEnvironment, _source: string): Promise<PluginOpResult> {
        return { ok: false, message: 'unsupported' };
    }

    async removeMarketplace(_env: OpenCodeEnvironment, _name: string): Promise<PluginOpResult> {
        return { ok: false, message: 'unsupported' };
    }
}
