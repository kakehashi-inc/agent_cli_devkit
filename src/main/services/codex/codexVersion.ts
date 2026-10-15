/**
 * Codex のバージョン文字列を比較する（'0.144.0-alpha.4' < '0.144.0' < '0.162.1'）。
 * 数値部を各セグメントの数値で比べ、同じなら正式版をプレリリースより新しいとみなす。
 */
export function compareCodexVersions(a: string, b: string): number {
    const splitPre = (v: string): [string, string] => {
        const i = v.indexOf('-');
        return i === -1 ? [v, ''] : [v.slice(0, i), v.slice(i + 1)];
    };
    const [coreA, preA] = splitPre(a);
    const [coreB, preB] = splitPre(b);
    const numsA = coreA.split('.').map(s => Number.parseInt(s, 10));
    const numsB = coreB.split('.').map(s => Number.parseInt(s, 10));
    for (let i = 0; i < Math.max(numsA.length, numsB.length); i++) {
        const diff = (numsA[i] ?? 0) - (numsB[i] ?? 0);
        if (diff !== 0) {
            return diff;
        }
    }
    if (preA === preB) {
        return 0;
    }
    if (preA.length === 0) {
        return 1;
    }
    if (preB.length === 0) {
        return -1;
    }
    const segA = preA.split('.');
    const segB = preB.split('.');
    for (let i = 0; i < Math.max(segA.length, segB.length); i++) {
        const sa = segA[i] ?? '';
        const sb = segB[i] ?? '';
        const na = Number.parseInt(sa, 10);
        const nb = Number.parseInt(sb, 10);
        const cmp = Number.isFinite(na) && Number.isFinite(nb) ? na - nb : sa.localeCompare(sb);
        if (cmp !== 0) {
            return cmp;
        }
    }
    return 0;
}
