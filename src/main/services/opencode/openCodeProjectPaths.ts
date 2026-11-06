import type { CleanupProbe } from '../common/cleanup/CleanupProbe';

type PathOs = CleanupProbe['os'];

// 複数のパスの共有先になるプロジェクトの ID。project の行、保存済み承認、シェル出力はパスの削除では消さない。
const GLOBAL_PROJECT_ID = 'global';

export interface ProjectRow {
    id: string;
    worktree: string;
}

export interface SessionRow {
    id: string;
    projectId: string;
    parentId: string | null;
    directory: string;
    path: string | null;
}

/** worktree と project_directory の行。directory はデータベースの生の値。 */
export interface DirectoryRow {
    projectId: string;
    directory: string;
    strategy: string | null;
    timeCreated: number;
}

/** kv のアーティファクトの行。key は kv のキー、id はフォルダー名になる ID。 */
export interface ArtifactRow {
    key: string;
    id: string;
    directory: string;
    projectId: string;
}

export interface ProjectDbRows {
    projects: ProjectRow[];
    sessions: SessionRow[];
    worktrees: DirectoryRow[];
    projectDirectories: DirectoryRow[];
    artifacts: ArtifactRow[];
    // project_id ごとの保存済み承認の件数
    approvalCounts: Map<string, number>;
}

/**
 * プロジェクト ID ごとの処理。
 * - remove: このパスが最後なので project の行ごと消す。
 * - repoint: 他のパスが残り、project.worktree がこのパスなので worktree の値へ付け替える。
 * - keep: project の行を変更しない。
 */
export type ProjectAction =
    { id: string; kind: 'remove' } | { id: string; kind: 'repoint'; worktree: string } | { id: string; kind: 'keep' };

/** パス 1 行を消すときの対象。 */
export interface PathRemovalPlan {
    key: string;
    // このパスの綴り（project.worktree、worktree、project_directory、セッションのルートの順）
    spellings: string[];
    // ルートがこのパスのセッションと、その子孫の ID
    sessionIds: string[];
    worktrees: DirectoryRow[];
    projectDirectories: DirectoryRow[];
    artifacts: ArtifactRow[];
    projects: ProjectAction[];
}

interface ResolvedRoot {
    key: string;
    spelled: string;
}

interface PathEntry {
    spellings: string[];
    sessionIds: string[];
    worktrees: DirectoryRow[];
    projectDirectories: DirectoryRow[];
    artifacts: ArtifactRow[];
    projectIds: Set<string>;
}

/** データベースの行をパスごとに分類した結果。 */
export interface ProjectPathIndex {
    os: PathOs;
    rows: ProjectDbRows;
    entries: Map<string, PathEntry>;
    // セッション ID からルートへの対応。directory が空のセッションは含まない。
    sessionRoots: Map<string, ResolvedRoot>;
    // 親のセッション ID から子の ID への対応。
    children: Map<string, string[]>;
}

/** 生の値を、区切りと末尾をそろえた綴りにする。Windows は \ を / にする。ルート（D:/、/）の末尾は残す。 */
export function spellPath(raw: string, os: PathOs): string {
    let spelled = os === 'win32' ? raw.replace(/\\/g, '/') : raw;
    while (spelled.length > 1 && spelled.endsWith('/') && !(os === 'win32' && /^[A-Za-z]:\/$/.test(spelled))) {
        spelled = spelled.slice(0, -1);
    }
    return spelled;
}

/** 綴りの比較キー。Windows は全体を小文字にし、それ以外はバイト一致で比べる。 */
export function pathKey(spelled: string, os: PathOs): string {
    return os === 'win32' ? spelled.toLowerCase() : spelled;
}

