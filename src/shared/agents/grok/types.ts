// ============================================================
// Grok 固有の型定義
// ------------------------------------------------------------
// agent 非依存の共通型（shared/agents/types.ts）を再エクスポートしつつ、
// Grok 系コードが従来の命名規則で参照できるエイリアスをここに定義する。
// ============================================================
import type { AgentEnvironment, AgentEnvKind, McpEnvInfo } from '../types';

export * from '../types';

// Grok 環境（native = ホストOS、wsl = Windows 上の WSL distro）
export type GrokEnvKind = AgentEnvKind;
export type GrokEnvironment = AgentEnvironment;

// Grok MCP 管理の環境ごとの情報
export type GrokMcpEnvInfo = McpEnvInfo;
