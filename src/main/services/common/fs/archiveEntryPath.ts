import type AdmZip from 'adm-zip';

/** ZIP のエントリを、展開先からの正規化した相対パス（区切りは '/'）と組にしたもの。 */
export interface NormalizedArchiveEntry {
    path: string;
    entry: AdmZip.IZipEntry;
}

/**
 * パスの 1 セグメントとして安全な名前か。
 * 空・空白だけ・'.'・'..' を含む名前、区切り文字（'/'・'\'）、':'（ドライブ・代替データストリーム）、制御文字を含む名前、
 * 末尾がドット・空白の名前（Windows では末尾が取り除かれ、別の名前と同じ場所を指す）を拒否する。
 */
export function isSafePathSegment(name: string): boolean {
    return (
        name.trim().length > 0 &&
        name !== '.' &&
        !name.includes('..') &&
        !/[/\\:]/.test(name) &&
        !Array.from(name).some(char => char.charCodeAt(0) < 0x20) &&
        !/[. ]$/.test(name)
    );
}

/**
 * ZIP のエントリ名を展開先からの相対パス（区切りは '/'）に正規化する。
 * 区切りの '\' を '/' にそろえ、空のセグメントと '.' のセグメント（先頭の './' など）を取り除く。
 * 絶対パス・ドライブ文字で始まる名前と、安全でないセグメント（isSafePathSegment）を含む名前は null。
 * 正規化して何も残らない名前（'./' だけのエントリなど）は ''。
 */
export function normalizeArchiveEntryPath(entryName: string): string | null {
    const unified = entryName.replace(/\\/g, '/');
    if (unified.startsWith('/') || /^[a-zA-Z]:/.test(unified)) return null;
    const segments = unified.split('/').filter(segment => segment.length > 0 && segment !== '.');
    return segments.every(isSafePathSegment) ? segments.join('/') : null;
}

/**
 * ZIP の各エントリを正規化した相対パスと組にして返す。安全でない名前のエントリが 1 つでもあれば null。
 * 正規化して何も残らないエントリは含めない。
 */
export function normalizedArchiveEntries(zip: AdmZip): NormalizedArchiveEntry[] | null {
    const entries: NormalizedArchiveEntry[] = [];
    for (const entry of zip.getEntries()) {
        const path = normalizeArchiveEntryPath(entry.entryName);
        if (path === null) return null;
        if (path.length > 0) entries.push({ path, entry });
    }
    return entries;
}

/** 正規化したエントリの先頭セグメント（トップレベルのファイル名を含む。重複なし）。 */
export function archiveTopLevelNames(entries: readonly NormalizedArchiveEntry[]): string[] {
    return Array.from(new Set(entries.map(({ path }) => path.split('/')[0])));
}

/**
 * 正規化したエントリのトップレベルのディレクトリ名（重複なし）。
 * ディレクトリの中にあるエントリと、ディレクトリのエントリの先頭セグメントだけを数え、トップレベルのファイルは含めない。
 */
export function archiveTopLevelDirs(entries: readonly NormalizedArchiveEntry[]): string[] {
    const dirs = new Set<string>();
    for (const { path, entry } of entries) {
        const slash = path.indexOf('/');
        if (slash > 0) dirs.add(path.slice(0, slash));
        else if (entry.isDirectory) dirs.add(path);
    }
    return Array.from(dirs);
}
