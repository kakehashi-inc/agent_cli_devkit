import {
    CLAUDE_CODE_CONFIG_FILENAME,
    CLAUDE_DIR,
    CLAUDE_TEMP_CLEANUP_KEYS,
} from '../../../shared/agents/claude/constants';
import type {
    AgentEnvironment,
    CleanupChild,
    CleanupChildBadge,
    CleanupInUseSession,
} from '../../../shared/agents/types';
import { wyhash64 } from '../../utils/wyhash';
import type { CleanupProbe, ProbeEntry, ProbeEntryType, RemoveTarget } from '../common/cleanup/CleanupProbe';
import {
    MINUTE_MS,
    type CandidateSource,
    type CleanupResolver,
    type ResolvedChild,
} from '../common/cleanup/resolvedCleanup';
import type { HomeFs } from '../common/wsl/HomeFs';
import { resolveClaudeGlobalConfigRel } from './claudeGlobalConfig';
import {
    ProjectPathBook,
    ancestorPaths,
    isAbsolutePathOn,
    pathCompareKey,
    projectNameCandidates,
    projectNameKey,
    readHistoryProjects,
    readSessionCwd,
} from './claudeProjectPaths';
import { readClaudeRecordIndex, removeClaudeRecordKeys, type ClaudeRecordIndex } from './claudeProjectRecords';

// ~/.claude 配下の構成
const PROJECTS_DIR = 'projects';
const SESSIONS_DIR = 'sessions';
const SETTINGS_FILE = 'settings.json';
const HISTORY_FILE = 'history.jsonl';
// プロジェクトの自動メモリ（~/.claude/projects/<プロジェクト名>/memory）
const MEMORY_DIR = 'memory';
// 一時ルート（Windows は <一時フォルダ>/claude、それ以外は <一時フォルダ>/claude-<uid>）
const WINDOWS_TEMP_ROOT = 'claude';
const POSIX_TEMP_ROOT = /^claude-\d+$/;
const BASH_EDIT_DIFF_DIR = 'bash-edit-diff';
const BUNDLED_SKILLS_DIR = 'bundled-skills';
// MCP ログのキャッシュ（env-paths の claude-cli-nodejs）
const CACHE_APP_DIR = 'claude-cli-nodejs';

const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TRANSCRIPT_FILE = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/i;
// セッションのエントリ（<セッション ID>.jsonl、<セッション ID>.orphaned-*.jsonl、<セッション ID>.jsonl.superseded-*、<セッション ID>/）
const SESSION_ENTRY = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\.|$)/i;
// <セッション ID の wyhash（10 進）>-<数値>-<16 桁の 16 進>。先頭がセッション ID そのものの形式も受け付ける。
const BASH_EDIT_DIFF_ENTRY = /^([0-9a-f-]+)-\d+-[0-9a-f]{16}$/;
// 実行中セッションの登録（<pid>.json）
const REGISTRATION_FILE = /^\d+\.json$/;
const REGISTRATION_MAX_BYTES = 64 * 1024;
const SETTINGS_MAX_BYTES = 1024 * 1024;
const HISTORY_MAX_BYTES = 16 * 1024 * 1024;
// 会話記録の作業フォルダを読むときに読む先頭と末尾の大きさ
const SESSION_SCAN_BYTES = 64 * 1024;
// 会話記録（<セッション ID>.jsonl か <セッション ID>/ 配下のファイル）がこの時間内に更新されたセッションは、
// 登録が無くても実行中として扱う。~/.claude/sessions に登録を書かない Claude Code のセッションを、
// 実行中の会話が会話記録を書き続けることから検出する。
const RECENT_SESSION_MS = 10 * MINUTE_MS;
// 実行中のセッションを判定できないプロジェクトの、すべてのセッションを表す識別子（CleanupInUseSession.id）
const ALL_SESSIONS_ID = '*';

/** スキャンと削除に使う環境ごとの操作。probe ごとに構成を 1 度だけ調べる。 */
export interface ClaudeCleanupContext {
    probe: CleanupProbe;
    // WSL 環境のときの Windows 側。そこに登録されたセッションも実行中として扱う
    hostProbe: CleanupProbe | null;
    fs: HomeFs;
}

/** 行に属する、~/.claude/projects/<プロジェクト名> 直下のエントリ。memory は含めない。 */
interface ProjectRecordEntry extends ResolvedChild {
    // セッションのエントリならセッション ID（小文字）
    sessionId?: string;
}

/**
 * プロジェクト行（ワークスペースのパス 1 つ、またはパスを特定できないプロジェクト名 1 つ）と、紐づく ~/.claude 外の一時物。
 * 実行中のセッションは、~/.claude/sessions に登録されたセッションと、会話記録が RECENT_SESSION_MS 以内に更新された
 * セッション。利用者が削除を承認した行は、実行中のセッションが無いものとして扱う。行の状態は次のいずれか。
 * - 実行中のセッションが無い: エントリをすべて削除の対象にする（historyTargets）。
 * - 実行中のセッションがある: 使用中の可能性がある行として削除しない。そのセッションのエントリとリンクを、使用中の
 *   可能性があるものとして数える（少なくとも 1 件）。
 * - 実行中のセッションを判定できない（登録や一覧を読めない）: 使用中の可能性がある行として削除しない。全体を 1 件として数える。
 */
export interface ClaudeProjectGroup {
    // 行の識別子（パスの比較キー。パスを特定できない行はプロジェクト名）
    name: string;
    // name の比較キー
    key: string;
    pathUnknown: boolean;
    // 行が属するプロジェクト名のディレクトリ
    slugs: Set<SlugState>;
    // 行に属するエントリ
    records: ProjectRecordEntry[];
    // エントリのうち削除の対象にするもの
    historyTargets: ProjectRecordEntry[];
    // エントリのうち使用中の可能性があるものの件数
    keptHistory: number;
    // 一覧できなかったプロジェクト名のディレクトリ
    unlisted: string[];
    // セッションの作業フォルダ・bash-edit-diff・MCP ログ。実行中のセッションのものは in-use。
    parts: ResolvedChild[];
    // 使用中の判定の前の MCP ログ
    mcpLogs: ResolvedChild[];
    // エントリ・一時物を残す根拠になったセッション（識別子 → セッション）
    inUseSessions: Map<string, CleanupInUseSession>;
}

