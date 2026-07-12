import type React from 'react';
import type { SvgIconComponent } from '@mui/icons-material';

// agent が提供する 1 機能（ダッシュボードのカード / タイトルバーのアイコン / ルート定義を兼ねる）
export interface AgentFeature {
    // ルートパス（'/claude/desktop-mcp' など。'/<agent>/<feature>' 形式で統一する）
    path: string;
    // 画面タイトルの i18n キー（例 'claude.claudeDesktop.title'）
    titleKey: string;
    // ナビゲーション表示名の i18n キー（例 'claude.nav.claudeDesktop'）
    navKey: string;
    // ダッシュボードカード説明文の i18n キー（例 'claude.dashboard.claudeDesktopDesc'）
    descKey: string;
    // 表示アイコンとカードの色
    Icon: SvgIconComponent;
    color: string;
    // ルートに割り当てる画面要素
    element: React.ReactElement;
}

// 1 つの agent CLI が提供する機能グループ。
// agent を追加する場合は renderer/agents/<agent>/index.tsx で AgentModule を定義し、
// renderer/agents/index.ts の AGENT_MODULES に登録する。
export interface AgentModule {
    // 識別子（'claude' / 'codex' など）
    id: string;
    // グループ表示名（固有名詞のため翻訳しない）
    label: string;
    // 提供する機能一覧（ダッシュボード・タイトルバー・ルートに表示順で並ぶ）
    features: AgentFeature[];
}
