import {
    GROK_DIR,
    GROK_PROJECT_GRANTS_CLEANUP_KEY,
    GROK_PROJECT_MEMORY_CLEANUP_KEY,
    GROK_PROJECT_RECORDS_CLEANUP_KEY,
} from '../../../shared/agents/grok/constants';
import type { AgentEnvironment, CleanupChildBadge } from '../../../shared/agents/types';
import type { CleanupProbe, ProbeEntry, RemoveTarget } from '../common/cleanup/CleanupProbe';
import { homePath, type CandidateSource } from '../common/cleanup/resolvedCleanup';
import type { HomeFs } from '../common/wsl/HomeFs';
import { readGitOrigins } from './grokGitOrigin';
import {
    decodeGrokSessionDirName,
    GrokPathBook,
    grokMemoryScopeOfRemote,
    grokMemoryScopesOfPath,
    grokPathKey,
    isGrokAbsolutePath,
    isGrokSubpathKey,
    parseGrokCwdFile,
    parseGrokPromptContextScope,
    parseGrokSummaryCwd,
    parseGrokSummaryRemotes,
} from './grokProjectPaths';
import {
    GROK_TRUSTED_FOLDERS_REL,
    readGrokTrustRecords,
    removeGrokTrustRecords,
    type GrokTrustRecord,
} from './grokTrustedFolders';

const SESSIONS_REL = `${GROK_DIR}/sessions`;
const MEMORY_WORKSPACES_REL = `${GROK_DIR}/memory-v2/workspaces`;
const LEGACY_MEMORY_REL = `${GROK_DIR}/memory`;
// プロジェクトのメモリとして扱わないスコープ。
const GLOBAL_MEMORY_SCOPE = 'global';
// sessions/<符号化したパス> 直下の、プロジェクト別の許可のファイル。
const PERMISSION_FILE = /^permission.*\.toml$/;
const SANDBOX_GRANTS_FILE = 'sandbox_grants.toml';
// sessions/<符号化したパス> 直下の、元のパスを持つファイル。
const CWD_FILE = '.cwd';
const CWD_MAX_BYTES = 64 * 1024;
// セッションの中で読むファイルの名前。
const SUMMARY_FILE = 'summary.json';
const PROMPT_CONTEXT_FILE = 'prompt_context.json';
// セッションのファイルを読む上限。切れたファイルは解析できないので、読めなかったものとして扱う。
const SESSION_FILE_MAX_BYTES = 2 * 1024 * 1024;
// セッションのファイルを 1 回にまとめて読む数。
const SESSION_READ_BATCH = 32;
// パスを特定できないメモリの印の文言。
const MEMORY_PATH_UNKNOWN_LABEL_KEY = 'grok.cleanup.memoryPathUnknown';

/** 1 回のスキャン・削除で共有する環境の操作と、走査の結果。 */
export interface GrokCleanupContext {
    probe: CleanupProbe;
    fs: HomeFs;
    env: AgentEnvironment;
    layout?: Promise<GrokLayout>;
}

/** sessions 直下のディレクトリ 1 つ。 */
interface SessionDir {
    name: string;
    path: string;
    // 特定できた元のパスの綴り（特定できなければ null）
    spelling: string | null;
    size: number;
    fileCount: number;
    // プロジェクト別の許可のファイル
    grantFiles: ProbeEntry[];
    // 各セッションのディレクトリ
    sessionPaths: string[];
}

/** 同じパスのディレクトリをまとめた行。key は照合キーで、パスを特定できない行はディレクトリ名。 */
interface SessionRow {
    key: string;
    pathUnknown: boolean;
    dirs: SessionDir[];
    sessionPaths: string[];
}

/** メモリのスコープ 1 つ。 */
interface MemoryScope {
    name: string;
    // memory-v2/workspaces/<name> と memory/<name>
    entries: ProbeEntry[];
    // 対応するパスの照合キー
    keys: Set<string>;
}

interface GrokLayout {
    records: GrokTrustRecord[];
    rows: SessionRow[];
    book: GrokPathBook;
    scopes: MemoryScope[];
}

/** 削除の結果。skipped は消せなかった子要素名、failedPaths は残ったパス。 */
export interface GrokRemoval {
    skipped: string[];
    failedPaths: string[];
}

