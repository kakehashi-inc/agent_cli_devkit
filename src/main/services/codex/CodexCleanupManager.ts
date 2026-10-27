import { promises as nodeFs } from 'fs';
import {
    CODEX_DIR,
    CODEX_STANDALONE_AUTO_UPDATE_REL,
    CODEX_STANDALONE_CURRENT_REL,
    CODEX_WSL_CLI_TEST,
    CLEANUP_CANDIDATES,
    CLEANUP_OLD_RELEASES_KEY,
    OTHER_CLEANUP_ITEMS,
} from '../../../shared/agents/codex/constants';
import {
    CodexEnvironment,
    CleanupCandidate,
    CleanupChild,
    CleanupEnvReport,
    CleanupSelection,
    OSType,
    OtherCleanupItemStatus,
    OtherCleanupReport,
    OtherCleanupSelection,
} from '../../../shared/agents/codex/types';
import { createCleanupProbe } from '../common/cleanup/CleanupProbe';
import {
    deleteResolvedChildren,
    removeHomeTargets,
    resolveChildren,
    toResolvedCandidate,
} from '../common/cleanup/resolvedCleanup';
import { HomeFs } from '../common/wsl/HomeFs';
import { WslDetector } from '../common/wsl/WslDetector';
import { clearYamlList, countYamlListEntries, needsYamlListNormalize } from '../../utils/yamlPreserve';
import { CODEX_CLEANUP_RESOLVERS } from './codexCleanupResolvers';
import { compareCodexVersions } from './codexVersion';

const VALID_KEYS = new Set(CLEANUP_CANDIDATES.map(c => c.key));
const OTHER_VALID_KEYS = new Set(OTHER_CLEANUP_ITEMS.map(i => i.key));

/**
 * Codex CLI のデータディレクトリ（~/.codex 配下）のクリーンアップを行う。
 * - 対象は履歴／キャッシュ／一時／ログ／セッション／旧バージョン実体のみ（CLEANUP_CANDIDATES）。
 * - expandable 候補（sessions=サブディレクトリ単位、archived_sessions=ファイル単位）は
 *   個別 + 全体の両方を削除可能。
 * - それ以外はディレクトリ/ファイルごと削除（Codex が必要時に自動再作成する）。
 * - 'standalone-old-releases' は特別候補: packages/standalone/releases 配下のうち、
 *   current が指す使用中バージョン・auto-update-version が示す切り替え予定バージョン・
 *   最新バージョンを除いたリリースディレクトリのみを対象とする。使用中バージョンを
 *   特定できない場合は何も対象にせず、「全体削除」でも releases ディレクトリ自体は削除しない。
 * - CODEX_CLEANUP_RESOLVERS に登録した候補（tmp/arg0・プラグイン同期の作業フォルダ・サンドボックスの
 *   ログと実行ファイル）は、リゾルバが使用中でないと判定した子要素だけを扱い、削除の直前に再判定する。
 *   「全体削除」でも親ディレクトリ自体は削除しない。
 * - native とすべての Codex 入り WSL distro を環境として扱う。
 */
export class CodexCleanupManager {
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

    private fsFor(env: CodexEnvironment): HomeFs {
        return new HomeFs(env, this.detector);
    }

    private rel(dirKey: string): string {
        return `${CODEX_DIR}/${dirKey}`;
    }

    /** 管理対象の環境一覧（native + Codex 入り WSL distro）。 */
    async getEnvironments(): Promise<{ env: CodexEnvironment; label: string }[]> {
        const result: { env: CodexEnvironment; label: string }[] = [];
        result.push({ env: { kind: 'native' }, label: this.nativeLabel() });
        const distros = await this.detector.getDistrosWithTest(CODEX_WSL_CLI_TEST);
        for (const d of distros) {
            result.push({ env: { kind: 'wsl', distro: d.distro }, label: d.distro });
        }
        return result;
    }

    /** 環境ごとのクリーンアップ候補をスキャンする。 */
    async scan(env: CodexEnvironment): Promise<CleanupEnvReport> {
        const fs = this.fsFor(env);
        const probe = createCleanupProbe(env, this.detector);
        const label = env.kind === 'wsl' ? (env.distro ?? 'WSL') : this.nativeLabel();
        const candidates: CleanupCandidate[] = [];

        for (const spec of CLEANUP_CANDIDATES) {
            const resolver = CODEX_CLEANUP_RESOLVERS[spec.key];
            if (resolver) {
                candidates.push(toResolvedCandidate(spec, await resolveChildren(resolver, probe, spec.key, env)));
                continue;
            }
            const relPath = this.rel(spec.path ?? spec.key);
            if (spec.key === CLEANUP_OLD_RELEASES_KEY) {
                candidates.push(await this.scanOldReleases(env, fs, relPath));
                continue;
            }
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
                    const files = await fs.listFiles(relPath);
                    for (const name of files) {
                        const childStats = await fs.fileStats(`${relPath}/${name}`);
                        children.push({ name, size: childStats.size, fileCount: childStats.fileCount });
                    }
                }
                children.sort((a, b) => b.size - a.size);
                candidate.children = children;
            }

