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
import type { AgentEnvironment, PluginEntry, PluginEnvReport, PluginMarketplaceEntry } from '@shared/agents/types';
import { envId } from '../../utils/format';
import { AddMarketplaceDialog } from './AddMarketplaceDialog';
import { AddPluginDialog } from './AddPluginDialog';
import { formatPluginMessage } from './pluginMessage';
import type { PluginManagerApi, PluginNotify } from './types';

type SectionTab = 'plugins' | 'marketplaces';

// 直近の操作（削除・切り替え）の失敗。見出しと、理由（CLI の出力や失敗理由の文言）を画面に残す。
interface OperationError {
    title: string;
    detail: string;
}

interface Props {
    api: PluginManagerApi;
    env: AgentEnvironment;
    onNotify: PluginNotify;
    // 操作の実行中かどうかの変化を、環境 ID（envId）とともに受け取る。
    onBusyChange: (id: string, busy: boolean) => void;
}

/**
 * 1 環境分のプラグイン管理セクション。
 * 「インストール済み」「マーケットプレイス」をタブで分離し、
 * プラグインの追加（マーケットプレイスから / 個別リポジトリから）・アンインストール・
 * マーケットプレイスの追加・削除を行う。操作の実行中かどうかを onBusyChange で知らせる
 * （アンマウント時は実行中でないものとして知らせる）。
 */
