import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AgentEnvironment } from '@shared/agents/types';
import type { AgentProfileSpec, ProfileApi, ProfileSectionSpec } from '@shared/agents/profile/types';
import type { Notify } from '../agent/types';

/** section の表示に必要な、環境と再読込の情報。 */
export interface ProfileContext {
    agentId: string;
    env: AgentEnvironment;
    api: ProfileApi;
    notify: Notify;
    // 更新ボタンを押すたびに変わる値。
    reloadNonce: number;
    // section が読むファイルが保存されるたびに変わる値を返す。
    versionOf(section: ProfileSectionSpec): number;
    // section がファイルを保存したことを伝える。
    onChanged(section: ProfileSectionSpec): void;
}

export interface ProfileSectionProps<S extends ProfileSectionSpec = ProfileSectionSpec> {
    section: S;
    ctx: ProfileContext;
}

const docKey = (doc: string) => `doc:${doc}`;
const collectionKey = (id: string) => `collection:${id}`;
const sectionKey = (id: string) => `section:${id}`;

/** section が書くファイルの再読込の単位を返す。 */
function writeKeysOf(section: ProfileSectionSpec): string[] {
    switch (section.kind) {
        case 'scopedEditor':
        case 'commandFields':
        case 'orderedLists':
            return [docKey(section.doc)];
        case 'fileCollection':
            return [collectionKey(section.collection.id)];
        case 'hookOverview':
            return [
                sectionKey(section.id),
                ...section.sources.flatMap(source => {
                    if ('doc' in source) return [docKey(source.doc)];
                    return 'collection' in source ? [collectionKey(source.collection.id)] : [];
                }),
            ];
        default:
            return [sectionKey(section.id)];
    }
}

/** section が読むファイルの再読込の単位を返す。 */
function readKeysOf(section: ProfileSectionSpec): string[] {
    const keys = [...writeKeysOf(section)];
    for (const notice of section.conditionalNotices ?? []) {
        if (notice.when.kind === 'docPath') keys.push(docKey(notice.when.doc));
        if (notice.when.kind === 'keysShadowedByCollections') {
            keys.push(docKey(notice.when.doc), ...notice.when.collections.map(collectionKey));
        }
    }
    if (section.kind === 'fileCollection') keys.push(...(section.collection.shadowedBy ?? []).map(collectionKey));
    return [...new Set(keys)];
}

/** 文書と一覧ごとの保存の回数を持ち、section の再読込の値を作る。 */
export function useProfileVersions(settingsDoc: string | undefined) {
    const [versions, setVersions] = useState<Record<string, number>>({});
    // 設定タブ以外の section が設定ファイルを保存した回数。
    const [settingsDocVersion, setSettingsDocVersion] = useState(0);

    const versionOf = useCallback(
        (section: ProfileSectionSpec) => readKeysOf(section).reduce((sum, key) => sum + (versions[key] ?? 0), 0),
        [versions]
    );
    const bump = useCallback((keys: readonly string[]) => {
        setVersions(previous => {
            const next = { ...previous };
            for (const key of keys) next[key] = (next[key] ?? 0) + 1;
            return next;
        });
    }, []);
    const onChanged = useCallback(
        (section: ProfileSectionSpec) => {
            const keys = writeKeysOf(section);
            bump(keys);
            if (settingsDoc !== undefined && keys.includes(docKey(settingsDoc))) {
                setSettingsDocVersion(value => value + 1);
            }
        },
        [bump, settingsDoc]
    );
    const onSettingsSaved = useCallback(() => {
        if (settingsDoc !== undefined) bump([docKey(settingsDoc)]);
    }, [bump, settingsDoc]);

    return useMemo(
        () => ({ versionOf, onChanged, onSettingsSaved, settingsDocVersion }),
        [versionOf, onChanged, onSettingsSaved, settingsDocVersion]
    );
}

/** エージェントのプロファイル設定の定義を読み込む。spec は読み込みの前と失敗したときは null で、failed は失敗を表す。 */
export function useProfileSpec(api: ProfileApi | undefined): { spec: AgentProfileSpec | null; failed: boolean } {
    const [state, setState] = useState<{
        owner: ProfileApi | undefined;
        spec: AgentProfileSpec | null;
        failed: boolean;
    }>({ owner: api, spec: null, failed: false });
    // 別のエージェントの定義を描画しないよう、api が変わったら読み込みの前の状態へ戻す。
    if (state.owner !== api) setState({ owner: api, spec: null, failed: false });
    useEffect(() => {
        if (!api) return undefined;
        let cancelled = false;
        api.getSpec()
            .then(result => {
                if (!cancelled) setState({ owner: api, spec: result, failed: false });
            })
            .catch((error: unknown) => {
                console.error('Failed to load the profile tab definition:', error);
                if (!cancelled) setState({ owner: api, spec: null, failed: true });
            });
        return () => {
            cancelled = true;
        };
    }, [api]);
    return { spec: state.spec, failed: state.failed };
}
