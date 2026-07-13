import {
    Storage as StorageIcon,
    Hub as HubIcon,
    SmartToy as AssetIcon,
    Extension as PluginIcon,
    Settings as SettingsIcon,
    CleaningServices as CleanupIcon,
} from '@mui/icons-material';
import type { AgentModule } from '../types';
import { ClaudeDesktopManager } from './ClaudeDesktopManager';
import { ClaudeCodeManager } from './ClaudeCodeManager';
import { AssetManager } from './AssetManager';
import { PluginManager } from './PluginManager';
import { ClaudeSettingsManager } from './ClaudeSettingsManager';
import { Cleanup } from './Cleanup';

// Claude グループの機能定義。
// ダッシュボードのカード・タイトルバーのアイコン・ルートはこの配列から生成される。
export const claudeModule: AgentModule = {
    id: 'claude',
    label: 'Claude',
    features: [
        {
            path: '/claude/desktop-mcp',
            titleKey: 'claude.claudeDesktop.title',
            navKey: 'claude.nav.claudeDesktop',
            descKey: 'claude.dashboard.claudeDesktopDesc',
            Icon: StorageIcon,
            color: '#5b8def',
            element: <ClaudeDesktopManager />,
        },
        {
            path: '/claude/code-mcp',
            titleKey: 'claude.claudeCode.title',
            navKey: 'claude.nav.claudeCode',
            descKey: 'claude.dashboard.claudeCodeDesc',
            // CLI 系の MCP 管理は全 agent で同一の見た目（Hub / #5b8def）に統一する。
            Icon: HubIcon,
            color: '#5b8def',
            element: <ClaudeCodeManager />,
        },
        {
            path: '/claude/agent-skill',
            titleKey: 'claude.assetManager.title',
            navKey: 'claude.nav.assetManager',
            descKey: 'claude.dashboard.assetManagerDesc',
            Icon: AssetIcon,
            color: '#d98a3a',
            element: <AssetManager />,
        },
        {
            path: '/claude/plugins',
            titleKey: 'claude.pluginManager.title',
            navKey: 'claude.nav.pluginManager',
            descKey: 'claude.dashboard.pluginManagerDesc',
            // プラグイン管理は全 agent で同一の見た目（Extension / #c85f8d）に統一する。
            Icon: PluginIcon,
            color: '#c85f8d',
            element: <PluginManager />,
        },
        {
            path: '/claude/settings',
            titleKey: 'claude.settings.title',
            navKey: 'claude.nav.claudeSettings',
            descKey: 'claude.dashboard.claudeSettingsDesc',
            Icon: SettingsIcon,
            color: '#8a6df0',
            element: <ClaudeSettingsManager />,
        },
        {
            path: '/claude/cleanup',
            titleKey: 'claude.cleanup.title',
            navKey: 'claude.nav.cleanup',
            descKey: 'claude.dashboard.cleanupDesc',
            Icon: CleanupIcon,
            color: '#3aa675',
            element: <Cleanup />,
        },
    ],
};
