import type { ProfileApi } from './types';

// ProfileApi のメソッドごとの IPC チャンネル名。
export type ProfileChannels = Record<keyof ProfileApi, string>;

/** エージェントのプロファイル設定の IPC チャンネル名（`<agentId>-profile:<op>`）を返す。 */
export function profileChannels(agentId: string): ProfileChannels {
    const channel = (op: string) => `${agentId}-profile:${op}`;
    return {
        getSpec: channel('get-spec'),
        readSection: channel('read-section'),
        saveScoped: channel('save-scoped'),
        saveCommandFields: channel('save-command-fields'),
        saveLists: channel('save-lists'),
        readFixedFile: channel('read-fixed-file'),
        saveFixedFile: channel('save-fixed-file'),
        deleteFixedFile: channel('delete-fixed-file'),
        mergeFixedFileVariants: channel('merge-fixed-file-variants'),
        setHookEnabled: channel('set-hook-enabled'),
        readHookEntry: channel('read-hook-entry'),
        readHookSourceFile: channel('read-hook-source-file'),
        saveHookSourceFile: channel('save-hook-source-file'),
        readHookTemplate: channel('read-hook-template'),
        saveHookEntry: channel('save-hook-entry'),
        addHookEntry: channel('add-hook-entry'),
        deleteHookEntry: channel('delete-hook-entry'),
        listCollection: channel('list-collection'),
        readEntry: channel('read-entry'),
        saveEntry: channel('save-entry'),
        createEntry: channel('create-entry'),
        deleteEntries: channel('delete-entries'),
        revealEntry: channel('reveal-entry'),
        download: channel('download'),
        inspectUpload: channel('inspect-upload'),
        upload: channel('upload'),
    };
}