/** プロジェクト名 1 つ分の状態。別のパスが同じプロジェクト名になると、複数の行に分かれる。 */
interface SlugState {
    name: string;
    key: string;
    // ~/.claude/projects/<プロジェクト名>（無ければ null）
    path: string | null;
    // 直下を一覧できたか
    listed: boolean;
    // memory のエントリ（無ければ null）
    memory: ProbeEntry | null;
    // memory 以外のエントリ
    entries: ProbeEntry[];
    // エントリが何も無いか、唯一のエントリが何も入っていない memory か。消せるように行に出す
    empty: boolean;
    // セッション ID → 作業フォルダの比較キー（プロジェクト名と一致したものだけ）
    sessionPaths: Map<string, string>;
    // 会話記録から得た作業フォルダの比較キー
    paths: Set<string>;
    // このプロジェクト名に属する行
    rows: Set<ClaudeProjectGroup>;
    // セッション ID → 行
    sessionRows: Map<string, ClaudeProjectGroup>;
    // どのパスのものか分けられない MCP ログ。この名前の行をすべて消すときだけ消す
    sharedLogs: ResolvedChild[];
    // 一時ルート配下の <プロジェクト名> ディレクトリ（作業フォルダの削除後に空なら削除する）
    tempDirs: string[];
}

/** 実行中として扱うセッション。 */
interface RunningSession {
    // 小文字のセッション ID。セッション ID の無い登録は 'pid:<pid>'
    id: string;
    reason: Exclude<CleanupInUseSession['reason'], 'unknown'>;
    title?: string;
    // セッション ID の wyhash（10 進）。セッション ID の無い登録は undefined
    hash?: string;
    // セッションがあるプロジェクト名（登録の作業フォルダと会話記録の場所。比較用にそろえたもの）
    projects: Set<string>;
    // 登録の作業フォルダの比較キー
    cwdKeys: Set<string>;
}

/** プロジェクトメモリの行 1 件。 */
interface ClaudeMemoryRow {
    // プロジェクト名
    name: string;
    key: string;
    // memory の実パスと、それを含むプロジェクト名のディレクトリ
    path: string;
    slugPath: string;
    size: number;
    fileCount: number;
    // 一致したパスの比較キー
    pathKeys: string[];
}

interface ClaudeTempLayout {
    book: ProjectPathBook;
    groups: ClaudeProjectGroup[];
    memories: ClaudeMemoryRow[];
    recordIndex: ClaudeRecordIndex;
    bundledSkills: ResolvedChild[];
    bashEditDiff: ResolvedChild[];
}

interface Registrations {
    // 実行中として登録されたセッション
    sessions: RunningSession[];
    // 実行中として登録されたセッションのバージョン
    versions: Set<string>;
    // 登録の作業フォルダ（原文）
    cwds: Set<string>;
    // すべての登録を読めたか。一覧できない・読めない・解析できない登録があれば false（実行中のセッションが分からない）。
    complete: boolean;
}

// 1 回のスキャン・削除（同じ probe）で構成を 1 度だけ調べる
const layouts = new WeakMap<CleanupProbe, Promise<ClaudeTempLayout>>();

/**
 * Claude Code の会話履歴と ~/.claude 外の一時物の構成を調べる（同じ probe では最初の呼び出しの結果を使い回す）。
 * approved のプロジェクト行（利用者が削除を承認したもの）は、実行中のセッションが無いものとして扱う。
 */
function loadLayout(context: ClaudeCleanupContext, approved: readonly string[] = []): Promise<ClaudeTempLayout> {
    let layout = layouts.get(context.probe);
    if (!layout) {
        layout = buildLayout(context, approved);
        layouts.set(context.probe, layout);
    }
    return layout;
}

/**
 * 利用者の承認を反映した構成を調べておく。同じ probe の以後の処理はこの結果を使う。
 * 失敗は構成を使う処理がそれぞれ報告するので、ここでは投げない。
 */
export async function prepareClaudeLayout(context: ClaudeCleanupContext, approved: readonly string[]): Promise<void> {
    await loadLayout(context, approved).catch(() => undefined);
}

/** セッション ID から bash-edit-diff の名前の先頭に使われる値（wyhash の 10 進）を求める。 */
function sessionHash(sessionId: string): string {
    return wyhash64(sessionId.toLowerCase()).toString();
}

function toChild(entry: ProbeEntry, name = entry.path): ResolvedChild {
    return { name, path: entry.path, type: 'dir', size: entry.size, fileCount: entry.fileCount };
}

/** 作業フォルダの絶対パスを符号化したプロジェクト名か（英数字以外は '-'。先頭はドライブ・UNC・'/' 由来）。 */
function isEncodedProjectName(probe: CleanupProbe, name: string): boolean {
    return (probe.os === 'win32' ? /^(?:[A-Za-z]-)?-[A-Za-z0-9-]*$/ : /^-[A-Za-z0-9-]*$/).test(name);
}

/** ~/.claude/settings.json の env.CLAUDE_CODE_TMPDIR。無ければ ''。 */
async function settingsTmpdir(probe: CleanupProbe, claudeDir: string): Promise<string> {
    const [head] = await probe.readHeads([probe.join(claudeDir, SETTINGS_FILE)], SETTINGS_MAX_BYTES);
    if (!head) return '';
    try {
        const settings = JSON.parse(head.toString('utf8')) as { env?: Record<string, unknown> };
        const value = settings.env?.CLAUDE_CODE_TMPDIR;
        return typeof value === 'string' ? value : '';
    } catch {
        return '';
    }
}

/**
 * 一時ルートを返す（先頭が既定の一時フォルダのもの）。OS の一時フォルダと CLAUDE_CODE_TMPDIR
 * （プロセス環境と settings.json の env）の直下にある、リンクではない実行ユーザー所有のディレクトリだけを扱う。
 */
async function resolveTempRoots(probe: CleanupProbe, claudeDir: string): Promise<string[]> {
    const bases = [...(await probe.tempDirs())];
    for (const value of [await probe.envVar('CLAUDE_CODE_TMPDIR'), await settingsTmpdir(probe, claudeDir)]) {
        const trimmed = value.trim();
        if (trimmed && isAbsolutePathOn(probe.os, trimmed)) bases.push(trimmed);
    }
    const seen = new Set<string>();
    const roots: string[] = [];
    for (const base of bases) {
        const found =
            probe.os === 'win32'
                ? await probe.listNested(probe.join(base, WINDOWS_TEMP_ROOT), 0)
                : (await probe.listNested(base, 1)).filter(entry => POSIX_TEMP_ROOT.test(entry.rel));
        for (const entry of found) {
            if (entry.type !== 'dir' || !entry.ownedBySelf) continue;
            const key = probe.os === 'win32' ? entry.path.toLowerCase() : entry.path;
            if (seen.has(key)) continue;
            seen.add(key);
            roots.push(entry.path);
        }
    }
    return roots;
}

