import { posix, win32 } from 'path';
import { blake3 } from '@noble/hashes/blake3';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';

/** パスの規則を決める環境の OS（WSL は linux）。 */
export type GrokPathOs = 'win32' | 'darwin' | 'linux';

// Windows の長いパスの接頭辞。
const LONG_PATH_PREFIX = '\\\\?\\';
const LONG_UNC_PREFIX = '\\\\?\\UNC\\';
// メモリのスコープ名の規則（<slug>-<blake3 の 16 進の先頭 8 文字>）。
const MEMORY_SLUG_MAX = 40;
const MEMORY_SLUG_FALLBACK = 'workspace';
const MEMORY_HASH_CHARS = 8;
// 旧方式のセッションで memory_workspace_path が指すファイルの名前。
const LEGACY_MEMORY_FILE = 'MEMORY.md';

/** JSON のオブジェクトか。 */
function isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** JSON のテキストを解析する。解析できなければ null。 */
function parseJson(text: string): unknown {
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

/** Windows のパスの区切りを '\' にそろえ、長いパスの接頭辞を除く（'\\?\UNC\' は '\\' になる）。 */
function plainWindowsPath(path: string): string {
    const separators = path.replace(/\//g, '\\');
    if (separators.toUpperCase().startsWith(LONG_UNC_PREFIX)) return `\\\\${separators.slice(LONG_UNC_PREFIX.length)}`;
    return separators.startsWith(LONG_PATH_PREFIX) ? separators.slice(LONG_PATH_PREFIX.length) : separators;
}

/**
 * ワークスペースのパスの照合キー。
 * Windows は長いパスの接頭辞を除いて区切りを '\' にそろえ、ドライブ直下以外の末尾の区切りを除いて小文字にする。
 * それ以外は末尾の '/' を除くだけ（ルートは '/'）。macOS も大文字小文字を区別するボリュームがあるので畳まない。
 * 空文字列は空文字列を返す。
 */
export function grokPathKey(os: GrokPathOs, path: string): string {
    if (path.length === 0) return '';
    if (os === 'win32') {
        const trimmed = plainWindowsPath(path).replace(/\\+$/, '');
        return (/^[A-Za-z]:$/.test(trimmed) ? `${trimmed}\\` : trimmed).toLowerCase();
    }
    const trimmed = path.replace(/\/+$/, '');
    return trimmed.length > 0 ? trimmed : '/';
}

/** 環境の絶対パスの形か。NUL と改行を含む文字列はパスとして扱わない。 */
export function isGrokAbsolutePath(os: GrokPathOs, path: string): boolean {
    if (/[\0\r\n]/.test(path)) return false;
    return os === 'win32' ? /^(?:[A-Za-z]:[\\/]|[\\/]{2})/.test(path) : path.startsWith('/');
}

/** parentKey の下位フォルダの照合キーか（同じキーは含まない）。 */
export function isGrokSubpathKey(os: GrokPathOs, parentKey: string, childKey: string): boolean {
    const separator = os === 'win32' ? '\\' : '/';
    const prefix = parentKey.endsWith(separator) ? parentKey : `${parentKey}${separator}`;
    return childKey.length > prefix.length && childKey.startsWith(prefix);
}

/** sessions 直下のディレクトリ名を復号する。復号の結果が環境の絶対パスの形でなければ null。 */
export function decodeGrokSessionDirName(os: GrokPathOs, name: string): string | null {
    let decoded: string;
    try {
        decoded = decodeURIComponent(name);
    } catch {
        return null;
    }
    return isGrokAbsolutePath(os, decoded) ? decoded : null;
}

/** .cwd の内容からパスを読む。環境の絶対パスの形でなければ null。 */
export function parseGrokCwdFile(os: GrokPathOs, text: string): string | null {
    const path = text.trim();
    return isGrokAbsolutePath(os, path) ? path : null;
}

/** summary.json の内容から info.cwd を読む。環境の絶対パスの形でなければ null。 */
export function parseGrokSummaryCwd(os: GrokPathOs, text: string): string | null {
    const summary = parseJson(text);
    const cwd = isObject(summary) && isObject(summary.info) ? summary.info.cwd : null;
    return typeof cwd === 'string' && isGrokAbsolutePath(os, cwd) ? cwd : null;
}

/** git_remotes の値から URL を集める。要素は文字列か、url を持つオブジェクト。 */
function remoteUrlsOf(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap(item => {
        const url = isObject(item) ? item.url : item;
        return typeof url === 'string' && url.length > 0 ? [url] : [];
    });
}

/** summary.json の内容から git_remotes の URL を読む（トップレベルと info の下のどちらでも読む）。 */
export function parseGrokSummaryRemotes(text: string): string[] {
    const summary = parseJson(text);
    if (!isObject(summary)) return [];
    return [
        ...remoteUrlsOf(summary.git_remotes),
        ...(isObject(summary.info) ? remoteUrlsOf(summary.info.git_remotes) : []),
    ];
}

/**
 * prompt_context.json の内容から memory_workspace_path だけを読み、メモリのスコープ名を返す。
 * 値の最後の要素がスコープ名で、旧方式の MEMORY.md を指す値は親の要素を使う。読めなければ null。
 */
export function parseGrokPromptContextScope(text: string): string | null {
    const context = parseJson(text);
    const value = isObject(context) ? context.memory_workspace_path : null;
    if (typeof value !== 'string') return null;
    const segments = value.split(/[\\/]/).filter(segment => segment.length > 0);
    if (segments[segments.length - 1] === LEGACY_MEMORY_FILE) segments.pop();
    return segments.pop() ?? null;
}

/** メモリのスコープ名の slug 部分。小文字にして ASCII 英数字以外を '-' にし、40 文字で切って両端の '-' を除く。 */
export function grokMemorySlug(name: string): string {
    const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, MEMORY_SLUG_MAX)
        .replace(/^-+|-+$/g, '');
    return slug.length > 0 ? slug : MEMORY_SLUG_FALLBACK;
}

/** slug の元の名前とハッシュの入力から、メモリのスコープ名を計算する。 */
export function grokMemoryScopeName(slugSource: string, hashInput: string): string {
    const hash = bytesToHex(blake3(utf8ToBytes(hashInput))).slice(0, MEMORY_HASH_CHARS);
    return `${grokMemorySlug(slugSource)}-${hash}`;
}

/**
 * パスの原文から、メモリのスコープ名の候補を計算する。slug の元はパスの最後の要素で、ルートには要素が無い。
 * Windows は CLI の正規化で付くことがある長いパスの接頭辞の有無も候補にする。
 */
export function grokMemoryScopesOfPath(os: GrokPathOs, path: string): string[] {
    const baseName = (os === 'win32' ? win32 : posix).basename(path);
    const inputs = [path];
    if (os === 'win32') {
        inputs.push(path.startsWith(LONG_PATH_PREFIX) ? plainWindowsPath(path) : `${LONG_PATH_PREFIX}${path}`);
    }
    return inputs.map(input => grokMemoryScopeName(baseName, input));
}

/**
 * リモートの URL を org/repo の形にする。スキームとホスト、末尾の .git、両端の '/' を除く。
 * git@host:org/repo.git の形にも対応する。'/' を含まない結果は使えないので null。
 */
export function normalizeGrokGitRemote(url: string): { input: string; repo: string } | null {
    let rest = url.trim();
    const scheme = /^[A-Za-z][A-Za-z0-9+.-]*:\/\//.exec(rest);
    if (scheme) {
        rest = rest.slice(scheme[0].length);
        const slash = rest.indexOf('/');
        if (slash === -1) return null;
        rest = rest.slice(slash + 1);
    } else {
        const colon = rest.indexOf(':');
        const slash = rest.indexOf('/');
        if (colon !== -1 && (slash === -1 || colon < slash)) rest = rest.slice(colon + 1);
    }
    const input = rest
        .replace(/\/+$/, '')
        .replace(/\.git$/, '')
        .replace(/^\/+|\/+$/g, '');
    const slash = input.lastIndexOf('/');
    return slash === -1 ? null : { input, repo: input.slice(slash + 1) };
}

/** リモートの URL から、メモリのスコープ名を計算する。org/repo の形にできなければ null。 */
export function grokMemoryScopeOfRemote(url: string): string | null {
    const remote = normalizeGrokGitRemote(url);
    return remote ? grokMemoryScopeName(remote.repo, remote.input) : null;
}

/** .git/config の値の引用符とエスケープを解き、行末のコメントを除く。 */
function gitConfigValue(raw: string): string {
    let value = '';
    let quoted = false;
    for (let i = 0; i < raw.length; i++) {
        const char = raw[i];
        if (char === '"') {
            quoted = !quoted;
        } else if (char === '\\' && i + 1 < raw.length) {
            i++;
            value += raw[i];
        } else if (!quoted && (char === '#' || char === ';')) {
            break;
        } else {
            value += char;
        }
    }
    return value.trim();
}

/** .git/config の内容から、[remote "origin"] の url の値をすべて返す。 */
export function parseGitOriginUrls(text: string): string[] {
    const urls: string[] = [];
    let inOrigin = false;
    for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (line.length === 0 || line.startsWith('#') || line.startsWith(';')) continue;
        const section = /^\[\s*([A-Za-z0-9.-]+)(?:\s+"((?:[^"\\]|\\.)*)")?\s*\]/.exec(line);
        if (section) {
            const name = section[1].toLowerCase();
            inOrigin = name === 'remote.origin' || (name === 'remote' && section[2] === 'origin');
            continue;
        }
        if (!inOrigin) continue;
        const entry = /^url\s*=(.*)$/i.exec(line);
        if (!entry) continue;
        const url = gitConfigValue(entry[1]);
        if (url.length > 0) urls.push(url);
    }
    return urls;
}