/**
 * 項目ごとのセッションのファイルを、各項目から順番に少しずつまとめて読む。extract が真を返した項目は
 * 以降のセッションを読まない。まとめて読むごとに stop を確かめ、真なら打ち切る。
 */
async function readSessionFiles<T extends { sessionPaths: readonly string[] }>(
    probe: CleanupProbe,
    items: readonly T[],
    fileName: string,
    extract: (text: string, item: T) => boolean,
    stop: () => boolean = () => false
): Promise<void> {
    const cursors = new Map(items.map(item => [item, 0]));
    while (!stop()) {
        const batch: { item: T; path: string }[] = [];
        let added = true;
        while (added && batch.length < SESSION_READ_BATCH) {
            added = false;
            for (const [item, cursor] of cursors) {
                if (batch.length >= SESSION_READ_BATCH || cursor >= item.sessionPaths.length) continue;
                batch.push({ item, path: probe.join(item.sessionPaths[cursor], fileName) });
                cursors.set(item, cursor + 1);
                added = true;
            }
        }
        if (batch.length === 0) return;
        const heads = await probe.readHeads(
            batch.map(entry => entry.path),
            SESSION_FILE_MAX_BYTES
        );
        batch.forEach(({ item }, i) => {
            const head = heads[i];
            if (head && extract(head.toString('utf8'), item)) cursors.delete(item);
        });
    }
}

/** sessions 直下のディレクトリを一覧し、ディレクトリ名、.cwd、summary.json の info.cwd の順に元のパスを読む。 */
async function readSessionDirs(probe: CleanupProbe): Promise<SessionDir[]> {
    const root = await homePath(probe, SESSIONS_REL);
    const listed = (await probe.listNested(root, 1)).filter(entry => entry.type === 'dir');
    const contents = await probe.listEach(listed.map(entry => entry.path));
    const dirs = listed.map((entry, i): SessionDir => {
        const children = contents[i] ?? [];
        return {
            name: entry.rel,
            path: entry.path,
            spelling: decodeGrokSessionDirName(probe.os, entry.rel),
            size: children.reduce((sum, child) => sum + child.size, 0),
            fileCount: children.reduce((sum, child) => sum + child.fileCount, 0),
            grantFiles: children.filter(
                child =>
                    child.type === 'file' && (child.name === SANDBOX_GRANTS_FILE || PERMISSION_FILE.test(child.name))
            ),
            sessionPaths: children.filter(child => child.type === 'dir').map(child => child.path),
        };
    });

    const withoutName = dirs.filter(dir => dir.spelling === null);
    const cwdHeads = await probe.readHeads(
        withoutName.map(dir => probe.join(dir.path, CWD_FILE)),
        CWD_MAX_BYTES
    );
    withoutName.forEach((dir, i) => {
        const head = cwdHeads[i];
        dir.spelling = head ? parseGrokCwdFile(probe.os, head.toString('utf8')) : null;
    });
    await readSessionFiles(
        probe,
        withoutName.filter(dir => dir.spelling === null),
        SUMMARY_FILE,
        (text, dir) => {
            dir.spelling ??= parseGrokSummaryCwd(probe.os, text);
            return dir.spelling !== null;
        }
    );
    return dirs;
}

/** 同じパスのディレクトリを 1 行にまとめる。パスを特定できないディレクトリはそれぞれ 1 行にする。 */
function toSessionRows(os: CleanupProbe['os'], dirs: readonly SessionDir[], book: GrokPathBook): SessionRow[] {
    const rows = new Map<string, SessionRow>();
    for (const dir of dirs) {
        if (dir.spelling !== null) book.addPath(dir.spelling);
        const key = dir.spelling !== null ? grokPathKey(os, dir.spelling) : dir.name;
        const row = rows.get(key) ?? { key, pathUnknown: dir.spelling === null, dirs: [], sessionPaths: [] };
        row.dirs.push(dir);
        row.sessionPaths.push(...dir.sessionPaths);
        rows.set(key, row);
    }
    return [...rows.values()];
}

