import type {
    AgentEnvironment,
    CleanupCandidate,
    CleanupCandidateSpec,
    CleanupChild,
    CleanupEnvReport,
    CleanupSelection,
    OSType,
} from '../../../../shared/agents/types';
import { isSafePathSegment } from '../fs/archiveEntryPath';
import { createSqliteStore } from '../sqlite/createSqliteStore';
import { HomeFs } from '../wsl/HomeFs';
import { WslDetector } from '../wsl/WslDetector';
import { createCleanupProbe, type CleanupProbe } from './CleanupProbe';
import { listHandled, removeHandled, type CleanupBlock, type CleanupHandler } from './handledCleanup';
import {
    candidateTextKeys,
    deleteResolvedChildren,
    homePath,
    removeHomeTargets,
    resolveChildren,
    toBlockedCandidate,
    toResolvedCandidate,
    type CleanupResolver,
} from './resolvedCleanup';

/**
 * 候補の子要素を消した後に、それに付随するものを片付ける処理。
 * names は消そうとした子要素名（候補全体の選択では、消す前に一覧した子要素名）で、消せずに残ったものも含む。
 * 片付けきれなかった子要素名を返し、削除できずに残ったパスを failedPaths に追加する。
 */
export type CleanupAfterDelete = (
    env: AgentEnvironment,
    probe: CleanupProbe,
    names: readonly string[],
    failedPaths: string[]
) => Promise<string[]>;

interface Options {
    baseRel: string;
    wslTest: string;
    // native 環境を一覧に出すかの判定。指定した場合は、true を返すときだけ native 環境を一覧に出す。
    nativeAvailable?: () => Promise<boolean>;
    wslAvailable?: (env: AgentEnvironment) => Promise<boolean>;
    candidates: CleanupCandidateSpec[];
    // 候補キーごとの子要素リゾルバ。指定した候補は baseRel に縛られず、リゾルバが解決した子要素だけを扱う。
    resolvers?: Record<string, CleanupResolver>;
    // 候補キーごとのハンドラー。指定した候補はファイルを直接消さず、ハンドラーが子要素の一覧と削除を行う。
    handlers?: Record<string, CleanupHandler>;
    // 候補キーごとの削除後の処理。resolvers と handlers を指定した候補には使わない。
    afterDelete?: Record<string, CleanupAfterDelete>;
    // 候補キーごとの、環境によって行に添える注記を返す処理。
    notices?: Record<string, (env: AgentEnvironment) => Promise<CleanupBlock | null>>;
}

/**
 * agent の公式ホーム配下に限定した宣言的クリーンアップ。
 * resolvers を指定した候補は、ホーム外を含めてリゾルバが特定した子要素だけを扱う。
 * handlers を指定した候補は、ハンドラーが子要素の一覧と削除を行う（CLI 経由の削除など）。
 * その子要素は走査のたびにハンドラーで一覧し、一覧できなかった場合は対象なしとして扱う。
 * afterDelete を指定した候補は、子要素を消した後に付随するものを片付ける。
 * 削除は OS のファイルロックなどで消せないものを飛ばして続け、残ったパスを CleanupEnvReport.failedPaths で報告する。
 * 使用中の可能性がある子要素は、利用者が削除を承認したもの（CleanupSelection.approvedChildren）だけを削除する。
 */
export class AgentCleanupManager {
    private readonly validKeys: Set<string>;

    constructor(
        private readonly detector: WslDetector,
        private readonly options: Options
    ) {
        this.validKeys = new Set(options.candidates.map(candidate => candidate.key));
    }

    private nativeLabel(): string {
        const platform = process.platform as OSType;
        if (platform === 'win32') return 'Windows';
        if (platform === 'darwin') return 'macOS';
        return 'Linux';
    }

    private fsFor(env: AgentEnvironment): HomeFs {
        return new HomeFs(env, this.detector);
    }

    private rel(spec: CleanupCandidateSpec): string {
        const path = spec.path ?? spec.key;
        return this.options.baseRel.length > 0 ? `${this.options.baseRel}/${path}` : path;
    }

    private resolverFor(spec: CleanupCandidateSpec): CleanupResolver | undefined {
        return this.options.resolvers?.[spec.key];
    }

    private handlerFor(spec: CleanupCandidateSpec): CleanupHandler | undefined {
        return this.options.handlers?.[spec.key];
    }

