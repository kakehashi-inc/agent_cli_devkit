import { ipcMain } from 'electron';
import { UPDATER_CHANNELS } from '../../shared/constants';
import { checkForUpdates, downloadUpdate, getUpdateState, quitAndInstall } from '../services/updater';

export function registerUpdaterIpcHandlers() {
    ipcMain.handle(UPDATER_CHANNELS.GET_STATE, () => getUpdateState());
    ipcMain.handle(UPDATER_CHANNELS.CHECK, () => checkForUpdates());
    ipcMain.handle(UPDATER_CHANNELS.DOWNLOAD, () => downloadUpdate());
    ipcMain.handle(UPDATER_CHANNELS.QUIT_AND_INSTALL, () => {
        quitAndInstall();
    });
}
