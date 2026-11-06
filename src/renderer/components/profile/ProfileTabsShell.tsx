import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Paper, Tab, Tabs } from '@mui/material';
import type { AgentEnvironment } from '@shared/agents/types';
import type { ProfileApi } from '@shared/agents/profile/types';
import type { Notify } from '../agent/types';
import type { SettingsTabContext } from '../settings/settingsTabContext';
import { useProfileSpec, useProfileVersions, type ProfileContext } from './profileContext';
import { ProfileTabBody } from './ProfileTabBody';

// 設定の表を表示するタブの ID。
const SETTINGS_TAB_ID = 'settings';

interface Props {
    agentId: string;
    env: AgentEnvironment;
    api: ProfileApi;
    notify: Notify;
    // 更新ボタンを押すたびに変わる値。
    reloadNonce: number;
    // 選択中のタブの ID。未選択や定義にない ID なら先頭のタブを表示する。
    tab: string | undefined;
    onTabChange: (tabId: string) => void;
    renderSettings: (context: SettingsTabContext) => React.ReactNode;
}

/**
 * 1 環境分の設定画面のタブ。タブの一覧はエージェントの定義から受け取る。
 * 一度開いたタブは表示を消すだけでマウントしたままにするので、未保存の編集はタブの切り替えで失われない。
 * タブの定義を読めなければ、設定のタブだけを表示する。
 */
export const ProfileTabsShell: React.FC<Props> = ({
    agentId,
    env,
    api,
    notify,
    reloadNonce,
    tab,
    onTabChange,
    renderSettings,
}) => {
    const { t } = useTranslation();
    const { spec } = useProfileSpec(api);
    const tabs = useMemo(() => spec?.settingsTabs ?? [], [spec]);
    const versions = useProfileVersions(spec?.settingsDoc);
    const current = tab !== undefined && tabs.some(item => item.id === tab) ? tab : (tabs[0]?.id ?? SETTINGS_TAB_ID);
    const [visited, setVisited] = useState<ReadonlySet<string>>(() => new Set([current]));
    if (!visited.has(current)) setVisited(new Set([...visited, current]));

    const ctx: ProfileContext = {
        agentId,
        env,
        api,
        notify,
        reloadNonce,
        versionOf: versions.versionOf,
        onChanged: versions.onChanged,
    };
    const settingsContext: SettingsTabContext = {
        selectTab: onTabChange,
        docVersion: versions.settingsDocVersion,
        reloadNonce,
        onSaved: versions.onSettingsSaved,
    };

    const ids = tabs.length > 0 ? tabs.map(item => item.id) : [SETTINGS_TAB_ID];

    return (
        <Paper variant='outlined' sx={{ mb: 3 }}>
            {tabs.length > 1 && (
                <Tabs
                    value={current}
                    onChange={(_, value: string) => onTabChange(value)}
                    variant='scrollable'
                    scrollButtons='auto'
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    {tabs.map(item => (
                        <Tab key={item.id} value={item.id} label={t(`${agentId}.profile.tab.${item.id}`)} />
                    ))}
                </Tabs>
            )}
            <Box sx={{ p: 2 }}>
                {ids
                    .filter(id => visited.has(id))
                    .map(id => {
                        const definition = tabs.find(item => item.id === id);
                        return (
                            <Box key={id} sx={{ display: id === current ? 'block' : 'none' }}>
                                {id === SETTINGS_TAB_ID || !definition ? (
                                    renderSettings(settingsContext)
                                ) : (
                                    <ProfileTabBody tab={definition} ctx={ctx} />
                                )}
                            </Box>
                        );
                    })}
            </Box>
        </Paper>
    );
};
