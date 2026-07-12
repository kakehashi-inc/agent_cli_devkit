// ============================================================
// Claude 固有の型定義
// ------------------------------------------------------------
// agent 非依存の共通型（shared/agents/types.ts）を再エクスポートしつつ、
// Claude 系コードが従来の名前で参照できるエイリアスと
// Claude 固有の型をここに定義する。
// ============================================================
import type { AgentEnvironment, AgentEnvKind, MCPServerConfig } from '../types';

export * from '../types';

// Claude 環境（native = ホストOS、wsl = Windows 上の WSL distro）
export type ClaudeEnvKind = AgentEnvKind;
export type ClaudeEnvironment = AgentEnvironment;

// Claude Code (CLI) の環境ごとの情報
export interface ClaudeCodeEnvInfo {
    env: ClaudeEnvironment;
    label: string;
    configPath: string;
    configExists: boolean;
    disabledConfigPath: string;
}

// Claude Desktop の設定ファイル（claude_desktop_config.json）
export interface ClaudeDesktopConfig {
    mcpServers: Record<string, MCPServerConfig>;
    [key: string]: unknown;
}

// Claude Desktop の情報
export interface ClaudeDesktopInfo {
    configPath: string;
    configExists: boolean;
    disabledConfigPath: string;
    claudeExecutable?: string;
}
