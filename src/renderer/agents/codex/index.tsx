import { Hub as HubIcon, SmartToy as AssetIcon, CleaningServices as CleanupIcon } from '@mui/icons-material';
import type { AgentModule } from '../types';
import { CodexMcpManager } from './CodexMcpManager';
import { CodexAssetManager } from './CodexAssetManager';
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
