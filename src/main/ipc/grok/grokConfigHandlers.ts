import { ipcMain } from 'electron';
import { GROK_CONFIG_CHANNELS } from '../../../shared/agents/grok/constants';
import { GrokEnvironment, SettingsValues } from '../../../shared/agents/grok/types';
import { GrokConfigManager } from '../../services/grok/GrokConfigManager';

/**
 * Grok 設定（~/.grok/config.toml）管理の IPC ハンドラを登録する。
 */
export function registerGrokConfigHandlers(manager: GrokConfigManager): void {
    ipcMain.handle(GROK_CONFIG_CHANNELS.GET_ENVIRONMENTS, (_, refresh: unknown) => {
        return manager.getEnvironments(refresh === true);
    });

    ipcMain.handle(GROK_CONFIG_CHANNELS.READ, (_, env: GrokEnvironment) => {
        return manager.read(env);
    });

    ipcMain.handle(GROK_CONFIG_CHANNELS.READ_RAW, (_, env: GrokEnvironment) => {
        return manager.readRaw(env);
    });

    ipcMain.handle(
        GROK_CONFIG_CHANNELS.WRITE,
        (_, env: GrokEnvironment, values: SettingsValues, base: SettingsValues) => {
            return manager.write(env, values, base);
        }
    );

    ipcMain.handle(GROK_CONFIG_CHANNELS.WRITE_RAW, (_, env: GrokEnvironment, rawToml: string, baseRevision: string) => {
        return manager.writeRaw(env, rawToml, baseRevision);
    });
}
