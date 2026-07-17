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
import type { AgentModule } from '../types';

const api = window.agentCliDevkit.agy;

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
            element: <AssetManagerView agentId='agy' api={api.asset} />,
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