/** 画面に出す形。Windows は \ 区切りでドライブ文字を大文字にする。 */
export function displayPath(spelled: string, os: PathOs): string {
    if (os !== 'win32') return spelled;
    const native = spelled.replace(/\//g, '\\');
    return /^[a-z]:/.test(native) ? native[0].toUpperCase() + native.slice(1) : native;
}

/** child が parent 自身か、その配下か。比較は区切りを含めて行い、D:/w/A と D:/w/Ab を区別する。 */
function containsKey(parent: string, child: string): boolean {
    return child === parent || child.startsWith(parent.endsWith('/') ? parent : `${parent}/`);
}

/**
 * path 列の値がプロジェクトルートより上や別の場所を指すか。
 * '..' で始まる値と絶対パス（Windows はドライブ文字で始まる値を含む）が該当する。
 */
function escapesRoot(relative: string, os: PathOs): boolean {
    return (
        relative.split('/')[0] === '..' || relative.startsWith('/') || (os === 'win32' && /^[A-Za-z]:/.test(relative))
    );
}

/**
 * directory と path からセッションのルートの綴りを求める。directory の末尾が '/'+path なら、その部分を除いたものがルート。
 * path が空か '.'、ルートより外を指す値、末尾が一致しない値では directory をルートにする。
 */
function rootFromRelative(directory: string, rawRelative: string, os: PathOs): string {
    const relative = spellPath(rawRelative, os);
    if (relative === '' || relative === '.' || escapesRoot(relative, os)) return directory;
    const suffix = `/${relative}`;
    if (directory.length < suffix.length) return directory;
    if (pathKey(directory.slice(-suffix.length), os) !== pathKey(suffix, os)) return directory;
    const head = directory.slice(0, -suffix.length);
    if (head === '') return '/';
    return os === 'win32' && /^[A-Za-z]:$/.test(head) ? `${head}/` : head;
}

/** known の中で、directory を含む最も長いパスの綴りを返す。無ければ undefined。 */
function longestContaining(known: ReadonlyMap<string, string> | undefined, directoryKey: string): string | undefined {
    let found: string | undefined;
    let foundLength = -1;
    for (const [key, spelled] of known ?? []) {
        if (key.length > foundLength && containsKey(key, directoryKey)) {
            found = spelled;
            foundLength = key.length;
        }
    }
    return found;
}

/**
 * データベースの行をパスごとに分類する。行の単位は project.worktree（global を除く）、worktree.directory、
 * project_directory.directory、セッションのルートの和集合で、比較キーが同じものは 1 行になる。
 * directory が空のセッションと、どの既知のパスにも入らないアーティファクトはどの行にも入らない。
 */
export function indexProjectPaths(rows: ProjectDbRows, os: PathOs): ProjectPathIndex {
    const entries = new Map<string, PathEntry>();
    // project_id ごとの既知のパス（比較キーから綴りへの対応）
    const known = new Map<string, Map<string, string>>();
    const entryFor = (spelled: string, projectId: string): PathEntry => {
        const key = pathKey(spelled, os);
        let entry = entries.get(key);
        if (!entry) {
            entry = {
                spellings: [],
                sessionIds: [],
                worktrees: [],
                projectDirectories: [],
                artifacts: [],
                projectIds: new Set(),
            };
            entries.set(key, entry);
        }
        if (!entry.spellings.includes(spelled)) entry.spellings.push(spelled);
        entry.projectIds.add(projectId);
        let paths = known.get(projectId);
        if (!paths) {
            paths = new Map();
            known.set(projectId, paths);
        }
        if (!paths.has(key)) paths.set(key, spelled);
        return entry;
    };

    for (const project of rows.projects) {
        const spelled = spellPath(project.worktree, os);
        if (project.id !== GLOBAL_PROJECT_ID && spelled !== '') entryFor(spelled, project.id);
    }
    for (const row of rows.worktrees) {
        const spelled = spellPath(row.directory, os);
        if (spelled !== '') entryFor(spelled, row.projectId).worktrees.push(row);
    }
    for (const row of rows.projectDirectories) {
        const spelled = spellPath(row.directory, os);
        if (spelled !== '') entryFor(spelled, row.projectId).projectDirectories.push(row);
    }

    const sessionRoots = new Map<string, ResolvedRoot>();
    const children = new Map<string, string[]>();
    const assignRoot = (session: SessionRow, spelled: string) => {
        entryFor(spelled, session.projectId).sessionIds.push(session.id);
        sessionRoots.set(session.id, { key: pathKey(spelled, os), spelled });
    };
    const withoutRelative: SessionRow[] = [];
    for (const session of rows.sessions) {
        if (session.parentId !== null) {
            children.set(session.parentId, [...(children.get(session.parentId) ?? []), session.id]);
        }
        if (session.directory === '') continue;
        if (session.path === null) withoutRelative.push(session);
        else assignRoot(session, rootFromRelative(spellPath(session.directory, os), session.path, os));
    }
    // path が NULL のセッションは、他のセッションの解決順に左右されないよう、先にすべてのルートを決めてから登録する。
    const legacyRoots = withoutRelative.map(session => {
        const directory = spellPath(session.directory, os);
        return longestContaining(known.get(session.projectId), pathKey(directory, os)) ?? directory;
    });
    withoutRelative.forEach((session, index) => assignRoot(session, legacyRoots[index]));

    for (const artifact of rows.artifacts) {
        const directoryKey = pathKey(spellPath(artifact.directory, os), os);
        const spelled = longestContaining(known.get(artifact.projectId), directoryKey);
        if (spelled !== undefined) entries.get(pathKey(spelled, os))?.artifacts.push(artifact);
    }
    return { os, rows, entries, sessionRoots, children };
}

/** roots とその子孫のセッション ID を返す。 */
function withDescendants(index: ProjectPathIndex, roots: readonly string[]): string[] {
    const seen = new Set<string>();
    const stack = [...roots];
    while (stack.length > 0) {
        const id = stack.pop() as string;
        if (seen.has(id)) continue;
        seen.add(id);
        stack.push(...(index.children.get(id) ?? []));
    }
    return [...seen];
}

/**
 * key のパスと deleted のセッションを除いた後で、プロジェクトに残るパスの綴りを、付け替え先として優先する順に返す。
 * 順序は strategy が NULL の worktree 行（新しい順）、それ以外の worktree 行（新しい順）、project_directory、
 * セッションのルート、project.worktree。
 */
function remainingPaths(
    index: ProjectPathIndex,
    project: ProjectRow,
    key: string,
    deleted: ReadonlySet<string>
): string[] {
    const { rows, os } = index;
    const others = (list: readonly DirectoryRow[]) =>
        list
            .filter(row => row.projectId === project.id)
            .map(row => ({ row, spelled: spellPath(row.directory, os) }))
            .filter(({ spelled }) => spelled !== '' && pathKey(spelled, os) !== key);
    const newestFirst = (a: { row: DirectoryRow }, b: { row: DirectoryRow }) => b.row.timeCreated - a.row.timeCreated;
    const worktrees = others(rows.worktrees);
    const result = [
        ...worktrees.filter(({ row }) => row.strategy === null).sort(newestFirst),
        ...worktrees.filter(({ row }) => row.strategy !== null).sort(newestFirst),
        ...others(rows.projectDirectories),
    ].map(({ spelled }) => spelled);
    for (const session of rows.sessions) {
        if (session.projectId !== project.id || deleted.has(session.id)) continue;
        const root = index.sessionRoots.get(session.id);
        if (root && root.key !== key) result.push(root.spelled);
    }
    const canonical = spellPath(project.worktree, os);
    if (canonical !== '' && pathKey(canonical, os) !== key) result.push(canonical);
    return result;
}

/**
 * プロジェクト ID ごとの処理を決める。global は常に keep。残るパスがあり project.worktree が対象なら repoint、
 * 残るパスが無ければ remove。ただし directory が空のセッションが残るプロジェクトは、project の行を消すとカスケードで
 * そのセッションも消えるため keep にする。
 */
function actionFor(
    index: ProjectPathIndex,
    project: ProjectRow,
    key: string,
    deleted: ReadonlySet<string>
): ProjectAction {
    if (project.id === GLOBAL_PROJECT_ID) return { id: project.id, kind: 'keep' };
    const remaining = remainingPaths(index, project, key, deleted);
    const isCanonical = pathKey(spellPath(project.worktree, index.os), index.os) === key;
    if (remaining.length > 0) {
        return isCanonical
            ? { id: project.id, kind: 'repoint', worktree: remaining[0] }
            : { id: project.id, kind: 'keep' };
    }
    const held = index.rows.sessions.some(session => session.projectId === project.id && !deleted.has(session.id));
    return { id: project.id, kind: held ? 'keep' : 'remove' };
}

/**
 * パスを消すときの対象を求める。パスが無い場合と、消せるものが何も無い場合は null。
 * 消せるものが無いのは、directory が空のセッションが残るために project の行を消せず、そのパスの他の記録も無い場合。
 */
export function planPathRemoval(index: ProjectPathIndex, key: string): PathRemovalPlan | null {
    const entry = index.entries.get(key);
    if (!entry) return null;
    const sessionIds = withDescendants(index, entry.sessionIds);
    const deleted = new Set(sessionIds);
    const projects: ProjectAction[] = [];
    for (const id of entry.projectIds) {
        const project = index.rows.projects.find(row => row.id === id);
        projects.push(project ? actionFor(index, project, key, deleted) : { id, kind: 'keep' });
    }
    const removable =
        sessionIds.length > 0 ||
        entry.worktrees.length > 0 ||
        entry.projectDirectories.length > 0 ||
        entry.artifacts.length > 0 ||
        projects.some(action => action.kind !== 'keep');
    if (!removable) return null;
    return {
        key,
        spellings: entry.spellings,
        sessionIds,
        worktrees: entry.worktrees,
        projectDirectories: entry.projectDirectories,
        artifacts: entry.artifacts,
        projects,
    };
}

/** スナップショットのフォルダー名の sha1 に渡すパスの形。Windows は各綴りの \ 区切りと、ドライブ文字を大文字にしたもの。それ以外は各綴り。 */
export function snapshotPathForms(spellings: readonly string[], os: PathOs): string[] {
    const forms = new Set<string>();
    for (const spelled of spellings) {
        if (os === 'win32') {
            forms.add(spelled.replace(/\//g, '\\'));
            forms.add(displayPath(spelled, os));
        } else {
            forms.add(spelled);
        }
    }
    return [...forms];
}

/**
 * スナップショットのフォルダー名の sha1 に渡す入力の候補を返す。CLI は作業ツリーの実パスをハッシュするので、パスの形と
 * その実パスの両方を候補にする。realPathOf はパスが実在しなければ null を返す。
 */
export function snapshotHashInputs(
    spellings: readonly string[],
    os: PathOs,
    realPathOf: (path: string) => string | null
): string[] {
    const inputs = new Set<string>();
    for (const form of snapshotPathForms(spellings, os)) {
        inputs.add(form);
        const real = realPathOf(form);
        if (real !== null) inputs.add(real);
    }
    return [...inputs];
}