/** MCP ログのキャッシュの場所（プロジェクト名のディレクトリが並ぶ）。 */
async function mcpCacheDir(probe: CleanupProbe, home: string): Promise<string> {
    if (probe.os === 'win32') {
        const local = (await probe.envVar('LOCALAPPDATA')).trim();
        const base = local && isAbsolutePathOn(probe.os, local) ? local : probe.join(home, 'AppData', 'Local');
        return probe.join(base, CACHE_APP_DIR, 'Cache');
    }
    if (probe.os === 'darwin') {
        return probe.join(home, 'Library', 'Caches', CACHE_APP_DIR);
    }
    const xdg = (await probe.envVar('XDG_CACHE_HOME')).trim();
    return probe.join(xdg && isAbsolutePathOn(probe.os, xdg) ? xdg : probe.join(home, '.cache'), CACHE_APP_DIR);
}

/** 登録ファイルの内容を解析する。読めない・JSON のオブジェクトとして解析できない場合は null。 */
function parseRegistration(head: Buffer | null): Record<string, unknown> | null {
    if (!head) return null;
    try {
        const parsed: unknown = JSON.parse(head.toString('utf8'));
        return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
            ? (parsed as Record<string, unknown>)
            : null;
    } catch {
        return null;
    }
}

/**
 * ~/.claude/sessions/<pid>.json に実行中として登録されたセッションの ID・バージョン・作業フォルダ・名前を集める。
 * プロセスは調べないため、登録した環境（pidDomain の OS・ホスト名）は問わず、すべての登録を実行中として扱う。
 * sessions が無い場合だけ登録なしとし、一覧できない・読めない・解析できない登録が 1 件でもあれば
 * complete を false にする（どのセッションが実行中か分からない）。
 */
async function readRegistrations(probe: CleanupProbe, hostProbe: CleanupProbe | null): Promise<Registrations> {
    const result: Registrations = { sessions: [], versions: new Set(), cwds: new Set(), complete: true };
    for (const source of hostProbe ? [probe, hostProbe] : [probe]) {
        const dir = source.join(await source.homeDir(), CLAUDE_DIR, SESSIONS_DIR);
        const listed = await source.tryListNested(dir, 1);
        if (listed === null) {
            result.complete = false;
            continue;
        }
        const named = listed.filter(entry => REGISTRATION_FILE.test(entry.rel));
        if (named.some(entry => entry.type !== 'file')) result.complete = false;
        const files = named.filter(entry => entry.type === 'file');
        const heads = await source.readHeads(
            files.map(file => file.path),
            REGISTRATION_MAX_BYTES
        );
        heads.forEach((head, i) => {
            const registration = parseRegistration(head);
            if (!registration) {
                result.complete = false;
                return;
            }
            if (typeof registration.version === 'string' && registration.version.length > 0) {
                result.versions.add(registration.version);
            }
            const sessionId =
                typeof registration.sessionId === 'string' && SESSION_ID.test(registration.sessionId)
                    ? registration.sessionId
                    : undefined;
            const projects = new Set<string>();
            const cwdKeys = new Set<string>();
            if (typeof registration.cwd === 'string' && registration.cwd.length > 0) {
                result.cwds.add(registration.cwd);
                cwdKeys.add(pathCompareKey(probe.os, registration.cwd));
                for (const name of projectNameCandidates(probe.os, registration.cwd)) {
                    projects.add(projectNameKey(probe.os, name));
                }
            }
            const title = typeof registration.name === 'string' && registration.name.trim() ? registration.name : '';
            result.sessions.push({
                // セッション ID の無い登録は、登録ファイル名の <pid> で識別する
                id: sessionId ? sessionId.toLowerCase() : `pid:${files[i].rel.replace(/\.json$/, '')}`,
                reason: 'registered',
                ...(title ? { title } : {}),
                ...(sessionId ? { hash: sessionHash(sessionId) } : {}),
                projects,
                cwdKeys,
            });
        });
    }
    return result;
}

/** 会話記録のエントリ（<セッション ID>.jsonl・<セッション ID>/）のセッション ID。会話記録でなければ undefined。 */
function recordSessionId(type: ProbeEntryType, name: string): string | undefined {
    if (type === 'file') return TRANSCRIPT_FILE.exec(name)?.[1];
    return type === 'dir' && SESSION_ID.test(name) ? name : undefined;
}

/** 更新日時が RECENT_SESSION_MS 以内（未来の日時を含む）か。 */
function isRecent(mtimeMs: number, now: number): boolean {
    return mtimeMs > 0 && now - mtimeMs < RECENT_SESSION_MS;
}

/** 実行中として扱うセッションを画面表示用にする。 */
function toInUseSession(session: RunningSession): CleanupInUseSession {
    return { id: session.id, reason: session.reason, ...(session.title ? { title: session.title } : {}) };
}

/** 全体設定ファイルのプロジェクト記録を読む。読めない場合はログを残して空を返す。 */
async function readRecordIndexOrEmpty(fs: HomeFs): Promise<ClaudeRecordIndex> {
    try {
        return await readClaudeRecordIndex(fs);
    } catch (error) {
        console.error('Failed to read the Claude global config:', error);
        return { records: [], repoPaths: [] };
    }
}

/** 各プロジェクト名のセッションを読み、作業フォルダのうちプロジェクト名と一致するものを記録する。 */
async function readSessionPaths(probe: CleanupProbe, slugs: Iterable<SlugState>, book: ProjectPathBook): Promise<void> {
    const targets: { slug: SlugState; sessionId: string; path: string }[] = [];
    for (const slug of slugs) {
        // セッションごとに読むファイルは 1 つ。<セッション ID>.jsonl を優先する。
        const files = new Map<string, ProbeEntry>();
        for (const entry of slug.entries) {
            const sessionId = SESSION_ENTRY.exec(entry.name)?.[1]?.toLowerCase();
            if (!sessionId || entry.type !== 'file' || !entry.name.includes('.jsonl')) continue;
            if (!files.has(sessionId) || TRANSCRIPT_FILE.test(entry.name)) files.set(sessionId, entry);
        }
        for (const [sessionId, entry] of files) targets.push({ slug, sessionId, path: entry.path });
    }
    const reads = await probe.readHeadTails(
        targets.map(target => target.path),
        SESSION_SCAN_BYTES
    );
    targets.forEach((target, i) => {
        const read = reads[i];
        const cwd = read ? readSessionCwd(read.head, read.tail) : null;
        if (!cwd || !isAbsolutePathOn(probe.os, cwd)) return;
        const matches = projectNameCandidates(probe.os, cwd).some(
            name => projectNameKey(probe.os, name) === target.slug.key
        );
        if (!matches) return;
        const key = book.addSessionPath(cwd);
        target.slug.sessionPaths.set(target.sessionId, key);
        target.slug.paths.add(key);
    });
}

