import {
    Storage as StorageIcon,
    Terminal as TerminalIcon,
    SmartToy as AssetIcon,
    CleaningServices as CleanupIcon,
} from '@mui/icons-material';
import type { AgentModule } from '../types';
import { ClaudeDesktopManager } from './ClaudeDesktopManager';
import { ClaudeCodeManager } from './ClaudeCodeManager';
import { AssetManager } from './AssetManager';
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
            Icon: TerminalIcon,
            color: '#8a6df0',
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
