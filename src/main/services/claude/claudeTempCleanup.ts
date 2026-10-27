import { CLAUDE_DIR, CLAUDE_TEMP_CLEANUP_KEYS } from '../../../shared/agents/claude/constants';
import type { AgentEnvironment, CleanupChild, CleanupInUseSession } from '../../../shared/agents/types';
import { wyhash64 } from '../../utils/wyhash';
import type { CleanupProbe, ProbeEntry, ProbeEntryType, RemoveTarget } from '../common/cleanup/CleanupProbe';
import { MINUTE_MS, type CleanupResolver, type ResolvedChild } from '../common/cleanup/resolvedCleanup';

// ~/.claude 配下の構成
const PROJECTS_DIR = 'projects';
const SESSIONS_DIR = 'sessions';
const SETTINGS_FILE = 'settings.json';
// プロジェクトの自動メモリ（~/.claude/projects/<プロジェクト名>/memory）
const MEMORY_DIR = 'memory';
// 一時ルート（Windows は <一時フォルダ>/claude、それ以外は <一時フォルダ>/claude-<uid>）
const WINDOWS_TEMP_ROOT = 'claude';
const POSIX_TEMP_ROOT = /^claude-\d+$/;
const BASH_EDIT_DIFF_DIR = 'bash-edit-diff';
const BUNDLED_SKILLS_DIR = 'bundled-skills';
// MCP ログのキャッシュ（env-paths の claude-cli-nodejs）
const CACHE_APP_DIR = 'claude-cli-nodejs';
// プロジェクト名（作業フォルダのパスを符号化した名前）の長さの上限。超える分は切り詰めてハッシュを付ける。
const PROJECT_NAME_MAX = 200;

const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TRANSCRIPT_FILE = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/i;
// <セッション ID の wyhash（10 進）>-<数値>-<16 桁の 16 進>。先頭がセッション ID そのものの形式も受け付ける。
const BASH_EDIT_DIFF_ENTRY = /^([0-9a-f-]+)-\d+-[0-9a-f]{16}$/;
// 実行中セッションの登録（<pid>.json）
const REGISTRATION_FILE = /^\d+\.json$/;
const REGISTRATION_MAX_BYTES = 64 * 1024;
const SETTINGS_MAX_BYTES = 1024 * 1024;
// 会話記録（<セッション ID>.jsonl か <セッション ID>/ 配下のファイル）がこの時間内に更新されたセッションは、
// 登録が無くても実行中として扱う。~/.claude/sessions に登録を書かない Claude Code のセッションを、
// 実行中の会話が会話記録を書き続けることから検出する。
const RECENT_SESSION_MS = 10 * MINUTE_MS;
// 実行中のセッションを判定できないプロジェクトの、すべてのセッションを表す識別子（CleanupInUseSession.id）
const ALL_SESSIONS_ID = '*';

/**
 * 会話記録（~/.claude/projects/<プロジェクト名>）の扱い。実行中のセッションは、~/.claude/sessions に登録された
 * セッションと、会話記録が RECENT_SESSION_MS 以内に更新されたセッション。
 * 利用者が削除を承認したプロジェクトは、実行中のセッションが無いものとして扱う。
 * - 'free': 実行中のセッションが無いため、memory/ を含めてディレクトリごと削除の対象にする。
 * - 'partial': 実行中のセッションがあるため、使用中の可能性があるプロジェクトとして削除しない。そのセッションの記録
 *   （<セッション ID>.jsonl と <セッション ID>/）と memory/ を使用中の可能性があるものとして数える。
 * - 'locked': 実行中のセッションを判定できない（登録や会話記録を読めない）ため、使用中の可能性があるプロジェクトとして
 *   削除しない。会話記録全体を 1 件として数える。
 */
type HistoryState = 'free' | 'partial' | 'locked';

