import React from 'react';
import { PluginManagerView } from '../../components/plugins/PluginManagerView';

/**
 * Claude Code のプラグイン管理画面。
 * UI 本体は共通の PluginManagerView（agent 非依存）で、API と文言キーだけを渡す。
 */
export const PluginManager: React.FC = () => (
    <PluginManagerView
        titleKey='claude.pluginManager.title'
        descKey='claude.pluginManager.description'
        api={window.agentCliDevkit.claude.plugin}
    />
);
