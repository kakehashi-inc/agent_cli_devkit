import { OPENCODE_CLI_COMMAND, OPENCODE_DATABASE_REL } from '../../../shared/agents/opencode/constants';
import type { AgentEnvironment, CleanupInUseSession } from '../../../shared/agents/types';
import type { AgentCliRunner } from '../common/cli/AgentCliRunner';
import { HandledRemovalIncomplete, type CleanupHandler, type HandledChild } from '../common/cleanup/handledCleanup';
import { MINUTE_MS } from '../common/cleanup/resolvedCleanup';
import { HomeFs } from '../common/wsl/HomeFs';
import type { WslDetector } from '../common/wsl/WslDetector';
import { openCodeCliAvailable } from './openCodeCli';

// 一覧で一度に取得する件数の上限（子セッションを含む）。超える分は削除を繰り返して取り切る。
const LIST_LIMIT = 1000;
// 削除のために一覧を取り直す回数の上限。
const MAX_ROUNDS = 20;
const SESSION_TIMEOUT_MS = 120_000;
// OpenCode のセッション ID（ses_ に英数字が続く）。
const SESSION_ID_PATTERN = /^ses_[A-Za-z0-9]+$/;
// 表示名の末尾に付けたセッション ID（[ses_...]）。
const SESSION_ID_IN_NAME = /\[(ses_[A-Za-z0-9]+)\]$/;
// 自身か子孫のセッションがこの時間内に更新された親なしのセッションは、実行中の可能性があるため承認されない限り削除しない。
const RECENT_UPDATE_MS = 5 * MINUTE_MS;

/** 使用中の可能性があると判定した根拠（'recent'=直近に更新、'unknown'=更新日時や親が分からない）。 */
type InUseReason = Extract<CleanupInUseSession['reason'], 'recent' | 'unknown'>;

interface SessionEntry {
    id: string;
    name: string;
    // 使用中の可能性があるセッションの根拠。使用中の可能性が無いセッションは undefined。
    inUse?: InUseReason;
}

interface SessionListing {
    // 親なしのセッション（新しい順）
    entries: SessionEntry[];
    // 一覧が上限に達したか（一覧に入らなかった古いセッションが残っている可能性がある）
    truncated: boolean;
}

/** 一覧の 1 件（子セッションを含む）。 */
interface SessionItem {
    id: string;
    title?: string;
    parentID?: string;
    // 直近に更新された（'recent'）か、更新日時が分からない（'unknown'）か。どちらでもなければ undefined。
    inUse?: InUseReason;
}

/** 表示名の末尾にセッション ID を付ける。削除するときは名前から ID を取り出して特定する。 */
function displayName(title: string | undefined, id: string): string {
    const text = (title ?? '').replace(/[\r\n\t]+/g, ' ').trim();
    return `${text.length > 0 ? text : '(untitled)'} [${id}]`;
}

/**
 * 一覧の各セッションを親なしのセッションごとにまとめ、自身か子孫が直近に更新された（または更新日時が分からない）ものを
 * 使用中の可能性があるものにする。根拠は、更新日時が分からないものを含む場合は 'unknown'、それ以外は 'recent'。
 * 一覧は更新日時の新しい順のため、一覧に入らなかった子孫はそのセッションより古く、判定に影響しない。
 * 直近に更新されたセッションの親を一覧の中でたどれない場合は、どの親なしのセッションのものか分からないため、
 * すべての親なしのセッションを根拠 'unknown' で使用中の可能性があるものにする。
 */
function toEntries(items: SessionItem[]): SessionEntry[] {
    const byId = new Map(items.map(item => [item.id, item]));
    const recentRoots = new Map<string, InUseReason>();
    let unknownRoot = false;
    for (const item of items) {
        if (!item.inUse) continue;
        let current = item;
        const visited = new Set<string>();
        while (current.parentID !== undefined && !visited.has(current.id)) {
            visited.add(current.id);
            const parent = byId.get(current.parentID);
            if (!parent) break;
            current = parent;
        }
        if (current.parentID === undefined) {
            if (recentRoots.get(current.id) !== 'unknown') recentRoots.set(current.id, item.inUse);
        } else {
            unknownRoot = true;
        }
    }
    return items
        .filter(item => item.parentID === undefined)
        .map(item => {
            const inUse: InUseReason | undefined = unknownRoot ? 'unknown' : recentRoots.get(item.id);
            return { id: item.id, name: displayName(item.title, item.id), ...(inUse ? { inUse } : {}) };
        });
}