/**
 * パスを特定できていないプロジェクト名について、他のセッションのパス・登録の作業フォルダ・githubRepoPaths・入力履歴の
 * project と、それぞれの祖先を順方向に変換して一致するものを探し、プロジェクト名の比較用の値 → パスの比較キーを返す。
 */
async function findDistantPaths(
    probe: CleanupProbe,
    claudeDir: string,
    wanted: ReadonlySet<string>,
    seeds: Iterable<string>,
    book: ProjectPathBook
): Promise<Map<string, Set<string>>> {
    const found = new Map<string, Set<string>>();
    const [history] = await probe.readHeads([probe.join(claudeDir, HISTORY_FILE)], HISTORY_MAX_BYTES);
    const sources = [...seeds, ...(history ? readHistoryProjects(history.toString('utf8')) : [])];
    for (const source of new Set(sources)) {
        if (!isAbsolutePathOn(probe.os, source)) continue;
        for (const path of [source, ...ancestorPaths(probe.os, source)]) {
            for (const name of projectNameCandidates(probe.os, path)) {
                const slugKey = projectNameKey(probe.os, name);
                if (!wanted.has(slugKey)) continue;
                const keys = found.get(slugKey) ?? new Set<string>();
                keys.add(book.addOtherPath(path));
                found.set(slugKey, keys);
            }
        }
    }
    return found;
}

/**
 * 中身の無いプロジェクト名に印を付ける。エントリが何も無いものと、唯一のエントリが何も入っていない memory のもの。
 * memory の中身を調べられなければ空とみなさない。リンクの memory も空とみなさない。
 */
async function markEmptySlugs(probe: CleanupProbe, slugs: Iterable<SlugState>): Promise<void> {
    const memoryOnly: SlugState[] = [];
    for (const slug of slugs) {
        if (!slug.listed || slug.entries.length > 0) continue;
        if (slug.memory === null) slug.empty = true;
        else if (slug.memory.type === 'dir' && slug.memory.fileCount === 0) memoryOnly.push(slug);
    }
    const listings = await probe.listEach(memoryOnly.map(slug => (slug.memory as ProbeEntry).path));
    memoryOnly.forEach((slug, i) => {
        slug.empty = listings[i]?.length === 0;
    });
}

/** 行が中身の無いプロジェクト名を含むか。 */
function holdsEmptySlug(group: ClaudeProjectGroup): boolean {
    return [...group.slugs].some(slug => slug.empty);
}

