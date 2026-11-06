import { ipcMain } from 'electron';
import { CODEX_CONFIG_CHANNELS } from '../../../shared/agents/codex/constants';
import { CodexEnvironment, SettingsValues } from '../../../shared/agents/codex/types';
import { CodexConfigManager } from '../../services/codex/CodexConfigManager';

/**
 * Codex 設定（~/.codex/config.toml）管理の IPC ハンドラを登録する。
 */
export function registerCodexConfigHandlers(manager: CodexConfigManager): void {
    ipcMain.handle(CODEX_CONFIG_CHANNELS.GET_ENVIRONMENTS, (_, refresh: unknown) => {
        return manager.getEnvironments(refresh === true);
    });

    ipcMain.handle(CODEX_CONFIG_CHANNELS.READ, (_, env: CodexEnvironment) => {
        return manager.read(env);
    });

    ipcMain.handle(CODEX_CONFIG_CHANNELS.READ_RAW, (_, env: CodexEnvironment) => {
        return manager.readRaw(env);
    });

    ipcMain.handle(
        CODEX_CONFIG_CHANNELS.WRITE,
        (_, env: CodexEnvironment, values: SettingsValues, base: SettingsValues) => {
            return manager.write(env, values, base);
        }
    );

    ipcMain.handle(
        CODEX_CONFIG_CHANNELS.WRITE_RAW,
        (_, env: CodexEnvironment, rawToml: string, baseRevision: string) => {
            return manager.writeRaw(env, rawToml, baseRevision);
        }
    );
}
