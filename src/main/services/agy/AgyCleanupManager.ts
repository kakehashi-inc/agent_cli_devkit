import {
    AGY_CLI_DIR,
    AGY_OLD_BINARIES_KEY,
    AGY_UPDATE_LOCK_REL,
    AGY_WSL_CLI_TEST,
    CLEANUP_CANDIDATES,
} from '../../../shared/agents/agy/constants';
import { AgentCleanupManager } from '../common/cleanup/AgentCleanupManager';
import type { CleanupProbe } from '../common/cleanup/CleanupProbe';
import {
    MINUTE_MS,
    homePath,
    isOlderThan,
    nanosToMs,
    type CleanupResolver,
    type ResolvedChild,
} from '../common/cleanup/resolvedCleanup';
import { WslDetector } from '../common/wsl/WslDetector';

// 退避からこの時間が経つまでは、更新直後の切り替え・再起動中の可能性があるため対象にしない
const OLD_BINARY_GRACE_MS = 15 * MINUTE_MS;
// 実行ファイルの先頭バイト（Windows は PE の MZ、Linux は ELF）
const PE_MAGIC = Buffer.from('MZ', 'ascii');
const ELF_MAGIC = Buffer.from([0x7f, 0x45, 0x4c, 0x46]);

interface BinaryLayout {
    dir: string;
    current: string;
    pattern: RegExp;
    magic: Buffer;
}

/** 環境ごとの agy 実行ファイルの置き場所と、退避された旧実行ファイルの名前。対象外の OS は null。 */
async function binaryLayout(probe: CleanupProbe): Promise<BinaryLayout | null> {
    if (probe.os === 'win32') {
        const localAppData =
            (await probe.envVar('LOCALAPPDATA')) || probe.join(await probe.homeDir(), 'AppData', 'Local');
        return {
            dir: probe.join(localAppData, 'agy', 'bin'),
            current: 'agy.exe',
            pattern: /^agy\.exe\.(\d{16,19})\.old$/,
            magic: PE_MAGIC,
        };
    }
    if (probe.os === 'linux') {
        return {
            dir: probe.join(await probe.homeDir(), '.local', 'bin'),
            current: 'agy',
            pattern: /^agy\.(\d{16,19})\.old$/,
            magic: ELF_MAGIC,
        };
    }
    return null;
}

/**
 * 自動更新で退避された旧実行ファイル（名前の数字は退避時刻の Unix ナノ秒）。
 * 同じ場所に現行の agy があり、先頭バイトが実行ファイルで、退避から 15 分以上経過したものを対象にし、
 * 自動更新のロックが保持されている間と、書き込みで開けない（実行中の）ものは使用中として除外する。
 * 現行の agy / agy.exe は対象にしない。
 */
const resolveOldBinaries: CleanupResolver = async probe => {
    const layout = await binaryLayout(probe);
    if (!layout) return [];
    const entries = await probe.list(layout.dir, name => name === layout.current || layout.pattern.test(name));
    if (!entries.some(entry => entry.name === layout.current && entry.type !== 'dir')) return [];
    const olds = entries.filter(entry => entry.name !== layout.current && entry.type === 'file' && entry.ownedBySelf);
    const heads = await probe.readHeads(
        olds.map(entry => entry.path),
        layout.magic.length
    );
    const binaries = olds.filter((_, i) => heads[i]?.equals(layout.magic));
    if (binaries.length === 0) return [];
    const [updateLock] = await probe.lockStates([await homePath(probe, AGY_UPDATE_LOCK_REL)]);
    const now = Date.now();
    const children: ResolvedChild[] = binaries.map(entry => {
        const movedAt = nanosToMs(layout.pattern.exec(entry.name)?.[1] ?? '');
        return {
            name: entry.name,
            path: entry.path,
            type: 'file',
            size: entry.size,
            fileCount: entry.fileCount,
            excluded: isOlderThan(movedAt, OLD_BINARY_GRACE_MS, now) ? undefined : 'ineligible',
        };
    });
    const candidates = children.filter(child => !child.excluded);
    const inUse =
        updateLock === 'held' ? candidates.map(() => true) : await probe.filesInUse(candidates.map(c => c.path));
    candidates.forEach((child, i) => {
        if (inUse[i]) child.excluded = 'in-use';
    });
    return children;
};

export class AgyCleanupManager extends AgentCleanupManager {
    constructor(detector: WslDetector) {
        super(detector, {
            baseRel: AGY_CLI_DIR,
            wslTest: AGY_WSL_CLI_TEST,
            candidates: CLEANUP_CANDIDATES,
            resolvers: { [AGY_OLD_BINARIES_KEY]: resolveOldBinaries },
        });
    }
}