async function buildLayout(context: ClaudeCleanupContext, approved: readonly string[]): Promise<ClaudeTempLayout> {
    const { probe, hostProbe, fs } = context;
    const os = probe.os;
    const home = await probe.homeDir();
    const claudeDir = probe.join(home, CLAUDE_DIR);
    const projectsDir = probe.join(claudeDir, PROJECTS_DIR);
    const keyOf = (name: string) => projectNameKey(os, name);
    const registrations = await readRegistrations(probe, hostProbe);
    // 実行中のセッションを判定できない場合は、セッション単位の一時物と会話記録をすべて残す
    const unknownRunning = !registrations.complete;
    const roots = await resolveTempRoots(probe, claudeDir);

    // 利用者が削除を承認した行
    const approvedRows = new Set(approved.map(name => pathCompareKey(os, name)));

    const book = new ProjectPathBook(os);
    const recordIndex = await readRecordIndexOrEmpty(fs);
    // プロジェクト名の比較用の値 → 全体設定ファイルのキーのうち順方向に変換して一致するパスの比較キー
    const recordPaths = new Map<string, Set<string>>();
    for (const { key } of recordIndex.records) {
        const compareKey = book.addRecordKey(key);
        if (!isAbsolutePathOn(os, key)) continue;
        for (const name of projectNameCandidates(os, key)) {
            const paths = recordPaths.get(keyOf(name)) ?? new Set<string>();
            paths.add(compareKey);
            recordPaths.set(keyOf(name), paths);
        }
    }

    const slugs = new Map<string, SlugState>();
    const slugFor = (name: string): SlugState => {
        const key = keyOf(name);
        let slug = slugs.get(key);
        if (!slug) {
            slug = {
                name,
                key,
                path: null,
                listed: true,
                memory: null,
                entries: [],
                empty: false,
                sessionPaths: new Map(),
                paths: new Set(),
                rows: new Set(),
                sessionRows: new Map(),
                sharedLogs: [],
                tempDirs: [],
            };
            slugs.set(key, slug);
        }
        return slug;
    };
    const rows = new Map<string, ClaudeProjectGroup>();
    const rowFor = (id: string, pathUnknown: boolean, slug: SlugState): ClaudeProjectGroup => {
        const key = pathCompareKey(os, id);
        let row = rows.get(key);
        if (!row) {
            row = {
                name: id,
                key,
                pathUnknown,
                slugs: new Set(),
                records: [],
                historyTargets: [],
                keptHistory: 0,
                unlisted: [],
                parts: [],
                mcpLogs: [],
                inUseSessions: new Map(),
            };
            rows.set(key, row);
        }
        row.slugs.add(slug);
        slug.rows.add(row);
        return row;
    };
    // 特定のセッションに結び付かないものの行。プロジェクト名に対応するパス（会話記録と全体設定ファイルのキーの和集合）が
    // 1 つならそのパス、それ以外は別のパスのものかもしれないのでパス不明の行。パスを読めないセッションの行には使わない。
    const sharedRowOf = (slug: SlugState): ClaudeProjectGroup => {
        const paths = new Set([...slug.paths, ...(recordPaths.get(slug.key) ?? [])]);
        return paths.size === 1 ? rowFor([...paths][0], false, slug) : rowFor(slug.name, true, slug);
    };
    const isProject = (name: string) => slugs.has(keyOf(name)) || isEncodedProjectName(probe, name);

    // ~/.claude/projects 直下のプロジェクト名ごとに、memory とそれ以外のエントリを分けて一覧する
    const slugDirs = (await probe.listNested(projectsDir, 1)).filter(entry => entry.type === 'dir');
    const listings = await probe.listEach(slugDirs.map(entry => entry.path));
    slugDirs.forEach((dir, i) => {
        const slug = slugFor(dir.rel);
        const listing = listings[i];
        slug.path = dir.path;
        slug.listed = listing !== null;
        for (const entry of listing ?? []) {
            if (keyOf(entry.name) === keyOf(MEMORY_DIR)) slug.memory = entry;
            else slug.entries.push(entry);
        }
    });
    await readSessionPaths(probe, slugs.values(), book);
    await markEmptySlugs(probe, slugs.values());

    // セッションとプロジェクト行の対応（セッション ID の wyhash → 行）
    const sessionGroups = new Map<string, ClaudeProjectGroup>();
    // エントリを行に振り分ける。パスの分かるセッションはそのパスの行へ、パスを読めないセッションはパス不明の行へ、
    // セッションでないものは sharedRowOf の行へ入れる。パスの行がパス不明のセッションを消さないようにする。
    for (const slug of slugs.values()) {
        if (!slug.listed) {
            sharedRowOf(slug).unlisted.push(slug.path ?? slug.name);
            continue;
        }
        if (slug.empty) sharedRowOf(slug);
        for (const entry of slug.entries) {
            const sessionId = SESSION_ENTRY.exec(entry.name)?.[1]?.toLowerCase();
            const pathKey = sessionId ? slug.sessionPaths.get(sessionId) : undefined;
            const row = pathKey
                ? rowFor(pathKey, false, slug)
                : sessionId
                  ? rowFor(slug.name, true, slug)
                  : sharedRowOf(slug);
            row.records.push({
                name: entry.path,
                path: entry.path,
                type: entry.type === 'other' ? 'link' : entry.type,
                size: entry.size,
                fileCount: entry.fileCount,
                ...(sessionId ? { sessionId } : {}),
            });
            if (sessionId) {
                slug.sessionRows.set(sessionId, row);
                sessionGroups.set(sessionHash(sessionId), row);
            }
        }
    }

    // 実行中として扱うセッション（識別子 → セッション）。同じセッションの登録が複数あればプロジェクトをまとめる。
    const sessions = new Map<string, RunningSession>();
    for (const session of registrations.sessions) {
        const known = sessions.get(session.id);
        if (known) {
            session.projects.forEach(project => known.projects.add(project));
            session.cwdKeys.forEach(key => known.cwdKeys.add(key));
        } else {
            sessions.set(session.id, session);
        }
    }
    // 会話記録からセッションとプロジェクト名を対応付け、登録の無い実行中のセッションを更新日時で調べる
    const now = Date.now();
    for (const slug of slugs.values()) {
        for (const entry of slug.entries) {
            const sessionId = recordSessionId(entry.type, entry.name);
            if (!sessionId) continue;
            const id = sessionId.toLowerCase();
            const known = sessions.get(id);
            known?.projects.add(slug.key);
            if (known || unknownRunning || !isRecent(entry.mtimeMs, now)) continue;
            sessions.set(id, {
                id,
                reason: 'recent',
                hash: sessionHash(sessionId),
                projects: new Set([slug.key]),
                cwdKeys: new Set(),
            });
        }
    }
    const running = [...sessions.values()];
    const runningIds = new Set(running.map(session => session.id));
    const runningByHash = new Map<string, RunningSession>();
    for (const session of running) {
        if (session.hash) runningByHash.set(session.hash, session);
    }
    const activeSlugs = new Set(running.flatMap(session => [...session.projects]));

    // 残すものの根拠にしたセッションを行に記録する
    const noteLocked = (row: ClaudeProjectGroup) =>
        row.inUseSessions.set(ALL_SESSIONS_ID, { id: ALL_SESSIONS_ID, reason: 'unknown' });
    const noteSession = (row: ClaudeProjectGroup, session: RunningSession) =>
        row.inUseSessions.set(session.id, toInUseSession(session));

    // 一時ルート配下 <プロジェクト名>/<セッション ID>（セッションの作業フォルダ）
    for (const root of roots) {
        for (const top of await probe.listNested(root, 1)) {
            if (top.type !== 'dir' || !isProject(top.rel)) continue;
            const work = (await probe.list(top.path, name => SESSION_ID.test(name))).filter(e => e.type === 'dir');
            const slug = slugFor(top.rel);
            slug.tempDirs.push(top.path);
            if (slug.rows.size === 0) sharedRowOf(slug);
            for (const entry of work) {
                const id = entry.name.toLowerCase();
                const row = slug.sessionRows.get(id) ?? sharedRowOf(slug);
                slug.sessionRows.set(id, row);
                sessionGroups.set(sessionHash(entry.name), row);
                const isApproved = approvedRows.has(row.key);
                const session = isApproved ? undefined : sessions.get(id);
                const locked = unknownRunning && !isApproved;
                if (locked) noteLocked(row);
                else if (session) noteSession(row, session);
                row.parts.push({ ...toChild(entry), excluded: locked || session ? 'in-use' : undefined });
            }
        }
    }

    // MCP ログのキャッシュ <プロジェクト名>/（mcp-logs-* など）。どのパスのものか分けられないので、
    // 同じ名前に複数の行があれば行に含めず、その名前の行をすべて消すときだけ消す。
    for (const entry of await probe.list(await mcpCacheDir(probe, home), () => true)) {
        if (entry.type !== 'dir' || !isProject(entry.name)) continue;
        const slug = slugFor(entry.name);
        if (slug.rows.size >= 2) slug.sharedLogs.push(toChild(entry));
        else ([...slug.rows][0] ?? sharedRowOf(slug)).mcpLogs.push(toChild(entry));
    }

    // bash-edit-diff はセッション ID で行へ対応付け、対応しないものを独立した候補にする
    const bashEditDiff: ResolvedChild[] = [];
    const bundledSkills: ResolvedChild[] = [];
    for (const [i, root] of roots.entries()) {
        const diffs = await probe.list(probe.join(root, BASH_EDIT_DIFF_DIR), name => BASH_EDIT_DIFF_ENTRY.test(name));
        for (const entry of diffs) {
            if (entry.type !== 'dir') continue;
            const lead = BASH_EDIT_DIFF_ENTRY.exec(entry.name)?.[1] ?? '';
            const hash = SESSION_ID.test(lead) ? sessionHash(lead) : lead;
            const row = sessionGroups.get(hash);
            if (row) {
                const isApproved = approvedRows.has(row.key);
                const session = isApproved ? undefined : runningByHash.get(hash);
                const locked = unknownRunning && !isApproved;
                if (locked) noteLocked(row);
                else if (session) noteSession(row, session);
                row.parts.push({ ...toChild(entry), excluded: locked || session ? 'in-use' : undefined });
            } else {
                const inUse = unknownRunning || runningByHash.has(hash);
                bashEditDiff.push({
                    ...toChild(entry, i === 0 ? entry.name : entry.path),
                    excluded: inUse ? 'in-use' : undefined,
                });
            }
        }
        // bundled-skills/<バージョン>。実行中として登録されたセッションのバージョンは使用中
        for (const entry of await probe.list(probe.join(root, BUNDLED_SKILLS_DIR), () => true)) {
            if (entry.type !== 'dir') continue;
            const inUse = unknownRunning || registrations.versions.has(entry.name);
            bundledSkills.push({
                ...toChild(entry, i === 0 ? entry.name : entry.path),
                excluded: inUse ? 'in-use' : undefined,
            });
        }
    }

    // 実行中のセッションがどの行に関わるか。プロジェクト名の行が 1 つならその行、複数なら自分の会話記録がある行、
    // 無ければ登録の作業フォルダの行、それも無ければパス不明の行とする。
    const runningByRow = new Map<ClaudeProjectGroup, RunningSession[]>();
    for (const session of running) {
        const targets = new Set<ClaudeProjectGroup>();
        for (const slugKey of session.projects) {
            const slug = slugs.get(slugKey);
            if (!slug) continue;
            const slugRows = [...slug.rows];
            if (slugRows.length <= 1) {
                slugRows.forEach(row => targets.add(row));
                continue;
            }
            const own =
                slug.sessionRows.get(session.id) ??
                slugRows.find(row => session.cwdKeys.has(row.key)) ??
                slugRows.find(row => row.pathUnknown);
            if (own) targets.add(own);
        }
        for (const row of targets) {
            runningByRow.set(row, [...(runningByRow.get(row) ?? []), session]);
        }
    }

    for (const row of rows.values()) {
        const isApproved = approvedRows.has(row.key);
        const locked = unknownRunning && !isApproved;
        const active = isApproved ? [] : (runningByRow.get(row) ?? []);
        for (const log of row.mcpLogs) {
            if (locked) noteLocked(row);
            else active.forEach(session => noteSession(row, session));
            row.parts.push({ ...log, excluded: locked || active.length > 0 ? 'in-use' : undefined });
        }
        if (row.records.length === 0 && row.unlisted.length === 0 && !holdsEmptySlug(row)) continue;
        if (locked || (row.unlisted.length > 0 && !isApproved)) {
            row.keptHistory = 1;
            noteLocked(row);
        } else if (active.length > 0) {
            const kept = row.records.filter(
                entry => entry.type === 'link' || (entry.sessionId && runningIds.has(entry.sessionId))
            ).length;
            row.keptHistory = Math.max(1, kept);
            active.forEach(session => noteSession(row, session));
        } else {
            row.historyTargets = row.records;
        }
    }
    // 分けられない MCP ログは、実行中のセッションがあれば、その名前のすべての行が承認されない限り使用中とする
    for (const slug of slugs.values()) {
        const allApproved = slug.rows.size > 0 && [...slug.rows].every(row => approvedRows.has(row.key));
        const inUse = !allApproved && (unknownRunning || activeSlugs.has(slug.key));
        slug.sharedLogs = slug.sharedLogs.map(log => ({ ...log, excluded: inUse ? 'in-use' : undefined }));
    }

    // プロジェクトメモリの行。配下にドットで始まらないエントリがあるものだけを出す
    const memorySlugs = [...slugs.values()].filter(slug => slug.path && slug.memory?.type === 'dir');
    const visible = await probe.hasUndottedEntries(memorySlugs.map(slug => (slug.memory as ProbeEntry).path));
    const shown = memorySlugs.filter((_, i) => visible[i] === true);
    const memoryPaths = new Map<string, Set<string>>();
    for (const slug of shown) {
        memoryPaths.set(slug.key, new Set([...(recordPaths.get(slug.key) ?? []), ...slug.paths]));
    }
    const unmatched = new Set(shown.filter(slug => memoryPaths.get(slug.key)?.size === 0).map(slug => slug.key));
    if (unmatched.size > 0) {
        const seeds = new Set([...registrations.cwds, ...recordIndex.repoPaths]);
        for (const slug of slugs.values()) {
            for (const pathKey of slug.paths) seeds.add(book.display(pathKey));
        }
        const distant = await findDistantPaths(probe, claudeDir, unmatched, seeds, book);
        for (const [slugKey, keys] of distant) memoryPaths.set(slugKey, keys);
    }
    const memories = shown.map((slug): ClaudeMemoryRow => {
        const memory = slug.memory as ProbeEntry;
        return {
            name: slug.name,
            key: slug.key,
            path: memory.path,
            slugPath: slug.path as string,
            size: memory.size,
            fileCount: memory.fileCount,
            pathKeys: [...(memoryPaths.get(slug.key) ?? [])],
        };
    });

    return { book, groups: [...rows.values()], memories, recordIndex, bundledSkills, bashEditDiff };
}

