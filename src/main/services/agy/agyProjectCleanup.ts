import {
    AGY_CLI_DIR,
    AGY_PROJECT_DEFINITIONS_REL,
    AGY_SHARED_CONFIG_JSON_REL,
} from '../../../shared/agents/agy/constants';
import type { AgentEnvironment } from '../../../shared/agents/types';
import { parseJsoncObject, removeJsoncArrayElements, removeJsoncProperty } from '../../utils/jsoncEdit';
import { strictDeepEqual } from '../../utils/strictDeepEqual';
import { createCleanupProbe, type CleanupProbe } from '../common/cleanup/CleanupProbe';
import type { CleanupHandler, HandledChild } from '../common/cleanup/handledCleanup';
import { homePath } from '../common/cleanup/resolvedCleanup';
import { withBom } from '../common/fs/atomicFile';
import { createSqliteStore } from '../common/sqlite/createSqliteStore';
import { sqliteBlockedNotice } from '../common/sqlite/sqliteNotices';
import type { SqliteStore } from '../common/sqlite/sqliteStore';
import { HomeFs } from '../common/wsl/HomeFs';
import type { WslDetector } from '../common/wsl/WslDetector';
import {
    AGY_SUMMARIES_DB,
    agyConversationIdOf,
    createAgyWorktreeRemover,
    measureAgyConversations,
    removeAgyConversations,
} from './agyConversationArtifacts';
import { readAgyConversationBlobs } from './agyConversationDb';
import { editAgyFile } from './agyFileEdit';
import { readAgyTrajectoryMetadata, type AgyTrajectoryMetadata } from './agyTrajectoryMetadata';
import { agyPathDisplay, agyPathRowKey, normalizeAgyPath, normalizeAgyWorkspaceUri } from './agyWorkspacePath';

const CONVERSATIONS_REL = `${AGY_CLI_DIR}/conversations`;
const HISTORY_REL = `${AGY_CLI_DIR}/history.jsonl`;
const LAST_CONVERSATIONS_REL = `${AGY_CLI_DIR}/cache/last_conversations.json`;
const DEFAULT_PROJECT_ID_REL = `${AGY_CLI_DIR}/cache/default_project_id.txt`;
// 利用者のプロジェクトとして扱わない定義の ID。
const RESERVED_PROJECT_IDS = ['default-cli-project', 'outside-of-project'];
const DEFINITION_SUFFIX = '.json';
const RESOURCES_PATH = ['projectResources', 'resources'];
const NEWLINE = 0x0a;

/** ワークスペースのパス 1 つの行。 */
interface ProjectRow {
    // 表示用のパス
    display: string;
    // そのパスに属する会話（親と子）の ID
    conversationIds: string[];
}

/** 行の組み立てと削除に使う一覧。 */
interface ProjectLayout {
    // 行を同一視するキー → 行
    rows: Map<string, ProjectRow>;
    // 変更してよい定義のホーム相対パス
    definitions: string[];
}

/** JSON のオブジェクトか。 */
function isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** 定義の要素の folderUri を行のキーにする。folderUri が無い要素と照合できない値は null。 */
function resourceRowKey(resource: unknown, os: CleanupProbe['os']): string | null {
    if (!isObject(resource) || typeof resource.folderUri !== 'string') return null;
    const normalized = normalizeAgyWorkspaceUri(resource.folderUri);
    return normalized === null ? null : agyPathRowKey(normalized, os);
}

/** 定義のオブジェクトの resources。配列でなければ空。 */
function definitionResources(definition: Record<string, unknown>): unknown[] {
    const holder = definition.projectResources;
    return isObject(holder) && Array.isArray(holder.resources) ? holder.resources : [];
}

/**
 * 変更しない定義の ID（既定のプロジェクト、cache/default_project_id.txt の値、outside-of-project、
 * config.json の sidecars.*.projectId）を返す。cache の ID や config.json を読めない場合は判定できないので null。
 */
