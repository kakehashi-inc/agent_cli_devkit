import { CODEX_CONFIG_REL } from '../../../shared/agents/codex/constants';
import { isTomlTable, parseToml, removeTomlTables } from '../../utils/tomlSubtree';
import { withBom } from '../common/fs/atomicFile';
import type { HomeFs } from '../common/wsl/HomeFs';

const PROJECTS_KEY = 'projects';
const TRUST_LEVEL_KEY = 'trust_level';
// 書き込みの直前に内容が変わった場合に読み直す回数。
const WRITE_ATTEMPTS = 2;

/** config.toml のプロジェクト記録 1 件の信頼状態。 */
export type CodexTrustState = 'trusted' | 'untrusted' | 'unset';

/** プロジェクト記録のキー 1 件。 */
export interface CodexRecordSummary {
    // [projects.<key>] のキーの原文
    key: string;
    trust: CodexTrustState;
}

function trustOf(entry: unknown): CodexTrustState {
    if (!isTomlTable(entry)) return 'unset';
    const level = entry[TRUST_LEVEL_KEY];
    return level === 'trusted' || level === 'untrusted' ? level : 'unset';
}

/** ~/.codex/config.toml のプロジェクト記録を返す。ファイルが無ければ空。読めない・解析できない場合は例外を投げる。 */
export async function readCodexRecords(fs: HomeFs): Promise<CodexRecordSummary[]> {
    const read = await fs.readTextStrict(CODEX_CONFIG_REL);
    if (read.kind === 'missing') return [];
    if (read.kind !== 'ok') {
        throw new Error(`Failed to read ${CODEX_CONFIG_REL}: ${read.kind === 'error' ? read.code : read.kind}`);
    }
    const projects = parseToml(read.text)[PROJECTS_KEY];
    if (!isTomlTable(projects)) return [];
    return Object.keys(projects).map(key => ({ key, trust: trustOf(projects[key]) }));
}

/**
 * config.toml から、selectKey が真を返すキーの [projects.<key>] をテーブルごと切り取る。空のテーブルは残さず、他の文は
 * バイト単位で保つ。直前に読み直して解析できなければ何も書かず、同じディレクトリの一時ファイルと rename で置き換える。
 * 書き込みの直前に内容が変わっていれば読み直してやり直す。切り取れなかった場合は例外を投げる。
 */
export async function removeCodexRecords(fs: HomeFs, selectKey: (key: string) => boolean): Promise<void> {
    for (let attempt = 0; attempt < WRITE_ATTEMPTS; attempt++) {
        const read = await fs.readTextStrict(CODEX_CONFIG_REL);
        if (read.kind === 'missing') return;
        if (read.kind !== 'ok') {
            throw new Error(`Failed to read ${CODEX_CONFIG_REL}: ${read.kind === 'error' ? read.code : read.kind}`);
        }
        if (!read.utf8Clean) throw new Error(`${CODEX_CONFIG_REL} is not valid UTF-8`);
        const projects = parseToml(read.text)[PROJECTS_KEY];
        if (projects === undefined) return;
        if (!isTomlTable(projects)) throw new Error(`${CODEX_CONFIG_REL} has a projects value that is not a table`);
        const keys = Object.keys(projects).filter(selectKey);
        if (keys.length === 0) return;

        const next = removeTomlTables(
            read.text,
            keys.map(key => [PROJECTS_KEY, key])
        );
        const written = await fs.writeTextAtomic(CODEX_CONFIG_REL, withBom(next, read.hadBom), {
            expectedRevision: read.revision,
        });
        if (written.kind === 'ok') return;
        if (written.kind !== 'conflict') {
            throw new Error(
                `Failed to write ${CODEX_CONFIG_REL}: ${written.kind === 'error' ? written.code : written.kind}`
            );
        }
    }
    throw new Error(`${CODEX_CONFIG_REL} kept changing while removing project records`);
}
