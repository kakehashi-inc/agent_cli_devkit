import { posix } from 'path';

/** 行の同一視と表示の規則を決める OS。 */
export type AgyPathOs = 'win32' | 'darwin' | 'linux';

const FILE_URI_PREFIX = 'file://';

/**
 * file URI からパスの部分を取り出す。'file://' の直後から最初の '/' までを権限部とし、権限部は空か
 * ドライブ（英字と ':'）だけを受け付ける。別のホストの URI、'?' や '#' を含む URI、パーセントエンコードが
 * 不正な URI は null。
 */
function fileUriPath(uri: string): string | null {
    if (/[?#]/.test(uri)) return null;
    const rest = uri.slice(FILE_URI_PREFIX.length);
    const slash = rest.indexOf('/');
    const authority = slash === -1 ? rest : rest.slice(0, slash);
    if (authority.length > 0 && !/^[a-zA-Z]:$/.test(authority)) return null;
    let decoded: string;
    try {
        decoded = decodeURIComponent(rest);
    } catch {
        return null;
    }
    return /^\/[a-zA-Z]:/.test(decoded) ? decoded.slice(1) : decoded;
}

/**
 * OS のパス文字列を比較用の形にする。Windows の形のパス（ドライブから始まるものと UNC）だけ '\' を '/' にする。
 * POSIX のパスの '\' はファイル名の一部なので変えない。path.Clean と同じく '.' と '..' を解決し、末尾の '/' を除き、
 * ドライブ文字だけを小文字にする。それ以外の大文字小文字は区別したまま残す。
 * 空の場合、ルート（'/'）の場合、絶対パスにならない場合は null。
 */
export function normalizeAgyPath(path: string): string | null {
    if (path.length === 0 || path.includes('\0')) return null;
    const windowsForm = /^[a-zA-Z]:/.test(path) || path.startsWith('\\\\');
    const cleaned = posix.normalize(windowsForm ? path.replace(/\\/g, '/') : path);
    const trimmed = cleaned.endsWith('/') ? cleaned.slice(0, -1) : cleaned;
    const result = /^[a-zA-Z]:/.test(trimmed) ? `${trimmed[0].toLowerCase()}${trimmed.slice(1)}` : trimmed;
    return result.startsWith('/') || /^[a-z]:(\/|$)/.test(result) ? result : null;
}

/**
 * ワークスペースの URI を比較用の形にする。'file://' で始まるものだけを URI として解釈し、それ以外はパスとして扱う。
 * 照合できないもの（別のスキーム、別のホスト、絶対パスにならないものなど）は null。
 */
export function normalizeAgyWorkspaceUri(uri: string): string | null {
    if (!uri.startsWith(FILE_URI_PREFIX)) return normalizeAgyPath(uri);
    const path = fileUriPath(uri);
    return path === null ? null : normalizeAgyPath(path);
}

/** 正規化したパスの、行を同一視するためのキー。Windows は全体を小文字にし、それ以外は区別したまま使う。 */
export function agyPathRowKey(normalized: string, os: AgyPathOs): string {
    return os === 'win32' ? normalized.toLowerCase() : normalized;
}

/** 正規化したパスの表示用の文字列。Windows は区切りを '\' に戻し、ドライブ文字を大文字にする。 */
export function agyPathDisplay(normalized: string, os: AgyPathOs): string {
    if (os !== 'win32') return normalized;
    const drive = /^[a-z]:/.test(normalized) ? `${normalized[0].toUpperCase()}${normalized.slice(1)}` : normalized;
    return /^[A-Z]:$/.test(drive) ? `${drive}\\` : drive.replace(/\//g, '\\');
}
