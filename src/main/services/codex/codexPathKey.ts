/** パスの規則を決める環境の OS（WSL は linux）。 */
export type CodexPathOs = 'win32' | 'darwin' | 'linux';

/** A-Z だけを小文字にする（Windows の Codex の比較と同じ範囲。非 ASCII は変えない）。 */
function lowerAscii(text: string): string {
    return text.replace(/[A-Z]/g, letter => String.fromCharCode(letter.charCodeAt(0) + 32));
}

/** Windows の verbatim 接頭辞を除く。信頼のキーは小文字のことがあるので、接頭辞の大小文字は区別しない。 */
function dropVerbatimPrefix(path: string): string {
    if (/^\\\\\?\\UNC\\/i.test(path)) return `\\\\${path.slice('\\\\?\\UNC\\'.length)}`;
    return path.startsWith('\\\\?\\') ? path.slice('\\\\?\\'.length) : path;
}

/** Windows のパスから接頭辞と区切りの違い、末尾の区切りを除く。 */
function plainWindowsPath(path: string): string {
    return dropVerbatimPrefix(path).replace(/\//g, '\\').replace(/\\+$/, '');
}

/** POSIX のパスの末尾の '/' を除く（ルートは '/' のまま）。 */
function plainPosixPath(path: string): string {
    const trimmed = path.replace(/\/+$/, '');
    return trimmed.length > 0 || path.length === 0 ? trimmed : '/';
}

/**
 * パスの比較キー。ファイルシステムには問い合わせず、保存された文字列だけで決める。
 * Windows は `\\?\UNC\` を `\\` に、`\\?\` を空にし、'/' を '\' に揃え、末尾の区切りを除き、A-Z だけを小文字にする。
 * それ以外は末尾の '/' だけを除く。
 */
export function codexPathKey(os: CodexPathOs, path: string): string {
    return os === 'win32' ? lowerAscii(plainWindowsPath(path)) : plainPosixPath(path);
}

/**
 * 画面に表示するパスの形。Windows は verbatim 接頭辞を除いて '\' 区切りにし、ドライブ文字を大文字にする。
 * ドライブ直下は 'D:\' の形を保つ。それ以外は末尾の '/' だけを除く。
 */
export function codexDisplayPath(os: CodexPathOs, path: string): string {
    if (os !== 'win32') return plainPosixPath(path);
    const plain = plainWindowsPath(path);
    const rooted = /^[A-Za-z]:$/.test(plain) ? `${plain}\\` : plain;
    return rooted.replace(/^[a-z]:/, drive => drive.toUpperCase());
}

/**
 * 1 回のスキャンで見つかったパスの綴りを比較キーごとに集め、表示するパスを 1 つに決める。
 * 綴りの優先順は threads.cwd、session_meta の cwd、config.toml のキーの順で、同じ順位に複数あれば並べ替えて先頭を使う。
 */
export class CodexPathBook {
    private readonly spellings = new Map<string, [Set<string>, Set<string>, Set<string>]>();

    constructor(private readonly os: CodexPathOs) {}

    private add(rank: 0 | 1 | 2, path: string): string {
        const key = codexPathKey(this.os, path);
        let entry = this.spellings.get(key);
        if (!entry) {
            entry = [new Set(), new Set(), new Set()];
            this.spellings.set(key, entry);
        }
        entry[rank].add(path);
        return key;
    }

    /** threads.cwd の綴りを記録し、比較キーを返す。 */
    addThreadCwd(path: string): string {
        return this.add(0, path);
    }

    /** session_meta の cwd の綴りを記録し、比較キーを返す。 */
    addSessionMetaCwd(path: string): string {
        return this.add(1, path);
    }

    /** config.toml のキーの綴りを記録し、比較キーを返す。 */
    addRecordKey(path: string): string {
        return this.add(2, path);
    }

    /** 比較キーに対応する表示するパス。綴りが記録されていなければ比較キーを表示の形にする。 */
    display(key: string): string {
        const pool = this.spellings.get(key)?.find(spelling => spelling.size > 0);
        return codexDisplayPath(this.os, pool ? [...pool].sort()[0] : key);
    }
}
