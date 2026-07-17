import React, { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, HashRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAppStore } from './store/useAppStore';
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
    // 保存済み設定の読込完了フラグ。完了までは描画しない（既定値での一瞬の表示を防ぐ）
    const [settingsLoaded, setSettingsLoaded] = useState(false);

    // ~/.agent_cli_devkit/settings.json の保存値を優先し、未保存の場合のみ OS の設定を引き継ぐ
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const saved = await window.agentCliDevkit.appSettings.read();

                const theme =
                    saved.theme === 'light' || saved.theme === 'dark'
                        ? saved.theme
                        : await window.agentCliDevkit.system.getTheme();
                setTheme(theme);

                let language: 'en' | 'ja';
                if (saved.language === 'en' || saved.language === 'ja') {
                    language = saved.language;
                } else {
                    const systemLocale = await window.agentCliDevkit.system.getLocale();
                    language = systemLocale.startsWith('ja') ? 'ja' : 'en';
                }
                setLanguage(language);
                i18n.changeLanguage(language);
            } catch (error) {
                console.error('Failed to load app settings:', error);
            } finally {
                setSettingsLoaded(true);
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

    if (!settingsLoaded) {
        return null;
    }

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