async function protectedProjectIds(fs: HomeFs): Promise<Set<string> | null> {
    const ids = new Set(RESERVED_PROJECT_IDS);
    const defaultId = await fs.readTextStrict(DEFAULT_PROJECT_ID_REL);
    if (defaultId.kind === 'ok') {
        if (defaultId.text.trim().length > 0) ids.add(defaultId.text.trim());
    } else if (defaultId.kind !== 'missing' && defaultId.kind !== 'dangling-link') {
        return null;
    }
    const config = await fs.readTextStrict(AGY_SHARED_CONFIG_JSON_REL);
    if (config.kind === 'missing' || config.kind === 'dangling-link') return ids;
    if (config.kind !== 'ok') return null;
    const parsed = parseOrNull(config.text, AGY_SHARED_CONFIG_JSON_REL);
    if (parsed === null) return null;
    if (isObject(parsed.sidecars)) {
        for (const sidecar of Object.values(parsed.sidecars)) {
            if (isObject(sidecar) && typeof sidecar.projectId === 'string') ids.add(sidecar.projectId);
        }
    }
    return ids;
}

/**
 * conversations の各会話のメタデータを読む。.pb と、読めない .db、読み切れないメタデータの値は null。
 * 値が null の会話も会話が存在することを表すためにキーとして持つ。
 */
async function readConversations(
    probe: CleanupProbe,
    store: SqliteStore
): Promise<Map<string, AgyTrajectoryMetadata | null>> {
    const entries = await probe.listNested(await homePath(probe, CONVERSATIONS_REL), 1);
    const conversations = new Map<string, AgyTrajectoryMetadata | null>();
    const databases: { id: string; path: string }[] = [];
    for (const entry of entries) {
        const id = agyConversationIdOf(entry.rel);
        if (id === null || (!entry.rel.endsWith('.pb') && !entry.rel.endsWith('.db'))) continue;
        if (!conversations.has(id)) conversations.set(id, null);
        if (entry.rel.endsWith('.db') && entry.type === 'file') databases.push({ id, path: entry.path });
    }
    const blobs = await readAgyConversationBlobs(
        store,
        databases.map(database => database.path)
    );
    databases.forEach(({ id }, index) => {
        const blob = blobs[index];
        const metadata = blob ? readAgyTrajectoryMetadata(blob) : null;
        if (metadata?.complete) conversations.set(id, metadata);
    });
    return conversations;
}

/**
 * 各会話が属するパス（正規化済み）を求める。パスを読めない会話は null。
 * 自身以外のフィールド 6、次にフィールド 5 の会話が存在すれば、その会話に従う。フィールド 6 が自身なら最上位の会話として扱う。
 * たどる先が無ければ、フィールド 7 で空でない最初の値を使う。たどる先が循環している場合は null。
 */
function conversationPaths(
    conversations: ReadonlyMap<string, AgyTrajectoryMetadata | null>
): Map<string, string | null> {
    const paths = new Map<string, string | null>();
    const resolve = (id: string, visiting: ReadonlySet<string>): string | null => {
        const known = paths.get(id);
        if (known !== undefined) return known;
        const metadata = conversations.get(id);
        let path: string | null = null;
        if (metadata) {
            const owner = [metadata.rootConversationId, metadata.parentConversationId].find(
                target => target && (target === id || conversations.has(target))
            );
            if (owner && owner !== id) {
                path = visiting.has(owner) ? null : resolve(owner, new Set([...visiting, id]));
            } else {
                const first = metadata.workspaceUris.find(uri => uri.length > 0);
                path = first === undefined ? null : normalizeAgyWorkspaceUri(first);
            }
        }
        paths.set(id, path);
        return path;
    };
    for (const id of conversations.keys()) resolve(id, new Set([id]));
    return paths;
}

