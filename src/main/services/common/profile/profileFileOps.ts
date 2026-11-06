/**
 * プロファイル設定のファイル単位の読み書きの共通処理。
 * 読み取り結果の変換、編集テキストの正規化、開いた時点の revision との比較を伴う保存を扱う。
 * 結果にはエラーコードだけを含め、例外のメッセージや本文の断片を含めない。
 */
import {
    DANGLING_LINK_REVISION,
    MISSING_REVISION,
    type ProfileEol,
    type ProfileFileData,
    type ProfileWriteResult,
} from '../../../../shared/agents/profile/types';
import { codeOf, withBom, type AtomicWrite, type StrictRead } from '../fs/atomicFile';
import { stripBom } from '../json/stripBom';
import type { HomeFs } from '../wsl/HomeFs';

/** 編集テキストの検証の結果。error があれば保存しない。warnings は未確認なら確認を求める。 */
export interface EditCheck {
    error?: ProfileWriteResult;
    warnings?: string[];
}

export interface SaveFileOptions {
    text: string;
    baseRevision: string;
    confirmedWarnings: boolean;
    // リンクを読み取り専用として扱う。
    rejectLink?: boolean;
    // 未作成のファイルへは保存しない。
    requireExisting?: boolean;
    // 改行を揃えた後の本文を検証する。hadBom は保存後の BOM の有無。
    check?: (normalized: string, hadBom: boolean) => EditCheck;
}

/** BOM を付けずに保存するファイルか。hook の JSON、lsp.json、sidecar.json、.rules が当たる。 */
function isBomFreeFile(rel: string): boolean {
    const slash = rel.lastIndexOf('/');
    const name = rel.slice(slash + 1).toLowerCase();
    if (name === 'hooks.json' || name === 'lsp.json' || name === 'sidecar.json' || name.endsWith('.rules')) {
        return true;
    }
    const dir = slash === -1 ? '' : rel.slice(0, slash).toLowerCase();
    return name.endsWith('.json') && (dir === 'hooks' || dir.endsWith('/hooks'));
}

/** 保存後のファイルに BOM を付けるか。BOM を付けないファイル以外は、見つけたときの状態を保つ。 */
export function bomAfterSave(rel: string, hadBom: boolean): boolean {
    return hadBom && !isBomFreeFile(rel);
}

/** 編集テキストの BOM を除き、改行を eol へ揃える。 */
export function normalizeEditedText(text: string, eol: ProfileEol): string {
    const unified = stripBom(text).replace(/\r\n?/g, '\n');
    return eol === '\n' ? unified : unified.replace(/\n/g, '\r\n');
}

/** 改行の違いを除いて同じ本文か。 */
export function sameEditedText(a: string, b: string): boolean {
    return normalizeEditedText(a, '\n') === normalizeEditedText(b, '\n');
}

/** 読み取り結果の revision。読み取りエラーは null。 */
export function revisionOfRead(read: StrictRead): string | null {
    switch (read.kind) {
        case 'ok':
            return read.revision;
        case 'missing':
            return MISSING_REVISION;
        case 'dangling-link':
            return DANGLING_LINK_REVISION;
        default:
            return null;
    }
}

/** 読み取り結果を IPC で返せる形にする。 */
export function toFileData(read: StrictRead, displayPath: string): ProfileFileData {
    switch (read.kind) {
        case 'missing':
            return { state: 'missing', revision: MISSING_REVISION, displayPath };
        case 'dangling-link':
            return {
                state: 'dangling-link',
                revision: DANGLING_LINK_REVISION,
                linkTarget: read.linkTarget,
                displayPath,
            };
        case 'error':
            return { state: 'error', code: read.code, displayPath };
        default: {
            const link = read.linkTarget !== undefined ? { linkTarget: read.linkTarget } : {};
            if (!read.utf8Clean) {
                return { state: 'not-utf8', revision: read.revision, isLink: read.isLink, ...link, displayPath };
            }
            return {
                state: 'ok',
                text: read.text,
                revision: read.revision,
                hadBom: read.hadBom,
                eol: read.eol,
                mixedEol: read.mixedEol,
                isLink: read.isLink,
                ...link,
                displayPath,
            };
        }
    }
}

