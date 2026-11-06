import type { StrictRead } from '../common/fs/atomicFile';
import type { HomeFs } from '../common/wsl/HomeFs';

// 書き込みの直前に内容が変わった場合に読み直す回数。
const EDIT_ATTEMPTS = 2;

/** ファイルへの変更。null は変更なし。 */
export type AgyFileChange = { kind: 'write'; content: string | Buffer } | { kind: 'delete' } | null;

/**
 * ファイルを厳密に読み、decide の結果を、読んだ時点の内容から変わっていない場合だけ原子的に反映する。
 * 変わっていれば読み直してやり直す。ファイルが無い（リンク切れを含む）場合は何もしない。
 * 読み書きに失敗した場合は例外を投げる。decide が投げた例外もそのまま投げる。
 */
export async function editAgyFile(
    fs: HomeFs,
    rel: string,
    decide: (read: Extract<StrictRead, { kind: 'ok' }>) => AgyFileChange
): Promise<void> {
    for (let attempt = 0; attempt < EDIT_ATTEMPTS; attempt++) {
        const read = await fs.readTextStrict(rel);
        if (read.kind === 'missing' || read.kind === 'dangling-link') return;
        if (read.kind === 'error') throw new Error(`Failed to read ${rel}: ${read.code}`);
        const change = decide(read);
        if (change === null) return;
        const result =
            change.kind === 'delete'
                ? await fs.deleteStrict(rel, read.revision)
                : await fs.writeTextAtomic(rel, change.content, { expectedRevision: read.revision });
        if (result.kind === 'ok' || result.kind === 'removed' || result.kind === 'missing') return;
        if (result.kind !== 'conflict') {
            throw new Error(`Failed to update ${rel}: ${result.kind === 'error' ? result.code : result.kind}`);
        }
    }
    throw new Error(`${rel} kept changing while updating it`);
}