/**
 * プロジェクト行を画面表示用の子要素にする。サイズ・件数は、削除すれば消える全体（行のエントリとすべての一時物）の合計とする。
 * 使用中の可能性があるもの（会話記録・一時物）がある行は、承認されない限り削除しない使用中の子要素とし、
 * その件数を inUseParts に、根拠のセッションを inUseSessions にする。
 */
function toProjectChild(group: ClaudeProjectGroup, book: ProjectPathBook): CleanupChild {
    const kept = group.keptHistory + group.parts.filter(part => part.excluded).length;
    const all = [...group.records, ...group.parts];
    return {
        name: group.name,
        ...(group.pathUnknown ? { pathUnknown: true } : { displayName: book.display(group.key) }),
        size: all.reduce((sum, item) => sum + item.size, 0),
        fileCount: all.reduce((sum, item) => sum + item.fileCount, 0),
        ...(kept > 0 ? { inUse: true, inUseParts: kept } : {}),
        ...(kept > 0 && group.inUseSessions.size > 0 ? { inUseSessions: [...group.inUseSessions.values()] } : {}),
        ...(group.records.length === 0 &&
        group.unlisted.length === 0 &&
        (group.parts.length > 0 || !holdsEmptySlug(group))
            ? { orphan: true }
            : {}),
    };
}

