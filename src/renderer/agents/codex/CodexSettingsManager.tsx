import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, Typography, Snackbar, Alert, Divider } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import type { CodexEnvironment } from '@shared/agents/codex/types';
import { envId } from '../../utils/format';
import { SettingsSection } from './SettingsSection';

/**
 * 画面: ~/.codex/config.toml の設定編集。
 * native（Windows/macOS/Linux）と WSL distro ごとに、設定項目のテーブル編集と直接編集を行う。
 * 環境セクションの並べ方は Agent・Skill 管理画面の仕様を踏襲する。
 */
export const CodexSettingsManager: React.FC = () => {
    const { t } = useTranslation();
    const [environments, setEnvironments] = useState<{ env: CodexEnvironment; label: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error' | 'warning';
    }>({
        open: false,
        message: '',
        severity: 'success',
    });

    const load = async () => {
        setLoading(true);
        try {
            const envs = await window.agentCliDevkit.codex.config.getEnvironments();
            setEnvironments(envs);
        } catch (error) {
            console.error('Failed to load settings environments:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const notify = (message: string, severity: 'success' | 'error' | 'warning') => {
        setSnackbar({ open: true, message, severity });
    };

    if (loading) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography>{t('common.loading')}</Typography>
            </Box>
        );
    }

    const nativeEnvs = environments.filter(e => e.env.kind === 'native');
    const wslEnvs = environments.filter(e => e.env.kind === 'wsl');

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                <Box>
                    <Typography variant='h4' component='h1' sx={{ mb: 1 }}>
                        {t('codex.settings.title')}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                        {t('codex.settings.description')}
                    </Typography>
                </Box>
                <Button
                    variant='outlined'
                    startIcon={<RefreshIcon />}
                    onClick={load}
                    sx={{ textTransform: 'none', flexShrink: 0 }}
                >
                    {t('common.refresh')}
                </Button>
            </Box>

            {nativeEnvs.map(({ env, label }) => (
                <Box key={envId(env)}>
                    <Typography variant='h6' sx={{ mb: 1 }}>
                        {label}
                    </Typography>
                    <SettingsSection env={env} onNotify={notify} />
                </Box>
            ))}

            {wslEnvs.length > 0 && (
                <>
                    <Divider sx={{ my: 3 }} />
                    <Typography variant='h5' sx={{ mb: 2 }}>
                        WSL
                    </Typography>
                    {wslEnvs.map(({ env, label }) => (
                        <Box key={envId(env)}>
                            <Typography variant='h6' sx={{ mb: 1 }}>
                                {t('codex.settings.wslSection', { distro: label })}
                            </Typography>
                            <SettingsSection env={env} onNotify={notify} />
                        </Box>
                    ))}
                </>
            )}

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};