export const PluginEnvSection: React.FC<Props> = ({ api, env, onNotify, onBusyChange }) => {
    const { t } = useTranslation();
    const [report, setReport] = useState<PluginEnvReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<SectionTab>('plugins');
    const [busy, setBusy] = useState(false);
    const [uninstallTarget, setUninstallTarget] = useState<PluginEntry | null>(null);
    const [removeMarketTarget, setRemoveMarketTarget] = useState<PluginMarketplaceEntry | null>(null);
    const [opError, setOpError] = useState<OperationError | null>(null);
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

    useEffect(() => {
        onBusyChange(envId(env), busy);
    }, [busy, env, onBusyChange]);
    useEffect(() => () => onBusyChange(envId(env), false), [env, onBusyChange]);

    const handleUninstall = async () => {
        if (!uninstallTarget) {
            return;
        }
        const target = uninstallTarget;
        setUninstallTarget(null);
        setBusy(true);
        setOpError(null);
        try {
            // 確認画面で一緒に削除されると示した名前を渡し、それを超える削除は行わせない。
            const result = await api.uninstall(env, target.id, target.sameRepoPlugins ?? []);
            if (result.ok) {
                onNotify(t('pluginManager.uninstallSuccess'), 'success');
                await load();
            } else {
                console.error('Plugin uninstall failed:', result.message);
                setOpError({
                    title: t('pluginManager.uninstallError'),
                    detail: formatPluginMessage(t, result.message),
                });
                onNotify(t('pluginManager.uninstallError'), 'error');
                // 一緒に削除される対象が確認後に変わったときは、一覧を取り直して確認し直せるようにする。
                if (result.message === 'needs-reconfirm') {
                    await load();
                }
            }
        } catch (error) {
            console.error('Plugin uninstall failed:', error);
            setOpError({ title: t('pluginManager.uninstallError'), detail: formatPluginMessage(t, String(error)) });
            onNotify(t('pluginManager.uninstallError'), 'error');
        } finally {
            setBusy(false);
        }
    };

    const handleToggleEnabled = async (id: string, enabled: boolean) => {
        setBusy(true);
        setOpError(null);
        try {
            const result = await api.setEnabled(env, id, enabled);
            if (result.ok) {
                onNotify(enabled ? t('pluginManager.enabledSuccess') : t('pluginManager.disabledSuccess'), 'success');
                await load();
            } else {
                console.error('Plugin enable/disable failed:', result.message);
                setOpError({ title: t('pluginManager.toggleError'), detail: formatPluginMessage(t, result.message) });
                onNotify(t('pluginManager.toggleError'), 'error');
            }
        } catch (error) {
            console.error('Plugin enable/disable failed:', error);
            setOpError({ title: t('pluginManager.toggleError'), detail: formatPluginMessage(t, String(error)) });
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
        setOpError(null);
        try {
            const result = await api.removeMarketplace(env, target.name);
            if (result.ok) {
                onNotify(t('pluginManager.removeMarketSuccess'), 'success');
                await load();
            } else {
                console.error('Marketplace remove failed:', result.message);
                setOpError({
                    title: t('pluginManager.removeMarketError'),
                    detail: formatPluginMessage(t, result.message),
                });
                onNotify(t('pluginManager.removeMarketError'), 'error');
            }
        } catch (error) {
            console.error('Marketplace remove failed:', error);
            setOpError({ title: t('pluginManager.removeMarketError'), detail: formatPluginMessage(t, String(error)) });
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
            <Tabs
                value={tab}
                onChange={(_, v: SectionTab) => setTab(v)}
                sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
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
                            {formatPluginMessage(t, report.error)}
                        </Typography>
                    </Alert>
                )}
                {report.warningKey && (
                    <Alert severity='warning' sx={{ mb: 2 }}>
                        {t(report.warningKey)}
                    </Alert>
                )}
                {opError && (
                    <Alert severity='error' sx={{ mb: 2 }} onClose={() => setOpError(null)}>
                        {opError.title}
                        {opError.detail.length > 0 && (
                            <Typography component='pre' variant='caption' sx={{ whiteSpace: 'pre-wrap', m: 0 }}>
                                {opError.detail}
                            </Typography>
                        )}
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
                                    {report.plugins.map(p => {
                                        // 変更できない理由は、行の注記があればそれを、無ければ共通の説明を示す。
                                        const note = p.noteKey ? t(p.noteKey) : null;
                                        const toggleTooltip =
                                            p.toggleable === false
                                                ? (note ?? t('pluginManager.notToggleable'))
                                                : t(p.enabled ? 'pluginManager.disable' : 'pluginManager.enable');
                                        const uninstallTooltip =
                                            p.uninstallable === false
                                                ? (note ?? t('pluginManager.notUninstallable'))
                                                : '';
                                        return (
                                            <TableRow key={p.id} hover>
                                                <TableCell sx={{ fontWeight: 500, wordBreak: 'break-all' }}>
                                                    {p.name}
                                                    {note && (
                                                        <Typography
                                                            variant='caption'
                                                            color='text.secondary'
                                                            sx={{
                                                                display: 'block',
                                                                fontWeight: 400,
                                                                wordBreak: 'normal',
                                                            }}
                                                        >
                                                            {note}
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell sx={{ wordBreak: 'break-all' }}>
                                                    {p.version ?? '-'}
                                                </TableCell>
                                                <TableCell sx={{ wordBreak: 'break-all' }}>
                                                    {p.marketplace ?? '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <Tooltip title={toggleTooltip}>
                                                        <span>
                                                            <IconButton
                                                                size='large'
                                                                color={p.enabled ? 'success' : 'error'}
                                                                disabled={busy || p.toggleable === false}
                                                                onClick={() => handleToggleEnabled(p.id, !p.enabled)}
                                                            >
                                                                {p.enabled ? (
                                                                    <EnableIcon sx={{ fontSize: 40 }} />
                                                                ) : (
                                                                    <DisableIcon sx={{ fontSize: 40 }} />
                                                                )}
                                                            </IconButton>
                                                        </span>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell align='right'>
                                                    <Tooltip title={uninstallTooltip}>
                                                        <span>
                                                            <Button
                                                                size='small'
                                                                color='error'
                                                                startIcon={<DeleteIcon />}
                                                                disabled={busy || p.uninstallable === false}
                                                                onClick={() => setUninstallTarget(p)}
                                                                sx={{ textTransform: 'none' }}
                                                            >
                                                                {t('pluginManager.uninstall')}
                                                            </Button>
                                                        </span>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
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
                    {uninstallTarget?.sameRepoPlugins && uninstallTarget.sameRepoPlugins.length > 0 && (
                        <Alert severity='warning' sx={{ mt: 2 }}>
                            {t('pluginManager.uninstallSameRepo', { count: uninstallTarget.sameRepoPlugins.length })}
                            <Box component='ul' sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
                                {uninstallTarget.sameRepoPlugins.map(name => (
                                    <Typography
                                        key={name}
                                        component='li'
                                        variant='body2'
                                        sx={{ wordBreak: 'break-all' }}
                                    >
                                        {name}
                                    </Typography>
                                ))}
                            </Box>
                        </Alert>
                    )}
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
