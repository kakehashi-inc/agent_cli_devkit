import { shell } from 'electron';
import { existsSync } from 'fs';
import type { AssetOpResult } from '../../../../shared/agents/types';

/**
 * OS 標準のファイルマネージャーで Agent・Skill の実パスを表示する。
 * スキルはディレクトリを開き、エージェントは親ディレクトリ内でファイルを選択表示する。
 */
export async function revealAssetPath(targetPath: string, isDirectory: boolean): Promise<AssetOpResult> {
    if (!existsSync(targetPath)) {
        return { ok: false, message: 'not-found' };
    }

    try {
        if (isDirectory) {
            const error = await shell.openPath(targetPath);
            return error ? { ok: false, message: 'open-failed' } : { ok: true };
        }

        shell.showItemInFolder(targetPath);
        return { ok: true };
    } catch {
        return { ok: false, message: 'open-failed' };
    }
}
