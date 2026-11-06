import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, Typography, Snackbar, Alert, Divider } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import type { CodexEnvironment } from '@shared/agents/codex/types';
import { envId } from '../../utils/format';
import { AssetManagerSection } from './AssetManagerSection';

/**
 * 画面: Codex Agent・Skill 管理。
 * native（Windows/macOS/Linux）と WSL distro ごとに、~/.codex/agents（エージェント）と
 * ~/.agents/skills（スキル）を管理する。
 */
export const CodexAssetManager: React.FC = () => {
    const { t } = useTranslation();
    const [environments, setEnvironments] = useState<{ env: CodexEnvironment; label: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [reloadNonce, setReloadNonce] = useState(0);
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error' | 'warning';
    }>({
        open: false,
        message: '',
        severity: 'success',
    });

    // 更新中は環境セクションを表示したまま読み直し、タブと検索語を保つ。
    const load = async (refresh = false) => {
        setRefreshing(true);
        try {
            const envs = await window.agentCliDevkit.codex.asset.getEnvironments(refresh);
            setEnvironments(envs);
            setReloadNonce(value => value + 1);
        } catch (error) {
            console.error('Failed to load asset manager environments:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        void load();
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
                        {t('codex.assetManager.title')}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                        {t('codex.assetManager.description')}
                    </Typography>
                </Box>
                <Button
                    variant='outlined'
                    startIcon={<RefreshIcon />}
                    disabled={refreshing}
                    onClick={() => void load(true)}
                    sx={{ flexShrink: 0 }}
                >
                    {t('common.refresh')}
                </Button>
            </Box>

            {nativeEnvs.map(({ env, label }) => (
                <Box key={envId(env)}>
                    <Typography variant='h6' sx={{ mb: 1 }}>
                        {label}
                    </Typography>
                    <AssetManagerSection env={env} onNotify={notify} reloadNonce={reloadNonce} />
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
                                {t('codex.assetManager.wslSection', { distro: label })}
                            </Typography>
                            <AssetManagerSection env={env} onNotify={notify} reloadNonce={reloadNonce} />
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
