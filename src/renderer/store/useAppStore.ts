import { create } from 'zustand';

// テーマ / 言語の実行時ストア。
// 永続化は window.agentCliDevkit.appSettings（~/.agent_cli_devkit/settings.json）で行い、
// 起動時に App.tsx が読み込んでこのストアへ反映する（保存値がなければ OS 設定を引き継ぐ）。
interface AppState {
    theme: 'light' | 'dark';
    language: 'en' | 'ja';
    setTheme: (theme: 'light' | 'dark') => void;
    setLanguage: (language: 'en' | 'ja') => void;
}

export const useAppStore = create<AppState>(set => ({
    theme: 'light',
    language: 'ja',
    setTheme: theme => set({ theme }),
    setLanguage: language => set({ language }),
}));
