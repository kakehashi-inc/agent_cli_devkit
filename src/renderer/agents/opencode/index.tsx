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

const api = window.agentCliDevkit.opencode;

export const opencodeModule: AgentModule = {
    id: 'opencode',
    label: 'OpenCode',
    features: [
        {
            path: '/opencode/mcp',
            titleKey: 'opencode.mcp.title',
            navKey: 'opencode.nav.mcp',
            descKey: 'opencode.dashboard.mcpDesc',
            Icon: HubIcon,
            color: '#5b8def',
            element: <McpManagerView agentId='opencode' api={api.mcp} />,
        },
        {
            path: '/opencode/agent-skill',
            titleKey: 'opencode.assets.title',
            navKey: 'opencode.nav.assets',
            descKey: 'opencode.dashboard.assetsDesc',
            Icon: AssetIcon,
            color: '#d98a3a',
            element: <AssetManagerView agentId='opencode' api={api.asset} />,
        },
        {
            path: '/opencode/plugins',
            titleKey: 'opencode.plugins.title',
            navKey: 'opencode.nav.plugins',
            descKey: 'opencode.dashboard.pluginsDesc',
            Icon: PluginIcon,
            color: '#c85f8d',
            element: (
                <PluginManagerView
                    titleKey='opencode.plugins.title'
                    descKey='opencode.plugins.description'
                    api={api.plugin}
                />
            ),
        },
        {
            path: '/opencode/settings',
            titleKey: 'opencode.settings.title',
            navKey: 'opencode.nav.settings',
            descKey: 'opencode.dashboard.settingsDesc',
            Icon: SettingsIcon,
            color: '#8a6df0',
            element: <SettingsManagerView agentId='opencode' api={api.settings} />,
        },
        {
            path: '/opencode/cleanup',
            titleKey: 'opencode.cleanup.title',
            navKey: 'opencode.nav.cleanup',
            descKey: 'opencode.dashboard.cleanupDesc',
            Icon: CleanupIcon,
            color: '#3aa675',
            element: <CleanupManagerView agentId='opencode' api={api.cleanup} />,
        },
    ],
};
