// agent モジュールの registry。
// agent を追加する場合は renderer/agents/<agent>/ を作成し、ここに 1 行追加する。
// 配列の順序がダッシュボードのグループ表示順・タイトルバーのアイコン順になる。
import type { AgentModule } from './types';
import { claudeModule } from './claude/index';
import { codexModule } from './codex/index';

export const AGENT_MODULES: AgentModule[] = [claudeModule, codexModule];
