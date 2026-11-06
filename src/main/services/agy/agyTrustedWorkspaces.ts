import { AGY_SETTINGS_REL } from '../../../shared/agents/agy/constants';
import type { AgentEnvironment } from '../../../shared/agents/types';
import { parseJsoncObject, readJsoncScope, removeJsoncArrayElements, setJsoncRaw } from '../../utils/jsoncEdit';
import { strictDeepEqual } from '../../utils/strictDeepEqual';
import type { CleanupHandler, HandledChild } from '../common/cleanup/handledCleanup';
import { withBom } from '../common/fs/atomicFile';
import { HomeFs } from '../common/wsl/HomeFs';
import type { WslDetector } from '../common/wsl/WslDetector';
import { editAgyFile } from './agyFileEdit';

const TRUSTED_WORKSPACES_KEY = 'trustedWorkspaces';

/** settings.json の値から、行にする空でない文字列の要素を重複なく取り出す。 */
function trustedStrings(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((item): item is string => typeof item === 'string' && item.length > 0))];
}

/**
 * settings.json の trustedWorkspaces から、selects が真を返す文字列の要素だけを取り除く。
 * ほかのキー、文字列でない要素、配列の外の文字列は変えない。すべて取り除いた配列は [] として残す。
 */
async function removeTrustedStrings(fs: HomeFs, selects: (value: string) => boolean): Promise<void> {
    const matches = (value: unknown) => typeof value === 'string' && value.length > 0 && selects(value);
    await editAgyFile(fs, AGY_SETTINGS_REL, read => {
        if (!read.utf8Clean) throw new Error(`${AGY_SETTINGS_REL} is not valid UTF-8`);
        const config = parseJsoncObject(read.text);
        const current = config[TRUSTED_WORKSPACES_KEY];
        if (!Array.isArray(current)) return null;
        const indexes = current.flatMap((value, index) => (matches(value) ? [index] : []));
        if (indexes.length === 0) return null;
        let next = removeJsoncArrayElements(read.text, [TRUSTED_WORKSPACES_KEY], indexes);
        // 要素もコメントも残らないと配列のキーごと切り取られるので、同じ位置に空の配列を残す。
        if (!readJsoncScope(next, [TRUSTED_WORKSPACES_KEY]).present) {
            next = setJsoncRaw(read.text, [TRUSTED_WORKSPACES_KEY], '[]');
        }
        const expected = { ...config, [TRUSTED_WORKSPACES_KEY]: current.filter(value => !matches(value)) };
        if (!strictDeepEqual(parseJsoncObject(next), expected)) {
            throw new Error(`Removing trusted workspaces from ${AGY_SETTINGS_REL} changed other values`);
        }
        return { kind: 'write', content: withBom(next, read.hadBom) };
    });
}

/** settings.json の trustedWorkspaces の、行にする要素を読む。読めない、解析できない場合は例外を投げる。 */
async function readTrustedStrings(fs: HomeFs): Promise<string[]> {
    const read = await fs.readTextStrict(AGY_SETTINGS_REL);
    if (read.kind === 'missing' || read.kind === 'dangling-link') return [];
    if (read.kind === 'error') throw new Error(`Failed to read ${AGY_SETTINGS_REL}: ${read.code}`);
    return trustedStrings(parseJsoncObject(read.text)[TRUSTED_WORKSPACES_KEY]);
}

/**
 * settings.json の trustedWorkspaces の要素ごとの行。名前は要素の文字列そのもので、完全に一致する要素だけを消す。
 * 消せない場合は選択したものを消せなかったものとして返し、ファイルのパスを報告する。
 */
export function createAgyTrustedWorkspacesHandler(detector: WslDetector): CleanupHandler {
    return {
        async listChildren(env: AgentEnvironment): Promise<HandledChild[]> {
            const names = await readTrustedStrings(new HomeFs(env, detector));
            return names.map(name => ({ name, size: 0, fileCount: 1, sizeUnknown: true }));
        },
        async remove(env, names, _approved, failedPaths = []) {
            const fs = new HomeFs(env, detector);
            const wanted = names === 'all' ? null : new Set(names);
            let present: string[] = [];
            try {
                present = await readTrustedStrings(fs);
                await removeTrustedStrings(fs, value => !wanted || wanted.has(value));
            } catch (error) {
                console.error(`Failed to remove Agy trusted workspaces (${JSON.stringify(env)}):`, error);
                failedPaths.push(await fs.displayPath(AGY_SETTINGS_REL));
                return names === 'all' ? present : [...names];
            }
            return names === 'all' ? [] : names.filter(name => !present.includes(name));
        },
    };
}
