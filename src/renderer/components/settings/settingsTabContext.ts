import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { SettingsFieldSpec, SettingsFieldValue, SettingsValues } from '@shared/agents/types';

/** 設定タブの表示に必要な、タブの切り替えと再読込の情報。 */
export interface SettingsTabContext {
    // 同じ環境の別のタブへ切り替える。
    selectTab(tabId: string): void;
    // 別のタブが設定ファイルを保存するたびに変わる値。
    docVersion: number;
    // 更新ボタンを押すたびに変わる値。
    reloadNonce: number;
    // 設定ファイルを保存したことを伝える。
    onSaved(): void;
}

/** 項目の編集先へのリンクの文言と操作を返す関数を作る。linkTab と linkRoute のない項目は空を返す。 */
export function useSettingsFieldLink(
    agentId: string,
    selectTab: ((tabId: string) => void) | undefined
): (field: SettingsFieldSpec) => { linkLabel?: string; onLink?: () => void } {
    const { t } = useTranslation();
    const navigate = useNavigate();
    return field => {
        const { linkRoute, linkTab } = field;
        if (linkRoute !== undefined) {
            return {
                linkLabel: t(`${agentId}.profile.link.${field.key}`),
                onLink: () => void navigate(linkRoute),
            };
        }
        if (linkTab !== undefined && selectTab) {
            return {
                linkLabel: t('common.profile.linkTo', { tab: t(`${agentId}.profile.tab.${linkTab}`) }),
                onLink: () => selectTab(linkTab),
            };
        }
        return {};
    };
}

/** 未保存の編集を、読み直した値に重ねる。編集していない項目と discard の項目は読み直した値にする。 */
export function overlayUnsavedValues(
    fields: readonly SettingsFieldSpec[],
    edited: Readonly<Record<string, SettingsFieldValue>>,
    original: Readonly<Record<string, SettingsFieldValue>>,
    next: Readonly<Record<string, SettingsFieldValue>>,
    discard: readonly string[] = []
): Record<string, SettingsFieldValue> {
    const merged: Record<string, SettingsFieldValue> = {};
    for (const { key } of fields) {
        merged[key] = discard.includes(key) || Object.is(edited[key], original[key]) ? next[key] : edited[key];
    }
    return merged;
}

/** 保存する項目の、読み込んだ時点の値を集める。 */
export function baseValuesOf(
    values: SettingsValues,
    original: Readonly<Record<string, SettingsFieldValue>>
): SettingsValues {
    return Object.fromEntries(Object.keys(values).map(key => [key, original[key]]));
}

/**
 * 設定の読み込みの方法。'replace' は読み込み中の表示を出して編集値を置き換え、'overlay' は表示を保ったまま未保存の編集を重ねる。
 */
export type SettingsLoadMode = 'replace' | 'overlay';

/** マウント時に 'replace' で読み込み、docVersion か reloadNonce が変わるたびに 'overlay' で読み直す。 */
export function useSettingsLoadEffect(
    load: (mode: SettingsLoadMode) => void | Promise<void>,
    docVersion: number | undefined,
    reloadNonce: number | undefined
): void {
    const latestLoad = useRef(load);
    const mounted = useRef(false);
    useEffect(() => {
        latestLoad.current = load;
    });
    useEffect(() => {
        const mode: SettingsLoadMode = mounted.current ? 'overlay' : 'replace';
        mounted.current = true;
        void latestLoad.current(mode);
    }, [docVersion, reloadNonce]);
}
