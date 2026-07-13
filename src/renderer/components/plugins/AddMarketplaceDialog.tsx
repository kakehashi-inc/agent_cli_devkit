import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    LinearProgress,
    TextField,
    Typography,
} from '@mui/material';
import type { AgentEnvironment, PluginCapabilities } from '@shared/agents/types';
import type { PluginManagerApi, PluginNotify } from './types';

interface Props {
    api: PluginManagerApi;
    env: AgentEnvironment;
    capabilities: PluginCapabilities;
    onNotify: PluginNotify;
    onClose: (changed: boolean) => void;
}

/** agent が受け付けるソース形式の説明文を組み立てる。 */
export function sourceFormatsText(
    t: (key: string) => string,
    capabilities: PluginCapabilities,
    directInstallContext: boolean
): string {
    const formats = [t('pluginManager.formatOwnerRepo'), t('pluginManager.formatGitUrl'), t('pluginManager.formatLocalPath')];
    if (!directInstallContext && capabilities.marketplaceRemoteUrl) {
        formats.push(t('pluginManager.formatRemoteUrl'));
    }
    return formats.join(' / ');
}

/** 入力ソースの簡易検証（空・引用符・制御文字を拒否。詳細な検証は CLI 側が行う）。 */
export function isValidSource(source: string): boolean {
    const s = source.trim();
    // eslint-disable-next-line no-control-regex -- コマンド引数に渡せない制御文字の混入を入力時点で拒否する
    return s.length > 0 && s.length <= 2048 && !s.includes('"') && !/[\x00-\x1f\x7f]/.test(s);
}

/**
 * マーケットプレイス追加ダイアログ。
 * ソース（owner/repo・Git URL・ローカルパス、agent により marketplace.json URL）を入力して追加する。
 */
export const AddMarketplaceDialog: React.FC<Props> = ({ api, env, capabilities, onNotify, onClose }) => {
    const { t } = useTranslation();
    const [source, setSource] = useState('');
    const [busy, setBusy] = useState(false);
    const [errorDetail, setErrorDetail] = useState<string | null>(null);

    const handleAdd = async () => {
        setBusy(true);
        setErrorDetail(null);
        try {
            const result = await api.addMarketplace(env, source.trim());
            if (result.ok) {
                onNotify(t('pluginManager.addMarketSuccess'), 'success');
                onClose(true);
            } else {
                setErrorDetail(result.message ?? '');
                onNotify(t('pluginManager.addMarketError'), 'error');
            }
        } catch (error) {
            setErrorDetail(String(error));
            onNotify(t('pluginManager.addMarketError'), 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open fullWidth maxWidth='sm' onClose={() => !busy && onClose(false)}>
            <DialogTitle>{t('pluginManager.addMarketplaceTitle')}</DialogTitle>
            <DialogContent>
                <Alert severity='warning' sx={{ mb: 2 }}>
                    {t('pluginManager.trustBody')}
                </Alert>
                <TextField
                    autoFocus
                    fullWidth
                    label={t('pluginManager.sourceLabel')}
                    value={source}
                    disabled={busy}
                    onChange={e => setSource(e.target.value)}
                    helperText={t('pluginManager.sourceFormats', {
                        formats: sourceFormatsText(t, capabilities, false),
                    })}
                />
                {busy && (
                    <>
                        <LinearProgress sx={{ mt: 2 }} />
                        <Typography variant='caption' color='text.secondary'>
                            {t('pluginManager.working')}
                        </Typography>
                    </>
                )}
                {errorDetail !== null && errorDetail.length > 0 && (
                    <Alert severity='error' sx={{ mt: 2 }}>
                        <Typography component='pre' variant='caption' sx={{ whiteSpace: 'pre-wrap', m: 0 }}>
                            {errorDetail}
                        </Typography>
                    </Alert>
                )}
            </DialogContent>
            <DialogActions>
                <Button disabled={busy} onClick={() => onClose(false)} sx={{ textTransform: 'none' }}>
                    {t('pluginManager.cancel')}
                </Button>
                <Button
                    variant='contained'
                    disabled={busy || !isValidSource(source)}
                    onClick={handleAdd}
                    sx={{ textTransform: 'none' }}
                >
                    {t('pluginManager.trustProceedAdd')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
