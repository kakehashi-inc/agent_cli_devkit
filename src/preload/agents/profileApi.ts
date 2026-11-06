import { ipcRenderer } from 'electron';
import type { ProfileChannels } from '../../shared/agents/profile/channels';
import type { ProfileApi } from '../../shared/agents/profile/types';

/** チャンネル名の組から、プロファイル設定の IPC を呼び出す API を作る。 */
export function createProfileApi(channels: ProfileChannels): ProfileApi {
    return {
        getSpec: () => ipcRenderer.invoke(channels.getSpec),
        readSection: (env, sectionId, options) => ipcRenderer.invoke(channels.readSection, env, sectionId, options),
        saveScoped: (env, sectionId, text, baseRevision, confirmed) =>
            ipcRenderer.invoke(channels.saveScoped, env, sectionId, text, baseRevision, confirmed),
        saveCommandFields: (env, sectionId, values, base, confirmed) =>
            ipcRenderer.invoke(channels.saveCommandFields, env, sectionId, values, base, confirmed),
        saveLists: (env, sectionId, lists, base, confirmed) =>
            ipcRenderer.invoke(channels.saveLists, env, sectionId, lists, base, confirmed),
        readFixedFile: (env, sectionId, fileKey) => ipcRenderer.invoke(channels.readFixedFile, env, sectionId, fileKey),
        saveFixedFile: (env, sectionId, fileKey, text, baseRevision, confirmed) =>
            ipcRenderer.invoke(channels.saveFixedFile, env, sectionId, fileKey, text, baseRevision, confirmed),
        deleteFixedFile: (env, sectionId, fileKey, baseRevision, confirmed) =>
            ipcRenderer.invoke(channels.deleteFixedFile, env, sectionId, fileKey, baseRevision, confirmed),
        mergeFixedFileVariants: (env, sectionId, fileKey, baseRevision, confirmed) =>
            ipcRenderer.invoke(channels.mergeFixedFileVariants, env, sectionId, fileKey, baseRevision, confirmed),
        setHookEnabled: (env, sectionId, hookName, enabled, baseRevision, confirmed) =>
            ipcRenderer.invoke(channels.setHookEnabled, env, sectionId, hookName, enabled, baseRevision, confirmed),
        readHookEntry: (env, sectionId, locator) => ipcRenderer.invoke(channels.readHookEntry, env, sectionId, locator),
        readHookSourceFile: (env, sectionId, source) =>
            ipcRenderer.invoke(channels.readHookSourceFile, env, sectionId, source),
        saveHookSourceFile: (env, sectionId, source, text, baseRevision, confirmed) =>
            ipcRenderer.invoke(channels.saveHookSourceFile, env, sectionId, source, text, baseRevision, confirmed),
        readHookTemplate: (env, sectionId, addition) =>
            ipcRenderer.invoke(channels.readHookTemplate, env, sectionId, addition),
        saveHookEntry: (env, sectionId, locator, text, baseRevision, confirmed) =>
            ipcRenderer.invoke(channels.saveHookEntry, env, sectionId, locator, text, baseRevision, confirmed),
        addHookEntry: (env, sectionId, addition, text, baseRevision, confirmed) =>
            ipcRenderer.invoke(channels.addHookEntry, env, sectionId, addition, text, baseRevision, confirmed),
        deleteHookEntry: (env, sectionId, locator, baseRevision, confirmed) =>
            ipcRenderer.invoke(channels.deleteHookEntry, env, sectionId, locator, baseRevision, confirmed),
        listCollection: (env, sectionId) => ipcRenderer.invoke(channels.listCollection, env, sectionId),
        readEntry: (env, sectionId, relPath) => ipcRenderer.invoke(channels.readEntry, env, sectionId, relPath),
        saveEntry: (env, sectionId, relPath, text, baseRevision, confirmed) =>
            ipcRenderer.invoke(channels.saveEntry, env, sectionId, relPath, text, baseRevision, confirmed),
        createEntry: (env, sectionId, relPath, text, confirmed) =>
            ipcRenderer.invoke(channels.createEntry, env, sectionId, relPath, text, confirmed),
        deleteEntries: (env, sectionId, relPaths, confirmed) =>
            ipcRenderer.invoke(channels.deleteEntries, env, sectionId, relPaths, confirmed),
        revealEntry: (env, sectionId, relPath) => ipcRenderer.invoke(channels.revealEntry, env, sectionId, relPath),
        download: (env, sectionId, relPaths) => ipcRenderer.invoke(channels.download, env, sectionId, relPaths),
        inspectUpload: (env, sectionId) => ipcRenderer.invoke(channels.inspectUpload, env, sectionId),
        upload: (env, sectionId, srcPath, overwrite, confirmed) =>
            ipcRenderer.invoke(channels.upload, env, sectionId, srcPath, overwrite, confirmed),
    };
}
