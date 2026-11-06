import { ipcMain, type BrowserWindow } from 'electron';
import type { ProfileChannels } from '../../../shared/agents/profile/channels';
import type { HookEntryAddition, HookEntryLocator } from '../../../shared/agents/profile/types';
import type { AgentEnvironment } from '../../../shared/agents/types';
import type { ProfileManager } from '../../services/common/profile/ProfileManager';

/**
 * エージェントのプロファイル設定の IPC ハンドラを登録する。
 * ダウンロードとアップロードのダイアログに親ウィンドウが必要なため、現在のウィンドウを返す getter を受け取る。
 */
export function registerProfileHandlers(
    channels: ProfileChannels,
    manager: ProfileManager,
    getMainWindow: () => BrowserWindow | null
): void {
    ipcMain.handle(channels.getSpec, () => manager.getSpec());
    ipcMain.handle(
        channels.readSection,
        (_, env: AgentEnvironment, sectionId: string, options?: { reveal?: boolean }) =>
            manager.readSection(env, sectionId, options)
    );
    ipcMain.handle(
        channels.saveScoped,
        (_, env: AgentEnvironment, sectionId: string, text: string, baseRevision: string, confirmed?: boolean) =>
            manager.saveScoped(env, sectionId, text, baseRevision, confirmed === true)
    );
    ipcMain.handle(
        channels.saveCommandFields,
        (
            _,
            env: AgentEnvironment,
            sectionId: string,
            values: Record<string, string | null>,
            base: Record<string, string>,
            confirmed?: boolean
        ) => manager.saveCommandFields(env, sectionId, values, base, confirmed === true)
    );
    ipcMain.handle(
        channels.saveLists,
        (
            _,
            env: AgentEnvironment,
            sectionId: string,
            lists: Record<string, string[] | null>,
            base: Record<string, string>,
            confirmed?: boolean
        ) => manager.saveLists(env, sectionId, lists, base, confirmed === true)
    );
    ipcMain.handle(channels.readFixedFile, (_, env: AgentEnvironment, sectionId: string, fileKey: string) =>
        manager.readFixedFile(env, sectionId, fileKey)
    );
    ipcMain.handle(
        channels.saveFixedFile,
        (
            _,
            env: AgentEnvironment,
            sectionId: string,
            fileKey: string,
            text: string,
            baseRevision: string,
            confirmed?: boolean
        ) => manager.saveFixedFile(env, sectionId, fileKey, text, baseRevision, confirmed === true)
    );
    ipcMain.handle(
        channels.deleteFixedFile,
        (_, env: AgentEnvironment, sectionId: string, fileKey: string, baseRevision: string, confirmed?: boolean) =>
            manager.deleteFixedFile(env, sectionId, fileKey, baseRevision, confirmed === true)
    );
    ipcMain.handle(
        channels.mergeFixedFileVariants,
        (_, env: AgentEnvironment, sectionId: string, fileKey: string, baseRevision: string, confirmed?: boolean) =>
            manager.mergeFixedFileVariants(env, sectionId, fileKey, baseRevision, confirmed === true)
    );
    ipcMain.handle(
        channels.setHookEnabled,
        (
            _,
            env: AgentEnvironment,
            sectionId: string,
            hookName: string,
            enabled: boolean,
            baseRevision: string,
            confirmed?: boolean
        ) => manager.setHookEnabled(env, sectionId, hookName, enabled, baseRevision, confirmed === true)
    );
    ipcMain.handle(channels.readHookEntry, (_, env: AgentEnvironment, sectionId: string, locator: HookEntryLocator) =>
        manager.readHookEntry(env, sectionId, locator)
    );
    ipcMain.handle(
        channels.readHookTemplate,
        (_, env: AgentEnvironment, sectionId: string, addition: HookEntryAddition) =>
            manager.readHookTemplate(env, sectionId, addition)
    );
    ipcMain.handle(
        channels.saveHookEntry,
        (
            _,
            env: AgentEnvironment,
            sectionId: string,
            locator: HookEntryLocator,
            text: string,
            baseRevision: string,
            confirmed?: boolean
        ) => manager.saveHookEntry(env, sectionId, locator, text, baseRevision, confirmed === true)
    );
    ipcMain.handle(channels.readHookSourceFile, (_, env: AgentEnvironment, sectionId: string, source: string) =>
        manager.readHookSourceFile(env, sectionId, source)
    );
    ipcMain.handle(
        channels.saveHookSourceFile,
        (
            _,
            env: AgentEnvironment,
            sectionId: string,
            source: string,
            text: string,
            baseRevision: string,
            confirmed?: boolean
        ) => manager.saveHookSourceFile(env, sectionId, source, text, baseRevision, confirmed === true)
    );
    ipcMain.handle(
        channels.addHookEntry,
        (
            _,
            env: AgentEnvironment,
            sectionId: string,
            addition: HookEntryAddition,
            text: string,
            baseRevision: string,
            confirmed?: boolean
        ) => manager.addHookEntry(env, sectionId, addition, text, baseRevision, confirmed === true)
    );
    ipcMain.handle(
        channels.deleteHookEntry,
        (
            _,
            env: AgentEnvironment,
            sectionId: string,
            locator: HookEntryLocator,
            baseRevision: string,
            confirmed?: boolean
        ) => manager.deleteHookEntry(env, sectionId, locator, baseRevision, confirmed === true)
    );
    ipcMain.handle(channels.listCollection, (_, env: AgentEnvironment, sectionId: string) =>
        manager.listCollection(env, sectionId)
    );
    ipcMain.handle(channels.readEntry, (_, env: AgentEnvironment, sectionId: string, relPath: string) =>
        manager.readEntry(env, sectionId, relPath)
    );
    ipcMain.handle(
        channels.saveEntry,
        (
            _,
            env: AgentEnvironment,
            sectionId: string,
            relPath: string,
            text: string,
            baseRevision: string,
            confirmed?: boolean
        ) => manager.saveEntry(env, sectionId, relPath, text, baseRevision, confirmed === true)
    );
    ipcMain.handle(
        channels.createEntry,
        (_, env: AgentEnvironment, sectionId: string, relPath: string, text: string, confirmed?: boolean) =>
            manager.createEntry(env, sectionId, relPath, text, confirmed === true)
    );
    ipcMain.handle(
        channels.deleteEntries,
        (_, env: AgentEnvironment, sectionId: string, relPaths: string[], confirmed?: boolean) =>
            manager.deleteEntries(env, sectionId, relPaths, confirmed === true)
    );
    ipcMain.handle(channels.revealEntry, (_, env: AgentEnvironment, sectionId: string, relPath: string) =>
        manager.revealEntry(env, sectionId, relPath)
    );
    ipcMain.handle(channels.download, (_, env: AgentEnvironment, sectionId: string, relPaths: string[]) =>
        manager.download(env, sectionId, relPaths, getMainWindow())
    );
    ipcMain.handle(channels.inspectUpload, (_, env: AgentEnvironment, sectionId: string) =>
        manager.inspectUpload(env, sectionId, getMainWindow())
    );
    ipcMain.handle(
        channels.upload,
        (_, env: AgentEnvironment, sectionId: string, srcPath: string, overwrite: boolean, confirmed?: boolean) =>
            manager.upload(env, sectionId, srcPath, overwrite, confirmed === true)
    );
}
