import {
    Hub as HubIcon,
    SmartToy as AssetIcon,
    Extension as PluginIcon,
    Settings as SettingsIcon,
    CleaningServices as CleanupIcon,
} from '@mui/icons-material';
import type { AgentModule } from '../types';
import { GrokMcpManager } from './GrokMcpManager';
import { GrokAssetManager } from './GrokAssetManager';
import { PluginManager } from './PluginManager';
import { GrokSettingsManager } from './GrokSettingsManager';
import { Cleanup } from './Cleanup';

// Grok グループの機能定義。
// ダッシュボードのカード・タイトルバーのアイコン・ルートはこの配列から生成される。
export const grokModule: AgentModule = {
    id: 'grok',
    label: 'Grok',
    features: [
        {
            path: '/grok/mcp',
            titleKey: 'grok.grokMcp.title',
            navKey: 'grok.nav.grokMcp',
            descKey: 'grok.dashboard.grokMcpDesc',
            Icon: HubIcon,
            color: '#5b8def',
            element: <GrokMcpManager />,
        },
        {
            path: '/grok/agent-skill',
            titleKey: 'grok.assetManager.title',
            navKey: 'grok.nav.grokAgentSkill',
            descKey: 'grok.dashboard.grokAgentSkillDesc',
            Icon: AssetIcon,
            color: '#d98a3a',
            element: <GrokAssetManager />,
        },
        {
            path: '/grok/plugins',
            titleKey: 'grok.pluginManager.title',
            navKey: 'grok.nav.pluginManager',
            descKey: 'grok.dashboard.pluginManagerDesc',
            // プラグイン管理は全 agent で同一の見た目（Extension / #c85f8d）に統一する。
            Icon: PluginIcon,
            color: '#c85f8d',
            element: <PluginManager />,
        },
        {
            path: '/grok/settings',
            titleKey: 'grok.settings.title',
            navKey: 'grok.nav.grokSettings',
            descKey: 'grok.dashboard.grokSettingsDesc',
            Icon: SettingsIcon,
            color: '#8a6df0',
            element: <GrokSettingsManager />,
        },
        {
            path: '/grok/cleanup',
            titleKey: 'grok.cleanup.title',
            navKey: 'grok.nav.grokCleanup',
            descKey: 'grok.dashboard.grokCleanupDesc',
            Icon: CleanupIcon,
            color: '#3aa675',
            element: <Cleanup />,
        },
    ],
};