/** memory-v2/workspaces のスコープを、同名の旧メモリと一緒に一覧する。global は含めない。 */
async function readMemoryScopes(probe: CleanupProbe): Promise<MemoryScope[]> {
    const listed = await probe.list(await homePath(probe, MEMORY_WORKSPACES_REL), name => name !== GLOBAL_MEMORY_SCOPE);
    const dirs = listed.filter(entry => entry.type === 'dir');
    if (dirs.length === 0) return [];
    const names = new Set(dirs.map(dir => dir.name));
    const legacy = await probe.list(await homePath(probe, LEGACY_MEMORY_REL), name => names.has(name));
    return dirs.map(dir => ({
        name: dir.name,
        entries: [dir, ...legacy.filter(entry => entry.name === dir.name)],
        keys: new Set<string>(),
    }));
}

/**
 * セッションに記録された memory_workspace_path で、スコープとパスを対応付ける。パスごとに対応が取れたら
 * 以降のセッションを読まず、すべてのスコープに対応が付けば打ち切る。内容はこの項目以外を使わない。
 * 対応が取れたパスの照合キーを返す。
 */
async function mapScopesByPromptContext(
    probe: CleanupProbe,
    rows: readonly SessionRow[],
    scopes: readonly MemoryScope[]
): Promise<Set<string>> {
    const byName = new Map(scopes.map(scope => [scope.name, scope]));
    const mapped = new Set<string>();
    await readSessionFiles(
        probe,
        rows.filter(row => !row.pathUnknown),
        PROMPT_CONTEXT_FILE,
        (text, row) => {
            const name = parseGrokPromptContextScope(text);
            const scope = name !== null ? byName.get(name) : undefined;
            if (!scope) return false;
            scope.keys.add(row.key);
            mapped.add(row.key);
            return true;
        },
        () => scopes.every(scope => scope.keys.size > 0)
    );
    return mapped;
}

/**
 * パスの原文、.git/config の origin、summary.json の git_remotes からスコープ名を計算し、実在するスコープと
 * 一致したものだけを対応付ける。一致しないものは対応付けないので、入力の規則が違っていてもパス不明のままになる。
 */
async function mapScopesByHash(
    probe: CleanupProbe,
    rows: readonly SessionRow[],
    book: GrokPathBook,
    scopes: readonly MemoryScope[],
    alreadyMapped: ReadonlySet<string>
): Promise<void> {
    const byName = new Map(scopes.map(scope => [scope.name, scope]));
    const adopt = (key: string, name: string | null) => {
        if (name !== null) byName.get(name)?.keys.add(key);
    };
    const keys = book.keys();
    const origins = await readGitOrigins(
        probe,
        keys.flatMap(key => book.spellings(key))
    );
    for (const key of keys) {
        for (const spelling of book.spellings(key)) {
            for (const name of grokMemoryScopesOfPath(probe.os, spelling)) adopt(key, name);
            for (const url of origins.get(spelling) ?? []) adopt(key, grokMemoryScopeOfRemote(url));
        }
    }
    await readSessionFiles(
        probe,
        rows.filter(row => !row.pathUnknown && !alreadyMapped.has(row.key)),
        SUMMARY_FILE,
        (text, row) => {
            const urls = parseGrokSummaryRemotes(text);
            for (const url of urls) adopt(row.key, grokMemoryScopeOfRemote(url));
            return urls.length > 0;
        }
    );
}

/** 例外の 1 行目（パーサーのメッセージは 2 行目以降にファイル本文の抜粋を含む）。 */
function firstLine(error: unknown): string {
    return (error instanceof Error ? error.message : String(error)).split('\n')[0];
}

/** 信頼の記録を読む。読めない場合はログを残して空にする（他の行の表示を止めない）。 */
async function readTrustRecordsSafely(context: GrokCleanupContext): Promise<GrokTrustRecord[]> {
    try {
        return await readGrokTrustRecords(context.fs);
    } catch (error) {
        console.error(`Failed to read Grok trusted folders (${JSON.stringify(context.env)}): ${firstLine(error)}`);
        return [];
    }
}

