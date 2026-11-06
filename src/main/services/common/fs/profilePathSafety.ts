import { lstat } from 'fs/promises';
import { join } from 'path';
import { isWorkEntryName } from './atomicFile';
import { isSafePathSegment, type NormalizedArchiveEntry } from './archiveEntryPath';

export type RelPathViolation =
    'empty' | 'absolute' | 'unsafe-segment' | 'reserved-name' | 'extension' | 'too-deep' | 'case-conflict';

export interface RelPathRule {
    // 許可する拡張子（'.md' など）。作成時は完全一致、既存の操作は大文字小文字を無視して比較する。
    extensions?: readonly string[];
    // 許可する深さの上限。0 は直下のみ。
    maxDepth?: number;
    // 新しく作るパスか。予約名の検査と拡張子の完全一致を行う。
    creating?: boolean;
}

export type RelPathCheck = { ok: true; relPath: string; segments: string[] } | { ok: false; reason: RelPathViolation };

export type LinkBelowRoot = { kind: 'none' } | { kind: 'link'; at: string } | { kind: 'error'; code: string };

// Windows が拡張子の有無にかかわらず特別に扱うデバイス名（上付き数字の COM / LPT を含む）。
const WINDOWS_DEVICE_NAME = new RegExp(
    `^(con|prn|aux|nul|conin\\$|conout\\$|(com|lpt)[1-9${String.fromCharCode(0xb9, 0xb2, 0xb3)}])$`,
    'i'
);

// Windows のファイル名に使えない文字。
const WINDOWS_FORBIDDEN_CHARS = /[<>"|?*]/;

/** Windows で作れない名前か、アプリの作業用の名前か。 */
export function isReservedEntryName(segment: string): boolean {
    const stem = segment.split('.')[0];
    return WINDOWS_DEVICE_NAME.test(stem) || WINDOWS_FORBIDDEN_CHARS.test(segment) || isWorkEntryName(segment);
}

/**
 * ルートからの相対パスを検証し、区切りを '/' にそろえて返す。
 * 絶対パス・ドライブ指定、安全でないセグメント、深さと拡張子の違反を拒否する。作成時は予約名も拒否する。
 */
export function validateRelPath(input: string, rule: RelPathRule = {}): RelPathCheck {
    if (input.length === 0) return { ok: false, reason: 'empty' };
    const unified = input.replace(/\\/g, '/');
    if (unified.startsWith('/') || /^[a-zA-Z]:/.test(unified)) return { ok: false, reason: 'absolute' };
    const segments = unified.split('/');
    if (!segments.every(isSafePathSegment)) return { ok: false, reason: 'unsafe-segment' };
    if (rule.creating && segments.some(isReservedEntryName)) return { ok: false, reason: 'reserved-name' };
    if (rule.maxDepth !== undefined && segments.length - 1 > rule.maxDepth) return { ok: false, reason: 'too-deep' };
    if (rule.extensions && !hasAllowedExtension(segments[segments.length - 1], rule)) {
        return { ok: false, reason: 'extension' };
    }
    return { ok: true, relPath: segments.join('/'), segments };
}

/** ファイル名の拡張子が規則に合うか。 */
function hasAllowedExtension(name: string, rule: RelPathRule): boolean {
    const allowed = rule.extensions ?? [];
    if (rule.creating) return allowed.some(extension => name.endsWith(extension));
    const lower = name.toLowerCase();
    return allowed.some(extension => lower.endsWith(extension.toLowerCase()));
}

/**
 * ZIP の全エントリ（正規化済み）を、新しく作るパスとして検証する。ディレクトリのエントリは拡張子を見ず、配下が深さの上限を超えるものを拒否する。
 * 大文字小文字だけ違うパスの組も拒否する。問題があれば最初のエントリのパスと理由を返す。
 */
export function validateArchiveEntries(
    entries: readonly NormalizedArchiveEntry[],
    rule: RelPathRule
): { ok: true } | { ok: false; path: string; reason: RelPathViolation } {
    const spelled = new Map<string, string>();
    for (const { path, entry } of entries) {
        const check = validateRelPath(
            path,
            entry.isDirectory
                ? { creating: true, maxDepth: rule.maxDepth === undefined ? undefined : rule.maxDepth - 1 }
                : { ...rule, creating: true }
        );
        if (!check.ok) return { ok: false, path, reason: check.reason };
        for (let count = 1; count <= check.segments.length; count++) {
            const prefix = check.segments.slice(0, count).join('/');
            const known = spelled.get(prefix.toLowerCase());
            if (known !== undefined && known !== prefix) return { ok: false, path, reason: 'case-conflict' };
            spelled.set(prefix.toLowerCase(), prefix);
        }
    }
    return { ok: true };
}

/**
 * ルートより下の中間のセグメント（最後のセグメントを除く）にリンクがあるかを実 OS パスで調べる。ルート自身はリンクでもよい。
 * まだ無いセグメントに当たったら、その先にリンクは無いものとする。
 */
export async function findLocalLinkBelowRoot(rootAbs: string, segments: readonly string[]): Promise<LinkBelowRoot> {
    let current = rootAbs;
    for (let index = 0; index < segments.length - 1; index++) {
        current = join(current, segments[index]);
        try {
            if ((await lstat(current)).isSymbolicLink()) {
                return { kind: 'link', at: segments.slice(0, index + 1).join('/') };
            }
        } catch (error) {
            const code = (error as NodeJS.ErrnoException).code;
            if (code === 'ENOENT' || code === 'ENOTDIR') return { kind: 'none' };
            return { kind: 'error', code: typeof code === 'string' ? code : 'EIO' };
        }
    }
    return { kind: 'none' };
}