    /** ホーム相対のロックファイルが他から保持されているか。判定できない場合は保持中とみなす。 */
    private async isLockHeld(probe: CleanupProbe, rel: string): Promise<boolean> {
        try {
            const [state] = await probe.lockStates([await homePath(probe, rel)]);
            return state === 'held';
        } catch (error) {
            console.error(`Failed to check lock file ${rel}:`, error);
            return true;
        }
    }

    async getEnvironments(): Promise<{ env: AgentEnvironment; label: string }[]> {
        const result: { env: AgentEnvironment; label: string }[] = [];
        if (!this.options.nativeAvailable || (await this.options.nativeAvailable())) {
            result.push({ env: { kind: 'native' }, label: this.nativeLabel() });
        }
        const distros = await this.detector.getDistrosWithTest(this.options.wslTest);
        for (const distro of distros) {
            const env: AgentEnvironment = { kind: 'wsl', distro: distro.distro };
            if (!this.options.wslAvailable || (await this.options.wslAvailable(env))) {
                result.push({ env, label: distro.distro });
            }
        }
        return result;
    }

    /** ハンドラーの候補をスキャンする。使えない環境では行と注記だけの候補にする。 */
    private async scanHandled(
        spec: CleanupCandidateSpec,
        handler: CleanupHandler,
        env: AgentEnvironment
    ): Promise<CleanupCandidate> {
        const block = await handler.blocked?.(env);
        if (block) return toBlockedCandidate(spec, block);
        return toResolvedCandidate(spec, await listHandled(handler, spec.key, env));
    }

    /** 候補に環境によって添える注記を反映する。 */
    private async withNotice(candidate: CleanupCandidate, env: AgentEnvironment): Promise<CleanupCandidate> {
        const notice = await this.options.notices?.[candidate.key]?.(env);
        return notice ? { ...candidate, ...notice } : candidate;
    }

    async scan(env: AgentEnvironment): Promise<CleanupEnvReport> {
        await createSqliteStore(env, this.detector).removeStaleCopies();
        const fs = this.fsFor(env);
        const probe = createCleanupProbe(env, this.detector);
        const candidates: CleanupCandidate[] = [];
        for (const spec of this.options.candidates) {
            const handler = this.handlerFor(spec);
            if (handler) {
                candidates.push(await this.scanHandled(spec, handler, env));
                continue;
            }
            const resolver = this.resolverFor(spec);
            if (resolver) {
                candidates.push(toResolvedCandidate(spec, await resolveChildren(resolver, probe, spec.key, env)));
                continue;
            }
            const rel = this.rel(spec);
            let exists = await fs.exists(rel);
            // リンクのディレクトリは配下が管理対象の外にあり得るため、候補にしない（削除もしない）。
            if (exists && spec.kind !== 'file' && (await fs.isLink(rel))) exists = false;
            if (exists && spec.lockFile && (await this.isLockHeld(probe, rel))) exists = false;
            const stats = exists
                ? spec.kind === 'file'
                    ? await fs.fileStats(rel)
                    : await fs.dirStats(rel)
                : { size: 0, fileCount: 0, mtimeMs: 0 };
            const candidate: CleanupCandidate = {
                key: spec.key,
                exists,
                size: stats.size,
                fileCount: stats.fileCount,
                defaultChecked: spec.defaultChecked,
                expandable: spec.expandable,
                childKind: spec.childKind,
                ...candidateTextKeys(spec),
            };
            if (exists && spec.expandable && spec.childKind) {
                const names = spec.childKind === 'dir' ? await fs.listDirs(rel) : await fs.listFiles(rel);
                const children: CleanupChild[] = [];
                for (const name of names) {
                    const childStats =
                        spec.childKind === 'dir'
                            ? await fs.dirStats(`${rel}/${name}`)
                            : await fs.fileStats(`${rel}/${name}`);
                    children.push({ name, size: childStats.size, fileCount: childStats.fileCount });
                }
                candidate.children = children.sort((a, b) => b.size - a.size);
            }
            candidates.push(await this.withNotice(candidate, env));
        }
        return {
            env,
            label: env.kind === 'wsl' ? (env.distro ?? 'WSL') : this.nativeLabel(),
            candidates,
        };
    }

    /** 削除後の処理を持つ候補の、現在の子要素名。処理を持たない候補と、候補自体がリンクの場合は空。 */
    private async childNamesForAfterDelete(fs: HomeFs, spec: CleanupCandidateSpec): Promise<string[]> {
        if (!this.options.afterDelete?.[spec.key] || !spec.childKind) return [];
        const rel = this.rel(spec);
        if (await fs.isLink(rel)) return [];
        return spec.childKind === 'dir' ? fs.listDirs(rel) : fs.listFiles(rel);
    }