async function buildLayout(context: GrokCleanupContext): Promise<GrokLayout> {
    const { probe } = context;
    const book = new GrokPathBook(probe.os);
    const records = await readTrustRecordsSafely(context);
    for (const record of records) {
        if (isGrokAbsolutePath(probe.os, record.key)) book.addRecordKey(record.key);
    }
    const rows = toSessionRows(probe.os, await readSessionDirs(probe), book);
    const scopes = await readMemoryScopes(probe);
    if (scopes.length > 0) {
        const mapped = await mapScopesByPromptContext(probe, rows, scopes);
        await mapScopesByHash(probe, rows, book, scopes, mapped);
    }
    return { records, rows, book, scopes };
}

/** 走査の結果を返す。同じコンテキストでは 1 度だけ走査する。 */
function loadLayout(context: GrokCleanupContext): Promise<GrokLayout> {
    context.layout ??= buildLayout(context);
    return context.layout;
}

/** 行の表示に使う名前。パスを特定できない行は識別子をそのまま表示する。 */
function rowDisplayName(row: SessionRow, book: GrokPathBook): { displayName?: string; pathUnknown?: boolean } {
    return row.pathUnknown ? { pathUnknown: true } : { displayName: book.display(row.key) };
}

/** 走査に失敗したらログを残して空にする行の解決。 */
async function resolveRows(
    context: GrokCleanupContext,
    label: string,
    resolve: () => Promise<CandidateSource[]>
): Promise<CandidateSource[]> {
    try {
        return await resolve();
    } catch (error) {
        console.error(`Failed to resolve Grok ${label} (${JSON.stringify(context.env)}):`, error);
        return [];
    }
}

/**
 * 対象をまとめて削除する。選ばれた行のうち残ったものがある行と、一覧に無い名前を skipped に、残ったパスを failedPaths に入れる。
 */
async function removeRows(
    context: GrokCleanupContext,
    rows: readonly { name: string; targets: readonly RemoveTarget[] }[],
    names: 'all' | readonly string[]
): Promise<GrokRemoval> {
    const wanted = names === 'all' ? null : new Set(names);
    const chosen = rows.filter(row => !wanted || wanted.has(row.name));
    const left = await context.probe.removeReporting(chosen.flatMap(row => row.targets));
    const known = new Set(rows.map(row => row.name));
    const unmatched = names === 'all' ? [] : names.filter(name => !known.has(name));
    const removal: GrokRemoval = { skipped: [...unmatched], failedPaths: [] };
    let index = 0;
    for (const row of chosen) {
        const remaining = left.slice(index, index + row.targets.length).flat();
        index += row.targets.length;
        if (remaining.length > 0) {
            console.error(`Failed to remove ${row.name} (${JSON.stringify(context.env)})`);
            removal.skipped.push(row.name);
            removal.failedPaths.push(...remaining);
        }
    }
    return removal;
}

/** 行を走査して削除する。走査に失敗したら何も消さず、選択全体（'all' は候補キー）を消せなかったものとして返す。 */
async function removeResolved(
    context: GrokCleanupContext,
    key: string,
    names: 'all' | readonly string[],
    toRows: (layout: GrokLayout) => { name: string; targets: RemoveTarget[] }[]
): Promise<GrokRemoval> {
    let layout: GrokLayout;
    try {
        layout = await loadLayout(context);
    } catch (error) {
        console.error(`Failed to resolve Grok ${key} (${JSON.stringify(context.env)}):`, error);
        return { skipped: names === 'all' ? [key] : [...names], failedPaths: [] };
    }
    return removeRows(context, toRows(layout), names);
}

// ------------------------------------------------------------
// セッション
// ------------------------------------------------------------

/** セッションの行。同じパスのディレクトリは 1 行で、許可のファイルの件数を添える。 */
export function resolveGrokSessionRows(context: GrokCleanupContext): Promise<CandidateSource[]> {
    return resolveRows(context, 'sessions', async () => {
        const { rows, book } = await loadLayout(context);
        return rows.map((row): CandidateSource => {
            const grants = row.dirs.reduce((sum, dir) => sum + dir.grantFiles.length, 0);
            return {
                name: row.key,
                ...rowDisplayName(row, book),
                badges: grants > 0 ? [{ key: 'grants', count: grants }] : [],
                size: row.dirs.reduce((sum, dir) => sum + dir.size, 0),
                fileCount: row.dirs.reduce((sum, dir) => sum + dir.fileCount, 0),
            };
        });
    });
}

