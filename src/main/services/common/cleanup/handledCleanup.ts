import type { AgentEnvironment, CleanupChildBadge, CleanupInUseSession } from '../../../../shared/agents/types';
import type { ChildExclusion } from './resolvedCleanup';

/** ハンドラーが一覧した子要素（名前・件数・サイズ）。name はハンドラーが子要素を特定できる識別子を含む。 */
export interface HandledChild {
    name: string;
    // 画面に表示する名前（無ければ name を表示する）
    displayName?: string;
    // 対応するワークスペースのパスを特定できない子要素
    pathUnknown?: boolean;
    // 名前の横に添える状態の表示
    badges?: CleanupChildBadge[];
    size: number;
    fileCount: number;
    // 大きさを取得できない子要素。画面にはサイズを表示しない（size は 0 とする）。
    sizeUnknown?: boolean;
    excluded?: ChildExclusion;
    // 使用中の可能性があると判定した根拠（excluded='in-use' のうち、承認されたときに削除できるもの）
    inUseSessions?: CleanupInUseSession[];
}

/** 候補をこの環境で使えない理由。行と注記を表示し、選択できないようにする。 */
export interface CleanupBlock {
    noticeKey: string;
    noticeParams?: Record<string, string>;
}

/**
 * ファイルの削除ではなく、agent の CLI などの手段で消す候補の一覧と削除。
 * - listChildren: 候補の走査で呼ばれ、子要素を返す。対象が無い場合は空配列、一覧できない場合は例外を投げる。
 *   CLI の実行は副作用を伴うため、消す対象が無いと分かる環境（CLI やデータが無い環境）では CLI を実行せずに空配列を返す。
 * - remove: 選択された子要素（'all' は削除できるものすべて）を消し、消そうとして消せなかった子要素名を返す。
 *   approved は使用中の可能性がある子要素のうち利用者が削除を承認したもので、使用中でも削除する。
 *   'all' のときの承認されていない使用中のものは、削除の対象ではないため黙って残す。個別に選択された子要素が
 *   使用中になっていた場合と見つからない場合（既に無いもの・特定できないもの）は、消せなかったものとして返す。
 *   何も消さないうちに続けられなくなった場合は例外を投げ、一部を消してから続けられなくなった場合は
 *   HandledRemovalIncomplete を投げる。failedPaths には、削除や更新ができずに残ったパスを追加する。
 * - blocked: 候補の走査で最初に呼ばれ、この環境で使えない理由を返す。使えるときは null。
 */
export interface CleanupHandler {
    blocked?(env: AgentEnvironment): Promise<CleanupBlock | null>;
    listChildren(env: AgentEnvironment): Promise<HandledChild[]>;
    remove(
        env: AgentEnvironment,
        names: 'all' | string[],
        approved: readonly string[],
        failedPaths?: string[]
    ): Promise<string[]>;
}

/**
 * ハンドラーが一部を消してから続けられなくなったことを表す。
 * remaining はそれまでに消せなかった・消さなかったと分かっている子要素名（消せたものは含めない）。
 */
export class HandledRemovalIncomplete extends Error {
    constructor(
        readonly remaining: string[],
        reason: unknown
    ) {
        super(`Cleanup stopped before finishing: ${reason instanceof Error ? reason.message : String(reason)}`);
        this.name = 'HandledRemovalIncomplete';
    }
}

/** ハンドラーで子要素を一覧する。一覧できなかった場合はログを残して空配列（対象なし）を返す。 */
export async function listHandled(
    handler: CleanupHandler,
    key: string,
    env: AgentEnvironment
): Promise<HandledChild[]> {
    try {
        return await handler.listChildren(env);
    } catch (error) {
        console.error(`Failed to list cleanup candidate ${key} (${JSON.stringify(env)}):`, error);
        return [];
    }
}

/**
 * ハンドラーで削除し、消せなかった子要素名を返す（approved は利用者が削除を承認した使用中の可能性がある子要素）。
 * 失敗した場合はログを残す。
 * 何も消さないうちに失敗した場合は選択全体（'all' は候補キー）を、一部を消してから続けられなくなった場合は
 * 消せなかったと分かっているものと、'all' のときは確認しきれなかったことを表す候補キーを返す。
 * ハンドラーが報告した、削除や更新ができずに残ったパスを failedPaths に追加する。
 */
export async function removeHandled(
    handler: CleanupHandler,
    key: string,
    env: AgentEnvironment,
    names: 'all' | string[],
    approved: readonly string[],
    failedPaths?: string[]
): Promise<string[]> {
    try {
        return await handler.remove(env, names, approved, failedPaths);
    } catch (error) {
        console.error(`Failed to clean ${key} (${JSON.stringify(env)}):`, error);
        if (error instanceof HandledRemovalIncomplete) {
            return names === 'all' ? [...error.remaining, key] : error.remaining;
        }
        return names === 'all' ? [key] : [...names];
    }
}
