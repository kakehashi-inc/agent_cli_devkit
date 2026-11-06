/** パスを区切りごとの名前に分ける。 */
function segmentsOf(path: string): string[] {
    return path.split(/[\\/]+/).filter(segment => segment !== '');
}

/** 名前の並びの組に共通する先頭の数を返す。最後の名前は数えない。 */
function commonLeadingCount(lists: readonly string[][]): number {
    const limit = Math.min(...lists.map(list => list.length - 1));
    let count = 0;
    while (count < limit && lists.every(list => list[count] === lists[0][count])) count += 1;
    return count;
}

/**
 * パスごとに、ほかのパスと見分けられる最小の部分を返す。結果は入力と同じ順で、区切りは '/'。
 * ファイル名が重なるパスは共通の先頭のフォルダを除き、そのうえで見分けられるまで末尾を伸ばす。同じパスは同じ結果になる。
 */
export function shortestDistinctPaths(paths: readonly string[]): string[] {
    const parts = paths.map(segmentsOf);
    const sameName = new Map<string, number[]>();
    parts.forEach((list, index) => {
        const name = list[list.length - 1] ?? '';
        sameName.set(name, [...(sameName.get(name) ?? []), index]);
    });
    for (const indexes of sameName.values()) {
        if (indexes.length < 2) continue;
        const lists = indexes.map(index => parts[index]);
        const count = commonLeadingCount(lists);
        for (const index of indexes) parts[index] = parts[index].slice(count);
    }
    const tailOf = (index: number, depth: number) => parts[index].slice(-depth).join('/');
    const depths = paths.map(() => 1);
    for (;;) {
        const owners = new Map<string, Set<string>>();
        paths.forEach((path, index) => {
            const tail = tailOf(index, depths[index]);
            owners.set(tail, (owners.get(tail) ?? new Set<string>()).add(path));
        });
        let changed = false;
        paths.forEach((_, index) => {
            const shared = (owners.get(tailOf(index, depths[index])) as Set<string>).size > 1;
            if (shared && depths[index] < parts[index].length) {
                depths[index] += 1;
                changed = true;
            }
        });
        if (!changed) return paths.map((_, index) => tailOf(index, depths[index]));
    }
}