/** 選ばれたセッションの行のディレクトリを、配下ごと削除する。 */
export function removeGrokSessionRows(
    context: GrokCleanupContext,
    key: string,
    names: readonly string[]
): Promise<GrokRemoval> {
    return removeResolved(context, key, names, ({ rows }) =>
        rows.map(row => ({
            name: row.key,
            targets: row.dirs.map((dir): RemoveTarget => ({ path: dir.path, type: 'dir' })),
        }))
    );
}

// ------------------------------------------------------------
// プロジェクト記録
// ------------------------------------------------------------

/** キーの文字列を照合キーでまとめた行。パスの形でないキーは、キーの原文を「パス不明」として表示する。 */
function resolveGrokRecordRows(context: GrokCleanupContext): Promise<CandidateSource[]> {
    return resolveRows(context, 'project records', async () => {
        const { probe } = context;
        const { records, book } = await loadLayout(context);
        const groups = new Map<string, { raw: string; keys: number; trusted: number; untrusted: number }>();
        for (const record of records) {
            const key = grokPathKey(probe.os, record.key);
            if (key.length === 0) continue;
            const group = groups.get(key) ?? { raw: record.key, keys: 0, trusted: 0, untrusted: 0 };
            group.keys += 1;
            if (record.trusted === true) group.trusted += 1;
            if (record.trusted === false) group.untrusted += 1;
            groups.set(key, group);
        }
        return [...groups].map(([key, group]): CandidateSource => {
            const countOf = (count: number) => (group.keys > 1 ? { count } : {});
            const unset = group.keys - group.trusted - group.untrusted;
            const badges: CleanupChildBadge[] = [
                ...(group.trusted > 0 ? [{ key: 'trusted' as const, ...countOf(group.trusted) }] : []),
                ...(group.untrusted > 0 ? [{ key: 'untrusted' as const, ...countOf(group.untrusted) }] : []),
                ...(unset > 0 ? [{ key: 'trustUnset' as const, ...countOf(unset) }] : []),
                ...(group.keys > 1 ? [{ key: 'duplicateKeys' as const, count: group.keys }] : []),
            ];
            const isPath = isGrokAbsolutePath(probe.os, group.raw);
            return {
                name: key,
                displayName: isPath ? book.display(key) : group.raw,
                ...(isPath ? {} : { pathUnknown: true }),
                badges,
                size: 0,
                fileCount: 1,
                sizeUnknown: true,
            };
        });
    });
}

/**
 * 信頼の記録から、選ばれた行のキーのテーブルをまとめて削除する。ロックは取らない。
 * 一致するキーが無い名前は消せなかったものとして返す。削除できなかった場合は選択全体（'all' は候補キー）と、ファイルのパスを返す。
 */
async function removeGrokRecordRows(
    context: GrokCleanupContext,
    key: string,
    names: 'all' | readonly string[]
): Promise<GrokRemoval> {
    const { probe, fs } = context;
    const wanted = names === 'all' ? null : new Set(names);
    const matched = new Set<string>();
    try {
        await removeGrokTrustRecords(fs, recordKey => {
            const compareKey = grokPathKey(probe.os, recordKey);
            const hit = compareKey.length > 0 && (!wanted || wanted.has(compareKey));
            if (hit) matched.add(compareKey);
            return hit;
        });
        return { skipped: names === 'all' ? [] : names.filter(name => !matched.has(name)), failedPaths: [] };
    } catch (error) {
        console.error(`Failed to remove Grok trusted folders (${JSON.stringify(context.env)}): ${firstLine(error)}`);
        return {
            skipped: names === 'all' ? [key] : [...names],
            failedPaths: [await fs.displayPath(GROK_TRUSTED_FOLDERS_REL)],
        };
    }
}

// ------------------------------------------------------------
// プロジェクト別の許可
// ------------------------------------------------------------

/** 行の許可のファイルの名前（重複なし・並べ替え済み）。 */
function grantFileNames(row: SessionRow): string[] {
    return [...new Set(row.dirs.flatMap(dir => dir.grantFiles.map(file => file.name)))].sort();
}

/**
 * 許可のファイルがあるパスの行。下位フォルダに permission*.toml がある行は、削除の確認で一緒に消せるように添える
 * （上位の許可が無くなると、下位フォルダの旧形式のファイルが再び効く可能性がある）。
 */
