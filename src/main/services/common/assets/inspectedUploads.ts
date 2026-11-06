import type { AgentEnvironment } from '../../../../shared/agents/types';

/**
 * ファイル選択ダイアログで選ばれたファイルを、環境と取り込み先ごとに覚える。
 * 取り込みは、ここに覚えているファイルだけを受け付ける。
 */
export class InspectedUploads {
    private readonly sources = new Map<string, string>();

    private keyOf(env: AgentEnvironment, target: string): string {
        return JSON.stringify([env.kind, env.distro ?? '', target]);
    }

    remember(env: AgentEnvironment, target: string, source: string): void {
        this.sources.set(this.keyOf(env, target), source);
    }

    /** source が、この環境と取り込み先で最後に選ばれたファイルか。 */
    accepts(env: AgentEnvironment, target: string, source: unknown): source is string {
        return typeof source === 'string' && this.sources.get(this.keyOf(env, target)) === source;
    }

    forget(env: AgentEnvironment, target: string): void {
        this.sources.delete(this.keyOf(env, target));
    }
}