/** 表示名の末尾のセッション ID を取り出す。 */
function sessionIdOf(name: string): string | undefined {
    return SESSION_ID_IN_NAME.exec(name)?.[1];
}

/**
 * OpenCode 2 の履歴（opencode.db 内のセッション）を CLI で消すクリーンアップ候補。
 * `opencode api GET /api/session`（全プロジェクトのセッションを子セッションを含めて更新日時の新しい順）で一覧し、
 * 親なしのセッションを候補にして、`opencode session delete`（子セッションを含めて削除）で消す。
 * いずれも環境の中（WSL は distro の中）の private サーバー（--standalone）で実行し、資格情報・保存済みの権限・
 * アカウントなどデータベースの他の内容には触れない。OpenCode 2 が見つからない環境と、データベース（OPENCODE_DATABASE_REL）が
 * 無い環境では、セッション用のコマンドを実行せずにセッションが無いものとして扱う。
 * 実行中かどうかは CLI から得られないため、自身か子孫（サブエージェントのセッション）が直近 5 分以内に更新された
 * セッションと、更新日時が分からないセッションは使用中の可能性があるものとし、利用者が承認したものだけを削除する。
 * 選択・承認されたセッションは表示名の末尾の ID で特定する（タイトルが変わっても同じものを消す）。
 * 削除に失敗したセッション（使用中でロックされている場合など）・個別に選択したが承認されていない使用中の可能性がある
 * セッション・見つからないセッションは消せなかったものとして返す。
 */
export class OpenCodeSessionCleanup implements CleanupHandler {
    constructor(
        private readonly runner: AgentCliRunner,
        private readonly detector: WslDetector
    ) {}

    /**
     * 親なしのセッションを新しい順に取得する。OpenCode 2 が無い場合とデータベースが無い場合はセッション用のコマンドを実行せずに空の一覧、
     * CLI が失敗した場合は例外を投げる。
     */
    private async list(env: AgentEnvironment): Promise<SessionListing> {
        if (!(await openCodeCliAvailable(this.runner, env))) return { entries: [], truncated: false };
        if (!(await new HomeFs(env, this.detector).exists(OPENCODE_DATABASE_REL))) {
            return { entries: [], truncated: false };
        }
        // メソッドとパスで呼ぶ形式では --param がクエリに付かないため、クエリはパスに含める。
        const result = await this.runner.run(
            env,
            OPENCODE_CLI_COMMAND,
            ['api', 'GET', `/api/session?limit=${LIST_LIMIT}`, '--standalone'],
            SESSION_TIMEOUT_MS
        );
        if (!result.ok) throw new Error(`opencode api failed: ${result.stderr.trim() || result.exitCode}`);
        const parsed: unknown = JSON.parse(result.stdout);
        const data = (parsed as { data?: unknown }).data;
        if (!Array.isArray(data)) return { entries: [], truncated: false };
        const now = Date.now();
        const items: SessionItem[] = [];
        for (const item of data) {
            const { id, title, parentID, time } = item as {
                id?: unknown;
                title?: unknown;
                parentID?: unknown;
                time?: { updated?: unknown };
            };
            if (typeof id !== 'string' || !SESSION_ID_PATTERN.test(id)) continue;
            // time.updated はエポックミリ秒。未来の日時（時計のずれ）も直近として扱う。
            const updated = time?.updated;
            const inUse: InUseReason | undefined =
                typeof updated !== 'number' || !Number.isFinite(updated)
                    ? 'unknown'
                    : now - updated < RECENT_UPDATE_MS
                      ? 'recent'
                      : undefined;
            items.push({
                id,
                ...(typeof title === 'string' ? { title } : {}),
                ...(typeof parentID === 'string' ? { parentID } : {}),
                ...(inUse ? { inUse } : {}),
            });
        }
        return { entries: toEntries(items), truncated: data.length >= LIST_LIMIT };
    }

