import { GROK_DIR, GROK_GOAL_STATE_SUFFIX, GROK_TEMP_CLEANUP_KEYS } from '../../../shared/agents/grok/constants';
import type { CleanupProbe, ProbeEntry } from '../common/cleanup/CleanupProbe';
import {
    DAY_MS,
    HOUR_MS,
    isOlderThan,
    nanosToMs,
    type CleanupResolver,
    type ResolvedChild,
} from '../common/cleanup/resolvedCleanup';

// 名前が完全に一致するものだけを扱う（pid・作成時刻 ns・連番 / UUID v4 / UUID 先頭 12 桁）。
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const GOAL_DIR = /^grok-goal-([0-9a-f]{12})$/;
const SNAPSHOT_INDEX = /^grok-snapshot-index-\d+-(\d+)-\d+(?:\.lock)?$/;
const VIDEO_DIR = /^grok-video-\d+-(\d+)$/;
const EDITOR_FILE = new RegExp(`^grok-(?:prompt-${UUID}\\.md|transcript-${UUID}\\.(?:md|ansi))$`);

const SNAPSHOT_KEEP_MS = 24 * HOUR_MS;
const EDITOR_FILE_KEEP_MS = 7 * DAY_MS;
const GOAL_FINISHED_KEEP_MS = HOUR_MS;
const GOAL_KEEP_MS = 7 * DAY_MS;
// 作業フォルダを残す必要がない（Grok 自身も削除する）終了状態
const GOAL_FINISHED_STATUSES = new Set(['complete', 'budget_limited', 'budgetlimited']);
// ゴールの状態ファイルを読み取る上限
const GOAL_STATE_MAX_BYTES = 4 * 1024 * 1024;

/** 一時フォルダ直下の Grok 一時物。表示名は既定の一時フォルダなら名前、それ以外は絶対パス。 */
interface TempEntry extends ProbeEntry {
    label: string;
}

// 1 回のスキャン・削除（同じ probe）で一時フォルダの一覧を 1 度だけ取得する
const tempListings = new WeakMap<CleanupProbe, Promise<TempEntry[]>>();

/** OS の一時フォルダ直下にある、実行ユーザー所有の grok-* エントリを返す。 */
function grokTempEntries(probe: CleanupProbe): Promise<TempEntry[]> {
    let listing = tempListings.get(probe);
    if (!listing) {
        listing = listGrokTemp(probe);
        tempListings.set(probe, listing);
    }
    return listing;
}

async function listGrokTemp(probe: CleanupProbe): Promise<TempEntry[]> {
    const entries: TempEntry[] = [];
    const roots = await probe.tempDirs();
    for (const [i, root] of roots.entries()) {
        for (const entry of await probe.list(root, name => name.startsWith('grok-'))) {
            if (!entry.ownedBySelf) continue;
            entries.push({ ...entry, label: i === 0 ? entry.name : entry.path });
        }
    }
    return entries;
}

function toChild(entry: TempEntry, type: 'file' | 'dir', eligible: boolean): ResolvedChild {
    return {
        name: entry.label,
        path: entry.path,
        type,
        size: entry.size,
        fileCount: entry.fileCount,
        excluded: eligible ? undefined : 'ineligible',
    };
}

/**
 * 名前に作成時刻（ns）を含む一時物を、作成時刻と更新日時がともに keepMs 以上前なら対象にする。
 * 使用中かどうかはプロセスを調べずに判定できないため、十分に古いことで判断する。
 */
function timestampedResolver(pattern: RegExp, type: 'file' | 'dir', keepMs: number): CleanupResolver {
    return async probe => {
        const now = Date.now();
        return (await grokTempEntries(probe))
            .filter(entry => entry.type === type && pattern.test(entry.name))
            .map(entry => {
                const createdMs = nanosToMs(pattern.exec(entry.name)?.[1] ?? '');
                const old = isOlderThan(createdMs, keepMs, now) && isOlderThan(entry.mtimeMs, keepMs, now);
                return toChild(entry, type, old);
            });
    };
}

/** 外部エディタ・トランスクリプト表示用の一時ファイルを、7 日以上更新されていなければ対象にする。 */
const resolveEditorFiles: CleanupResolver = async probe => {
    const now = Date.now();
    return (await grokTempEntries(probe))
        .filter(entry => entry.type === 'file' && EDITOR_FILE.test(entry.name))
        .map(entry => toChild(entry, 'file', isOlderThan(entry.mtimeMs, EDITOR_FILE_KEEP_MS, now)));
};

/**
 * GROK_HOME（未設定なら ~/.grok）の sessions/<作業フォルダ>/<セッション>/goal/state.json を読み、
 * ゴールの状態を集める。
 */
async function readGoalStates(probe: CleanupProbe): Promise<Map<string, string>> {
    const grokHome = (await probe.envVar('GROK_HOME')) || probe.join(await probe.homeDir(), GROK_DIR);
    const { files } = await probe.readNested(
        probe.join(grokHome, 'sessions'),
        2,
        GROK_GOAL_STATE_SUFFIX,
        GOAL_STATE_MAX_BYTES
    );
    const statuses = new Map<string, string>();
    for (const file of files) {
        try {
            const state = JSON.parse(file.text ?? '') as { verifier_id?: unknown; status?: unknown };
            if (typeof state.verifier_id === 'string' && typeof state.status === 'string') {
                statuses.set(state.verifier_id.toLowerCase(), state.status.toLowerCase());
            }
        } catch {
            // 読めない状態ファイルは無視する（対応するゴールは 7 日の基準で判断される）
        }
    }
    return statuses;
}

/**
 * ゴールモードの作業フォルダ grok-goal-<verifier_id>。状態ファイルで終了が確認できたゴール
 * （complete / budget_limited）は 1 時間以上、それ以外（状態が見つからないものを含む）は 7 日以上
 * 更新されていなければ対象にする。状態が見つからないのは、別の場所のセッションのゴールである可能性があるため。
 */
const resolveGoalScratch: CleanupResolver = async probe => {
    const dirs = (await grokTempEntries(probe)).filter(entry => entry.type === 'dir' && GOAL_DIR.test(entry.name));
    if (dirs.length === 0) return [];
    const statuses = await readGoalStates(probe);
    const now = Date.now();
    return dirs.map(dir => {
        const status = statuses.get(GOAL_DIR.exec(dir.name)?.[1] ?? '');
        const finished = status !== undefined && GOAL_FINISHED_STATUSES.has(status);
        return toChild(dir, 'dir', isOlderThan(dir.mtimeMs, finished ? GOAL_FINISHED_KEEP_MS : GOAL_KEEP_MS, now));
    });
};

/** Grok の一時物の特別候補のリゾルバ（候補キー → リゾルバ）。 */
export const GROK_TEMP_CLEANUP_RESOLVERS: Record<string, CleanupResolver> = {
    [GROK_TEMP_CLEANUP_KEYS.GOAL_SCRATCH]: resolveGoalScratch,
    [GROK_TEMP_CLEANUP_KEYS.SNAPSHOT_INDEX]: timestampedResolver(SNAPSHOT_INDEX, 'file', SNAPSHOT_KEEP_MS),
    [GROK_TEMP_CLEANUP_KEYS.VIDEO_FRAMES]: timestampedResolver(VIDEO_DIR, 'dir', SNAPSHOT_KEEP_MS),
    [GROK_TEMP_CLEANUP_KEYS.EDITOR_FILES]: resolveEditorFiles,
};
