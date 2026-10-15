import {
    CODEX_ARG0_TEMP_REL,
    CODEX_DIR,
    CODEX_PLUGINS_SYNC_LOCK_REL,
    CODEX_PLUGINS_SYNC_TEMP_REL,
    CODEX_RESOLVED_CLEANUP_KEYS,
    CODEX_SANDBOX_BIN_REL,
    CODEX_SANDBOX_DIR_REL,
} from '../../../shared/agents/codex/constants';
import {
    DAY_MS,
    HOUR_MS,
    MINUTE_MS,
    homePath,
    isOlderThan,
    type CleanupResolver,
    type ResolvedChild,
} from '../common/cleanup/resolvedCleanup';
import { compareCodexVersions } from './codexVersion';

// tempfile が付ける 6 文字の英数字までを含めた名前
const ARG0_DIR = /^codex-arg0[A-Za-z0-9]{6}$/;
const PLUGINS_SYNC_DIR = /^plugins-(?:backup|clone)-[A-Za-z0-9]{6}$/;
const RUNNER_EXE = /^codex-command-runner-(\d+\.\d+\.\d+(?:-(?:alpha|beta|rc)(?:\.\d+)*)?)\.exe$/;
const SANDBOX_COPY_EXE = 'codex.exe';
const SANDBOX_LOG = /^sandbox\.(\d{4})-(\d{2})-(\d{2})\.log$/;

// .lock を持たない arg0 フォルダ（使用中か判定できないもの）を古いとみなすまでの時間
const ARG0_NO_LOCK_STALE_MS = 24 * HOUR_MS;
// Codex 自身がプラグイン同期の作業フォルダを古いとみなすまでの時間と同じ値
const PLUGINS_SYNC_STALE_MS = 10 * MINUTE_MS;
// サンドボックス用 codex.exe のコピー直後（セットアップ中）を避けるための猶予
const SANDBOX_COPY_GRACE_MS = 10 * MINUTE_MS;
const SANDBOX_LOG_KEEP_DAYS = 30;

/** 子要素の共通項目をエントリから写す。 */
function child(
    entry: { name: string; path: string; size: number; fileCount: number },
    type: 'file' | 'dir',
    name = entry.name
): ResolvedChild {
    return { name, path: entry.path, type, size: entry.size, fileCount: entry.fileCount };
}

/**
 * tmp/arg0 の codex-arg0XXXXXX。中の .lock を使用中のセッションが排他ロックで保持するため、
 * ロックが取れる（保持されていない）ものを削除対象にする。.lock が無いものは使用中か判定できないため、
 * 24 時間以上更新されていない場合だけ対象にする。
 */
const resolveArg0Temp: CleanupResolver = async probe => {
    const dirs = (await probe.list(await homePath(probe, CODEX_ARG0_TEMP_REL), name => ARG0_DIR.test(name))).filter(
        entry => entry.type === 'dir' && entry.ownedBySelf
    );
    const locks = await probe.lockStates(dirs.map(dir => probe.join(dir.path, '.lock')));
    const now = Date.now();
    return dirs.map((dir, i) => ({
        ...child(dir, 'dir'),
        excluded:
            locks[i] === 'held'
                ? 'in-use'
                : locks[i] === 'free' || isOlderThan(dir.mtimeMs, ARG0_NO_LOCK_STALE_MS, now)
                  ? undefined
                  : 'ineligible',
    }));
};

/**
 * .tmp の plugins-backup-XXXXXX / plugins-clone-XXXXXX。同期中は plugins.sync.lock が保持されるため、
 * ロックが保持されておらず、10 分以上更新されていないものだけを削除対象にする。
 */
const resolvePluginsSyncTemp: CleanupResolver = async probe => {
    const dirs = (
        await probe.list(await homePath(probe, CODEX_PLUGINS_SYNC_TEMP_REL), name => PLUGINS_SYNC_DIR.test(name))
    ).filter(entry => entry.type === 'dir' && entry.ownedBySelf);
    if (dirs.length === 0) return [];
    const [lock] = await probe.lockStates([await homePath(probe, CODEX_PLUGINS_SYNC_LOCK_REL)]);
    const now = Date.now();
    return dirs.map(dir => ({
        ...child(dir, 'dir'),
        excluded:
            lock === 'held'
                ? 'in-use'
                : isOlderThan(dir.mtimeMs, PLUGINS_SYNC_STALE_MS, now)
                  ? undefined
                  : 'ineligible',
    }));
};

