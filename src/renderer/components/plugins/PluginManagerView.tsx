import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, Typography, Snackbar, Alert, Divider } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import type { AgentEnvironment } from '@shared/agents/types';
import { envId } from '../../utils/format';
import { PluginEnvSection } from './PluginEnvSection';
import type { PluginManagerApi } from './types';

interface Props {
    // 画面タイトルの i18n キー（agent 別。例 'claude.pluginManager.title'）
    titleKey: string;
    // 画面説明の i18n キー（agent 別）
    descKey: string;
    api: PluginManagerApi;
}

/**
 * プラグイン管理画面の共通実装（agent 非依存）。
 * native セクションに加え、Windows では対象 CLI 入り WSL distro を別セクションで表示する。
 * agent ごとの差（タイトル・API・機能の有無）は props と PluginEnvReport.capabilities で吸収する。
 */
export const PluginManagerView: React.FC<Props> = ({ titleKey, descKey, api }) => {
    const { t } = useTranslation();
    const [environments, setEnvironments] = useState<{ env: AgentEnvironment; label: string }[]>([]);
    const [loading, setLoading] = useState(true);
    // 再取得時にセクションを作り直すためのキー。
    const [reloadKey, setReloadKey] = useState(0);
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error' | 'warning';
    }>({ open: false, message: '', severity: 'success' });

    const load = async () => {
        setLoading(true);
        try {
            const envs = await api.getEnvironments();
            setEnvironments(envs);
            setReloadKey(k => k + 1);
        } catch (error) {
            console.error('Failed to load plugin environments:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // api は安定参照（preload ブリッジ）。マウント時に一度ロードする。
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
                        {t(titleKey)}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                        {t(descKey)}
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

            {nativeEnvs.map(info => (
                <Box key={`${envId(info.env)}-${reloadKey}`}>
                    <Typography variant='h6' sx={{ mb: 1 }}>
                        {info.label}
                    </Typography>
                    <PluginEnvSection api={api} env={info.env} onNotify={notify} />
                </Box>
            ))}

            {wslEnvs.length > 0 && (
                <>
                    <Divider sx={{ my: 3 }} />
                    <Typography variant='h5' sx={{ mb: 2 }}>
                        WSL
                    </Typography>
                    {wslEnvs.map(info => (
                        <Box key={`${envId(info.env)}-${reloadKey}`}>
                            <Typography variant='h6' sx={{ mb: 1 }}>
                                {t('pluginManager.wslSection', { distro: info.label })}
                            </Typography>
                            <PluginEnvSection api={api} env={info.env} onNotify={notify} />
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