            candidates.push(candidate);
        }

        return { env, label, candidates };
    }

    /**
     * 選択されたディレクトリ／子要素を削除し、再スキャン結果を返す。OS のファイルロックなどで消せないものを飛ばして続け、
     * 削除できなかった対象を skipped に、残ったパスを failedPaths に入れる。
     */
    async deleteSelected(env: CodexEnvironment, selection: CleanupSelection): Promise<CleanupEnvReport> {
        const fs = this.fsFor(env);
        const probe = createCleanupProbe(env, this.detector);
        // 削除しようとして削除できなかった対象
        const skipped: string[] = [];
        // OS のファイルロックなどで削除できずに残ったパス
        const failedPaths: string[] = [];

        for (const key of selection.dirs) {
            if (!VALID_KEYS.has(key) || this.isUnsafeName(key)) {
                continue;
            }
            const resolver = CODEX_CLEANUP_RESOLVERS[key];
            if (resolver) {
                skipped.push(...(await deleteResolvedChildren(resolver, probe, key, env, 'all', failedPaths)));
                continue;
            }
            const spec = CLEANUP_CANDIDATES.find(c => c.key === key);
            const relPath = this.rel(spec?.path ?? key);
            // 旧バージョン候補は「全体削除」でも releases ディレクトリごとは消さず、
            // 保護対象を除いたリリースディレクトリのみを削除する。
            if (key === CLEANUP_OLD_RELEASES_KEY) {
                const releases = await this.oldReleaseNames(env, fs, relPath);
                const removed = await removeHomeTargets(
                    probe,
                    env,
                    releases.map(name => ({ rel: `${relPath}/${name}`, type: 'dir' as const })),
                    failedPaths
                );
                releases.forEach((name, i) => {
                    if (!removed[i]) {
                        skipped.push(name);
                    }
                });
                continue;
            }
            const [removed] = await removeHomeTargets(
                probe,
                env,
                [{ rel: relPath, type: spec?.kind === 'file' ? 'file' : 'dir' }],
                failedPaths
            );
            if (!removed) {
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
            const resolver = CODEX_CLEANUP_RESOLVERS[spec.key];
            if (resolver) {
                skipped.push(...(await deleteResolvedChildren(resolver, probe, spec.key, env, names, failedPaths)));
                continue;
            }
            const baseRel = this.rel(spec.path ?? spec.key);
            // 旧バージョン候補は保護対象を除いた集合のみ削除を許可する
            // （renderer から保護対象の名前が送られてきても無視される）。
            const existing = new Set(
                (await fs.isLink(baseRel))
                    ? []
                    : spec.key === CLEANUP_OLD_RELEASES_KEY
                      ? await this.oldReleaseNames(env, fs, baseRel)
                      : spec.childKind === 'file'
                        ? await fs.listFiles(baseRel)
                        : await fs.listDirs(baseRel)
            );
            // 消せないものを飛ばして削除し、残ったものを報告する。
            const childNames = names.filter(name => !this.isUnsafeName(name) && existing.has(name));
            const removed = await removeHomeTargets(
                probe,
                env,
                childNames.map(name => ({
                    rel: `${baseRel}/${name}`,
                    type: spec.childKind === 'file' ? ('file' as const) : ('dir' as const),
                })),
                failedPaths
            );
            childNames.forEach((name, i) => {
                if (!removed[i]) {
                    skipped.push(name);
                }
            });
        }

        const report = await this.scan(env);
        if (skipped.length > 0) {
            report.skipped = skipped;
        }
        if (failedPaths.length > 0) {
            report.failedPaths = failedPaths;
        }
        return report;
    }

    /** パストラバーサル対策: 区切り文字や .. を含む名前を拒否する。 */
    private isUnsafeName(name: string): boolean {
        return name.includes('/') || name.includes('\\') || name.includes('..') || name.trim().length === 0;
    }

    // ===== スタンドアロン版の旧バージョン候補（CLEANUP_OLD_RELEASES_KEY）の特別処理 =====

    /**
     * 旧バージョン候補をスキャンする。候補のサイズ・件数は回収可能な量を示すため、
     * releases ディレクトリ全体ではなく削除対象（保護対象を除いた子）の合計とする。
     */
    private async scanOldReleases(env: CodexEnvironment, fs: HomeFs, relPath: string): Promise<CleanupCandidate> {
        const spec = CLEANUP_CANDIDATES.find(c => c.key === CLEANUP_OLD_RELEASES_KEY);
        const children: CleanupChild[] = [];
        for (const name of await this.oldReleaseNames(env, fs, relPath)) {
            const stats = await fs.dirStats(`${relPath}/${name}`);
            children.push({ name, size: stats.size, fileCount: stats.fileCount });
        }
        children.sort((a, b) => b.size - a.size);
        return {
            key: CLEANUP_OLD_RELEASES_KEY,
            exists: children.length > 0,
            size: children.reduce((sum, c) => sum + c.size, 0),
            fileCount: children.reduce((sum, c) => sum + c.fileCount, 0),
            defaultChecked: spec?.defaultChecked ?? false,
            expandable: spec?.expandable,
            childKind: spec?.childKind,
            children,
        };
    }

    /**
     * releases 配下のディレクトリのうち削除してよい旧バージョンの名前を返す。
     * - '<version>-<target>' 形式以外のディレクトリは常に除外する。
     * - current が指す使用中バージョン、auto-update-version が示す切り替え予定バージョン、
     *   最新バージョンは保護する。
     * - 使用中バージョンを特定できない場合と、releases 自体がリンクの場合は、誤削除を避けるため空配列を返す。
     */
    private async oldReleaseNames(env: CodexEnvironment, fs: HomeFs, relPath: string): Promise<string[]> {
        if (await fs.isLink(relPath)) {
            return [];
        }
        const versioned = (await fs.listDirs(relPath))
            .map(name => ({ name, ver: this.releaseVersionOf(name) }))
            .filter((x): x is { name: string; ver: string } => x.ver !== null);
        if (versioned.length <= 1) {
            return [];
        }
        const current = await this.currentReleaseName(env, fs);
        if (!current) {
            return [];
        }
        const protectedNames = new Set<string>([current]);
        const staged = ((await fs.readText(CODEX_STANDALONE_AUTO_UPDATE_REL)) ?? '').trim();
        if (staged.length > 0) {
            protectedNames.add(staged);
        }
        const newest = versioned.reduce((a, b) => (compareCodexVersions(a.ver, b.ver) >= 0 ? a : b)).ver;
        return versioned
            .filter(x => !protectedNames.has(x.name) && x.ver !== newest)
            .map(x => x.name)
            .sort();
    }

    /**
     * current（シンボリックリンク）が指すリリースディレクトリ名を返す。特定できなければ null。
     * WSL の Linux シンボリックリンクは UNC 経由で解決できないため distro 内の readlink で読む。
     */
    private async currentReleaseName(env: CodexEnvironment, fs: HomeFs): Promise<string | null> {
        try {
            let target: string;
            if (env.kind === 'wsl') {
                if (!env.distro) {
                    return null;
                }
                const out = await this.detector.runInDistro(
                    env.distro,
                    `readlink "$HOME/${CODEX_STANDALONE_CURRENT_REL}" 2>/dev/null || true`
                );
                target = out.toString('utf8').trim();
            } else {
                const abs = await fs.resolveRealPath(CODEX_STANDALONE_CURRENT_REL);
                if (!abs) {
                    return null;
                }
                target = await nodeFs.readlink(abs);
            }
            const name = target
                .split(/[\\/]/)
                .filter(s => s.length > 0)
                .pop();
            return name ?? null;
        } catch {
            // リンクが無い・リンクでない（EINVAL）などは特定不可として扱う。
            return null;
        }
    }

    /** '<version>-<target>' 形式のリリース名からバージョン文字列を取り出す。該当しなければ null。 */
    private releaseVersionOf(name: string): string | null {
        const m = /^(\d+\.\d+\.\d+(?:-(?:alpha|beta|rc)(?:\.\d+)*)?)-[A-Za-z0-9_]+-[A-Za-z0-9_.-]+$/.exec(name);
        return m ? m[1] : null;
    }

    // ===== 「その他のツール」クリーンアップ（Serena など、~/.codex 配下ではないもの）=====

    /**
     * 「その他」クリーンアップの対象環境一覧。
     * native ＋（WSL で ~/.serena を持つ distro）。~/.serena 検出は ~/.codex と独立。
     */
    async getOtherEnvironments(): Promise<{ env: CodexEnvironment; label: string }[]> {
        const result: { env: CodexEnvironment; label: string }[] = [];
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
    async scanOther(env: CodexEnvironment): Promise<OtherCleanupReport> {
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
    async deleteOther(env: CodexEnvironment, selection: OtherCleanupSelection): Promise<OtherCleanupReport> {
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