/** .git がファイルのときの内容（gitdir: <パス>）から、パスを読む。読めなければ null。 */
export function parseGitDirPointer(text: string): string | null {
    const match = /^gitdir:[ \t]*(.+?)[ \t]*$/m.exec(text.replace(/\r/g, ''));
    return match ? match[1] : null;
}

/**
 * 1 回のスキャンで見つかったパスの綴りを照合キーごとに集め、表示するパスを 1 つに決める。
 * 優先順は信頼の記録のキー、その他の順で、同じ順位では接頭辞と '/' を含まない綴りを優先して並べ替えの先頭を使う。
 */
export class GrokPathBook {
    private readonly spellingsByKey = new Map<string, { records: Set<string>; others: Set<string> }>();

    constructor(private readonly os: GrokPathOs) {}

    private entryOf(path: string): { records: Set<string>; others: Set<string> } {
        const key = grokPathKey(this.os, path);
        let entry = this.spellingsByKey.get(key);
        if (!entry) {
            entry = { records: new Set(), others: new Set() };
            this.spellingsByKey.set(key, entry);
        }
        return entry;
    }

    /** 信頼の記録のキーの綴りを記録する。 */
    addRecordKey(path: string): void {
        this.entryOf(path).records.add(path);
    }

    /** それ以外で見つかったパスの綴りを記録する。 */
    addPath(path: string): void {
        this.entryOf(path).others.add(path);
    }

    /** 綴りが記録された照合キー。 */
    keys(): string[] {
        return [...this.spellingsByKey.keys()];
    }

    /** 照合キーの綴りをすべて返す。 */
    spellings(key: string): string[] {
        const entry = this.spellingsByKey.get(key);
        return entry ? [...new Set([...entry.records, ...entry.others])] : [];
    }

    /** 照合キーに対応する表示するパス。綴りが記録されていなければ照合キーをそのまま返す。 */
    display(key: string): string {
        const entry = this.spellingsByKey.get(key);
        const pool = entry && entry.records.size > 0 ? entry.records : entry?.others;
        if (!pool || pool.size === 0) return key;
        const sorted = [...pool].sort();
        const plain = sorted.find(path => !path.startsWith(LONG_PATH_PREFIX) && !path.includes('/'));
        return (this.os === 'win32' ? plain : undefined) ?? sorted[0];
    }
}