/**
 * プロジェクト行の子要素を返す。会話履歴が無く一時物だけが残っている行と、中身の無いプロジェクト名の行も含める。
 * memory に中身があり、それ以外のエントリも一時物も無いプロジェクト名は出さない。調べられなかった場合はログを残して空配列を返す。
 */
export async function resolveClaudeProjects(
    context: ClaudeCleanupContext,
    env: AgentEnvironment
): Promise<CleanupChild[]> {
    try {
        const { groups, book } = await loadLayout(context);
        return groups.map(group => toProjectChild(group, book)).sort((a, b) => b.size - a.size);
    } catch (error) {
        console.error(`Failed to resolve Claude projects (${JSON.stringify(env)}):`, error);
        return [];
    }
}

/**
 * プロジェクトの一時物とエントリを削除し、削除に失敗したものがある行の名前（skipped）と、
 * OS のファイルロックなどで削除できずに残ったパス（failedPaths）を返す。消せないものがあっても残りは削除する。
 * - names='all': すべての行を対象にする（~/.claude/projects 自体は残す）。
 * - names=名前の配列: 選択された行を対象にする。名前はパスの比較キーとして照合する。
 * 使用中の可能性がある行（実行中のセッションがある、または判定できない）は、approved に含まれる（利用者が削除を承認した）
 * ものだけを対象にし、承認されていないものには触れない。names='all' のときの承認されていないものは削除の対象ではないため
 * 報告せず、名前で選択されたものは選択後に使用中の可能性が生じたものとして skipped で報告する。
 * 対象の行は、一覧で得たエントリと一時物（作業フォルダ・bash-edit-diff・MCP ログ）を削除する。memory には空のディレクトリの
 * 削除だけをかけ、同じプロジェクト名のすべての行を消すときに限って行う。分けられない MCP ログも同じ条件で消す。
 * 最後にプロジェクト名のディレクトリと一時ルート配下の <プロジェクト名> ディレクトリを、空の場合だけ削除する。
 * 中身の無いプロジェクト名のディレクトリを消せなければ、その行の失敗として報告する。
 */
export async function deleteClaudeProjects(
    context: ClaudeCleanupContext,
    key: string,
    env: AgentEnvironment,
    names: 'all' | string[],
    approved: readonly string[] = []
): Promise<{ skipped: string[]; failedPaths: string[] }> {
    const { probe } = context;
    let layout: ClaudeTempLayout;
    try {
        layout = await loadLayout(context, approved);
    } catch (error) {
        console.error(`Failed to resolve Claude projects (${JSON.stringify(env)}):`, error);
        return { skipped: names === 'all' ? [key] : [...names], failedPaths: [] };
    }
    const wanted = names === 'all' ? null : new Set(names.map(name => pathCompareKey(probe.os, name)));
    const skipped = new Set<string>();
    const failedPaths: string[] = [];
    // 一覧に無い名前は消せなかったものとして報告する。
    const knownRows = new Set(layout.groups.map(group => group.key));
    if (names !== 'all') {
        for (const name of names) {
            if (!knownRows.has(pathCompareKey(probe.os, name))) skipped.add(name);
        }
    }
    // 残すもの（使用中の可能性があるもの）がある行は承認されていないため対象にしない。承認された行は
    // 実行中のセッションが無いものとして構成を調べているため、残すものが無い。
    const selected = new Set<ClaudeProjectGroup>();
    for (const group of layout.groups) {
        if (wanted && !wanted.has(group.key)) continue;
        if (group.keptHistory === 0 && !group.parts.some(part => part.excluded)) selected.add(group);
        else if (wanted) skipped.add(group.name);
    }

    const touched = new Set<SlugState>();
    const targets: { owner: string; target: RemoveTarget }[] = [];
    for (const group of selected) {
        group.slugs.forEach(slug => touched.add(slug));
        for (const item of [...group.historyTargets, ...group.parts]) {
            targets.push({ owner: group.name, target: { path: item.path, type: item.type } });
        }
        // 承認されても一覧できなかったプロジェクト名の中身は消せないので報告する
        if (group.unlisted.length > 0) {
            skipped.add(group.name);
            failedPaths.push(...group.unlisted);
        }
    }
    const isFinished = (slug: SlugState) => [...slug.rows].every(group => selected.has(group));
    for (const slug of touched) {
        if (!isFinished(slug)) continue;
        for (const log of slug.sharedLogs) {
            if (!log.excluded) targets.push({ owner: slug.name, target: { path: log.path, type: log.type } });
        }
    }
    const left = await probe.removeReporting(targets.map(item => item.target));
    targets.forEach((item, i) => {
        if (left[i].length > 0) {
            console.error(`Failed to remove ${item.target.path} (${JSON.stringify(env)})`);
            skipped.add(item.owner);
            failedPaths.push(...left[i]);
        }
    });

    // 空になったディレクトリを片付ける（空でなければ残る）。memory は中身があれば残るので、削除の判定に関わらず失われない。
    const emptyDirs: RemoveTarget[] = [];
    // 中身の無いプロジェクト名のディレクトリ → 消すことを選ばれた行
    const requiredRemovals = new Map<string, string>();
    for (const group of selected) {
        for (const slug of group.slugs) {
            if (slug.empty && slug.path && isFinished(slug)) requiredRemovals.set(slug.path, group.name);
        }
    }
    for (const slug of touched) {
        for (const dir of slug.tempDirs) emptyDirs.push({ path: dir, type: 'empty-dir' });
        if (slug.memory?.type === 'dir' && isFinished(slug)) {
            emptyDirs.push({ path: slug.memory.path, type: 'empty-dir' });
        }
        if (slug.path) emptyDirs.push({ path: slug.path, type: 'empty-dir' });
    }
    const removed = await probe.remove(emptyDirs);
    emptyDirs.forEach(({ path }, i) => {
        const owner = requiredRemovals.get(path);
        if (owner === undefined || removed[i]) return;
        console.error(`Failed to remove ${path} (${JSON.stringify(env)})`);
        skipped.add(owner);
        failedPaths.push(path);
    });
    return { skipped: [...skipped], failedPaths };
}

/** プロジェクトメモリの行の子要素を返す。パスが複数一致すれば改行で並べ、無ければパス不明にする。 */
export async function resolveClaudeMemories(
    context: ClaudeCleanupContext,
    env: AgentEnvironment
): Promise<CandidateSource[]> {
    try {
        const { memories, book } = await loadLayout(context);
        return memories.map(memory => ({
            name: memory.name,
            ...(memory.pathKeys.length > 0
                ? {
                      displayName: memory.pathKeys
                          .map(key => book.display(key))
                          .sort()
                          .join('\n'),
                  }
                : { pathUnknown: true }),
            size: memory.size,
            fileCount: memory.fileCount,
        }));
    } catch (error) {
        console.error(`Failed to resolve Claude project memory (${JSON.stringify(env)}):`, error);
        return [];
    }
}