/** history.jsonl の 1 行を解析する。JSON のオブジェクトでなければ null。 */
function parseHistoryLine(line: Buffer): Record<string, unknown> | null {
    try {
        const parsed: unknown = JSON.parse(line.toString('utf8'));
        return isObject(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

/** バイト列を改行（LF）の直後で区切った行を順に返す。各行は改行を含む。 */
function* splitLines(bytes: Buffer): Generator<Buffer> {
    let start = 0;
    while (start < bytes.length) {
        const newline = bytes.indexOf(NEWLINE, start);
        const end = newline === -1 ? bytes.length : newline + 1;
        yield bytes.subarray(start, end);
        start = end;
    }
}

/**
 * 変更してよい定義を読み、ホーム相対パスと正規化した folderUri を返す。
 * 変更しない ID を判定できない場合、一覧できない場合、読めない定義と解析できない定義は含めない。
 */
async function readDefinitions(fs: HomeFs): Promise<{ rel: string; folders: string[] }[]> {
    const protectedIds = await protectedProjectIds(fs);
    if (protectedIds === null) return [];
    const listed = await fs.listEntries(AGY_PROJECT_DEFINITIONS_REL);
    if (listed.kind !== 'ok') return [];
    const result: { rel: string; folders: string[] }[] = [];
    for (const entry of listed.entries) {
        if (!entry.name.endsWith(DEFINITION_SUFFIX) || entry.kind !== 'file' || entry.isLink) continue;
        if (protectedIds.has(entry.name.slice(0, -DEFINITION_SUFFIX.length))) continue;
        const rel = `${AGY_PROJECT_DEFINITIONS_REL}/${entry.name}`;
        const read = await fs.readTextStrict(rel);
        if (read.kind !== 'ok') continue;
        const definition = parseOrNull(read.text, rel);
        if (definition === null) continue;
        if (typeof definition.id === 'string' && protectedIds.has(definition.id)) continue;
        const folders = definitionResources(definition).flatMap(resource => {
            const uri = isObject(resource) ? resource.folderUri : undefined;
            return (typeof uri === 'string' && normalizeAgyWorkspaceUri(uri)) || [];
        });
        result.push({ rel, folders });
    }
    return result;
}

/** history.jsonl の workspace を正規化して返す。 */
async function readHistoryPaths(fs: HomeFs): Promise<string[]> {
    const read = await fs.readTextStrict(HISTORY_REL);
    if (read.kind !== 'ok') return [];
    const paths: string[] = [];
    for (const line of splitLines(read.bytes)) {
        const workspace = parseHistoryLine(line)?.workspace;
        const normalized = typeof workspace === 'string' ? normalizeAgyPath(workspace) : null;
        if (normalized !== null) paths.push(normalized);
    }
    return paths;
}

/** cache/last_conversations.json のキーを正規化して返す。読めない、解析できない場合は空。 */
async function readLastConversationPaths(fs: HomeFs): Promise<string[]> {
    const read = await fs.readTextStrict(LAST_CONVERSATIONS_REL);
    if (read.kind !== 'ok') return [];
    const record = parseOrNull(read.text, LAST_CONVERSATIONS_REL);
    return record === null ? [] : Object.keys(record).flatMap(key => normalizeAgyPath(key) ?? []);
}

/**
 * 行の一覧を組み立てる。行は、会話のパス、変更してよい定義の folderUri、history.jsonl の workspace、
 * cache/last_conversations.json のキーの和集合で、正規化したパス 1 つにつき 1 行。親や子のフォルダにはまとめない。
 */
async function loadLayout(probe: CleanupProbe, fs: HomeFs, store: SqliteStore): Promise<ProjectLayout> {
    const rows = new Map<string, ProjectRow>();
    const rowOf = (normalized: string): ProjectRow => {
        const key = agyPathRowKey(normalized, probe.os);
        let row = rows.get(key);
        if (!row) {
            row = { display: agyPathDisplay(normalized, probe.os), conversationIds: [] };
            rows.set(key, row);
        }
        return row;
    };
    for (const [id, path] of conversationPaths(await readConversations(probe, store))) {
        if (path !== null) rowOf(path).conversationIds.push(id);
    }
    const definitions = await readDefinitions(fs);
    for (const definition of definitions) definition.folders.forEach(rowOf);
    (await readHistoryPaths(fs)).forEach(rowOf);
    (await readLastConversationPaths(fs)).forEach(rowOf);
    return { rows, definitions: definitions.map(definition => definition.rel) };
}

/** 定義から行のキーに一致する folderUri の要素だけを除く。残る要素が無くなれば定義のファイルを消す。 */
async function removeDefinitionFolders(
    fs: HomeFs,
    rel: string,
    keys: ReadonlySet<string>,
    os: CleanupProbe['os']
): Promise<void> {
    const matches = (resource: unknown) => {
        const key = resourceRowKey(resource, os);
        return key !== null && keys.has(key);
    };
    await editAgyFile(fs, rel, read => {
        if (!read.utf8Clean) throw new Error(`${rel} is not valid UTF-8`);
        const definition = parseJsoncObject(read.text);
        const resources = definitionResources(definition);
        const indexes = resources.flatMap((resource, index) => (matches(resource) ? [index] : []));
        if (indexes.length === 0) return null;
        if (indexes.length === resources.length) return { kind: 'delete' };
        const next = removeJsoncArrayElements(read.text, RESOURCES_PATH, indexes);
        const expected = {
            ...definition,
            projectResources: {
                ...(definition.projectResources as object),
                resources: resources.filter(resource => !matches(resource)),
            },
        };
        if (!strictDeepEqual(parseJsoncObject(next), expected)) {
            throw new Error(`Removing folders from ${rel} changed other values`);
        }
        return { kind: 'write', content: withBom(next, read.hadBom) };
    });
}

/**
 * history.jsonl から、workspace が行のキーに一致する行と conversationId が ids に含まれる行を除く。
 * それ以外の行は解析できない行を含めてバイト単位でそのまま残す。
 */
async function removeHistoryLines(
    fs: HomeFs,
    keys: ReadonlySet<string>,
    ids: ReadonlySet<string>,
    os: CleanupProbe['os']
): Promise<void> {
    await editAgyFile(fs, HISTORY_REL, read => {
        const kept: Buffer[] = [];
        let removed = false;
        for (const line of splitLines(read.bytes)) {
            const entry = parseHistoryLine(line);
            const normalized = typeof entry?.workspace === 'string' ? normalizeAgyPath(entry.workspace) : null;
            const matches =
                (normalized !== null && keys.has(agyPathRowKey(normalized, os))) ||
                (typeof entry?.conversationId === 'string' && ids.has(entry.conversationId));
            if (matches) removed = true;
            else kept.push(line);
        }
        return removed ? { kind: 'write', content: Buffer.concat(kept) } : null;
    });
}

/** 解析したオブジェクトを返す。解析できない場合はログを残して null。 */
function parseOrNull(text: string, rel: string): Record<string, unknown> | null {
    try {
        return parseJsoncObject(text);
    } catch (error) {
        console.error(`Failed to parse ${rel}:`, error);
        return null;
    }
}

/** cache/last_conversations.json から、行のキーに一致するキーだけを切り取る。解析できないファイルには触らない。 */
async function removeLastConversations(fs: HomeFs, keys: ReadonlySet<string>, os: CleanupProbe['os']): Promise<void> {
    await editAgyFile(fs, LAST_CONVERSATIONS_REL, read => {
        const record = read.utf8Clean ? parseOrNull(read.text, LAST_CONVERSATIONS_REL) : null;
        if (record === null) return null;
        const matched = Object.keys(record).filter(key => {
            const normalized = normalizeAgyPath(key);
            return normalized !== null && keys.has(agyPathRowKey(normalized, os));
        });
        if (matched.length === 0) return null;
        let next = read.text;
        for (const key of matched) next = removeJsoncProperty(next, [key], { cascade: false });
        const expected = { ...record };
        for (const key of matched) delete expected[key];
        if (!strictDeepEqual(parseJsoncObject(next), expected)) {
            throw new Error(`Removing keys from ${LAST_CONVERSATIONS_REL} changed other values`);
        }
        return { kind: 'write', content: withBom(next, read.hadBom) };
    });
}

/** 会話か要約の DB があるか。 */
async function hasConversationDatabases(probe: CleanupProbe): Promise<boolean> {
    const entries = await probe.listNested(await homePath(probe, CONVERSATIONS_REL), 1);
    if (entries.some(entry => entry.rel.endsWith('.db'))) return true;
    return (await probe.listNested(await homePath(probe, `${AGY_CLI_DIR}/${AGY_SUMMARIES_DB}`), 0)).length > 0;
}

/**
 * ワークスペースのパスごとの行の一覧と削除。行の名前は同一視のキーで、一覧ごとに解決し直す。
 * 消すものは、そのパスの会話と子会話（ファイルと付随データ）、history.jsonl の該当行、
 * cache/last_conversations.json の該当キー、変更してよい定義の該当フォルダ。
 * 会話か要約の DB があるのに distro の sqlite3 を使えない環境では、行と注記だけを出して削除しない。
 */
export function createAgyProjectHandler(detector: WslDetector): CleanupHandler {
    const blocked = async (env: AgentEnvironment) => {
        const block = sqliteBlockedNotice(await createSqliteStore(env, detector).availability());
        if (!block) return null;
        return (await hasConversationDatabases(createCleanupProbe(env, detector))) ? block : null;
    };
    return {
        blocked,
        async listChildren(env: AgentEnvironment): Promise<HandledChild[]> {
            const probe = createCleanupProbe(env, detector);
            const { rows } = await loadLayout(probe, new HomeFs(env, detector), createSqliteStore(env, detector));
            const ids = new Set([...rows.values()].flatMap(row => row.conversationIds));
            const totals = await measureAgyConversations(probe, ids);
            return [...rows].map(([name, row]) => {
                const sizes = row.conversationIds.map(id => totals.get(id));
                return {
                    name,
                    displayName: row.display,
                    size: sizes.reduce((sum, total) => sum + (total?.size ?? 0), 0),
                    fileCount: sizes.reduce((sum, total) => sum + (total?.fileCount ?? 0), 0),
                };
            });
        },
        async remove(env, names, _approved, failedPaths = []) {
            if (await blocked(env)) throw new Error('sqlite3 is not usable in this distro');
            const probe = createCleanupProbe(env, detector);
            const fs = new HomeFs(env, detector);
            const store = createSqliteStore(env, detector);
            const { rows, definitions } = await loadLayout(probe, fs, store);
            const selected = names === 'all' ? [...rows.keys()] : names.filter(name => rows.has(name));
            const skipped = new Set(names === 'all' ? [] : names.filter(name => !rows.has(name)));
            if (selected.length === 0) return [...skipped];
            const keys = new Set(selected);
            const ownerOf = new Map(
                selected.flatMap(name => (rows.get(name) as ProjectRow).conversationIds.map(id => [id, name] as const))
            );
            const ids = [...ownerOf.keys()];

            const left = await removeAgyConversations(
                store,
                probe,
                createAgyWorktreeRemover(env, detector),
                ids,
                failedPaths,
                fs
            );
            for (const id of left) skipped.add(ownerOf.get(id) as string);

            const edit = async (rel: string, operation: () => Promise<void>) => {
                try {
                    await operation();
                } catch (error) {
                    console.error(`Failed to update ${rel} (${JSON.stringify(env)}):`, error);
                    failedPaths.push(await fs.displayPath(rel));
                    selected.forEach(name => skipped.add(name));
                }
            };
            for (const rel of definitions) {
                await edit(rel, () => removeDefinitionFolders(fs, rel, keys, probe.os));
            }
            await edit(HISTORY_REL, () => removeHistoryLines(fs, keys, new Set(ids), probe.os));
            await edit(LAST_CONVERSATIONS_REL, () => removeLastConversations(fs, keys, probe.os));
            return [...skipped];
        },
    };
}