function resolveGrokGrantRows(context: GrokCleanupContext): Promise<CandidateSource[]> {
    return resolveRows(context, 'project grants', async () => {
        const { probe } = context;
        const { rows, book } = await loadLayout(context);
        const withGrants = rows.filter(row => row.dirs.some(dir => dir.grantFiles.length > 0));
        return withGrants.map((row): CandidateSource => {
            const files = row.dirs.flatMap(dir => dir.grantFiles);
            const related = row.pathUnknown
                ? []
                : withGrants.filter(
                      other =>
                          !other.pathUnknown &&
                          isGrokSubpathKey(probe.os, row.key, other.key) &&
                          grantFileNames(other).some(name => PERMISSION_FILE.test(name))
                  );
            return {
                name: row.key,
                ...rowDisplayName(row, book),
                size: files.reduce((sum, file) => sum + file.size, 0),
                fileCount: files.length,
                relatedChildren: related.map(other => ({
                    name: other.key,
                    label: book.display(other.key),
                    files: grantFileNames(other),
                })),
            };
        });
    });
}

/** 選ばれたパスの許可のファイルだけを削除する。.lock、.cwd とセッションは残す。 */
function removeGrokGrantRows(
    context: GrokCleanupContext,
    key: string,
    names: 'all' | readonly string[]
): Promise<GrokRemoval> {
    return removeResolved(context, key, names, ({ rows }) =>
        rows.map(row => ({
            name: row.key,
            targets: row.dirs.flatMap(dir =>
                dir.grantFiles.map((file): RemoveTarget => ({ path: file.path, type: 'file' }))
            ),
        }))
    );
}

// ------------------------------------------------------------
// プロジェクトメモリ
// ------------------------------------------------------------

/** スコープごとの行。対応するパスを表示し、複数あれば確認に列挙する。対応が取れないものはスコープ名で表示する。 */
function resolveGrokMemoryRows(context: GrokCleanupContext): Promise<CandidateSource[]> {
    return resolveRows(context, 'project memory', async () => {
        const { scopes, book } = await loadLayout(context);
        return scopes.map((scope): CandidateSource => {
            const paths = [...scope.keys].map(key => book.display(key)).sort();
            return {
                name: scope.name,
                ...(paths.length > 0
                    ? { displayName: paths.join('\n') }
                    : { pathUnknown: true, pathUnknownLabelKey: MEMORY_PATH_UNKNOWN_LABEL_KEY }),
                ...(paths.length > 1 ? { sharedPaths: paths } : {}),
                size: scope.entries.reduce((sum, entry) => sum + entry.size, 0),
                fileCount: scope.entries.reduce((sum, entry) => sum + entry.fileCount, 0),
            };
        });
    });
}

/** 選ばれたスコープの memory-v2/workspaces/<name> と memory/<name> を丸ごと削除する。 */
function removeGrokMemoryRows(
    context: GrokCleanupContext,
    key: string,
    names: 'all' | readonly string[]
): Promise<GrokRemoval> {
    return removeResolved(context, key, names, ({ scopes }) =>
        scopes.map(scope => ({
            name: scope.name,
            targets: scope.entries.map((entry): RemoveTarget => ({ path: entry.path, type: 'dir' })),
        }))
    );
}

/** プロジェクト単位の候補の行の解決と削除（候補キー → 処理）。 */
export const GROK_PROJECT_CLEANUPS: Record<
    string,
    {
        rows: (context: GrokCleanupContext) => Promise<CandidateSource[]>;
        remove: (context: GrokCleanupContext, key: string, names: 'all' | readonly string[]) => Promise<GrokRemoval>;
    }
> = {
    [GROK_PROJECT_RECORDS_CLEANUP_KEY]: { rows: resolveGrokRecordRows, remove: removeGrokRecordRows },
    [GROK_PROJECT_GRANTS_CLEANUP_KEY]: { rows: resolveGrokGrantRows, remove: removeGrokGrantRows },
    [GROK_PROJECT_MEMORY_CLEANUP_KEY]: { rows: resolveGrokMemoryRows, remove: removeGrokMemoryRows },
};
