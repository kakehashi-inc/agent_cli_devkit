import { ipcMain } from 'electron';
import { CODEX_CLEANUP_CHANNELS } from '../../../shared/agents/codex/constants';
import { CodexEnvironment, CleanupSelection, OtherCleanupSelection } from '../../../shared/agents/codex/types';
import { CodexCleanupManager } from '../../services/codex/CodexCleanupManager';

export function registerCodexCleanupHandlers(manager: CodexCleanupManager): void {
    ipcMain.handle(CODEX_CLEANUP_CHANNELS.GET_ENVIRONMENTS, () => {
        return manager.getEnvironments();
    });

    ipcMain.handle(CODEX_CLEANUP_CHANNELS.SCAN, (_, env: CodexEnvironment) => {
        return manager.scan(env);
    });

    ipcMain.handle(CODEX_CLEANUP_CHANNELS.DELETE, (_, env: CodexEnvironment, selection: CleanupSelection) => {
        return manager.deleteSelected(env, selection);
    });

    ipcMain.handle(CODEX_CLEANUP_CHANNELS.GET_OTHER_ENVIRONMENTS, () => {
        return manager.getOtherEnvironments();
    });

    ipcMain.handle(CODEX_CLEANUP_CHANNELS.SCAN_OTHER, (_, env: CodexEnvironment) => {
        return manager.scanOther(env);
    });

    ipcMain.handle(
        CODEX_CLEANUP_CHANNELS.DELETE_OTHER,
        (_, env: CodexEnvironment, selection: OtherCleanupSelection) => {
            return manager.deleteOther(env, selection);
        }
    );
}
