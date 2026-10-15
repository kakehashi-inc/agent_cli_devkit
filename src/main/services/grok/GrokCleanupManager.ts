import { promises as nodeFs } from 'fs';
import {
    GROK_DIR,
    GROK_WSL_CLI_TEST,
    CLEANUP_BIN_OLD_KEY,
    CLEANUP_CANDIDATES,
    OTHER_CLEANUP_ITEMS,
} from '../../../shared/agents/grok/constants';
import {
    GrokEnvironment,
    CleanupCandidate,
    CleanupChild,
    CleanupEnvReport,
    CleanupSelection,
    OSType,
    OtherCleanupItemStatus,
    OtherCleanupReport,
    OtherCleanupSelection,
} from '../../../shared/agents/grok/types';
import { createCleanupProbe } from '../common/cleanup/CleanupProbe';
import { deleteResolvedChildren, resolveChildren, toResolvedCandidate } from '../common/cleanup/resolvedCleanup';
import { HomeFs } from '../common/wsl/HomeFs';
import { WslDetector } from '../common/wsl/WslDetector';
import { clearYamlList, countYamlListEntries, needsYamlListNormalize } from '../../utils/yamlPreserve';
import { GROK_TEMP_CLEANUP_RESOLVERS } from './grokTempCleanupResolvers';

const VALID_KEYS = new Set(CLEANUP_CANDIDATES.map(c => c.key));
const OTHER_VALID_KEYS = new Set(OTHER_CLEANUP_ITEMS.map(i => i.key));
// ~/.grok/bin の起動用ファイル
const BIN_LAUNCHERS = ['grok', 'grok.exe'];

