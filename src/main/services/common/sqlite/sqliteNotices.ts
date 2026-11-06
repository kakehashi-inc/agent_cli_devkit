import type { CleanupBlock } from '../cleanup/handledCleanup';
import type { SqliteAvailability } from './sqliteStore';

/**
 * distro の sqlite3 を使えないときの、データベースを使う行の注記。使える環境と native は null。
 * prefix は文言のキーの先頭で、続けて missing、tooOld、checkFailed のどれかが付く。
 */
function sqliteNotice(availability: SqliteAvailability, prefix: string): CleanupBlock | null {
    switch (availability.kind) {
        case 'missing':
            return { noticeKey: `${prefix}.missing` };
        case 'too-old':
            return { noticeKey: `${prefix}.tooOld`, noticeParams: { version: availability.version } };
        case 'check-failed':
            return { noticeKey: `${prefix}.checkFailed` };
        default:
            return null;
    }
}

/** データベースが無いと使えない行の注記。 */
export function sqliteBlockedNotice(availability: SqliteAvailability): CleanupBlock | null {
    return sqliteNotice(availability, 'common.cleanupSqlite.blocked');
}

/** ファイルは消せてデータベースの行だけが残る行の注記。 */
export function sqliteFilesOnlyNotice(availability: SqliteAvailability): CleanupBlock | null {
    return sqliteNotice(availability, 'common.cleanupSqlite.filesOnly');
}
