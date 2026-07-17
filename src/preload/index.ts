// renderer に公開する API（window.agentCliDevkit）のエントリポイント。
// アプリ共通（system / window / updater）のブリッジをここに定義し、
// agent 固有の API は preload/agents/<agent>.ts から取り込む。
// agent を追加する場合は preload/agents/<agent>.ts を作成し、ここに 1 行追加する。
import { contextBridge, ipcRenderer } from 'electron';
import { SYSTEM_CHANNELS, UPDATER_CHANNELS, WINDOW_CHANNELS } from '../shared/constants';
import type { IpcApi } from '../shared/ipc';
import type { UpdateState } from '../shared/types';
import { agyApi } from './agents/agy';
import { claudeApi } from './agents/claude';
import { codexApi } from './agents/codex';
import { grokApi } from './agents/grok';
import { opencodeApi } from './agents/opencode';

const api: IpcApi = {
    system: {
        getTheme: () => ipcRenderer.invoke(SYSTEM_CHANNELS.GET_THEME),
        getLocale: () => ipcRenderer.invoke(SYSTEM_CHANNELS.GET_LOCALE),
        getVersion: () => ipcRenderer.invoke(SYSTEM_CHANNELS.GET_VERSION),
        openExternal: (url: string) => ipcRenderer.invoke(SYSTEM_CHANNELS.OPEN_EXTERNAL, url),
    },
    window: {
        minimize: () => ipcRenderer.invoke(WINDOW_CHANNELS.MINIMIZE),
        maximize: () => ipcRenderer.invoke(WINDOW_CHANNELS.MAXIMIZE),
        close: () => ipcRenderer.invoke(WINDOW_CHANNELS.CLOSE),
        isMaximized: () => ipcRenderer.invoke(WINDOW_CHANNELS.IS_MAXIMIZED),
    },
    updater: {
        getState: () => ipcRenderer.invoke(UPDATER_CHANNELS.GET_STATE),
        check: () => ipcRenderer.invoke(UPDATER_CHANNELS.CHECK),
        download: () => ipcRenderer.invoke(UPDATER_CHANNELS.DOWNLOAD),
        quitAndInstall: () => ipcRenderer.invoke(UPDATER_CHANNELS.QUIT_AND_INSTALL),
        onStateChanged: (listener: (state: UpdateState) => void) => {
            const handler = (_event: Electron.IpcRendererEvent, state: UpdateState) => listener(state);
            ipcRenderer.on(UPDATER_CHANNELS.STATE_CHANGED, handler);
            return () => {
                ipcRenderer.removeListener(UPDATER_CHANNELS.STATE_CHANGED, handler);
            };
        },
    },
    // ===== agent 別 API =====
    claude: claudeApi,
    codex: codexApi,
    agy: agyApi,
    grok: grokApi,
    opencode: opencodeApi,
};

contextBridge.exposeInMainWorld('agentCliDevkit', api);

// メインプロセスのコンソールメッセージを受信してDevToolsに転送
ipcRenderer.on(
    'main:console',
    (
        _event,
        data: {
            level: string;
            args: Array<{ type: string; value?: string; message?: string; stack?: string; name?: string }>;
        }
    ) => {
        const { level, args } = data;
        // DevTools出力用に引数をデシリアライズ
        const deserializedArgs = args.map(arg => {
            if (arg.type === 'error') {
                const error = new Error(arg.message || 'Unknown error');
                if (arg.stack) error.stack = arg.stack;
                if (arg.name) error.name = arg.name;
                return error;
            } else if (arg.type === 'object') {
                try {
                    return JSON.parse(arg.value || '{}');
                } catch {
                    return arg.value;
                }
            } else {
                return arg.value;
            }
        });

        // レンダラーコンソールに転送（DevToolsに表示される）
        switch (level) {
            case 'log':
                console.log('[Main]', ...deserializedArgs);
                break;
            case 'error':
                console.error('[Main]', ...deserializedArgs);
                break;
            case 'warn':
                console.warn('[Main]', ...deserializedArgs);
                break;
            case 'info':
                console.info('[Main]', ...deserializedArgs);
                break;
            case 'debug':
                console.debug('[Main]', ...deserializedArgs);
                break;
            default:
                console.log('[Main]', ...deserializedArgs);
        }
    }
);
