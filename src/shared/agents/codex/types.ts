// ============================================================
// Codex 固有の型定義
// ------------------------------------------------------------
// agent 非依存の共通型（shared/agents/types.ts）を再エクスポートしつつ、
// Codex 系コードが従来の名前で参照できるエイリアスをここに定義する。
// ============================================================
import type { AgentEnvironment, AgentEnvKind, McpEnvInfo } from '../types';

export * from '../types';

// Codex 環境（native = ホストOS、wsl = Windows 上の WSL distro）
export type CodexEnvKind = AgentEnvKind;
export type CodexEnvironment = AgentEnvironment;

// Codex MCP 管理の環境ごとの情報
export type CodexMcpEnvInfo = McpEnvInfo;
