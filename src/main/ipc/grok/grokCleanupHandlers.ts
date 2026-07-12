import { ipcMain } from 'electron';
import { GROK_CLEANUP_CHANNELS } from '../../../shared/agents/grok/constants';
import { GrokEnvironment, CleanupSelection, OtherCleanupSelection } from '../../../shared/agents/grok/types';
import { GrokCleanupManager } from '../../services/grok/GrokCleanupManager';

export function registerGrokCleanupHandlers(manager: GrokCleanupManager): void {
    ipcMain.handle(GROK_CLEANUP_CHANNELS.GET_ENVIRONMENTS, () => {
        return manager.getEnvironments();
    });

    ipcMain.handle(GROK_CLEANUP_CHANNELS.SCAN, (_, env: GrokEnvironment) => {
        return manager.scan(env);
    });

    ipcMain.handle(GROK_CLEANUP_CHANNELS.DELETE, (_, env: GrokEnvironment, selection: CleanupSelection) => {
        return manager.deleteSelected(env, selection);
    });

    ipcMain.handle(GROK_CLEANUP_CHANNELS.GET_OTHER_ENVIRONMENTS, () => {
        return manager.getOtherEnvironments();
    });

    ipcMain.handle(GROK_CLEANUP_CHANNELS.SCAN_OTHER, (_, env: GrokEnvironment) => {
        return manager.scanOther(env);
    });

    ipcMain.handle(GROK_CLEANUP_CHANNELS.DELETE_OTHER, (_, env: GrokEnvironment, selection: OtherCleanupSelection) => {
        return manager.deleteOther(env, selection);
    });
}