/**
 * Windows のサンドボックス用日別ログ（.sandbox と ~/.codex 直下の sandbox.YYYY-MM-DD.log）。
 * ファイル名の日付（UTC）が 30 日以上前のものだけを削除対象にする（今日・昨日の書き込み中のログは常に残る）。
 */
const resolveSandboxLogs: CleanupResolver = async probe => {
    if (probe.os !== 'win32') return [];
    const today = Math.floor(Date.now() / DAY_MS);
    const sources = [
        { dir: await homePath(probe, CODEX_SANDBOX_DIR_REL), prefix: '.sandbox/' },
        { dir: await homePath(probe, CODEX_DIR), prefix: '' },
    ];
    const children: ResolvedChild[] = [];
    for (const source of sources) {
        for (const entry of await probe.list(source.dir, name => SANDBOX_LOG.test(name))) {
            if (entry.type !== 'file') continue;
            const day = logDay(entry.name);
            if (day === null) continue;
            children.push({
                ...child(entry, 'file', `${source.prefix}${entry.name}`),
                excluded: today - day >= SANDBOX_LOG_KEEP_DAYS ? undefined : 'ineligible',
            });
        }
    }
    return children;
};

/** sandbox.YYYY-MM-DD.log の日付を UTC の通算日（エポックからの日数）にする。不正な日付は null。 */
function logDay(name: string): number | null {
    const m = SANDBOX_LOG.exec(name);
    if (!m) return null;
    const [year, month, date] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const time = Date.UTC(year, month - 1, date);
    const parsed = new Date(time);
    if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== date) {
        return null;
    }
    return Math.floor(time / DAY_MS);
}

/**
 * Windows のサンドボックス用にコピーされた実行ファイル（.sandbox-bin）。
 * codex-command-runner は最新バージョンの 1 本を残し、codex.exe は 10 分以上更新されていないものを対象にする。
 * 書き込みで開けないもの（実行中）は使用中として除外する。ディレクトリ自体とそれ以外のファイルには触れない。
 */
const resolveSandboxBin: CleanupResolver = async probe => {
    if (probe.os !== 'win32') return [];
    const files = (
        await probe.list(
            await homePath(probe, CODEX_SANDBOX_BIN_REL),
            name => RUNNER_EXE.test(name) || name === SANDBOX_COPY_EXE
        )
    ).filter(entry => entry.type === 'file');
    const versions = files.map(file => RUNNER_EXE.exec(file.name)?.[1] ?? null);
    const newest = versions.reduce<string | null>(
        (best, ver) => (ver !== null && (best === null || compareCodexVersions(ver, best) > 0) ? ver : best),
        null
    );
    const now = Date.now();
    const children: ResolvedChild[] = files.map((file, i) => {
        const eligible =
            file.name === SANDBOX_COPY_EXE
                ? isOlderThan(file.mtimeMs, SANDBOX_COPY_GRACE_MS, now)
                : versions[i] !== newest;
        return { ...child(file, 'file'), excluded: eligible ? undefined : 'ineligible' };
    });
    const candidates = children.filter(c => !c.excluded);
    const inUse = await probe.filesInUse(candidates.map(c => c.path));
    candidates.forEach((c, i) => {
        if (inUse[i]) c.excluded = 'in-use';
    });
    return children;
};

/** Codex クリーンアップの特別候補のリゾルバ（候補キー → リゾルバ）。 */
export const CODEX_CLEANUP_RESOLVERS: Record<string, CleanupResolver> = {
    [CODEX_RESOLVED_CLEANUP_KEYS.ARG0_TEMP]: resolveArg0Temp,
    [CODEX_RESOLVED_CLEANUP_KEYS.PLUGINS_SYNC_TEMP]: resolvePluginsSyncTemp,
    [CODEX_RESOLVED_CLEANUP_KEYS.SANDBOX_LOGS]: resolveSandboxLogs,
    [CODEX_RESOLVED_CLEANUP_KEYS.SANDBOX_BIN_OLD]: resolveSandboxBin,
};
