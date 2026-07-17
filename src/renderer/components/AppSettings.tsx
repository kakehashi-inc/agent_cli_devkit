import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Box,
    Button,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Snackbar,
    Typography,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { useAppStore } from '../store/useAppStore';

/**
 * アプリ設定画面（テーマ / 言語）。
 * 編集内容はローカル state に保持し、「保存」を押した時点で初めてアプリへ反映し、
 * ~/.agent_cli_devkit/settings.json へ永続化する。
 * 保存値がない初回起動時は OS 設定から引き継ぐ（App.tsx 参照）。
 */
export const AppSettings: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { theme, language, setTheme, setLanguage } = useAppStore();
    // 保存前のドラフト値（画面表示中のテーマ / 言語には影響させない）
    const [draftTheme, setDraftTheme] = useState<'light' | 'dark'>(theme);
    const [draftLanguage, setDraftLanguage] = useState<'en' | 'ja'>(language);
    const [savedOpen, setSavedOpen] = useState(false);

    const dirty = draftTheme !== theme || draftLanguage !== language;

    const handleSave = async () => {
        try {
            await window.agentCliDevkit.appSettings.write({ theme: draftTheme, language: draftLanguage });
        } catch (error) {
            console.error('Failed to save app settings:', error);
        }
        setTheme(draftTheme);
        setLanguage(draftLanguage);
        i18n.changeLanguage(draftLanguage);
        setSavedOpen(true);
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant='h4' component='h1' sx={{ mb: 3 }}>
                {t('appSettings.title')}
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 360 }}>
                <FormControl size='small'>
                    <InputLabel id='app-settings-theme-label'>{t('appSettings.theme')}</InputLabel>
                    <Select
                        labelId='app-settings-theme-label'
                        label={t('appSettings.theme')}
                        value={draftTheme}
                        onChange={e => setDraftTheme(e.target.value as 'light' | 'dark')}
                    >
                        <MenuItem value='light'>{t('theme.light')}</MenuItem>
                        <MenuItem value='dark'>{t('theme.dark')}</MenuItem>
                    </Select>
                </FormControl>

                <FormControl size='small'>
                    <InputLabel id='app-settings-language-label'>{t('appSettings.language')}</InputLabel>
                    <Select
                        labelId='app-settings-language-label'
                        label={t('appSettings.language')}
                        value={draftLanguage}
                        onChange={e => setDraftLanguage(e.target.value as 'en' | 'ja')}
                    >
                        <MenuItem value='ja'>{t('language.ja')}</MenuItem>
                        <MenuItem value='en'>{t('language.en')}</MenuItem>
                    </Select>
                </FormControl>

                <Box>
                    <Button variant='contained' startIcon={<SaveIcon />} disabled={!dirty} onClick={handleSave}>
                        {t('appSettings.save')}
                    </Button>
                </Box>
            </Box>

            <Snackbar
                open={savedOpen}
                autoHideDuration={3000}
                onClose={() => setSavedOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity='success' onClose={() => setSavedOpen(false)}>
                    {t('appSettings.saved')}
                </Alert>
            </Snackbar>
        </Box>
    );
};
