import {
    CleaningServices as CleanupIcon,
    Extension as PluginIcon,
    Hub as HubIcon,
    Settings as SettingsIcon,
    SmartToy as AssetIcon,
} from '@mui/icons-material';
import { AssetManagerView } from '../../components/agent/AssetManagerView';
import { CleanupManagerView } from '../../components/agent/CleanupManagerView';
import { McpManagerView } from '../../components/agent/McpManagerView';
import { SettingsManagerView } from '../../components/agent/SettingsManagerView';
import { PluginManagerView } from '../../components/plugins/PluginManagerView';
import type { AssetKind } from '@shared/agents/types';
import type { FmColumn } from '../../components/assets/assetColumns';
import type { AgentModule } from '../types';

const api = window.agentCliDevkit.agy;

// エージェント一覧の列構成。モデル列（inherit / flash / pro。推論レベルの指定は無い）を持ち、
// 説明列の下に使えるツール・コマンド自動実行ポリシー・呼び出され方を補足表示する。
const ASSET_COLUMNS: Partial<Record<AssetKind, FmColumn[]>> = {
    agents: [
        { key: 'name', fit: true, maxWidthPct: 0.3 },
        { key: 'model', width: 90 },
        {
            key: 'description',
            flex: true,
            detailKeys: [
                'tools',
                { key: 'commandExecutionPolicy', defaultValue: 'sandbox' },
                { key: 'mainAgent', defaultValue: 'true' },
                { key: 'subagent', defaultValue: 'true' },
            ],
        },
    ],
};

export const agyModule: AgentModule = {
    id: 'agy',
    label: 'Agy',
    dashboardLabel: 'Agy（Antigravity CLI）',
    features: [
        {
            path: '/agy/mcp',
            titleKey: 'agy.mcp.title',
            navKey: 'agy.nav.mcp',
            descKey: 'agy.dashboard.mcpDesc',
            Icon: HubIcon,
            color: '#5b8def',
            element: <McpManagerView agentId='agy' api={api.mcp} />,
        },
        {
            path: '/agy/agent-skill',
            titleKey: 'agy.assets.title',
            navKey: 'agy.nav.assets',
            descKey: 'agy.dashboard.assetsDesc',
            Icon: AssetIcon,
            color: '#d98a3a',
            element: <AssetManagerView agentId='agy' api={api.asset} columns={ASSET_COLUMNS} />,
        },
        {
            path: '/agy/plugins',
            titleKey: 'agy.plugins.title',
            navKey: 'agy.nav.plugins',
            descKey: 'agy.dashboard.pluginsDesc',
            Icon: PluginIcon,
            color: '#c85f8d',
            element: (
                <PluginManagerView titleKey='agy.plugins.title' descKey='agy.plugins.description' api={api.plugin} />
            ),
        },
        {
            path: '/agy/settings',
            titleKey: 'agy.settings.title',
            navKey: 'agy.nav.settings',
            descKey: 'agy.dashboard.settingsDesc',
            Icon: SettingsIcon,
            color: '#8a6df0',
            element: <SettingsManagerView agentId='agy' api={api.settings} />,
        },
        {
            path: '/agy/cleanup',
            titleKey: 'agy.cleanup.title',
            navKey: 'agy.nav.cleanup',
            descKey: 'agy.dashboard.cleanupDesc',
            Icon: CleanupIcon,
            color: '#3aa675',
            element: <CleanupManagerView agentId='agy' api={api.cleanup} />,
        },
    ],
};
