import { strictDeepEqual } from '../../utils/strictDeepEqual';
import { removeJsoncProperty } from '../../utils/jsoncEdit';
import { withBom } from '../common/fs/atomicFile';
import type { HomeFs } from '../common/wsl/HomeFs';
import { resolveClaudeGlobalConfigRel } from './claudeGlobalConfig';

// 全体設定ファイルのプロジェクト記録のキー。
const PROJECTS_KEY = 'projects';
const GITHUB_REPO_PATHS_KEY = 'githubRepoPaths';
const TRUST_KEY = 'hasTrustDialogAccepted';
const MCP_SERVERS_KEY = 'mcpServers';
// 書き込みの直前に内容が変わった場合に読み直す回数。
const WRITE_ATTEMPTS = 2;

/** プロジェクト記録のキー 1 件の集計。記録の値そのものは持たない。 */
export interface ClaudeRecordSummary {
    // projects のキーの原文
    key: string;
    trusted: boolean;
    mcpServers: number;
}

/** 全体設定ファイルから読み取ったプロジェクト記録の集計と、パスとして参照できる値。 */
export interface ClaudeRecordIndex {
    records: ClaudeRecordSummary[];
    // githubRepoPaths の値（ローカルのパス）
    repoPaths: string[];
}

/** JSON のオブジェクトか。 */
function isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** 全体設定ファイルのテキストを解析する。JSON のオブジェクトでなければ例外を投げる。 */
function parseConfig(text: string): Record<string, unknown> {
    const parsed: unknown = JSON.parse(text);
    if (!isObject(parsed)) throw new Error('The global config is not a JSON object');
    return parsed;
}

/**
 * 全体設定ファイルのプロジェクト記録を集計して返す。ファイルが無ければ空。読めない・解析できない場合は例外を投げる。
 */
export async function readClaudeRecordIndex(fs: HomeFs): Promise<ClaudeRecordIndex> {
    const rel = await resolveClaudeGlobalConfigRel(fs);
    const read = await fs.readTextStrict(rel);
    if (read.kind === 'missing') return { records: [], repoPaths: [] };
    if (read.kind !== 'ok') throw new Error(`Failed to read ${rel}: ${read.kind === 'error' ? read.code : read.kind}`);
    const config = parseConfig(read.text);
    const projects = config[PROJECTS_KEY];
    const records = isObject(projects)
        ? Object.keys(projects).map((key): ClaudeRecordSummary => {
              const entry = projects[key];
              const servers = isObject(entry) ? entry[MCP_SERVERS_KEY] : undefined;
              return {
                  key,
                  trusted: isObject(entry) && entry[TRUST_KEY] === true,
                  mcpServers: isObject(servers) ? Object.keys(servers).length : 0,
              };
          })
        : [];
    const repoPaths: string[] = [];
    const repos = config[GITHUB_REPO_PATHS_KEY];
    if (isObject(repos)) {
        for (const value of Object.values(repos)) {
            if (Array.isArray(value)) {
                repoPaths.push(...value.filter((path): path is string => typeof path === 'string'));
            }
        }
    }
    return { records, repoPaths };
}

/**
 * 全体設定ファイルのプロジェクト記録のうち、selectKey が真を返すキーのエントリを切り取る。
 * 直前に読み直して解析できなければ何も書かない。テキストから該当キーだけを切り取るので、他の値の形式と大きな数値の精度、
 * 末尾の改行の有無は変わらない。同じディレクトリの一時ファイルと rename で置き換え、権限を引き継ぐ。
 * 書き込みの直前に内容が変わっていれば読み直してやり直す。切り取れなかった場合は例外を投げる。
 */
export async function removeClaudeRecordKeys(fs: HomeFs, selectKey: (key: string) => boolean): Promise<void> {
    const rel = await resolveClaudeGlobalConfigRel(fs);
    for (let attempt = 0; attempt < WRITE_ATTEMPTS; attempt++) {
        const read = await fs.readTextStrict(rel);
        if (read.kind === 'missing') return;
        if (read.kind !== 'ok') {
            throw new Error(`Failed to read ${rel}: ${read.kind === 'error' ? read.code : read.kind}`);
        }
        if (!read.utf8Clean) throw new Error(`${rel} is not valid UTF-8`);
        const config = parseConfig(read.text);
        const projects = config[PROJECTS_KEY];
        if (projects === undefined) return;
        if (!isObject(projects)) throw new Error(`${rel} has a projects value that is not an object`);
        const keys = Object.keys(projects).filter(selectKey);
        if (keys.length === 0) return;

        let next = read.text;
        for (const key of keys) {
            next = removeJsoncProperty(next, [PROJECTS_KEY, key], { cascade: false });
        }
        const expected = { ...projects };
        for (const key of keys) delete expected[key];
        if (!strictDeepEqual(parseConfig(next), { ...config, [PROJECTS_KEY]: expected })) {
            throw new Error(`Removing project records from ${rel} changed other values`);
        }

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
