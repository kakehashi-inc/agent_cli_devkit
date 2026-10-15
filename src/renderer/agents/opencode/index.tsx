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
import { resolveOpenCodeModel } from './modelColumn';

const api = window.agentCliDevkit.opencode;

// Agent・Skill 一覧の列構成。エージェントはモデル列（次の行に推論レベル）を持ち、
// 説明列の下に動作・権限を変える重要な設定（permissions は規則を「action:resource=effect」に要約した値）を補足表示する。
// スキルはモデルからの自動選択を止める設定を補足表示する。
const ASSET_COLUMNS: Partial<Record<AssetKind, FmColumn[]>> = {
    agents: [
        { key: 'name', fit: true, maxWidthPct: 0.3 },
        { key: 'model', width: 150, resolve: resolveOpenCodeModel },
        {
            key: 'description',
            flex: true,
            detailKeys: [
                { key: 'mode', defaultValue: 'primary' },
                { key: 'disabled', defaultValue: 'false' },
                'steps',
                'permissions',
            ],
        },
    ],
    skills: [
        { key: 'name', fit: true, maxWidthPct: 0.3 },
        {
            key: 'description',
            flex: true,
            detailKeys: [
                { key: 'metadata.opencode/autoinvoke', defaultValue: 'true' },
                { key: 'disable-model-invocation', defaultValue: 'false' },
            ],
        },
    ],
};

export const opencodeModule: AgentModule = {
    id: 'opencode',
    label: 'OpenCode',
    dashboardLabel: 'OpenCode 2',
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
            element: <AssetManagerView agentId='opencode' api={api.asset} columns={ASSET_COLUMNS} />,
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
                    noEnvironmentKey='opencode.noEnvironment'
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
