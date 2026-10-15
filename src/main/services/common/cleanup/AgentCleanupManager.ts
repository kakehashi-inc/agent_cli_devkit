import type {
    AgentEnvironment,
    CleanupCandidate,
    CleanupCandidateSpec,
    CleanupChild,
    CleanupEnvReport,
    CleanupSelection,
    OSType,
} from '../../../../shared/agents/types';
import { HomeFs } from '../wsl/HomeFs';
import { WslDetector } from '../wsl/WslDetector';
import { createCleanupProbe, type CleanupProbe } from './CleanupProbe';
import { listHandled, removeHandled, type CleanupHandler } from './handledCleanup';
import {
    deleteResolvedChildren,
    homePath,
    resolveChildren,
    toResolvedCandidate,
    type CleanupResolver,
} from './resolvedCleanup';

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
}

/**
 * agent の公式ホーム配下に限定した宣言的クリーンアップ。
 * resolvers を指定した候補は、ホーム外を含めてリゾルバが特定した子要素だけを扱う。
 * handlers を指定した候補は、ハンドラーが子要素の一覧と削除を行う（CLI 経由の削除など）。
 * その子要素は走査のたびにハンドラーで一覧し、一覧できなかった場合は対象なしとして扱う。
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

    async scan(env: AgentEnvironment): Promise<CleanupEnvReport> {
        const fs = this.fsFor(env);
        const probe = createCleanupProbe(env, this.detector);
        const candidates: CleanupCandidate[] = [];
        for (const spec of this.options.candidates) {
            const handler = this.handlerFor(spec);
            if (handler) {
                candidates.push(toResolvedCandidate(spec, await listHandled(handler, spec.key, env)));
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
            candidates.push(candidate);
        }
        return {
            env,
            label: env.kind === 'wsl' ? (env.distro ?? 'WSL') : this.nativeLabel(),
            candidates,
        };
    }

    private safeName(name: string): boolean {
        return name.trim().length > 0 && !name.includes('/') && !name.includes('\\') && !name.includes('..');
    }

    async deleteSelected(env: AgentEnvironment, selection: CleanupSelection): Promise<CleanupEnvReport> {
        const fs = this.fsFor(env);
        const probe = createCleanupProbe(env, this.detector);
        const skipped: string[] = [];
        for (const key of selection.dirs) {
            if (!this.validKeys.has(key)) continue;
            const spec = this.options.candidates.find(candidate => candidate.key === key);
            if (!spec) continue;
            const handler = this.handlerFor(spec);
            if (handler) {
                skipped.push(...(await removeHandled(handler, key, env, 'all')));
                continue;
            }
            const resolver = this.resolverFor(spec);
            if (resolver) {
                skipped.push(...(await deleteResolvedChildren(resolver, probe, key, env, 'all')));
                continue;
            }
            try {
                const rel = this.rel(spec);
                if (spec.lockFile && (await this.isLockHeld(probe, rel))) skipped.push(key);
                else if (spec.kind === 'file') await fs.deleteFile(rel);
                else if (!(await fs.removeDirBestEffort(rel)).removedAll) skipped.push(key);
            } catch (error) {
                console.error(`Failed to clean ${key} (${JSON.stringify(env)}):`, error);
                skipped.push(key);
            }
        }
        for (const spec of this.options.candidates) {
            if (!spec.expandable || !spec.childKind || selection.dirs.includes(spec.key)) continue;
            const selected = selection.childSelections?.[spec.key] ?? [];
            if (selected.length === 0) continue;
            const handler = this.handlerFor(spec);
            if (handler) {
                skipped.push(...(await removeHandled(handler, spec.key, env, selected)));
                continue;
            }
            const resolver = this.resolverFor(spec);
            if (resolver) {
                skipped.push(...(await deleteResolvedChildren(resolver, probe, spec.key, env, selected)));
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
            for (const name of selected) {
                if (!this.safeName(name) || !existing.has(name)) continue;
                try {
                    if (spec.childKind === 'file') await fs.deleteFile(`${base}/${name}`);
                    else if (!(await fs.removeDirBestEffort(`${base}/${name}`)).removedAll) skipped.push(name);
                } catch (error) {
                    console.error(`Failed to clean ${spec.key}/${name} (${JSON.stringify(env)}):`, error);
                    skipped.push(name);
                }
            }
        }
        const report = await this.scan(env);
        if (skipped.length > 0) report.skipped = skipped;
        return report;
    }
}