/** 書き込みへ進めない読み取り結果なら失敗の結果を返す。 */
export function readFailure(read: StrictRead): ProfileWriteResult | null {
    switch (read.kind) {
        case 'error':
            return { ok: false, message: 'read-failed', detail: read.code };
        case 'dangling-link':
            return { ok: false, message: 'dangling-link' };
        case 'ok':
            return read.utf8Clean ? null : { ok: false, message: 'not-utf8' };
        default:
            return null;
    }
}

/** 現在の内容を添えた conflict の結果。 */
export function conflictOf(read: StrictRead): ProfileWriteResult {
    const revision = revisionOfRead(read);
    if (revision === null) return { ok: false, message: 'conflict' };
    const text = read.kind === 'ok' && read.utf8Clean ? read.text : null;
    return { ok: false, message: 'conflict', current: { text, revision } };
}

/** 原子的な書き込みの結果を保存の結果にする。conflict は読み直した現在の内容を添える。 */
export async function resultOfWrite(
    fs: HomeFs,
    rel: string,
    write: AtomicWrite,
    warnings: string[]
): Promise<ProfileWriteResult> {
    switch (write.kind) {
        case 'ok':
            return { ok: true, revision: write.revision, ...(warnings.length > 0 ? { warnings } : {}) };
        case 'conflict':
            return conflictOf(await fs.readTextStrict(rel));
        case 'dangling-link':
            return { ok: false, message: 'dangling-link' };
        default:
            return { ok: false, message: 'write-failed', detail: write.code };
    }
}

/** 例外を結果にする。例外のメッセージは本文を含み得るので使わない。 */
export function failureOfException(error: unknown): ProfileWriteResult {
    return { ok: false, message: 'write-failed', detail: codeOf(error, 'EUNKNOWN') };
}

/**
 * ファイル全体を保存する。開いた時点の revision と違えば保存せず conflict を返す。
 * 改行は既存のファイルに揃え、BOM は bomAfterSave に従う。改行の違いを除いて本文が同じで BOM も変わらなければ書き込まない。
 */
export async function saveFileText(fs: HomeFs, rel: string, options: SaveFileOptions): Promise<ProfileWriteResult> {
    const read = await fs.readTextStrict(rel);
    const blocked = readFailure(read);
    if (blocked) return blocked;
    if (options.rejectLink && read.kind === 'ok' && read.isLink) return { ok: false, message: 'read-only' };
    const currentRevision = read.kind === 'ok' ? read.revision : MISSING_REVISION;
    if (currentRevision !== options.baseRevision) return conflictOf(read);
    if (options.requireExisting && read.kind !== 'ok') return { ok: false, message: 'not-found' };

    const existing = read.kind === 'ok' ? read : null;
    const hadBom = bomAfterSave(rel, existing?.hadBom ?? false);
    if (existing && hadBom === existing.hadBom && sameEditedText(options.text, existing.text)) {
        return { ok: true, revision: existing.revision };
    }
    const normalized = normalizeEditedText(options.text, existing?.eol ?? '\n');
    const checked = options.check?.(normalized, hadBom) ?? {};
    if (checked.error) return checked.error;
    const warnings = checked.warnings ?? [];
    if (warnings.length > 0 && !options.confirmedWarnings) {
        return { ok: false, message: 'needs-confirmation', warnings };
    }
    const bytes = Buffer.from(withBom(normalized, hadBom), 'utf8');
    const notes = existing?.mixedEol ? [...warnings, 'mixed-eol-normalized'] : warnings;
    const write = await fs.writeTextAtomic(rel, bytes, { expectedRevision: currentRevision });
    return resultOfWrite(fs, rel, write, notes);
}
