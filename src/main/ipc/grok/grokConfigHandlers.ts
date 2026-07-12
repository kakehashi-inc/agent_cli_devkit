import { ipcMain } from 'electron';
import { GROK_CONFIG_CHANNELS } from '../../../shared/agents/grok/constants';
import { GrokEnvironment, SettingsValues } from '../../../shared/agents/grok/types';
import { GrokConfigManager } from '../../services/grok/GrokConfigManager';

/**
 * Grok 設定（~/.grok/config.toml）管理の IPC ハンドラを登録する。
 */
export function registerGrokConfigHandlers(manager: GrokConfigManager): void {
    ipcMain.handle(GROK_CONFIG_CHANNELS.GET_ENVIRONMENTS, () => {
        return manager.getEnvironments();
    });

    ipcMain.handle(GROK_CONFIG_CHANNELS.READ, (_, env: GrokEnvironment) => {
        return manager.read(env);
    });

    ipcMain.handle(GROK_CONFIG_CHANNELS.WRITE, (_, env: GrokEnvironment, values: SettingsValues) => {
        return manager.write(env, values);
    });

    ipcMain.handle(GROK_CONFIG_CHANNELS.WRITE_RAW, (_, env: GrokEnvironment, rawToml: string) => {
        return manager.writeRaw(env, rawToml);
    });
}
