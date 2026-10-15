import type {
    AgentEnvironment,
    CleanupCandidate,
    CleanupCandidateSpec,
    CleanupChild,
} from '../../../../shared/agents/types';
import type { CleanupProbe } from './CleanupProbe';

/**
 * 子要素を削除しない理由。
 * - 'in-use': 使用中（ロック保持中・実行中など）。画面に表示し、選択できないようにする。
 * - 'ineligible': 日時などの条件を満たさない。画面には表示しない。
 */
export type ChildExclusion = 'in-use' | 'ineligible';

/** リゾルバが解決した子要素（環境内の実パス付き）。 */
export interface ResolvedChild {
    // 表示名兼識別子（候補内で一意）
    name: string;
    // 環境内の絶対パス
    path: string;
    type: 'file' | 'dir';
    size: number;
    fileCount: number;
    excluded?: ChildExclusion;
}

/**
 * 候補の子要素を環境ごとに解決する。名前・場所・中身・日時・ロックで対象を特定し、
 * 条件を満たさないものや使用中のものは excluded を付けて返す。削除の直前にも呼び直して再判定する。
 */
export type CleanupResolver = (probe: CleanupProbe) => Promise<ResolvedChild[]>;

export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

/** ホーム相対パス（区切りは '/'）を環境内の絶対パスにする。 */
export async function homePath(probe: CleanupProbe, rel: string): Promise<string> {
    return probe.join(await probe.homeDir(), ...rel.split('/'));
}

/** 日時 timeMs から thresholdMs 以上経過しているか。日時が不明（0 以下）や未来の場合は false。 */
export function isOlderThan(timeMs: number, thresholdMs: number, now: number): boolean {
    return timeMs > 0 && now - timeMs >= thresholdMs;
}

/**
 * Unix 時刻（ナノ秒）の 10 進文字列をエポックミリ秒に変換する。
 * Number では精度が足りないため、末尾 6 桁（1 ミリ秒未満の部分）を落として変換する。
 */
export function nanosToMs(nanos: string): number {
    return /^\d{7,}$/.test(nanos) ? Number(nanos.slice(0, -6)) : 0;
}

/** リゾルバを実行する。失敗した場合はログを残して空配列（対象なし）を返す。 */
export async function resolveChildren(
    resolver: CleanupResolver,
    probe: CleanupProbe,
    key: string,
    env: AgentEnvironment
): Promise<ResolvedChild[]> {
    try {
        return await resolver(probe);
    } catch (error) {
        console.error(`Failed to resolve cleanup candidate ${key} (${JSON.stringify(env)}):`, error);
        return [];
    }
}

/**
 * 解決済みの子要素から画面表示用の候補を組み立てる。
 * サイズ・件数は削除できる子要素だけの合計とし、使用中の子要素は inUse を付けて表示だけする。
 */
export function toResolvedCandidate(
    spec: CleanupCandidateSpec,
    resolved: readonly (Pick<ResolvedChild, 'name' | 'size' | 'fileCount' | 'excluded'> & { sizeUnknown?: boolean })[]
): CleanupCandidate {
    const visible = resolved.filter(child => child.excluded !== 'ineligible');
    const deletable = visible.filter(child => !child.excluded);
    const children: CleanupChild[] = visible
        .map(child => ({
            name: child.name,
            size: child.size,
            fileCount: child.fileCount,
            ...(child.sizeUnknown ? { sizeUnknown: true } : {}),
            ...(child.excluded === 'in-use' ? { inUse: true } : {}),
        }))
        .sort((a, b) => b.size - a.size);
    return {
        key: spec.key,
        exists: deletable.length > 0,
        size: deletable.reduce((sum, child) => sum + child.size, 0),
        fileCount: deletable.reduce((sum, child) => sum + child.fileCount, 0),
        defaultChecked: spec.defaultChecked,
        expandable: true,
        childKind: spec.childKind,
        children,
        ...(children.length > 0 && children.every(child => child.sizeUnknown) ? { sizeUnknown: true } : {}),
    };
}

/**
 * 子要素を解決し直したうえで、選択されたもののうち削除できるものだけを削除し、
 * 削除しなかった・できなかった子要素名を返す。
 * - names='all'（候補全体の選択）: 削除できるものすべてを削除する。使用中のものは報告し、
 *   条件を満たさないもの（画面に出していないもの）は黙って残す。
 * - names=名前の配列（個別選択）: 選択された名前だけを対象とし、使用中・条件外になったものは報告する。
 *   解決結果に無い名前（既に無いもの・対象外のもの）は何もしない。
 */
export async function deleteResolvedChildren(
    resolver: CleanupResolver,
    probe: CleanupProbe,
    key: string,
    env: AgentEnvironment,
    names: 'all' | string[]
): Promise<string[]> {
    let resolved: ResolvedChild[];
    try {
        resolved = await resolver(probe);
    } catch (error) {
        console.error(`Failed to resolve cleanup candidate ${key} (${JSON.stringify(env)}):`, error);
        return names === 'all' ? [key] : [...names];
    }
    const wanted = names === 'all' ? null : new Set(names);
    const skipped: string[] = [];
    const targets: ResolvedChild[] = [];
    for (const child of resolved) {
        if (wanted && !wanted.has(child.name)) continue;
        if (child.excluded === 'in-use' || (child.excluded === 'ineligible' && wanted)) {
            skipped.push(child.name);
            continue;
        }
        if (!child.excluded) targets.push(child);
    }
    const removed = await probe.remove(targets.map(child => ({ path: child.path, type: child.type })));
    targets.forEach((child, i) => {
        if (!removed[i]) {
            console.error(`Failed to remove ${child.path} (${JSON.stringify(env)})`);
            skipped.push(child.name);
        }
    });
    return skipped;
}