/** POSIX シェル向けのシングルクォートエスケープ。 */
function shellQuote(value: string): string {
    return `'${value.replace(/'/g, `'\\''`)}'`;
}

/** パスの最後の要素（区切りは '/' と '\'）。 */
function lastSegment(path: string): string {
    return (
        path
            .split(/[\\/]/)
            .filter(s => s.length > 0)
            .pop() ?? ''
    );
}

/**
 * Grok CLI のデータディレクトリ（~/.grok 配下）と、OS の一時フォルダに残った Grok の一時物の
 * クリーンアップを行う。
 * - 対象は履歴／メモリ／ログ／診断データ／キャッシュ／旧バイナリ／一時ファイルのみ（CLEANUP_CANDIDATES）。
 * - expandable 候補（sessions=プロジェクト単位のサブディレクトリ）は個別 + 全体の両方を削除可能。
 * - それ以外はディレクトリ/ファイルごと削除（Grok が必要時に自動再作成する）。
 * - 'bin-old-versions' は特別候補: ~/.grok/bin の grok-<version> 形式ファイルのうち
 *   最新バージョン以外と、Windows の更新時に退避された実行ファイル（grok.exe.old など
 *   *.old）だけを対象とする。起動用の grok / grok.exe、それがシンボリックリンクの場合の参照先、
 *   最新バージョンは常に除外して保護し、「全体削除」を選択しても bin ディレクトリ自体は削除しない。
 * - GROK_TEMP_CLEANUP_RESOLVERS に登録した候補（一時フォルダの Grok 一時物）は、リゾルバが名前・所有者・
 *   日時・ゴールの状態で特定した子要素だけを扱い、削除の直前に再判定する。
 * - native とすべての Grok 入り WSL distro を環境として扱う。
 */
export class GrokCleanupManager {
    private readonly detector: WslDetector;

    constructor(detector: WslDetector) {
        this.detector = detector;
    }

    private nativeLabel(): string {
        const platform = process.platform as OSType;
        if (platform === 'win32') return 'Windows';
        if (platform === 'darwin') return 'macOS';
        return 'Linux';
    }

    private fsFor(env: GrokEnvironment): HomeFs {
        return new HomeFs(env, this.detector);
    }

    private rel(dirKey: string): string {
        return `${GROK_DIR}/${dirKey}`;
    }

    /** 管理対象の環境一覧（native + Grok 入り WSL distro）。 */
    async getEnvironments(): Promise<{ env: GrokEnvironment; label: string }[]> {
        const result: { env: GrokEnvironment; label: string }[] = [];
        result.push({ env: { kind: 'native' }, label: this.nativeLabel() });
        const distros = await this.detector.getDistrosWithTest(GROK_WSL_CLI_TEST);
        for (const d of distros) {
            result.push({ env: { kind: 'wsl', distro: d.distro }, label: d.distro });
        }
        return result;
    }

    /** 環境ごとのクリーンアップ候補をスキャンする。 */
    async scan(env: GrokEnvironment): Promise<CleanupEnvReport> {
        const fs = this.fsFor(env);
        const probe = createCleanupProbe(env, this.detector);
        const label = env.kind === 'wsl' ? (env.distro ?? 'WSL') : this.nativeLabel();
        const candidates: CleanupCandidate[] = [];

        for (const spec of CLEANUP_CANDIDATES) {
            const resolver = GROK_TEMP_CLEANUP_RESOLVERS[spec.key];
            if (resolver) {
                candidates.push(toResolvedCandidate(spec, await resolveChildren(resolver, probe, spec.key, env)));
                continue;
            }
            const relPath = this.rel(spec.path ?? spec.key);
            // リンクのディレクトリは配下が管理対象の外にあり得るため、候補にしない（削除もしない）。
            const exists = (await fs.exists(relPath)) && (spec.kind === 'file' || !(await fs.isLink(relPath)));
            const stats = exists
                ? spec.kind === 'file'
                    ? await fs.fileStats(relPath)
                    : await fs.dirStats(relPath)
                : { size: 0, fileCount: 0, mtimeMs: 0 };

            const candidate: CleanupCandidate = {
                key: spec.key,
                exists,
                size: stats.size,
                fileCount: stats.fileCount,
                defaultChecked: spec.defaultChecked,
                expandable: spec.expandable,
                childKind: spec.childKind,
            };

            if (spec.expandable && spec.childKind && exists) {
                const children: CleanupChild[] = [];
                if (spec.childKind === 'dir') {
                    const subdirs = await fs.listDirs(relPath);
                    for (const name of subdirs) {
                        const childStats = await fs.dirStats(`${relPath}/${name}`);
                        children.push({ name, size: childStats.size, fileCount: childStats.fileCount });
                    }
                } else {
                    // bin 旧バイナリ候補は grok-<version> 形式のうち保護対象以外のみを対象とする。
                    const targets =
                        spec.key === CLEANUP_BIN_OLD_KEY
                            ? await this.binOldChildren(env, fs, relPath)
                            : await fs.listFiles(relPath);
                    for (const name of targets) {
                        const childStats = await fs.fileStats(`${relPath}/${name}`);
                        children.push({ name, size: childStats.size, fileCount: childStats.fileCount });
                    }
                }
                children.sort((a, b) => b.size - a.size);
                candidate.children = children;
                // bin 旧バイナリ候補は「回収可能な量」を示すため、候補自体のサイズ・件数を
                // ディレクトリ全体ではなく削除対象（フィルタ後の子）の合計に置き換える。
                if (spec.key === CLEANUP_BIN_OLD_KEY) {
                    candidate.size = children.reduce((sum, c) => sum + c.size, 0);
                    candidate.fileCount = children.length;
                    candidate.exists = exists && children.length > 0;
                }
            }

            candidates.push(candidate);
        }

        return { env, label, candidates };
    }

    /**
     * 選択されたディレクトリ／子要素を削除し、再スキャン結果を返す。
     */
    async deleteSelected(env: GrokEnvironment, selection: CleanupSelection): Promise<CleanupEnvReport> {
        const fs = this.fsFor(env);
        const probe = createCleanupProbe(env, this.detector);
        const skipped: string[] = [];

        for (const key of selection.dirs) {
            if (!VALID_KEYS.has(key) || this.isUnsafeName(key)) {
                continue;
            }
            const resolver = GROK_TEMP_CLEANUP_RESOLVERS[key];
            if (resolver) {
                skipped.push(...(await deleteResolvedChildren(resolver, probe, key, env, 'all')));
                continue;
            }
            const spec = CLEANUP_CANDIDATES.find(c => c.key === key);
            const relPath = this.rel(spec?.path ?? key);
            // bin 旧バイナリは「全体削除」でも bin ディレクトリごとは消さず、
            // 保護対象（最新バージョン・起動用 grok / grok.exe とその参照先）を除いた旧バージョン
            // ファイルのみを削除する。
            if (key === CLEANUP_BIN_OLD_KEY) {
                const targets = await this.binOldChildren(env, fs, relPath);
                for (const name of targets) {
                    const childRel = `${relPath}/${name}`;
                    try {
                        await fs.deleteFile(childRel);
                        if (await fs.exists(childRel)) {
                            skipped.push(name);
                        }
                    } catch (error) {
                        console.error(`Failed to remove old binary ${name} (${JSON.stringify(env)}):`, error);
                        skipped.push(name);
                    }
                }
                continue;
            }
            try {
                if (spec?.kind === 'file') {
                    await fs.deleteFile(relPath);
                    if (await fs.exists(relPath)) {
                        skipped.push(key);
                    }
                } else {
                    const { removedAll } = await fs.removeDirBestEffort(relPath);
                    if (!removedAll) {
                        skipped.push(key);
                    }
                }
            } catch (error) {
                console.error(`Failed to remove ${key} (${JSON.stringify(env)}):`, error);
                skipped.push(key);
            }
        }

        // expandable 候補の個別削除。
        const childSelections = selection.childSelections ?? {};
        for (const spec of CLEANUP_CANDIDATES) {
            if (!spec.expandable || !spec.childKind) {
                continue;
            }
            if (selection.dirs.includes(spec.key)) {
                continue;
            }
            const names = childSelections[spec.key];
            if (!names || names.length === 0) {
                continue;
            }
            const resolver = GROK_TEMP_CLEANUP_RESOLVERS[spec.key];
            if (resolver) {
                skipped.push(...(await deleteResolvedChildren(resolver, probe, spec.key, env, names)));
                continue;
            }
            const baseRel = this.rel(spec.path ?? spec.key);
            // bin 旧バイナリ候補は保護対象を除いたフィルタ後の集合のみ削除を許可する
            // （renderer から保護対象の名前が送られてきても無視される）。
            const existing = new Set(
                (await fs.isLink(baseRel))
                    ? []
                    : spec.childKind === 'file'
                      ? spec.key === CLEANUP_BIN_OLD_KEY
                          ? await this.binOldChildren(env, fs, baseRel)
                          : await fs.listFiles(baseRel)
                      : await fs.listDirs(baseRel)
            );
            for (const name of names) {
                if (this.isUnsafeName(name) || !existing.has(name)) {
                    continue;
                }
                const childRel = `${baseRel}/${name}`;
                try {
                    if (spec.childKind === 'file') {
                        await fs.deleteFile(childRel);
                        if (await fs.exists(childRel)) {
                            skipped.push(name);
                        }
                    } else {
                        const { removedAll } = await fs.removeDirBestEffort(childRel);
                        if (!removedAll) {
                            skipped.push(name);
                        }
                    }
                } catch (error) {
                    console.error(`Failed to remove child ${spec.key}/${name} (${JSON.stringify(env)}):`, error);
                    skipped.push(name);
                }
            }
        }

        const report = await this.scan(env);
        if (skipped.length > 0) {
            report.skipped = skipped;
        }
        return report;
    }

    /** パストラバーサル対策: 区切り文字や .. を含む名前を拒否する。 */
    private isUnsafeName(name: string): boolean {
        return name.includes('/') || name.includes('\\') || name.includes('..') || name.trim().length === 0;
    }

    // ===== bin 旧バイナリ候補（CLEANUP_BIN_OLD_KEY）の特別処理 =====

    /** 'grok-<version>(.exe)' 形式のファイル名からバージョン文字列を取り出す。該当しなければ null。 */
    private binVersionOf(name: string): string | null {
        const m = /^grok-(\d[0-9A-Za-z.+-]*?)(\.exe)?$/i.exec(name);
        return m ? m[1] : null;
    }

    /** バージョン文字列の数値優先比較（'0.2.93' < '0.2.100' となるよう各セグメントを数値比較する）。 */
    private compareBinVersions(a: string, b: string): number {
        const pa = a.split(/[.+-]/);
        const pb = b.split(/[.+-]/);
        const len = Math.max(pa.length, pb.length);
        for (let i = 0; i < len; i++) {
            const sa = pa[i] ?? '';
            const sb = pb[i] ?? '';
            const na = Number.parseInt(sa, 10);
            const nb = Number.parseInt(sb, 10);
            const aNum = Number.isFinite(na);
            const bNum = Number.isFinite(nb);
            if (aNum && bNum) {
                if (na !== nb) return na - nb;
            } else if (aNum !== bNum) {
                // 数値セグメントを非数値より新しいとみなす（'93' > 'alpha' 等）。
                return aNum ? 1 : -1;
            } else {
                const cmp = sa.localeCompare(sb);
                if (cmp !== 0) return cmp;
            }
        }
        return 0;
    }

    /**
     * Windows の更新時に、実行中で上書きできなかった実行ファイルを退避した名前か
     * （'grok.exe.old' や 'grok.exe.old.<pid>-<seq>.old' など、grok で始まり .old で終わる）。
     * Grok は次回の更新時に、使用中でなくなったものを削除する。
     */
    private isBinMovedAside(name: string): boolean {
        return /^grok[^/\\]*\.old$/i.test(name);
    }

    /**
     * bin 配下のファイル一覧から削除対象（旧バージョンバイナリと退避された実行ファイル）のみを返す。
     * - 退避された実行ファイル（*.old）は常に対象。
     * - grok-<version> 形式以外（起動用の grok / grok.exe を含む）は常に除外。
     * - 最新バージョンのファイル群（同一バージョンの .exe 等も含む）は現行実体として保護。
     * - バージョン付きが 1 種類以下ならバージョン付きファイルは対象外。
     * - launcherTargets（起動用ファイルの参照先）に含まれるものは使用中の実体として保護。null（参照先が分からない）の
     *   場合はバージョン付きファイルをすべて対象外にする。
     */
    private filterBinOldChildren(names: string[], launcherTargets: Set<string> | null): string[] {
        const movedAside = names.filter(name => this.isBinMovedAside(name));
        const versioned = names
            .filter(name => !this.isBinMovedAside(name))
            .map(name => ({ name, ver: this.binVersionOf(name) }))
            .filter((x): x is { name: string; ver: string } => x.ver !== null);
        const versions = [...new Set(versioned.map(x => x.ver))];
        versions.sort((a, b) => this.compareBinVersions(a, b));
        const newest = versions.length > 0 ? versions[versions.length - 1] : null;
        const oldVersions =
            versions.length > 1 && launcherTargets !== null
                ? versioned.filter(x => x.ver !== newest).map(x => x.name)
                : [];
        return [...oldVersions, ...movedAside].filter(name => !launcherTargets?.has(name)).sort();
    }

    /** bin（relPath）の削除対象を返す（filterBinOldChildren）。bin 自体がリンクの場合は空配列。 */
    private async binOldChildren(env: GrokEnvironment, fs: HomeFs, relPath: string): Promise<string[]> {
        if (await fs.isLink(relPath)) {
            return [];
        }
        const names = await fs.listFiles(relPath);
        return this.filterBinOldChildren(names, await this.launcherTargets(env, fs, relPath));
    }

    /**
     * 起動用の grok / grok.exe（bin の relPath 直下）がシンボリックリンクの場合の参照先のファイル名
     * （リンクが指す名前と、リンクをたどりきった実体の名前）。リンクでなければ含めない。参照先を読めない場合は null。
     * WSL の Linux のシンボリックリンクは UNC 経由で読めないため、distro 内の readlink で読む。
     */
    private async launcherTargets(env: GrokEnvironment, fs: HomeFs, relPath: string): Promise<Set<string> | null> {
        const targets = new Set<string>();
        if (env.kind === 'wsl') {
            if (!env.distro) {
                return null;
            }
            const script = [
                ...BIN_LAUNCHERS.map(
                    name =>
                        `p="$HOME"/${shellQuote(`${relPath}/${name}`)}; ` +
                        `if [ -L "$p" ]; then printf 'L\\t%s\\t%s\\n' "$(readlink -- "$p")" "$(readlink -f -- "$p")"; fi`
                ),
                'echo END',
            ].join('\n');
            let lines: string[];
            try {
                lines = (await this.detector.runInDistro(env.distro, script)).toString('utf8').split(/\r?\n/);
            } catch (error) {
                console.error(`Failed to read the Grok launcher (${env.distro}):`, error);
                return null;
            }
            if (!lines.includes('END')) {
                return null;
            }
            for (const line of lines.filter(l => l.startsWith('L\t'))) {
                for (const target of line.split('\t').slice(1)) {
                    if (lastSegment(target)) targets.add(lastSegment(target));
                }
            }
            return targets;
        }
        for (const name of BIN_LAUNCHERS) {
            const abs = await fs.resolveRealPath(`${relPath}/${name}`);
            if (abs === null) {
                return null;
            }
            try {
                if (!(await nodeFs.lstat(abs)).isSymbolicLink()) continue;
                targets.add(lastSegment(await nodeFs.readlink(abs)));
            } catch (error) {
                if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
                console.error(`Failed to read the Grok launcher ${abs}:`, error);
                return null;
            }
            try {
                targets.add(lastSegment(await nodeFs.realpath(abs)));
            } catch {
                // リンク先が無い場合は、リンクが指す名前だけを保護する
            }
        }
        return targets;
    }

    // ===== 「その他のツール」クリーンアップ（Serena など、~/.grok 配下ではないもの）=====

    /**
     * 「その他」クリーンアップの対象環境一覧。
     * native ＋（WSL で ~/.serena を持つ distro）。~/.serena 検出は ~/.grok と独立。
     */
    async getOtherEnvironments(): Promise<{ env: GrokEnvironment; label: string }[]> {
        const result: { env: GrokEnvironment; label: string }[] = [];
        result.push({ env: { kind: 'native' }, label: this.nativeLabel() });
        const distros = await this.detector.getSerenaDistros();
        for (const distro of distros) {
            result.push({ env: { kind: 'wsl', distro }, label: distro });
        }
        return result;
    }

    /**
     * 環境ごとの「その他」クリーンアップ項目をスキャンする。
     */
    async scanOther(env: GrokEnvironment): Promise<OtherCleanupReport> {
        const fs = this.fsFor(env);
        const label = env.kind === 'wsl' ? (env.distro ?? 'WSL') : this.nativeLabel();
        const items: OtherCleanupItemStatus[] = [];

        for (const item of OTHER_CLEANUP_ITEMS) {
            const available = await fs.exists(item.requiresPath);
            if (!available) {
                continue;
            }

            if (item.action === 'dir-delete') {
                const stats = await fs.dirStats(item.targetPath);
                // クリーンアップ対象が無い（ファイル 0 件）項目と、削除しないリンクのディレクトリは表示しない
                if (stats.fileCount === 0 || (await fs.isLink(item.targetPath))) {
                    continue;
                }
                items.push({
                    key: item.key,
                    available: true,
                    metricKind: 'size',
                    metricValue: stats.size,
                    fileCount: stats.fileCount,
                });
            } else if (item.action === 'yaml-list-clear' && item.yamlKey) {
                const text = await fs.readText(item.targetPath);
                const count = text ? countYamlListEntries(text, item.yamlKey) : 0;
                const needsNormalize = text ? needsYamlListNormalize(text, item.yamlKey) : false;
                if (count === 0 && !needsNormalize) {
                    continue;
                }
                items.push({
                    key: item.key,
                    available: true,
                    metricKind: 'count',
                    metricValue: count,
                });
            }
        }

        return { env, label, items };
    }

    /**
     * 選択された「その他」項目を実行し、再スキャン結果を返す。
     */
    async deleteOther(env: GrokEnvironment, selection: OtherCleanupSelection): Promise<OtherCleanupReport> {
        const fs = this.fsFor(env);
        const skipped: string[] = [];

        for (const key of selection) {
            if (!OTHER_VALID_KEYS.has(key)) {
                continue;
            }
            const item = OTHER_CLEANUP_ITEMS.find(i => i.key === key);
            if (!item) {
                continue;
            }
            try {
                if (item.action === 'dir-delete') {
                    const { removedAll } = await fs.removeDirBestEffort(item.targetPath);
                    if (!removedAll) {
                        skipped.push(key);
                    }
                } else if (item.action === 'yaml-list-clear' && item.yamlKey) {
                    const text = await fs.readText(item.targetPath);
                    if (text === null) {
                        skipped.push(key);
                        continue;
                    }
                    const next = clearYamlList(text, item.yamlKey);
                    if (next !== text) {
                        await fs.writeText(item.targetPath, next);
                    }
                }
            } catch (error) {
                console.error(`Failed to run other-cleanup ${key} (${JSON.stringify(env)}):`, error);
                skipped.push(key);
            }
        }

        const report = await this.scanOther(env);
        if (skipped.length > 0) {
            report.skipped = skipped;
        }
        return report;
    }
}
