import React, { useMemo, useEffect } from 'react';
import { BrowserRouter, HashRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAppStore } from './store/useAppStore';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { UpdateNotification } from './components/UpdateNotification';
import { AGENT_MODULES } from './agents/index';

const isDev = import.meta.env.DEV;
const Router = isDev ? BrowserRouter : HashRouter;

export const App: React.FC = () => {
    const { theme, setTheme, setLanguage } = useAppStore();
    const { i18n } = useTranslation();

    // OSの設定を読み込み
    useEffect(() => {
        const loadSystemSettings = async () => {
            try {
                // OSのテーマ設定を取得
                const systemTheme = await window.agentCliDevkit.system.getTheme();
                setTheme(systemTheme);

                // OSの言語設定を取得
                const systemLocale = await window.agentCliDevkit.system.getLocale();
                const language = systemLocale.startsWith('ja') ? 'ja' : 'en';
                setLanguage(language);
                i18n.changeLanguage(language);
            } catch (error) {
                console.error('Failed to load system settings:', error);
            }
        };

        loadSystemSettings();
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
