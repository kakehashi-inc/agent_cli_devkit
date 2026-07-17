import { create } from 'zustand';

// アプリ設定画面で「保存」したテーマ / 言語の永続化キー。
// 保存値がない場合は OS 設定から引き継ぐ（App.tsx の起動時ロジック）。
export const THEME_STORAGE_KEY = 'app.theme';
export const LANGUAGE_STORAGE_KEY = 'app.language';

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
