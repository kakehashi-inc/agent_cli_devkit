import React, { useMemo, useEffect } from 'react';
import { BrowserRouter, HashRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { LANGUAGE_STORAGE_KEY, THEME_STORAGE_KEY, useAppStore } from './store/useAppStore';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { AppSettings } from './components/AppSettings';
import { UpdateNotification } from './components/UpdateNotification';
import { AGENT_MODULES } from './agents/index';

const isDev = import.meta.env.DEV;
const Router = isDev ? BrowserRouter : HashRouter;

export const App: React.FC = () => {
    const { theme, setTheme, setLanguage } = useAppStore();
    const { i18n } = useTranslation();

    // アプリ設定画面で保存した値を優先し、未保存の場合のみ OS の設定を引き継ぐ
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
                const theme =
                    storedTheme === 'light' || storedTheme === 'dark'
                        ? storedTheme
                        : await window.agentCliDevkit.system.getTheme();
                setTheme(theme);

                const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
                let language: 'en' | 'ja';
                if (storedLanguage === 'en' || storedLanguage === 'ja') {
                    language = storedLanguage;
                } else {
                    const systemLocale = await window.agentCliDevkit.system.getLocale();
                    language = systemLocale.startsWith('ja') ? 'ja' : 'en';
                }
                setLanguage(language);
                i18n.changeLanguage(language);
            } catch (error) {
                console.error('Failed to load app settings:', error);
            }
        };

        loadSettings();
    }, [setTheme, setLanguage, i18n]);

    const muiTheme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode: theme,
                },
            }),
        [theme]
    );

    return (
        <ThemeProvider theme={muiTheme}>
            <CssBaseline />
            <Router>
                <Layout>
                    <Routes>
                        <Route path='/' element={<Dashboard />} />
                        <Route path='/app-settings' element={<AppSettings />} />
                        {/* 各 agent の機能ルートは registry から生成する */}
                        {AGENT_MODULES.flatMap(module =>
                            module.features.map(feature => (
                                <Route key={feature.path} path={feature.path} element={feature.element} />
                            ))
                        )}
                    </Routes>
                </Layout>
                <UpdateNotification />
            </Router>
        </ThemeProvider>
    );
};
