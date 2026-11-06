/**
 * 表の保存の失敗の文言キーを返す。
 * namespace は agent の設定の文言の接頭辞（例: 'claude.settings'）、invalidExisting は既存のファイルが壊れていることを表すコード。
 */
export function tableSaveErrorKey(namespace: string, message: string | undefined, invalidExisting: string): string {
    if (message === 'read-failed') return 'common.settingsFile.saveReadFailed';
    if (message === invalidExisting) return `${namespace}.invalidExisting`;
    if (message === 'verify-failed') return `${namespace}.verifyFailed`;
    return `${namespace}.saveError`;
}

/**
 * 直接編集の保存の失敗の文言キーを返す。
 * invalidCode は入力の構文が正しくないことを表すコード、invalidKey はその文言のキー（namespace からの相対）。
 */
export function directSaveErrorKey(
    namespace: string,
    message: string | undefined,
    invalidCode: string,
    invalidKey: string
): string {
    if (message === 'read-failed') return 'common.settingsFile.saveReadFailed';
    if (message === invalidCode) return `${namespace}.${invalidKey}`;
    return `${namespace}.saveError`;
}