    /** セッションを 1 件削除し、削除できたかを返す。 */
    private async deleteSession(env: AgentEnvironment, entry: SessionEntry): Promise<boolean> {
        const result = await this.runner.run(
            env,
            OPENCODE_CLI_COMMAND,
            ['session', 'delete', entry.id, '--standalone'],
            SESSION_TIMEOUT_MS
        );
        if (!result.ok) console.error(`Failed to delete OpenCode session ${entry.id}: ${result.stderr.trim()}`);
        return result.ok;
    }

    async listChildren(env: AgentEnvironment): Promise<HandledChild[]> {
        // 1 件ごとの大きさは CLI から得られないため、サイズは表示せず、件数は 1 件として数える。
        return (await this.list(env)).entries.map(entry => ({
            name: entry.name,
            size: 0,
            fileCount: 1,
            sizeUnknown: true,
            ...(entry.inUse
                ? { excluded: 'in-use' as const, inUseSessions: [{ id: entry.id, reason: entry.inUse }] }
                : {}),
        }));
    }

    async remove(env: AgentEnvironment, names: 'all' | string[], approved: readonly string[]): Promise<string[]> {
        const approvedIds = new Set(approved.map(sessionIdOf).filter((id): id is string => id !== undefined));
        return names === 'all' ? this.removeAll(env, approvedIds) : this.removeSelected(env, names, approvedIds);
    }

    /**
     * 選択されたセッションを名前の ID で特定して削除する。一覧に無い・承認されていない使用中の可能性がある・
     * 削除に失敗したものの名前を返す。
     */
    private async removeSelected(env: AgentEnvironment, names: string[], approvedIds: Set<string>): Promise<string[]> {
        const listed = new Map((await this.list(env)).entries.map(entry => [entry.id, entry]));
        const skipped: string[] = [];
        for (const name of names) {
            const id = sessionIdOf(name);
            const entry = id ? listed.get(id) : undefined;
            const allowed = entry !== undefined && (!entry.inUse || approvedIds.has(entry.id));
            if (!entry || !allowed || !(await this.deleteSession(env, entry))) skipped.push(name);
        }
        return skipped;
    }

    /**
     * 使用中の可能性が無いセッションと、承認された使用中の可能性があるセッションをすべて削除する。
     * 一覧の上限を超える分は、一覧と削除を繰り返して取り切る。削除に失敗したものの名前を返し、承認されていない使用中の
     * 可能性があるセッションは削除の対象ではないため黙って残す。2 回目以降の一覧に失敗した場合と、取り切れないまま
     * （一覧が上限に達したまま新しく消せるものが無くなった場合と、繰り返しの上限に達した場合）終わった場合は
     * HandledRemovalIncomplete を投げる。
     */
    private async removeAll(env: AgentEnvironment, approvedIds: Set<string>): Promise<string[]> {
        const deleted = new Set<string>();
        const skipped = new Map<string, string>();
        for (let round = 0; ; round++) {
            let listing: SessionListing;
            try {
                listing = await this.list(env);
            } catch (error) {
                if (round === 0) throw error;
                throw new HandledRemovalIncomplete([...skipped.values()], error);
            }
            const targets = listing.entries.filter(
                entry => !deleted.has(entry.id) && !skipped.has(entry.id) && (!entry.inUse || approvedIds.has(entry.id))
            );
            if (targets.length === 0) {
                if (!listing.truncated) return [...skipped.values()];
                throw new HandledRemovalIncomplete(
                    [...skipped.values()],
                    new Error('sessions beyond the listing limit remain')
                );
            }
            if (round === MAX_ROUNDS) {
                throw new HandledRemovalIncomplete(
                    [...skipped.values()],
                    new Error(`stopped after ${MAX_ROUNDS} rounds`)
                );
            }
            for (const entry of targets) {
                if (await this.deleteSession(env, entry)) deleted.add(entry.id);
                else skipped.set(entry.id, entry.name);
            }
        }
    }
}
