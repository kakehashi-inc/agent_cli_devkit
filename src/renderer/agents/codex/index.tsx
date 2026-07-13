import {
    Hub as HubIcon,
    SmartToy as AssetIcon,
    Extension as PluginIcon,
    Settings as SettingsIcon,
    CleaningServices as CleanupIcon,
} from '@mui/icons-material';
import type { AgentModule } from '../types';
import { CodexMcpManager } from './CodexMcpManager';
import { CodexAssetManager } from './CodexAssetManager';
import { PluginManager } from './PluginManager';
import { CodexSettingsManager } from './CodexSettingsManager';
import { Cleanup } from './Cleanup';

// Codex グループの機能定義。
// ダッシュボードのカード・タイトルバーのアイコン・ルートはこの配列から生成される。
export const codexModule: AgentModule = {
    id: 'codex',
    label: 'Codex',
    features: [
        {
            path: '/codex/mcp',
            titleKey: 'codex.codexMcp.title',
            navKey: 'codex.nav.codexMcp',
            descKey: 'codex.dashboard.codexMcpDesc',
            Icon: HubIcon,
            color: '#5b8def',
            element: <CodexMcpManager />,
        },
        {
            path: '/codex/agent-skill',
            titleKey: 'codex.assetManager.title',
            navKey: 'codex.nav.codexAgentSkill',
            descKey: 'codex.dashboard.codexAgentSkillDesc',
            Icon: AssetIcon,
            color: '#d98a3a',
            element: <CodexAssetManager />,
        },
        {
            path: '/codex/plugins',
            titleKey: 'codex.pluginManager.title',
            navKey: 'codex.nav.pluginManager',
            descKey: 'codex.dashboard.pluginManagerDesc',
            // プラグイン管理は全 agent で同一の見た目（Extension / #c85f8d）に統一する。
            Icon: PluginIcon,
            color: '#c85f8d',
            element: <PluginManager />,
        },
        {
            path: '/codex/settings',
            titleKey: 'codex.settings.title',
            navKey: 'codex.nav.codexSettings',
            descKey: 'codex.dashboard.codexSettingsDesc',
            Icon: SettingsIcon,
            color: '#8a6df0',
            element: <CodexSettingsManager />,
        },
        {
            path: '/codex/cleanup',
            titleKey: 'codex.cleanup.title',
            navKey: 'codex.nav.codexCleanup',
            descKey: 'codex.dashboard.codexCleanupDesc',
            Icon: CleanupIcon,
            color: '#3aa675',
            element: <Cleanup />,
        },
    ],
};
