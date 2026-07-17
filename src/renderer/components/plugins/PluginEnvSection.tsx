import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    Paper,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    AddCircleOutlined as AddIcon,
    DeleteOutlined as DeleteIcon,
    StorefrontOutlined as MarketIcon,
    ToggleOn as EnableIcon,
    ToggleOff as DisableIcon,
} from '@mui/icons-material';
import type { AgentEnvironment, PluginEnvReport, PluginMarketplaceEntry } from '@shared/agents/types';
import { AddMarketplaceDialog } from './AddMarketplaceDialog';
import { AddPluginDialog } from './AddPluginDialog';
import type { PluginManagerApi, PluginNotify } from './types';

type SectionTab = 'plugins' | 'marketplaces';

interface Props {
    api: PluginManagerApi;
    env: AgentEnvironment;
    onNotify: PluginNotify;
}

/**
 * 1 環境分のプラグイン管理セクション。
 * 「インストール済み」「マーケットプレイス」をタブで分離し、
 * プラグインの追加（マーケットプレイスから / 個別リポジトリから）・アンインストール・
 * マーケットプレイスの追加・削除を行う。
 */
export const PluginEnvSection: React.FC<Props> = ({ api, env, onNotify }) => {
    const { t } = useTranslation();
    const [report, setReport] = useState<PluginEnvReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<SectionTab>('plugins');
    const [busy, setBusy] = useState(false);
    const [uninstallTarget, setUninstallTarget] = useState<{ id: string; name: string } | null>(null);
    const [removeMarketTarget, setRemoveMarketTarget] = useState<PluginMarketplaceEntry | null>(null);
    const [addPluginOpen, setAddPluginOpen] = useState(false);
    const [addMarketOpen, setAddMarketOpen] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const result = await api.list(env);
            setReport(result);
        } catch (error) {
            console.error('Failed to load plugin list:', error);
            onNotify(t('pluginManager.listError'), 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // env は安定参照（親で固定）。マウント時に一度ロードする。
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleUninstall = async () => {
        if (!uninstallTarget) {
            return;
        }
        const target = uninstallTarget;
        setUninstallTarget(null);
        setBusy(true);
        try {
            const result = await api.uninstall(env, target.id);
            if (result.ok) {
                onNotify(t('pluginManager.uninstallSuccess'), 'success');
                await load();
            } else {
                console.error('Plugin uninstall failed:', result.message);
                onNotify(t('pluginManager.uninstallError'), 'error');
            }
        } catch (error) {
            console.error('Plugin uninstall failed:', error);
            onNotify(t('pluginManager.uninstallError'), 'error');
        } finally {
            setBusy(false);
        }
    };

    const handleToggleEnabled = async (id: string, enabled: boolean) => {
        setBusy(true);
        try {
            const result = await api.setEnabled(env, id, enabled);
            if (result.ok) {
                onNotify(enabled ? t('pluginManager.enabledSuccess') : t('pluginManager.disabledSuccess'), 'success');
                await load();
            } else {
                console.error('Plugin enable/disable failed:', result.message);
                onNotify(t('pluginManager.toggleError'), 'error');
            }
        } catch (error) {
            console.error('Plugin enable/disable failed:', error);
            onNotify(t('pluginManager.toggleError'), 'error');
        } finally {
            setBusy(false);
        }
    };

    const handleRemoveMarketplace = async () => {
        if (!removeMarketTarget) {
            return;
        }
        const target = removeMarketTarget;
        setRemoveMarketTarget(null);
        setBusy(true);
        try {
            const result = await api.removeMarketplace(env, target.name);
            if (result.ok) {
                onNotify(t('pluginManager.removeMarketSuccess'), 'success');
                await load();
            } else {
                console.error('Marketplace remove failed:', result.message);
                onNotify(t('pluginManager.removeMarketError'), 'error');
            }
        } catch (error) {
            console.error('Marketplace remove failed:', error);
            onNotify(t('pluginManager.removeMarketError'), 'error');
        } finally {
            setBusy(false);
        }
    };

    if (loading) {
        return (
            <Paper variant='outlined' sx={{ p: 2, mb: 2 }}>
                <Typography color='text.secondary'>{t('common.loading')}</Typography>
            </Paper>
        );
    }
    if (!report) {
        return null;
    }
    if (!report.cliAvailable) {
        return (
            <Paper variant='outlined' sx={{ p: 2, mb: 3 }}>
                <Alert severity='info'>{t('pluginManager.cliNotFound')}</Alert>
            </Paper>
        );
    }

    const originChip = (m: PluginMarketplaceEntry) => {
        if (m.origin === 'builtin') {
            return <Chip size='small' label={t('pluginManager.originBuiltin')} />;
        }
        if (m.origin === 'external') {
            return <Chip size='small' variant='outlined' label={t('pluginManager.originExternal')} />;
        }
        return null;
    };

    const removeDisabledReason = (m: PluginMarketplaceEntry): string | null => {
        if (m.origin === 'builtin') {
            return t('pluginManager.builtinTooltip');
        }
        if (m.origin === 'external') {
            return t('pluginManager.externalTooltip');
        }
        return null;
    };

    return (
        <Paper variant='outlined' sx={{ mb: 3 }}>
            <Tabs value={tab} onChange={(_, v: SectionTab) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tab value='plugins' label={t('pluginManager.tabPlugins')} />
                {report.capabilities.marketplaceManagement && (
                    <Tab value='marketplaces' label={t('pluginManager.tabMarketplaces')} />
                )}
            </Tabs>

            <Box sx={{ p: 2 }}>
                {report.cliVersion && (
                    <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
                        {t('pluginManager.cliVersion', { version: report.cliVersion })}
                    </Typography>
                )}
                {report.error && (
                    <Alert severity='error' sx={{ mb: 2 }}>
                        {t('pluginManager.listError')}
                        <Typography component='pre' variant='caption' sx={{ whiteSpace: 'pre-wrap', m: 0 }}>
                            {report.error}
                        </Typography>
                    </Alert>
                )}

                <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
                    {tab === 'plugins' ? (
                        <Button
                            variant='contained'
                            size='small'
                            startIcon={<AddIcon />}
                            disabled={busy}
                            onClick={() => setAddPluginOpen(true)}
                        >
                            {t('pluginManager.addPlugin')}
                        </Button>
                    ) : report.capabilities.marketplaceManagement ? (
                        <Button
                            variant='contained'
                            size='small'
                            startIcon={<MarketIcon />}
                            disabled={busy}
                            onClick={() => setAddMarketOpen(true)}
                        >
                            {t('pluginManager.addMarketplace')}
                        </Button>
                    ) : null}
                    {busy && <CircularProgress size={22} />}
                </Box>

                {tab === 'plugins' &&
                    (report.plugins.length === 0 ? (
                        <Typography color='text.secondary' sx={{ py: 1 }}>
                            {t('pluginManager.noPlugins')}
                        </Typography>
                    ) : (
                        <TableContainer>
                            {/* tableLayout: fixed で列幅を画面幅の比率から決め、長い値は省略せず折り返す */}
                            <Table size='small' sx={{ tableLayout: 'fixed', width: '100%' }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>{t('pluginManager.colName')}</TableCell>
                                        <TableCell width='110'>{t('pluginManager.colVersion')}</TableCell>
                                        <TableCell width='22%'>{t('pluginManager.colMarketplace')}</TableCell>
                                        <TableCell width='100'>{t('pluginManager.colStatus')}</TableCell>
                                        <TableCell align='right' width='140'>
                                            {t('pluginManager.colActions')}
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {report.plugins.map(p => (
                                        <TableRow key={p.id} hover>
                                            <TableCell sx={{ fontWeight: 500, wordBreak: 'break-all' }}>
                                                {p.name}
                                            </TableCell>
                                            <TableCell sx={{ wordBreak: 'break-all' }}>{p.version ?? '-'}</TableCell>
                                            <TableCell sx={{ wordBreak: 'break-all' }}>
                                                {p.marketplace ?? '-'}
                                            </TableCell>
                                            <TableCell>
                                                {p.enabled ? (
                                                    <Tooltip title={t('pluginManager.disable')}>
                                                        <span>
                                                            <IconButton
                                                                size='large'
                                                                color='success'
                                                                disabled={busy}
                                                                onClick={() => handleToggleEnabled(p.id, false)}
                                                            >
                                                                <EnableIcon sx={{ fontSize: 40 }} />
                                                            </IconButton>
                                                        </span>
                                                    </Tooltip>
                                                ) : (
                                                    <Tooltip title={t('pluginManager.enable')}>
                                                        <span>
                                                            <IconButton
                                                                size='large'
                                                                color='error'
                                                                disabled={busy}
                                                                onClick={() => handleToggleEnabled(p.id, true)}
                                                            >
                                                                <DisableIcon sx={{ fontSize: 40 }} />
                                                            </IconButton>
                                                        </span>
                                                    </Tooltip>
                                                )}
                                            </TableCell>
                                            <TableCell align='right'>
                                                <Button
                                                    size='small'
                                                    color='error'
                                                    startIcon={<DeleteIcon />}
                                                    disabled={busy}
                                                    onClick={() => setUninstallTarget({ id: p.id, name: p.name })}
                                                    sx={{ textTransform: 'none' }}
                                                >
                                                    {t('pluginManager.uninstall')}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ))}

                {report.capabilities.marketplaceManagement &&
                    tab === 'marketplaces' &&
                    (report.marketplaces.length === 0 ? (
                        <Typography color='text.secondary' sx={{ py: 1 }}>
                            {t('pluginManager.noMarketplaces')}
                        </Typography>
                    ) : (
                        <TableContainer>
                            {/* tableLayout: fixed で列幅を画面幅の比率から決め、長い値は省略せず折り返す */}
                            <Table size='small' sx={{ tableLayout: 'fixed', width: '100%' }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell width='20%'>{t('pluginManager.colName')}</TableCell>
                                        <TableCell width='100'>{t('pluginManager.colKind')}</TableCell>
                                        <TableCell>{t('pluginManager.colSource')}</TableCell>
                                        <TableCell width='110' />
                                        <TableCell align='right' width='140'>
                                            {t('pluginManager.colActions')}
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {report.marketplaces.map(m => {
                                        const disabledReason = removeDisabledReason(m);
                                        const removeButton = (
                                            <Button
                                                size='small'
                                                color='error'
                                                startIcon={<DeleteIcon />}
                                                disabled={busy || disabledReason !== null}
                                                onClick={() => setRemoveMarketTarget(m)}
                                                sx={{ textTransform: 'none' }}
                                            >
                                                {t('pluginManager.remove')}
                                            </Button>
                                        );
                                        return (
                                            <TableRow key={m.name} hover>
                                                <TableCell sx={{ fontWeight: 500, wordBreak: 'break-all' }}>
                                                    {m.name}
                                                </TableCell>
                                                <TableCell>{m.sourceKind}</TableCell>
                                                <TableCell sx={{ wordBreak: 'break-all' }}>{m.sourceDetail}</TableCell>
                                                <TableCell>{originChip(m)}</TableCell>
                                                <TableCell align='right'>
                                                    {disabledReason ? (
                                                        <Tooltip title={disabledReason}>
                                                            <span>{removeButton}</span>
                                                        </Tooltip>
                                                    ) : (
                                                        removeButton
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ))}
            </Box>

            {/* アンインストール確認 */}
            <Dialog open={uninstallTarget !== null} onClose={() => setUninstallTarget(null)}>
                <DialogTitle>{t('pluginManager.uninstallConfirmTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {t('pluginManager.uninstallConfirmBody', { name: uninstallTarget?.name ?? '' })}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setUninstallTarget(null)} sx={{ textTransform: 'none' }}>
                        {t('pluginManager.cancel')}
                    </Button>
                    <Button color='error' variant='contained' onClick={handleUninstall} sx={{ textTransform: 'none' }}>
                        {t('pluginManager.uninstall')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* マーケットプレイス削除確認 */}
            <Dialog open={removeMarketTarget !== null} onClose={() => setRemoveMarketTarget(null)}>
                <DialogTitle>{t('pluginManager.removeMarketConfirmTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {t('pluginManager.removeMarketConfirmBody', { name: removeMarketTarget?.name ?? '' })}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRemoveMarketTarget(null)} sx={{ textTransform: 'none' }}>
                        {t('pluginManager.cancel')}
                    </Button>
                    <Button
                        color='error'
                        variant='contained'
                        onClick={handleRemoveMarketplace}
                        sx={{ textTransform: 'none' }}
                    >
                        {t('pluginManager.remove')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* プラグイン追加 */}
            {addPluginOpen && (
                <AddPluginDialog
                    api={api}
                    env={env}
                    capabilities={report.capabilities}
                    marketplaces={report.marketplaces}
                    onNotify={onNotify}
                    onClose={changed => {
                        setAddPluginOpen(false);
                        if (changed) {
                            load();
                        }
                    }}
                />
            )}

            {/* マーケットプレイス追加 */}
            {report.capabilities.marketplaceManagement && addMarketOpen && (
                <AddMarketplaceDialog
                    api={api}
                    env={env}
                    capabilities={report.capabilities}
                    onNotify={onNotify}
                    onClose={changed => {
                        setAddMarketOpen(false);
                        if (changed) {
                            load();
                        }
                    }}
                />
            )}
        </Paper>
    );
};