    /** 候補の削除後の処理を実行し、片付けきれなかった子要素名を返す。処理が失敗した場合はログを残して候補キーを返す。 */
    private async runAfterDelete(
        spec: CleanupCandidateSpec,
        env: AgentEnvironment,
        probe: CleanupProbe,
        names: readonly string[],
        failedPaths: string[]
    ): Promise<string[]> {
        const afterDelete = this.options.afterDelete?.[spec.key];
        if (!afterDelete || names.length === 0) return [];
        try {
            return await afterDelete(env, probe, names, failedPaths);
        } catch (error) {
            console.error(`Failed to finish deleting ${spec.key} (${JSON.stringify(env)}):`, error);
            return [spec.key];
        }
    }

    /** 画面から渡された子要素名の配列を検証し、文字列だけを残す（ハンドラーは名前の中の識別子で特定する）。 */
    private safeNames(value: unknown): string[] {
        return Array.isArray(value) ? value.filter((name): name is string => typeof name === 'string') : [];
    }

    async deleteSelected(env: AgentEnvironment, selection: CleanupSelection): Promise<CleanupEnvReport> {
        const fs = this.fsFor(env);
        const probe = createCleanupProbe(env, this.detector);
        // 削除しようとして削除できなかった対象
        const skipped: string[] = [];
        // OS のファイルロックなどで削除できずに残ったパス
        const failedPaths: string[] = [];
        const approvedOf = (key: string) => this.safeNames(selection.approvedChildren?.[key]);
        for (const key of selection.dirs) {
            if (!this.validKeys.has(key)) continue;
            const spec = this.options.candidates.find(candidate => candidate.key === key);
            if (!spec) continue;
            const handler = this.handlerFor(spec);
            if (handler) {
                skipped.push(...(await removeHandled(handler, key, env, 'all', approvedOf(key), failedPaths)));
                continue;
            }
            const resolver = this.resolverFor(spec);
            if (resolver) {
                skipped.push(...(await deleteResolvedChildren(resolver, probe, key, env, 'all', failedPaths)));
                continue;
            }
            const rel = this.rel(spec);
            if (spec.lockFile && (await this.isLockHeld(probe, rel))) {
                skipped.push(key);
                continue;
            }
            const childNames = await this.childNamesForAfterDelete(fs, spec);
            const [removed] = await removeHomeTargets(
                probe,
                env,
                [{ rel, type: spec.kind === 'file' ? 'file' : 'dir' }],
                failedPaths
            );
            if (!removed) skipped.push(key);
            skipped.push(...(await this.runAfterDelete(spec, env, probe, childNames, failedPaths)));
        }
        for (const spec of this.options.candidates) {
            if (!spec.expandable || !spec.childKind || selection.dirs.includes(spec.key)) continue;
            const selected = selection.childSelections?.[spec.key] ?? [];
            if (selected.length === 0) continue;
            const handler = this.handlerFor(spec);
            if (handler) {
                skipped.push(
                    ...(await removeHandled(handler, spec.key, env, selected, approvedOf(spec.key), failedPaths))
                );
                continue;
            }
            const resolver = this.resolverFor(spec);
            if (resolver) {
                skipped.push(...(await deleteResolvedChildren(resolver, probe, spec.key, env, selected, failedPaths)));
                continue;
            }
            const base = this.rel(spec);
            const existing = new Set(
                (await fs.isLink(base))
                    ? []
                    : spec.childKind === 'dir'
                      ? await fs.listDirs(base)
                      : await fs.listFiles(base)
            );
            // パスの 1 セグメントとして扱えない名前は削除せず、消せなかったものとして報告する。
            const names = selected.filter(name => isSafePathSegment(name) && existing.has(name));
            skipped.push(...selected.filter(name => !isSafePathSegment(name)));
            const removed = await removeHomeTargets(
                probe,
                env,
                names.map(name => ({ rel: `${base}/${name}`, type: spec.childKind === 'file' ? 'file' : 'dir' })),
                failedPaths
            );
            names.forEach((name, i) => {
                if (!removed[i]) skipped.push(name);
            });
            skipped.push(...(await this.runAfterDelete(spec, env, probe, names, failedPaths)));
        }
        const report = await this.scan(env);
        if (skipped.length > 0) report.skipped = skipped;
        if (failedPaths.length > 0) report.failedPaths = failedPaths;
        return report;
    }
}
