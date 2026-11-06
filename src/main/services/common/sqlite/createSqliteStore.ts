import type { AgentEnvironment } from '../../../../shared/agents/types';
import type { WslDetector } from '../wsl/WslDetector';
import { NativeSqliteStore } from './nativeSqliteStore';
import type { SqliteStore } from './sqliteStore';
import { WslSqliteStore } from './wslSqliteStore';

/** 環境に対応するデータベースの読み書きの手段を作る。 */
export function createSqliteStore(env: AgentEnvironment, detector: WslDetector): SqliteStore {
    if (env.kind === 'wsl') {
        if (!env.distro) throw new Error('WSL environment requires a distro name');
        return new WslSqliteStore(env.distro, detector);
    }
    return new NativeSqliteStore();
}