/**
 * 選択されたプロジェクトメモリを中身ごと削除し、プロジェクト名のディレクトリを空の場合だけ削除する。
 * 会話記録と全体設定ファイルには触れない。削除に失敗した行の名前と、残ったパスを返す。
 * 一覧に無い名前は消せなかったものとして返す。
 */
export async function deleteClaudeProjectMemories(
    context: ClaudeCleanupContext,
    key: string,
    env: AgentEnvironment,
    names: 'all' | string[]
): Promise<{ skipped: string[]; failedPaths: string[] }> {
    const { probe } = context;
    let memories: ClaudeMemoryRow[];
    try {
        ({ memories } = await loadLayout(context));
    } catch (error) {
        console.error(`Failed to resolve Claude project memory (${JSON.stringify(env)}):`, error);
        return { skipped: names === 'all' ? [key] : [...names], failedPaths: [] };
    }
    const wanted = names === 'all' ? null : new Set(names.map(name => projectNameKey(probe.os, name)));
    const targets = memories.filter(memory => !wanted || wanted.has(memory.key));
    const left = await probe.removeReporting(targets.map(memory => ({ path: memory.path, type: 'dir' as const })));
    const knownMemories = new Set(memories.map(memory => memory.key));
    const skipped = names === 'all' ? [] : names.filter(name => !knownMemories.has(projectNameKey(probe.os, name)));
    const failedPaths: string[] = [];
    targets.forEach((memory, i) => {
        if (left[i].length > 0) {
            console.error(`Failed to remove ${memory.path} (${JSON.stringify(env)})`);
            skipped.push(memory.name);
            failedPaths.push(...left[i]);
        }
    });
    await probe.remove(targets.map(memory => ({ path: memory.slugPath, type: 'empty-dir' as const })));
    return { skipped, failedPaths };
}

/**
 * プロジェクト記録の行の子要素を返す。比較キーが同じキーを 1 行にまとめ、信頼状態と MCP の件数をキーごとに集計する。
 * 記録の値は含めない。大きさは取得せず、表示するパスで並べる。
 */
export async function resolveClaudeRecords(
    context: ClaudeCleanupContext,
    env: AgentEnvironment
): Promise<CandidateSource[]> {
    try {
        const { recordIndex, book } = await loadLayout(context);
        const groups = new Map<string, { keys: number; trusted: number; mcpServers: number }>();
        for (const record of recordIndex.records) {
            const compareKey = pathCompareKey(context.probe.os, record.key);
            if (compareKey.length === 0) continue;
            const group = groups.get(compareKey) ?? { keys: 0, trusted: 0, mcpServers: 0 };
            group.keys += 1;
            if (record.trusted) group.trusted += 1;
            group.mcpServers += record.mcpServers;
            groups.set(compareKey, group);
        }
        return [...groups]
            .map(([compareKey, group]): CandidateSource => {
                const badges: CleanupChildBadge[] = [];
                const countOf = (count: number) => (group.keys > 1 ? { count } : {});
                if (group.trusted > 0) badges.push({ key: 'trusted', ...countOf(group.trusted) });
                if (group.trusted < group.keys) {
                    badges.push({ key: 'trustUnset', ...countOf(group.keys - group.trusted) });
                }
                if (group.mcpServers > 0) badges.push({ key: 'mcpServers', count: group.mcpServers });
                if (group.keys > 1) badges.push({ key: 'duplicateKeys', count: group.keys });
                return {
                    name: compareKey,
                    displayName: book.display(compareKey),
                    badges,
                    size: 0,
                    fileCount: 1,
                    sizeUnknown: true,
                };
            })
            .sort((a, b) => ((a.displayName ?? '') < (b.displayName ?? '') ? -1 : 1));
    } catch (error) {
        console.error(`Failed to resolve Claude project records (${JSON.stringify(env)}):`, error);
        return [];
    }
}

/**
 * 全体設定ファイルから、選択された行のキーをまとめて切り取る。名前はパスの比較キーとして照合し、
 * 一致するキーが無い名前は消せなかったものとして返す。切り取れなかった場合は選択全体（'all' は候補キー）と、ファイルのパスを返す。
 */
export async function deleteClaudeRecords(
    context: ClaudeCleanupContext,
    key: string,
    env: AgentEnvironment,
    names: 'all' | string[]
): Promise<{ skipped: string[]; failedPaths: string[] }> {
    const { probe, fs } = context;
    const wanted = names === 'all' ? null : new Set(names.map(name => pathCompareKey(probe.os, name)));
    const matched = new Set<string>();
    try {
        await removeClaudeRecordKeys(fs, recordKey => {
            const compareKey = pathCompareKey(probe.os, recordKey);
            const hit = compareKey.length > 0 && (!wanted || wanted.has(compareKey));
            if (hit) matched.add(compareKey);
            return hit;
        });
        const unmatched = names === 'all' ? [] : names.filter(name => !matched.has(pathCompareKey(probe.os, name)));
        return { skipped: unmatched, failedPaths: [] };
    } catch (error) {
        console.error(`Failed to remove Claude project records (${JSON.stringify(env)}):`, error);
        return { skipped: names === 'all' ? [key] : [...names], failedPaths: [await configPathOf(fs)] };
    }
}

/** 全体設定ファイルの表示用のパス。選べなければ既定のファイルのパス。 */
async function configPathOf(fs: HomeFs): Promise<string> {
    try {
        return await fs.displayPath(await resolveClaudeGlobalConfigRel(fs));
    } catch {
        return fs.displayPath(CLAUDE_CODE_CONFIG_FILENAME);
    }
}

/** ~/.claude 外の一時物のうちプロジェクトに紐づかない候補のリゾルバ（候補キー → リゾルバ）。 */
export function claudeTempResolvers(
    context: ClaudeCleanupContext,
    approved: readonly string[] = []
): Record<string, CleanupResolver> {
    return {
        [CLAUDE_TEMP_CLEANUP_KEYS.BUNDLED_SKILLS]: async () => (await loadLayout(context, approved)).bundledSkills,
        [CLAUDE_TEMP_CLEANUP_KEYS.BASH_EDIT_DIFF]: async () => (await loadLayout(context, approved)).bashEditDiff,
    };
}
