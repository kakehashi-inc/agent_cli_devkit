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

interface Options {
    baseRel: string;
    wslTest: string;
    candidates: CleanupCandidateSpec[];
}

/** agent の公式ホーム配下に限定した宣言的クリーンアップ。 */
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

    async getEnvironments(): Promise<{ env: AgentEnvironment; label: string }[]> {
        const result: { env: AgentEnvironment; label: string }[] = [
            { env: { kind: 'native' }, label: this.nativeLabel() },
        ];
        const distros = await this.detector.getDistrosWithTest(this.options.wslTest);
        for (const distro of distros)
            result.push({ env: { kind: 'wsl', distro: distro.distro }, label: distro.distro });
        return result;
    }

    async scan(env: AgentEnvironment): Promise<CleanupEnvReport> {
        const fs = this.fsFor(env);
        const candidates: CleanupCandidate[] = [];
        for (const spec of this.options.candidates) {
            const rel = this.rel(spec);
            const exists = await fs.exists(rel);
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
        const skipped: string[] = [];
        for (const key of selection.dirs) {
            if (!this.validKeys.has(key)) continue;
            const spec = this.options.candidates.find(candidate => candidate.key === key);
            if (!spec) continue;
            try {
                const rel = this.rel(spec);
                if (spec.kind === 'file') await fs.deleteFile(rel);
                else if (!(await fs.removeDirBestEffort(rel)).removedAll) skipped.push(key);
            } catch (error) {
                console.error(`Failed to clean ${key} (${JSON.stringify(env)}):`, error);
                skipped.push(key);
            }
        }
        for (const spec of this.options.candidates) {
            if (!spec.expandable || !spec.childKind || selection.dirs.includes(spec.key)) continue;
            const selected = selection.childSelections?.[spec.key] ?? [];
            const base = this.rel(spec);
            const existing = new Set(spec.childKind === 'dir' ? await fs.listDirs(base) : await fs.listFiles(base));
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
