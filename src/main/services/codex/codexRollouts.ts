import { zstdDecompressSync } from 'zlib';
import type { CleanupProbe } from '../common/cleanup/CleanupProbe';

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
// rollout-<YYYY-MM-DDThh-mm-ss>-<スレッド ID>[_<ロールアウト ID>].jsonl[.zst]
const ROLLOUT_FILE = new RegExp(
    `^rollout-\\d{4}-\\d{2}-\\d{2}T\\d{2}-\\d{2}-\\d{2}-(${UUID})(?:_(${UUID}))?\\.jsonl(\\.zst)?$`
);
const SESSION_META_MARK = '"session_meta"';
// session_meta を探すときに読む大きさ。見つからず続きがあれば次の大きさで読み直す。
const META_READ_STEPS = [64 * 1024, 1024 * 1024, 8 * 1024 * 1024];
// .jsonl.zst は全体を展開するので、読む大きさと展開後の大きさに上限を置く（超えるものは読めないものとして扱う）。
const ZST_MAX_COMPRESSED_BYTES = 64 * 1024 * 1024;
const ZST_MAX_OUTPUT_BYTES = 256 * 1024 * 1024;

/** ロールアウトのファイル名から読み取った値。 */
export interface RolloutName {
    threadId: string;
    // 履歴の参照に使う ID。<スレッド ID>_<ロールアウト ID> の形以外はスレッド ID と同じ。
    rolloutId: string;
    compressed: boolean;
}

/** ロールアウトの session_meta から読み取った値。 */
export interface RolloutMeta {
    // 作業フォルダ（空や文字列以外は null）
    cwd: string | null;
    // history_base.thread_id（履歴を引き継ぐ元のロールアウト ID）
    historyBaseRolloutId: string | null;
    // attached_thread のときの forked_from_id（接続先の親スレッド ID）
    attachedParentId: string | null;
}

/** session_meta を読む対象のロールアウト。 */
export interface RolloutMetaTarget {
    path: string;
    threadId: string;
    compressed: boolean;
}

/** ロールアウトのファイル名を解析する。ロールアウトの形でなければ null。 */
export function parseRolloutFileName(name: string): RolloutName | null {
    const match = ROLLOUT_FILE.exec(name);
    if (!match) return null;
    return { threadId: match[1], rolloutId: match[2] ?? match[1], compressed: match[3] !== undefined };
}

/** 値が JSON のオブジェクトならそのまま返す。 */
function asObject(value: unknown): Record<string, unknown> | null {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;
}

/** JSON Lines の 1 行をオブジェクトとして解析する。解析できない行は null。 */
function parseJsonLine(line: string): Record<string, unknown> | null {
    try {
        return asObject(JSON.parse(line));
    } catch {
        return null;
    }
}

function stringOrNull(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * JSON Lines のテキストから、payload.id が threadId と一致する最初の session_meta を読む。
 * フォークのロールアウトは親の session_meta も含むので、一致しない行は読み飛ばす。見つからなければ null。
 */
export function findSessionMeta(text: string, threadId: string): RolloutMeta | null {
    for (const line of text.split('\n')) {
        if (!line.includes(SESSION_META_MARK)) continue;
        const record = parseJsonLine(line);
        if (record?.type !== 'session_meta') continue;
        const payload = asObject(record.payload);
        if (payload?.id !== threadId) continue;
        return {
            cwd: stringOrNull(payload.cwd),
            historyBaseRolloutId: stringOrNull(asObject(payload.history_base)?.thread_id),
            attachedParentId: payload.attached_thread === true ? stringOrNull(payload.forked_from_id) : null,
        };
    }
    return null;
}

/** .jsonl.zst の内容を展開して session_meta を探す。展開できなければ null。 */
function findCompressedSessionMeta(compressed: Buffer, threadId: string): RolloutMeta | null {
    try {
        const text = zstdDecompressSync(compressed, { maxOutputLength: ZST_MAX_OUTPUT_BYTES }).toString('utf8');
        return findSessionMeta(text, threadId);
    } catch {
        return null;
    }
}

/**
 * 各ロールアウトの session_meta を読み、入力の順に返す（読めない・見つからないものは null）。
 * 展開と解析はホスト側で行うので、環境に zstd が無くても読める。
 */
export async function readRolloutMetas(
    probe: CleanupProbe,
    targets: readonly RolloutMetaTarget[]
): Promise<(RolloutMeta | null)[]> {
    const results: (RolloutMeta | null)[] = targets.map(() => null);
    const indexes = targets.map((_, index) => index);

    const compressed = indexes.filter(index => targets[index].compressed);
    const bodies = await probe.readHeads(
        compressed.map(index => targets[index].path),
        ZST_MAX_COMPRESSED_BYTES
    );
    compressed.forEach((index, i) => {
        const body = bodies[i];
        results[index] = body ? findCompressedSessionMeta(body, targets[index].threadId) : null;
    });

    let pending = indexes.filter(index => !targets[index].compressed);
    for (const bytes of META_READ_STEPS) {
        if (pending.length === 0) break;
        const reads = await probe.readHeadTails(
            pending.map(index => targets[index].path),
            bytes
        );
        const unresolved: number[] = [];
        pending.forEach((index, i) => {
            const head = reads[i]?.head;
            if (!head) return;
            results[index] = findSessionMeta(head.toString('utf8'), targets[index].threadId);
            if (!results[index] && head.length >= bytes) unresolved.push(index);
        });
        pending = unresolved;
    }
    return results;
}

/**
 * JSON Lines のテキストから、key の値が ids に含まれる行を除く。解析できない行と他の行は改行を含めて原文のまま残す。
 * removed は除いた行の数。
 */
export function removeJsonlEntries(
    text: string,
    key: string,
    ids: ReadonlySet<string>
): { text: string; removed: number } {
    let removed = 0;
    const kept: string[] = [];
    for (const line of text.split(/(?<=\n)/)) {
        const value = parseJsonLine(line)?.[key];
        if (typeof value === 'string' && ids.has(value)) removed++;
        else kept.push(line);
    }
    return { text: removed > 0 ? kept.join('') : text, removed };
}
