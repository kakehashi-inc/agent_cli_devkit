import { GROK_DIR } from '../../../shared/agents/grok/constants';
import { isTomlTable, parseToml, removeTomlTables } from '../../utils/tomlSubtree';
import { withBom } from '../common/fs/atomicFile';
import type { HomeFs } from '../common/wsl/HomeFs';

// 信頼の記録のファイルと、記録を持つテーブルのキー。
export const GROK_TRUSTED_FOLDERS_REL = `${GROK_DIR}/trusted_folders.toml`;
const FOLDERS_KEY = 'folders';
// 書き込みの直前に内容が変わった場合に読み直す回数。
const WRITE_ATTEMPTS = 2;

/** 信頼の記録 1 件。 */
export interface GrokTrustRecord {
    // [folders.<key>] のキーの文字列（引用形式によらない）
    key: string;
    // trusted の値（値が無い・真偽値でない場合は null）
    trusted: boolean | null;
}

/** テキストの [folders] から、テーブルの値を持つキーの一覧を返す。読めなければ例外を投げる。 */
function foldersOf(text: string): [string, Record<string, unknown>][] {
    const folders: unknown = parseToml(text)[FOLDERS_KEY];
    if (!isTomlTable(folders)) return [];
    return Object.entries(folders).filter((entry): entry is [string, Record<string, unknown>] => isTomlTable(entry[1]));
}

/** 信頼の記録を読む。ファイルが無ければ空。読めない・解析できない場合は例外を投げる。 */
export async function readGrokTrustRecords(fs: HomeFs): Promise<GrokTrustRecord[]> {
    const read = await fs.readTextStrict(GROK_TRUSTED_FOLDERS_REL);
    if (read.kind === 'missing') return [];
    if (read.kind !== 'ok') {
        throw new Error(`Failed to read ${GROK_TRUSTED_FOLDERS_REL}: ${read.kind === 'error' ? read.code : read.kind}`);
    }
    return foldersOf(read.text).map(([key, value]) => ({
        key,
        trusted: typeof value.trusted === 'boolean' ? value.trusted : null,
    }));
}

/**
 * 信頼の記録のうち selectKey が真を返すキーのテーブルを削除する。ファイル自体は残す。
 * 直前に読み直して解析できなければ何も書かない。該当のテーブルだけを切り取るので、他の文の形式は変わらない。
 * 同じディレクトリの一時ファイルと rename で置き換える。書き込みの直前に内容が変わっていれば読み直してやり直す。
 * 削除できなかった場合は例外を投げる。
 */
export async function removeGrokTrustRecords(fs: HomeFs, selectKey: (key: string) => boolean): Promise<void> {
    const rel = GROK_TRUSTED_FOLDERS_REL;
    for (let attempt = 0; attempt < WRITE_ATTEMPTS; attempt++) {
        const read = await fs.readTextStrict(rel);
        if (read.kind === 'missing') return;
        if (read.kind !== 'ok') {
            throw new Error(`Failed to read ${rel}: ${read.kind === 'error' ? read.code : read.kind}`);
        }
        if (!read.utf8Clean) throw new Error(`${rel} is not valid UTF-8`);
        const keys = foldersOf(read.text)
            .map(([key]) => key)
            .filter(selectKey);
        if (keys.length === 0) return;

        const next = removeTomlTables(
            read.text,
            keys.map(key => [FOLDERS_KEY, key])
        );
        const written = await fs.writeTextAtomic(rel, withBom(next, read.hadBom), {
            expectedRevision: read.revision,
        });
        if (written.kind === 'ok') return;
        if (written.kind !== 'conflict') {
            throw new Error(`Failed to write ${rel}: ${written.kind === 'error' ? written.code : written.kind}`);
        }
    }
    throw new Error(`${rel} kept changing while removing project records`);
}
