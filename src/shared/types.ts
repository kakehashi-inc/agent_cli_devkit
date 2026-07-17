// アプリ共通の型定義（agent 非依存）。
// agent CLI 共通のドメイン型は shared/agents/types.ts を参照。

// プラットフォーム識別子
export type OSType = 'win32' | 'darwin' | 'linux';

// 自動アップデートの状態
export type UpdateStatus = 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';

// 自動アップデートの状態ペイロード
export interface UpdateState {
    status: UpdateStatus;
    // リモート上で公開されている最新バージョン (取得済みの場合)
    version?: string;
    // ダウンロード進捗 (0-100)
    progress?: number;
    // 直近のエラーメッセージ (status='error' 時のみ)
    error?: string;
}

// アプリ設定（~/.agent_cli_devkit/settings.json に保存する）
export interface AppSettingsData {
    // テーマ。未保存時は OS 設定を引き継ぐ
    theme?: 'light' | 'dark';
    // 言語。未保存時は OS ロケールを引き継ぐ
    language?: 'en' | 'ja';
}
