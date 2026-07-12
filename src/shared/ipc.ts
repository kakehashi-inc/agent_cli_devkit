// renderer に公開する API（window.agentCliDevkit）の型定義。
// agent 固有の API 型は shared/agents/<agent>/ipc.ts に定義し、
// ここでは agent 名のキーで束ねるだけにする（agent 追加時はここに 1 行追加する）。
import type { UpdateState } from './types';
import type { ClaudeIpcApi } from './agents/claude/ipc';
import type { CodexIpcApi } from './agents/codex/ipc';

export type IpcApi = {
    // システム情報
    system: {
        getTheme(): Promise<'light' | 'dark'>;
        getLocale(): Promise<string>;
        getVersion(): Promise<string>;
    };
    // ウィンドウ制御
    window: {
        minimize(): Promise<void>;
        maximize(): Promise<void>;
        close(): Promise<void>;
        isMaximized(): Promise<boolean>;
    };
    // 自動アップデート
    updater: {
        getState(): Promise<UpdateState>;
        check(): Promise<void>;
        download(): Promise<void>;
        quitAndInstall(): Promise<void>;
        onStateChanged(listener: (state: UpdateState) => void): () => void;
    };
    // ===== agent 別 API（agent 追加時はここに 1 エントリ追加）=====
    claude: ClaudeIpcApi;
    codex: CodexIpcApi;
};

declare global {
    interface Window {
        agentCliDevkit: IpcApi;
    }
}