/** プロジェクト 1 件と、それに紐づく ~/.claude 外の一時物。 */
export interface ClaudeProjectGroup {
    // 表示名兼識別子（会話履歴のディレクトリ名。無ければ一時物のディレクトリ名）
    name: string;
    // ~/.claude/projects/<プロジェクト名>（無ければ null）
    history: ResolvedChild | null;
    // 会話記録のうち削除の対象にするもの（'free' のディレクトリ自体）
    historyTargets: ResolvedChild[];
    // 会話記録のうち使用中の可能性があるものの件数（'partial' はそのエントリの数、'locked' は会話記録全体を 1 件とする）
    keptHistory: number;
    // セッションの作業フォルダ・bash-edit-diff・MCP ログ。実行中のセッションのものは in-use。
    parts: ResolvedChild[];
    // 一時ルート配下の <プロジェクト名> ディレクトリ（作業フォルダの削除後に空なら削除する）
    tempDirs: string[];
    // 会話記録・一時物を残す根拠になったセッション（識別子 → セッション）
    inUseSessions: Map<string, CleanupInUseSession>;
}

/** 実行中として扱うセッション。 */
interface RunningSession {
    // 小文字のセッション ID。セッション ID の無い登録は 'pid:<pid>'
    id: string;
    reason: Exclude<CleanupInUseSession['reason'], 'unknown'>;
    title?: string;
    // セッション ID の wyhash（10 進）。セッション ID の無い登録は undefined
    hash?: string;
    // セッションがあるプロジェクト（登録の作業フォルダと会話記録の場所。keyOf で比較用にそろえたもの）
    projects: Set<string>;
}

interface ClaudeTempLayout {
    groups: ClaudeProjectGroup[];
    bundledSkills: ResolvedChild[];
    bashEditDiff: ResolvedChild[];
}

interface Registrations {
    // 実行中として登録されたセッション
    sessions: RunningSession[];
    // 実行中として登録されたセッションのバージョン
    versions: Set<string>;
    // すべての登録を読めたか。一覧できない・読めない・解析できない登録があれば false（実行中のセッションが分からない）。
    complete: boolean;
}

// 1 回のスキャン・削除（同じ probe）で構成を 1 度だけ調べる
const layouts = new WeakMap<CleanupProbe, Promise<ClaudeTempLayout>>();

/**
 * Claude Code の会話履歴と ~/.claude 外の一時物の構成を調べる（同じ probe では最初の呼び出しの結果を使い回す）。
 * hostProbe は WSL 環境のときの Windows 側。そこに登録されたセッションも実行中として扱う。
 * approved のプロジェクト（利用者が削除を承認したもの）は、実行中のセッションが無いものとして扱う。
 */
function loadLayout(
    probe: CleanupProbe,
    hostProbe: CleanupProbe | null,
    approved: readonly string[] = []
): Promise<ClaudeTempLayout> {
    let layout = layouts.get(probe);
    if (!layout) {
        layout = buildLayout(probe, hostProbe, approved);
        layouts.set(probe, layout);
    }
    return layout;
}

/** セッション ID から bash-edit-diff の名前の先頭に使われる値（wyhash の 10 進）を求める。 */
function sessionHash(sessionId: string): string {
    return wyhash64(sessionId.toLowerCase()).toString();
}

/**
 * 作業フォルダの絶対パスを、Claude Code と同じ規則でプロジェクト名にする（会話記録・MCP ログのディレクトリ名）。
 * 英数字以外を '-' にし、上限を超える場合は切り詰めて、元のパスの 32 ビットハッシュ（36 進）を付ける。
 */
function encodeProjectName(cwd: string): string {
    const name = cwd.replace(/[^a-zA-Z0-9]/g, '-');
    if (name.length <= PROJECT_NAME_MAX) return name;
    let hash = 0;
    for (let i = 0; i < cwd.length; i++) hash = ((hash << 5) - hash + cwd.charCodeAt(i)) | 0;
    return `${name.slice(0, PROJECT_NAME_MAX)}-${Math.abs(hash).toString(36)}`;
}

/** プロジェクト名を比較用にそろえる（Windows はファイル名の大文字・小文字を区別しない）。 */
function projectKey(probe: CleanupProbe, name: string): string {
    return probe.os === 'win32' ? name.toLowerCase() : name;
}

function toChild(entry: ProbeEntry, name = entry.path): ResolvedChild {
    return { name, path: entry.path, type: 'dir', size: entry.size, fileCount: entry.fileCount };
}

