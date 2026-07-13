import React from 'react';
import { PluginManagerView } from '../../components/plugins/PluginManagerView';

/**
 * Codex のプラグイン管理画面。
 * UI 本体は共通の PluginManagerView（agent 非依存）で、API と文言キーだけを渡す。
 */
export const PluginManager: React.FC = () => (
    <PluginManagerView
        titleKey='codex.pluginManager.title'
        descKey='codex.pluginManager.description'
        api={window.agentCliDevkit.codex.plugin}
    />
);
