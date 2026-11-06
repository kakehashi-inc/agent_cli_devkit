import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, Typography, Snackbar, Alert, Divider } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { envId } from '../../utils/format';
import { useAgentEnvironments } from '../agent/useAgentEnvironments';
import { PluginEnvSection } from './PluginEnvSection';
import type { PluginManagerApi } from './types';

interface Props {
    // 画面タイトルの i18n キー（agent 別。例 'claude.pluginManager.title'）
    titleKey: string;
    // 画面説明の i18n キー（agent 別）
    descKey: string;
    api: PluginManagerApi;
    // 対象の CLI を持つ環境が 1 つも無いときの案内の i18n キー（agent 別。省略時は共通の案内）
    noEnvironmentKey?: string;
}

/**
 * プラグイン管理画面の共通実装（agent 非依存）。
 * native セクションに加え、Windows では対象 CLI 入り WSL distro を別セクションで表示する。
 * agent ごとの差（タイトル・API・機能の有無）は props と PluginEnvReport.capabilities で吸収する。
 * いずれかのセクションで操作の実行中は、セクションを作り直す「再取得」を押せないようにする
 * （作り直すと実行中の表示が消え、同じ環境へ重ねて操作できてしまうため）。
 */
export const PluginManagerView: React.FC<Props> = ({ titleKey, descKey, api, noEnvironmentKey }) => {
    const { t } = useTranslation();
    // reloadNonce はセクションのキーに使い、再取得のたびにセクションを作り直す。
    const { environments, refreshing, loadFailed, reloadNonce, load } = useAgentEnvironments(
        titleKey,
        api,
        'Failed to load plugin environments:'
    );
    // 操作の実行中のセクション（環境 ID）。
    const [busyEnvs, setBusyEnvs] = useState<ReadonlySet<string>>(new Set());
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error' | 'warning';
    }>({ open: false, message: '', severity: 'success' });

    const notify = (message: string, severity: 'success' | 'error' | 'warning') => {
        setSnackbar({ open: true, message, severity });
    };

    const setSectionBusy = useCallback((id: string, busy: boolean) => {
        setBusyEnvs(prev => {
            if (prev.has(id) === busy) {
                return prev;
            }
            const next = new Set(prev);
            if (busy) {
                next.add(id);
            } else {
                next.delete(id);
            }
            return next;
        });
    }, []);

    if (refreshing) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography>{t('common.loading')}</Typography>
            </Box>
        );
    }

    const shownEnvs = loadFailed ? [] : environments;
    const nativeEnvs = shownEnvs.filter(e => e.env.kind === 'native');
    const wslEnvs = shownEnvs.filter(e => e.env.kind === 'wsl');

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
                    disabled={busyEnvs.size > 0}
                    onClick={() => void load(true)}
                    sx={{ flexShrink: 0 }}
                >
                    {t('common.refresh')}
                </Button>
            </Box>

            {loadFailed ? (
                <Alert severity='error' sx={{ mb: 2 }}>
                    {t('pluginManager.environmentsError')}
                </Alert>
            ) : (
                shownEnvs.length === 0 && (
                    <Alert severity='info' sx={{ mb: 2 }}>
                        {t(noEnvironmentKey ?? 'pluginManager.noEnvironment')}
                    </Alert>
                )
            )}
            {nativeEnvs.map(info => (
                <Box key={`${titleKey}:${envId(info.env)}-${reloadNonce}`}>
                    <Typography variant='h6' sx={{ mb: 1 }}>
                        {info.label}
                    </Typography>
                    <PluginEnvSection api={api} env={info.env} onNotify={notify} onBusyChange={setSectionBusy} />
                </Box>
            ))}

            {wslEnvs.length > 0 && (
                <>
                    <Divider sx={{ my: 3 }} />
                    <Typography variant='h5' sx={{ mb: 2 }}>
                        WSL
                    </Typography>
                    {wslEnvs.map(info => (
                        <Box key={`${titleKey}:${envId(info.env)}-${reloadNonce}`}>
                            <Typography variant='h6' sx={{ mb: 1 }}>
                                {t('pluginManager.wslSection', { distro: info.label })}
                            </Typography>
                            <PluginEnvSection
                                api={api}
                                env={info.env}
                                onNotify={notify}
                                onBusyChange={setSectionBusy}
                            />
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
