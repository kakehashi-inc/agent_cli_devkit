import React from 'react';
import type { AgentEnvironment } from '@shared/agents/types';
import type { ProfileApi } from '@shared/agents/profile/types';
import type { Notify } from '../agent/types';
import { useProfileSpec, useProfileVersions, type ProfileContext } from './profileContext';
import { ProfileTabBody } from './ProfileTabBody';
import { SectionFailure, SectionLoading } from './ProfileSectionParts';

interface Props {
    agentId: string;
    env: AgentEnvironment;
    api: ProfileApi;
    notify: Notify;
    // エージェントの定義の assetTabs のタブの ID。
    tabId: string;
    // 更新のたびに変わる値。
    reloadNonce?: number;
}

/** エージェントの定義の assetTabs のタブの中身を表示する。定義を読めないときと、定義にタブが無いときは理由を表示する。 */
export const ProfileAssetTab: React.FC<Props> = ({ agentId, env, api, notify, tabId, reloadNonce = 0 }) => {
    const { spec, failed } = useProfileSpec(api);
    const versions = useProfileVersions(spec?.settingsDoc);
    const tab = spec?.assetTabs.find(item => item.id === tabId);
    if (failed || (spec && !tab)) return <SectionFailure data={{ kind: 'failed', message: 'read-failed' }} />;
    if (!tab) return <SectionLoading />;
    const ctx: ProfileContext = {
        agentId,
        env,
        api,
        notify,
        reloadNonce,
        versionOf: versions.versionOf,
        onChanged: versions.onChanged,
    };
    return <ProfileTabBody tab={tab} ctx={ctx} />;
};
