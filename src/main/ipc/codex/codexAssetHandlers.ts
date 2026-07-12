import { BrowserWindow, ipcMain } from 'electron';
import { CODEX_ASSET_CHANNELS } from '../../../shared/agents/codex/constants';
import { AssetKind, CodexEnvironment } from '../../../shared/agents/codex/types';
import { CodexAssetManager } from '../../services/codex/CodexAssetManager';

/**
 * Codex Agent・Skill 管理の IPC ハンドラを登録する。
 * DL/UL のダイアログ表示に親ウィンドウが必要なため getter を受け取る。
 */
export function registerCodexAssetHandlers(
    manager: CodexAssetManager,
    getMainWindow: () => BrowserWindow | null
): void {
    ipcMain.handle(CODEX_ASSET_CHANNELS.GET_ENVIRONMENTS, () => {
        return manager.getEnvironments();
    });

    ipcMain.handle(CODEX_ASSET_CHANNELS.LIST, (_, env: CodexEnvironment, kind: AssetKind) => {
        return manager.list(env, kind);
    });

    ipcMain.handle(CODEX_ASSET_CHANNELS.DOWNLOAD, (_, env: CodexEnvironment, kind: AssetKind, relPaths: string[]) => {
        return manager.download(env, kind, relPaths, getMainWindow());
    });

    ipcMain.handle(CODEX_ASSET_CHANNELS.INSPECT_UPLOAD, (_, env: CodexEnvironment, kind: AssetKind) => {
        return manager.inspectUpload(env, kind, getMainWindow());
    });

    ipcMain.handle(
        CODEX_ASSET_CHANNELS.UPLOAD,
        (_, env: CodexEnvironment, kind: AssetKind, zipPath: string, overwrite: boolean) => {
            return manager.upload(env, kind, zipPath, overwrite);
        }
    );

    ipcMain.handle(
        CODEX_ASSET_CHANNELS.UPLOAD_FILE,
        (_, env: CodexEnvironment, kind: AssetKind, filePath: string, overwrite: boolean) => {
            return manager.uploadFile(env, kind, filePath, overwrite);
        }
    );

    ipcMain.handle(CODEX_ASSET_CHANNELS.DELETE, (_, env: CodexEnvironment, kind: AssetKind, relPaths: string[]) => {
        return manager.deleteSelected(env, kind, relPaths);
    });

    ipcMain.handle(CODEX_ASSET_CHANNELS.IS_GIT_AVAILABLE, () => {
        return manager.isGitAvailable();
    });

    ipcMain.handle(CODEX_ASSET_CHANNELS.LIST_OFFICIAL_SKILLS, () => {
        return manager.listOfficialSkills();
    });

    ipcMain.handle(CODEX_ASSET_CHANNELS.IMPORT_OFFICIAL_SKILLS, (_, env: CodexEnvironment, relPaths: string[]) => {
        return manager.importOfficialSkills(env, relPaths);
    });
}