function isAbsolutePath(probe: CleanupProbe, path: string): boolean {
    return probe.os === 'win32' ? /^(?:[A-Za-z]:[\\/]|\\\\)/.test(path) : path.startsWith('/');
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
        if (trimmed && isAbsolutePath(probe, trimmed)) bases.push(trimmed);
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
        const base = local && isAbsolutePath(probe, local) ? local : probe.join(home, 'AppData', 'Local');
        return probe.join(base, CACHE_APP_DIR, 'Cache');
    }
    if (probe.os === 'darwin') {
        return probe.join(home, 'Library', 'Caches', CACHE_APP_DIR);
    }
    const xdg = (await probe.envVar('XDG_CACHE_HOME')).trim();
    return probe.join(xdg && isAbsolutePath(probe, xdg) ? xdg : probe.join(home, '.cache'), CACHE_APP_DIR);
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
    const result: Registrations = { sessions: [], versions: new Set(), complete: true };
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
            if (typeof registration.cwd === 'string' && registration.cwd.length > 0) {
                projects.add(projectKey(probe, encodeProjectName(registration.cwd)));
            }
            const title = typeof registration.name === 'string' && registration.name.trim() ? registration.name : '';
            result.sessions.push({
                // セッション ID の無い登録は、登録ファイル名の <pid> で識別する
                id: sessionId ? sessionId.toLowerCase() : `pid:${files[i].rel.replace(/\.json$/, '')}`,
                reason: 'registered',
                ...(title ? { title } : {}),
                ...(sessionId ? { hash: sessionHash(sessionId) } : {}),
                projects,
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

/** 会話記録のエントリが、実行中のセッション（小文字のセッション ID の集合）の記録か。 */
function isRunningRecord(entry: ProbeEntry, runningSessions: Set<string>): boolean {
    const sessionId = recordSessionId(entry.type, entry.name);
    return sessionId !== undefined && runningSessions.has(sessionId.toLowerCase());
}

/** 更新日時が RECENT_SESSION_MS 以内（未来の日時を含む）か。 */
function isRecent(mtimeMs: number, now: number): boolean {
    return mtimeMs > 0 && now - mtimeMs < RECENT_SESSION_MS;
}

/**
 * 実行中のセッションがあるプロジェクトの会話記録のうち、使用中の可能性があるもの（実行中のセッションの記録・
 * memory/・リンク）の件数を返す。
 */
async function countRunningHistory(history: ResolvedChild, probe: CleanupProbe, runningSessions: Set<string>) {
    const entries = await probe.list(history.path, () => true);
    return entries.filter(
        entry => entry.type === 'other' || entry.name === MEMORY_DIR || isRunningRecord(entry, runningSessions)
    ).length;
}

/** 実行中として扱うセッションを画面表示用にする。 */
function toInUseSession(session: RunningSession): CleanupInUseSession {
    return { id: session.id, reason: session.reason, ...(session.title ? { title: session.title } : {}) };
}

async function buildLayout(
    probe: CleanupProbe,
    hostProbe: CleanupProbe | null,
    approved: readonly string[]
): Promise<ClaudeTempLayout> {
    const home = await probe.homeDir();
    const claudeDir = probe.join(home, CLAUDE_DIR);
    const projectsDir = probe.join(claudeDir, PROJECTS_DIR);
    const keyOf = (name: string) => projectKey(probe, name);
    const registrations = await readRegistrations(probe, hostProbe);
    // 実行中のセッションを判定できない場合は、セッション単位の一時物と会話記録をすべて残す
    const unknownRunning = !registrations.complete;
    const roots = await resolveTempRoots(probe, claudeDir);

    // 利用者が削除を承認したプロジェクト
    const approvedProjects = new Set(approved.map(keyOf));

    const groups = new Map<string, ClaudeProjectGroup>();
    const groupFor = (name: string): ClaudeProjectGroup => {
        const key = keyOf(name);
        let group = groups.get(key);
        if (!group) {
            group = {
                name,
                history: null,
                historyTargets: [],
                keptHistory: 0,
                parts: [],
                tempDirs: [],
                inUseSessions: new Map(),
            };
            groups.set(key, group);
        }
        return group;
    };
    // 会話履歴のあるプロジェクト名か、一時物のディレクトリ名として妥当なものだけを扱う
    const isProject = (name: string) => groups.has(keyOf(name)) || isEncodedProjectName(probe, name);
    const sessionGroups = new Map<string, ClaudeProjectGroup>();

    const projectEntries = (await probe.list(projectsDir, () => true)).filter(entry => entry.type === 'dir');
    for (const entry of projectEntries) {
        groupFor(entry.name).history = toChild(entry, entry.name);
    }
    // 実行中として扱うセッション（識別子 → セッション）。同じセッションの登録が複数あればプロジェクトをまとめる。
    const sessions = new Map<string, RunningSession>();
    for (const session of registrations.sessions) {
        const known = sessions.get(session.id);
        if (known) session.projects.forEach(project => known.projects.add(project));
        else sessions.set(session.id, session);
    }
    // 会話履歴（<セッション ID>.jsonl とセッション ID のディレクトリ）からセッションとプロジェクトを対応付け、
    // 実行中のセッションの記録を含むプロジェクトを調べる。一覧できなければ会話記録はすべて残す。
    const nested = await probe.tryListNested(projectsDir, 2);
    for (const entry of nested ?? (await probe.listNested(projectsDir, 2))) {
        const [project, name] = entry.rel.split('/');
        const group = groups.get(keyOf(project));
        const sessionId = recordSessionId(entry.type, name);
        if (!group || !sessionId) continue;
        sessionGroups.set(sessionHash(sessionId), group);
        sessions.get(sessionId.toLowerCase())?.projects.add(keyOf(project));
    }
    // 登録の無い実行中のセッション: 配下が直近に更新されたプロジェクトだけ、会話記録ごとの更新日時を調べる
    if (!unknownRunning && nested !== null) {
        const now = Date.now();
        for (const project of projectEntries) {
            if (!isRecent(project.mtimeMs, now)) continue;
            for (const record of await probe.list(project.path, () => true)) {
                const sessionId = recordSessionId(record.type, record.name);
                if (!sessionId || !isRecent(record.mtimeMs, now)) continue;
                const id = sessionId.toLowerCase();
                const known = sessions.get(id);
                if (known) {
                    known.projects.add(keyOf(project.name));
                } else {
                    sessions.set(id, {
                        id,
                        reason: 'recent',
                        hash: sessionHash(sessionId),
                        projects: new Set([keyOf(project.name)]),
                    });
                }
            }
        }
    }
    // 実行中のセッションと、その wyhash・実行中のセッションがあるプロジェクト
    const running = [...sessions.values()];
    const runningIds = new Set(running.map(session => session.id));
    const runningByHash = new Map<string, RunningSession>();
    for (const session of running) {
        if (session.hash) runningByHash.set(session.hash, session);
    }
    const activeProjects = new Set(running.flatMap(session => [...session.projects]));

    // 削除を承認したプロジェクトは、実行中のセッションが無いものとして扱う
    const historyLocked = (key: string) => (unknownRunning || nested === null) && !approvedProjects.has(key);
    const partsLocked = (key: string) => unknownRunning && !approvedProjects.has(key);
    const isActive = (key: string) => activeProjects.has(key) && !approvedProjects.has(key);
    // 残すものの根拠にしたセッションをプロジェクトに記録する
    const noteLocked = (group: ClaudeProjectGroup) =>
        group.inUseSessions.set(ALL_SESSIONS_ID, { id: ALL_SESSIONS_ID, reason: 'unknown' });
    const noteSession = (group: ClaudeProjectGroup, session: RunningSession) =>
        group.inUseSessions.set(session.id, toInUseSession(session));
    const noteActive = (group: ClaudeProjectGroup, key: string) => {
        for (const session of running) {
            if (session.projects.has(key)) noteSession(group, session);
        }
    };

    for (const [key, group] of groups) {
        const history = group.history;
        if (!history) continue;
        const state: HistoryState = historyLocked(key) ? 'locked' : isActive(key) ? 'partial' : 'free';
        if (state === 'free') {
            group.historyTargets.push(history);
        } else if (state === 'locked') {
            group.keptHistory = 1;
            noteLocked(group);
        } else {
            group.keptHistory = await countRunningHistory(history, probe, runningIds);
            noteActive(group, key);
        }
    }

    // 一時ルート配下 <プロジェクト名>/<セッション ID>（セッションの作業フォルダ）
    for (const root of roots) {
        for (const top of await probe.listNested(root, 1)) {
            if (top.type !== 'dir' || !isProject(top.rel)) continue;
            const work = (await probe.list(top.path, name => SESSION_ID.test(name))).filter(e => e.type === 'dir');
            const group = groupFor(top.rel);
            const key = keyOf(top.rel);
            group.tempDirs.push(top.path);
            for (const entry of work) {
                sessionGroups.set(sessionHash(entry.name), group);
                const session = approvedProjects.has(key) ? undefined : sessions.get(entry.name.toLowerCase());
                const locked = partsLocked(key);
                const inUse = locked || session !== undefined;
                if (locked) noteLocked(group);
                else if (inUse && session) noteSession(group, session);
                group.parts.push({ ...toChild(entry), excluded: inUse ? 'in-use' : undefined });
            }
        }
    }

    // MCP ログのキャッシュ <プロジェクト名>/（mcp-logs-* など）。実行中のセッションがあるプロジェクトのものは使用中
    for (const entry of await probe.list(await mcpCacheDir(probe, home), () => true)) {
        if (entry.type !== 'dir' || !isProject(entry.name)) continue;
        const group = groupFor(entry.name);
        const key = keyOf(entry.name);
        const locked = partsLocked(key);
        const inUse = locked || isActive(key);
        if (locked) noteLocked(group);
        else if (inUse) noteActive(group, key);
        group.parts.push({ ...toChild(entry), excluded: inUse ? 'in-use' : undefined });
    }

    // bash-edit-diff はセッション ID でプロジェクトへ対応付け、対応しないものを独立した候補にする
    const bashEditDiff: ResolvedChild[] = [];
    const bundledSkills: ResolvedChild[] = [];
    for (const [i, root] of roots.entries()) {
        const diffs = await probe.list(probe.join(root, BASH_EDIT_DIFF_DIR), name => BASH_EDIT_DIFF_ENTRY.test(name));
        for (const entry of diffs) {
            if (entry.type !== 'dir') continue;
            const lead = BASH_EDIT_DIFF_ENTRY.exec(entry.name)?.[1] ?? '';
            const hash = SESSION_ID.test(lead) ? sessionHash(lead) : lead;
            const group = sessionGroups.get(hash);
            if (group) {
                const key = keyOf(group.name);
                const session = approvedProjects.has(key) ? undefined : runningByHash.get(hash);
                const locked = partsLocked(key);
                const inUse = locked || session !== undefined;
                if (locked) noteLocked(group);
                else if (session) noteSession(group, session);
                group.parts.push({ ...toChild(entry), excluded: inUse ? 'in-use' : undefined });
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
            const running = unknownRunning || registrations.versions.has(entry.name);
            bundledSkills.push({
                ...toChild(entry, i === 0 ? entry.name : entry.path),
                excluded: running ? 'in-use' : undefined,
            });
        }
    }

    return { groups: [...groups.values()], bundledSkills, bashEditDiff };
}

/**
 * プロジェクト 1 件を画面表示用の子要素にする。サイズ・件数は、削除すれば消える全体（会話履歴のディレクトリと
 * すべての一時物）の合計とする。使用中の可能性があるもの（会話記録・一時物）があるプロジェクトは、承認されない限り
 * 削除しない使用中の子要素とし、その件数を inUseParts に、根拠のセッションを inUseSessions にする。
 */
function toProjectChild(group: ClaudeProjectGroup): CleanupChild {
    const kept = group.keptHistory + group.parts.filter(part => part.excluded).length;
    const all = [...(group.history ? [group.history] : []), ...group.parts];
    return {
        name: group.name,
        size: all.reduce((sum, item) => sum + item.size, 0),
        fileCount: all.reduce((sum, item) => sum + item.fileCount, 0),
        ...(kept > 0 ? { inUse: true, inUseParts: kept } : {}),
        ...(kept > 0 && group.inUseSessions.size > 0 ? { inUseSessions: [...group.inUseSessions.values()] } : {}),
        ...(group.history ? {} : { orphan: true }),
    };
}

/**
 * プロジェクトごとの子要素を返す。会話履歴が無く一時物だけが残っているプロジェクトも含める。
 * 調べられなかった場合はログを残して空配列を返す。
 */
export async function resolveClaudeProjects(
    probe: CleanupProbe,
    hostProbe: CleanupProbe | null,
    env: AgentEnvironment
): Promise<CleanupChild[]> {
    try {
        const { groups } = await loadLayout(probe, hostProbe);
        return groups.map(toProjectChild).sort((a, b) => b.size - a.size);
    } catch (error) {
        console.error(`Failed to resolve Claude projects (${JSON.stringify(env)}):`, error);
        return [];
    }
}

/**
 * プロジェクトを紐づく一時物ごと削除し、削除に失敗したものがあるプロジェクトの名前（skipped）と、
 * OS のファイルロックなどで削除できずに残ったパス（failedPaths）を返す。消せないものがあっても残りは削除する。
 * - names='all': すべてのプロジェクトを対象にする（~/.claude/projects 自体は残す）。
 * - names=名前の配列: 選択されたプロジェクトを対象にする。
 * 使用中の可能性があるプロジェクト（実行中のセッションがある、または判定できない）は、approved に含まれる
 * （利用者が削除を承認した）ものだけを対象にし、承認されていないものには触れない。names='all' のときの承認されていない
 * ものは削除の対象ではないため報告せず、名前で選択されたものは選択後に使用中の可能性が生じたものとして skipped で報告する。
 * 対象のプロジェクトは、会話記録のディレクトリ（memory/ を含む）と一時物（作業フォルダ・bash-edit-diff・MCP ログ）を
 * すべて削除する。一時ルート配下の <プロジェクト名> ディレクトリは、空になった場合だけ削除する。
 */
export async function deleteClaudeProjects(
    probe: CleanupProbe,
    hostProbe: CleanupProbe | null,
    key: string,
    env: AgentEnvironment,
    names: 'all' | string[],
    approved: readonly string[] = []
): Promise<{ skipped: string[]; failedPaths: string[] }> {
    let layout: ClaudeTempLayout;
    try {
        layout = await loadLayout(probe, hostProbe, approved);
    } catch (error) {
        console.error(`Failed to resolve Claude projects (${JSON.stringify(env)}):`, error);
        return { skipped: names === 'all' ? [key] : [...names], failedPaths: [] };
    }
    const wanted = names === 'all' ? null : new Set(names.map(name => projectKey(probe, name)));
    const skipped = new Set<string>();
    // 残すもの（使用中の可能性があるもの）があるプロジェクトは承認されていないため対象にしない。承認されたプロジェクトは
    // 実行中のセッションが無いものとして構成を調べているため、残すものが無い。
    const selected: ClaudeProjectGroup[] = [];
    for (const group of layout.groups) {
        if (wanted && !wanted.has(projectKey(probe, group.name))) continue;
        if (group.keptHistory === 0 && !group.parts.some(part => part.excluded)) selected.push(group);
        else if (wanted) skipped.add(group.name);
    }

    const targets: { owner: string; target: RemoveTarget }[] = [];
    for (const group of selected) {
        for (const item of [...group.historyTargets, ...group.parts]) {
            targets.push({ owner: group.name, target: { path: item.path, type: item.type } });
        }
    }
    const failedPaths: string[] = [];
    const left = await probe.removeReporting(targets.map(item => item.target));
    targets.forEach((item, i) => {
        if (left[i].length > 0) {
            console.error(`Failed to remove ${item.target.path} (${JSON.stringify(env)})`);
            skipped.add(item.owner);
            failedPaths.push(...left[i]);
        }
    });

    // 作業フォルダをすべて削除して空になった <プロジェクト名> ディレクトリを片付ける（空でなければ残る）
    await probe.remove(
        selected.flatMap(group => group.tempDirs.map(dir => ({ path: dir, type: 'empty-dir' as const })))
    );
    return { skipped: [...skipped], failedPaths };
}

/**
 * ~/.claude 外の一時物のうちプロジェクトに紐づかない候補のリゾルバ（候補キー → リゾルバ）。
 * approved のプロジェクト（利用者が削除を承認したもの）は、実行中のセッションが無いものとして扱う。
 */
export function claudeTempResolvers(
    hostProbe: CleanupProbe | null,
    approved: readonly string[] = []
): Record<string, CleanupResolver> {
    return {
        [CLAUDE_TEMP_CLEANUP_KEYS.BUNDLED_SKILLS]: async probe =>
            (await loadLayout(probe, hostProbe, approved)).bundledSkills,
        [CLAUDE_TEMP_CLEANUP_KEYS.BASH_EDIT_DIFF]: async probe =>
            (await loadLayout(probe, hostProbe, approved)).bashEditDiff,
    };
}
