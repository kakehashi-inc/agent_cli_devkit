import { posix, win32 } from 'path';

/** パスの規則を決める環境の OS（WSL は linux）。 */
export type PathOs = 'win32' | 'darwin' | 'linux';

// プロジェクト名（作業フォルダのパスを符号化した名前）の長さの上限。超える分は切り詰めてハッシュを付ける。
const PROJECT_NAME_MAX = 200;
// 会話記録の行のうち、作業フォルダを持つ可能性がある行の目印。
const CWD_MARK = '"cwd"';
const RELOCATED_MARK = '"relocated"';

/**
 * 作業フォルダの絶対パスを、Claude Code と同じ規則でプロジェクト名にする（会話記録・MCP ログのディレクトリ名）。
 * 英数字以外を '-' にし、上限を超える場合は切り詰めて、元のパスの 32 ビットハッシュ（36 進）を付ける。
 */
export function encodeProjectName(cwd: string): string {
    const name = cwd.replace(/[^a-zA-Z0-9]/g, '-');
    if (name.length <= PROJECT_NAME_MAX) return name;
    let hash = 0;
    for (let i = 0; i < cwd.length; i++) hash = ((hash << 5) - hash + cwd.charCodeAt(i)) | 0;
    return `${name.slice(0, PROJECT_NAME_MAX)}-${Math.abs(hash).toString(36)}`;
}

/** プロジェクト名を比較用にそろえる（Windows はファイル名の大文字・小文字を区別しない）。 */
export function projectNameKey(os: PathOs, name: string): string {
    return os === 'win32' ? name.toLowerCase() : name;
}

/** 環境の絶対パスか。 */
export function isAbsolutePathOn(os: PathOs, path: string): boolean {
    return os === 'win32' ? /^(?:[A-Za-z]:[\\/]|\\\\)/.test(path) : path.startsWith('/');
}

/**
 * パスの比較キー。Windows は区切りを '/' にそろえ、末尾の '/' を除いて小文字にする。
 * それ以外は末尾の '/' を除くだけ（ルートは '/'）。空文字列は空文字列を返す。
 */
export function pathCompareKey(os: PathOs, path: string): string {
    if (os === 'win32') return path.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
    const trimmed = path.replace(/\/+$/, '');
    return trimmed.length > 0 || path.length === 0 ? trimmed : '/';
}

/**
 * 画面に表示するパスの形。Windows は '\' 区切りでドライブ文字を大文字にし、ドライブ直下は 'D:\' の形を保つ。
 * それ以外は末尾の '/' を除くだけ。
 */
export function displayPathOf(os: PathOs, path: string): string {
    if (os !== 'win32') return pathCompareKey(os, path);
    const trimmed = path.replace(/\//g, '\\').replace(/\\+$/, '');
    const rooted = /^[A-Za-z]:$/.test(trimmed) ? `${trimmed}\\` : trimmed;
    return rooted.replace(/^[a-z]:/, drive => drive.toUpperCase());
}

/**
 * パスを順方向に変換したプロジェクト名の候補。上限を超える名前のハッシュは綴りに依存するので、
 * Windows は '\' 区切りでドライブ文字の大小両方を計算する。
 */
export function projectNameCandidates(os: PathOs, path: string): string[] {
    const display = displayPathOf(os, path);
    if (os !== 'win32') return [encodeProjectName(display)];
    const lowerDrive = display.replace(/^[A-Z]:/, drive => drive.toLowerCase());
    return [...new Set([encodeProjectName(display), encodeProjectName(lowerDrive)])];
}

/** パスの祖先を近い順に返す（パス自身は含まない）。 */
export function ancestorPaths(os: PathOs, path: string): string[] {
    const dirname = os === 'win32' ? win32.dirname : posix.dirname;
    const ancestors: string[] = [];
    let current = displayPathOf(os, path);
    for (let parent = dirname(current); parent !== current; parent = dirname(current)) {
        ancestors.push(parent);
        current = parent;
    }
    return ancestors;
}

/** JSON Lines の 1 行をオブジェクトとして解析する。解析できない行は null。 */
function parseRecord(line: string): Record<string, unknown> | null {
    try {
        const parsed: unknown = JSON.parse(line);
        return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
            ? (parsed as Record<string, unknown>)
            : null;
    } catch {
        return null;
    }
}

/**
 * 会話記録の先頭と末尾から、セッションの作業フォルダを読む。末尾の最後の relocated 行の relocatedCwd を優先し、
 * 無ければ先頭から順に、解析できる行のトップレベルの cwd を使う。どちらも無ければ null。
 */
export function readSessionCwd(head: Buffer, tail: Buffer): string | null {
    const tailLines = tail.toString('utf8').split('\n');
    for (let i = tailLines.length - 1; i >= 0; i--) {
        if (!tailLines[i].includes(RELOCATED_MARK)) continue;
        const record = parseRecord(tailLines[i]);
        if (record?.type === 'relocated' && typeof record.relocatedCwd === 'string' && record.relocatedCwd.length > 0) {
            return record.relocatedCwd;
        }
    }
    for (const line of head.toString('utf8').split('\n')) {
        if (!line.includes(CWD_MARK)) continue;
        const record = parseRecord(line);
        if (typeof record?.cwd === 'string' && record.cwd.length > 0) return record.cwd;
    }
    return null;
}

/**
 * 入力履歴（history.jsonl）の内容から、project の値を重複なく返す。
 * 解析できない行は読み飛ばす。
 */
export function readHistoryProjects(text: string): string[] {
    const projects = new Set<string>();
    for (const line of text.split('\n')) {
        const project = parseRecord(line)?.project;
        if (typeof project === 'string' && project.length > 0) projects.add(project);
    }
    return [...projects];
}

/**
 * 1 回のスキャンで見つかったパスの綴りを比較キーごとに集め、表示するパスを 1 つに決める。
 * 綴りの優先順は全体設定ファイルのキー、セッションの作業フォルダ、その他の順で、同じ順位に複数あれば並べ替えて先頭を使う。
 */
export class ProjectPathBook {
    private readonly spellings = new Map<string, [Set<string>, Set<string>, Set<string>]>();

    constructor(private readonly os: PathOs) {}

    private add(rank: 0 | 1 | 2, path: string): string {
        const key = pathCompareKey(this.os, path);
        let entry = this.spellings.get(key);
        if (!entry) {
            entry = [new Set(), new Set(), new Set()];
            this.spellings.set(key, entry);
        }
        entry[rank].add(path);
        return key;
    }

    /** 全体設定ファイルのキーの綴りを記録し、比較キーを返す。 */
    addRecordKey(path: string): string {
        return this.add(0, path);
    }

    /** セッションの作業フォルダの綴りを記録し、比較キーを返す。 */
    addSessionPath(path: string): string {
        return this.add(1, path);
    }

    /** それ以外で見つかったパスの綴りを記録し、比較キーを返す。 */
    addOtherPath(path: string): string {
        return this.add(2, path);
    }

    /** 比較キーに対応する表示するパス。綴りが記録されていなければ比較キーを表示の形にする。 */
    display(key: string): string {
        const pool = this.spellings.get(key)?.find(spelling => spelling.size > 0);
        return displayPathOf(this.os, pool ? [...pool].sort()[0] : key);
    }
}
