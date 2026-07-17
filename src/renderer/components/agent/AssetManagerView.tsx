import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    Paper,
    Snackbar,
    Tab,
    Tabs,
    Typography,
} from '@mui/material';
import {
    Download as DownloadIcon,
    Upload as UploadIcon,
    DeleteOutlined as DeleteIcon,
    Refresh as RefreshIcon,
} from '@mui/icons-material';
import type { AgentEnvironment, AssetEntry, AssetKind, AssetListReport } from '@shared/agents/types';
import { envId } from '../../utils/format';
import { filterAssetEntries } from '../../utils/assetSearch';
import { AssetSearchField } from '../assets/AssetSearchField';
import { AssetEntriesTable, computeFitWidth, type FmColumn } from '../assets/AssetEntriesTable';
import type { AssetApi, Notify } from './types';

interface Props {
    agentId: string;
    api: AssetApi;
}

const FRONTMATTER_COLUMNS: Record<AssetKind, FmColumn[]> = {
    agents: [
        { key: 'name', fit: true, maxWidthPct: 0.3 },
        { key: 'description', flex: true },
    ],
    skills: [
        { key: 'name', fit: true, maxWidthPct: 0.3 },
        { key: 'description', flex: true },
    ],
};

/**
 * 1 環境分の Agent・Skill 管理セクション。
 * 既存 agent（Claude / Codex / Grok）と同じデザイン: 上部タブ、左寄せのボタン行、
 * 検索フィールド、fit 幅の name 列を持つ一覧テーブル、参照 / 全体ダイアログ。
 */
const AssetSection: React.FC<{
    agentId: string;
    api: AssetApi;
    env: AgentEnvironment;
    notify: Notify;
}> = ({ agentId, api, env, notify }) => {
    const { t } = useTranslation();
    const [tab, setTab] = useState<AssetKind>('agents');
    const kind: AssetKind = tab;
    const [reports, setReports] = useState<Record<AssetKind, AssetListReport | null>>({
        agents: null,
        skills: null,
    });
    const [loading, setLoading] = useState(true);
    const [checked, setChecked] = useState<Record<AssetKind, Set<string>>>({
        agents: new Set(),
        skills: new Set(),
    });
    const [searchQueries, setSearchQueries] = useState<Record<AssetKind, string>>({ agents: '', skills: '' });
    const [busy, setBusy] = useState(false);
    // 上書き確認: zip / md 共通。uploadKind で確定 IPC を呼び分ける。
    const [confirm, setConfirm] = useState<{
        srcPath: string;
        conflicts: string[];
        uploadKind: 'zip' | 'md';
    } | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [viewEntry, setViewEntry] = useState<AssetEntry | null>(null);
    // 「全体」参照ダイアログ（ファイル内容全体）。
    const [viewFull, setViewFull] = useState<{ name: string; content: string } | null>(null);
    // name 列の最大幅をウィンドウ幅の割合で算出するため、ウィンドウ幅を監視する。
    const [windowWidth, setWindowWidth] = useState<number>(() => window.innerWidth);

    useEffect(() => {
        const onResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const load = async () => {
        try {
            const [agents, skills] = await Promise.all([
                api.list(env, 'agents').catch(() => null),
                api.list(env, 'skills').catch(() => null),
            ]);
            setReports({ agents, skills });
            setChecked({ agents: new Set(), skills: new Set() });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
        // env は安定参照（親で固定）。マウント時に一度ロードする。
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const report = reports[kind];
    const checkedKeys = checked[kind];
    const entries = useMemo(() => report?.entries ?? [], [report]);
    const searchQuery = searchQueries[kind];
    const filteredEntries = useMemo(() => filterAssetEntries(entries, searchQuery), [entries, searchQuery]);
    const columns = FRONTMATTER_COLUMNS[kind];
    // name（fit 列）の幅を実データから見積もる。
    const fitWidth = useMemo(() => {
        const fitCol = columns.find(c => c.fit);
        if (!fitCol) {
            return 0;
        }
        const maxWidthPx = Math.round(windowWidth * (fitCol.maxWidthPct ?? 0.25));
        return computeFitWidth(filteredEntries, maxWidthPx, true);
    }, [columns, filteredEntries, windowWidth]);
    // ファイル数列は skills のみ表示（agents は 1 ファイル固定なので不要）。
    const showFileCount = kind === 'skills';
    const selectedEntries = filteredEntries.filter(entry => checkedKeys.has(entry.relPath));
    const someChecked = selectedEntries.length > 0;

    const setKindSearchQuery = (query: string) => {
        setSearchQueries(prev => ({ ...prev, [kind]: query }));
    };

    const setKindChecked = (next: Set<string>) => {
        setChecked(prev => ({ ...prev, [kind]: next }));
    };

    const toggle = (relPath: string) => {
        const next = new Set(checkedKeys);
        if (next.has(relPath)) {
            next.delete(relPath);
        } else {
            next.add(relPath);
        }
        setKindChecked(next);
    };

    const allChecked = filteredEntries.length > 0 && filteredEntries.every(e => checkedKeys.has(e.relPath));
    const toggleAll = () => {
        const next = new Set(checkedKeys);
        for (const entry of filteredEntries) {
            if (allChecked) {
                next.delete(entry.relPath);
            } else {
                next.add(entry.relPath);
            }
        }
        setKindChecked(next);
    };

    const handleViewFull = async (entry: AssetEntry) => {
        try {
            const result = await api.readEntry(env, kind, entry.relPath);
            if (!result.ok || result.content === undefined) {
                notify(t(`${agentId}.assets.viewFullError`), 'error');
                return;
            }
            setViewFull({ name: entry.name, content: result.content });
        } catch {
            notify(t(`${agentId}.assets.viewFullError`), 'error');
        }
    };

    const handleReveal = async (entry: AssetEntry) => {
        try {
            const result = await api.revealEntry(env, kind, entry.relPath);
            if (!result.ok) {
                notify(t('common.revealInFileManagerError'), 'error');
            }
        } catch {
            notify(t('common.revealInFileManagerError'), 'error');
        }
    };

    const handleDownload = async () => {
        const relPaths = selectedEntries.map(entry => entry.relPath);
        if (relPaths.length === 0) {
            return;
        }
        setBusy(true);
        try {
            const result = await api.download(env, kind, relPaths);
            if (result.canceled) {
                return;
            }
            if (result.ok) {
                notify(t(`${agentId}.assets.downloadSuccess`), 'success');
            } else {
                notify(t(`${agentId}.assets.downloadError`), 'error');
            }
        } catch {
            notify(t(`${agentId}.assets.downloadError`), 'error');
        } finally {
            setBusy(false);
        }
    };

    const handleUploadClick = async () => {
        setBusy(true);
        try {
            const result = await api.inspectUpload(env, kind);
            if (result.canceled) {
                return;
            }
            if (!result.ok) {
                notify(t(`${agentId}.assets.uploadError`), 'error');
                return;
            }
            const uploadKind = (result.uploadKind ?? 'zip') as 'zip' | 'md';
            const srcPath = uploadKind === 'md' ? result.srcPath : result.zipPath;
            if (!srcPath) {
                notify(t(`${agentId}.assets.uploadError`), 'error');
                return;
            }
            const conflicts = result.conflicts ?? [];
            if (conflicts.length > 0) {
                setConfirm({ srcPath, conflicts, uploadKind });
                return;
            }
            await runUpload(srcPath, uploadKind, false);
        } catch {
            notify(t(`${agentId}.assets.uploadError`), 'error');
        } finally {
            setBusy(false);
        }
    };

    const runUpload = async (srcPath: string, uploadKind: 'zip' | 'md', overwrite: boolean) => {
        const result =
            uploadKind === 'md'
                ? await api.uploadFile(env, kind, srcPath, overwrite)
                : await api.upload(env, kind, srcPath, overwrite);
        if (result.ok) {
            notify(t(`${agentId}.assets.uploadSuccess`, { count: result.importedCount ?? 0 }), 'success');
            await load();
        } else {
            notify(t(`${agentId}.assets.uploadError`), 'error');
        }
    };

    const handleConfirmOverwrite = async () => {
        if (!confirm) {
            return;
        }
        const { srcPath, uploadKind } = confirm;
        setConfirm(null);
        setBusy(true);
        try {
            await runUpload(srcPath, uploadKind, true);
        } catch {
            notify(t(`${agentId}.assets.uploadError`), 'error');
        } finally {
            setBusy(false);
        }
    };

    const handleConfirmDelete = async () => {
        setDeleteConfirmOpen(false);
        const relPaths = selectedEntries.map(entry => entry.relPath);
        if (relPaths.length === 0) {
            return;
        }
        setBusy(true);
        try {
            const result = await api.deleteSelected(env, kind, relPaths);
            if (result.ok) {
                notify(t(`${agentId}.assets.deleteSuccess`, { count: result.deletedCount ?? 0 }), 'success');
            } else if ((result.deletedCount ?? 0) > 0 || (result.skipped?.length ?? 0) > 0) {
                notify(t(`${agentId}.assets.deletePartial`), 'warning');
            } else {
                notify(t(`${agentId}.assets.deleteError`), 'error');
            }
            await load();
        } catch {
            notify(t(`${agentId}.assets.deleteError`), 'error');
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

    return (
        <Paper variant='outlined' sx={{ mb: 3 }}>
            <Tabs value={tab} onChange={(_, v: AssetKind) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tab value='agents' label={t(`${agentId}.assets.tabAgents`)} />
                <Tab value='skills' label={t(`${agentId}.assets.tabSkills`)} />
            </Tabs>

            <Box sx={{ p: 2 }}>
                {report && !report.available ? (
                    <Alert severity='info'>{t(`${agentId}.assets.unavailable`)}</Alert>
                ) : (
                    <>
                        <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
                            <Button
                                variant='contained'
                                size='small'
                                startIcon={<DownloadIcon />}
                                disabled={busy || !someChecked}
                                onClick={handleDownload}
                            >
                                {t(`${agentId}.assets.download`)}
                            </Button>
                            <Button
                                variant='outlined'
                                size='small'
                                startIcon={<UploadIcon />}
                                disabled={busy}
                                onClick={handleUploadClick}
                            >
                                {t(`${agentId}.assets.upload`)}
                            </Button>
                            <Button
                                variant='outlined'
                                color='error'
                                size='small'
                                startIcon={<DeleteIcon />}
                                disabled={busy || !someChecked}
                                onClick={() => setDeleteConfirmOpen(true)}
                            >
                                {t(`${agentId}.assets.delete`)}
                            </Button>
                        </Box>

                        <AssetSearchField value={searchQuery} onChange={setKindSearchQuery} />

                        {entries.length === 0 ? (
                            <Typography color='text.secondary' sx={{ py: 1 }}>
                                {t(`${agentId}.assets.noEntries`)}
                            </Typography>
                        ) : filteredEntries.length === 0 ? (
                            <Typography color='text.secondary' sx={{ py: 1 }}>
                                {t('common.noSearchResults')}
                            </Typography>
                        ) : (
                            <AssetEntriesTable
                                i18nPrefix={`${agentId}.assets`}
                                entries={filteredEntries}
                                columns={columns}
                                fitWidth={fitWidth}
                                showFileCount={showFileCount}
                                showLastModified
                                checkedKeys={checkedKeys}
                                onToggle={toggle}
                                onToggleAll={toggleAll}
                                onView={setViewEntry}
                                onReveal={handleReveal}
                                onViewFull={handleViewFull}
                            />
                        )}
                    </>
                )}
            </Box>

            {/* 上書き確認ダイアログ（zip / md 共通） */}
            <Dialog open={confirm !== null} onClose={() => setConfirm(null)}>
                <DialogTitle>{t(`${agentId}.assets.overwriteTitle`)}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {t(`${agentId}.assets.overwriteBody`, {
                            count: confirm?.conflicts.length ?? 0,
                            names: (confirm?.conflicts ?? []).join(', '),
                        })}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirm(null)}>{t(`${agentId}.assets.cancel`)}</Button>
                    <Button color='error' variant='contained' onClick={handleConfirmOverwrite}>
                        {t(`${agentId}.assets.overwrite`)}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* 削除確認ダイアログ */}
            <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
                <DialogTitle>{t(`${agentId}.assets.deleteConfirmTitle`)}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {t(`${agentId}.assets.deleteConfirmBody`, { count: selectedEntries.length })}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmOpen(false)}>{t(`${agentId}.assets.cancel`)}</Button>
                    <Button color='error' variant='contained' onClick={handleConfirmDelete}>
                        {t(`${agentId}.assets.delete`)}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* frontmatter 参照ダイアログ */}
            <Dialog open={viewEntry !== null} onClose={() => setViewEntry(null)} maxWidth='md' fullWidth>
                <DialogTitle>{t(`${agentId}.assets.viewTitle`, { name: viewEntry?.name ?? '' })}</DialogTitle>
                <DialogContent>
                    <Box
                        component='pre'
                        sx={{
                            m: 0,
                            p: 2,
                            bgcolor: 'action.hover',
                            borderRadius: 1,
                            fontFamily: 'monospace',
                            fontSize: '0.85rem',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                        }}
                    >
                        {viewEntry?.frontmatterRaw ?? ''}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setViewEntry(null)}>{t(`${agentId}.assets.close`)}</Button>
                </DialogActions>
            </Dialog>

            {/* 内容全体参照ダイアログ */}
            <Dialog open={viewFull !== null} onClose={() => setViewFull(null)} maxWidth='md' fullWidth>
                <DialogTitle>{t(`${agentId}.assets.viewFullTitle`, { name: viewFull?.name ?? '' })}</DialogTitle>
                <DialogContent>
                    <Box
                        component='pre'
                        sx={{
                            m: 0,
                            p: 2,
                            bgcolor: 'action.hover',
                            borderRadius: 1,
                            fontFamily: 'monospace',
                            fontSize: '0.85rem',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                        }}
                    >
                        {viewFull?.content ?? ''}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setViewFull(null)}>{t(`${agentId}.assets.close`)}</Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

export const AssetManagerView: React.FC<Props> = ({ agentId, api }) => {
    const { t } = useTranslation();
    const [environments, setEnvironments] = useState<{ env: AgentEnvironment; label: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [reload, setReload] = useState(0);
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error' | 'warning';
    }>({ open: false, message: '', severity: 'success' });

    const load = async () => {
        setLoading(true);
        try {
            setEnvironments(await api.getEnvironments());
            setReload(value => value + 1);
        } catch (error) {
            console.error('Failed to load asset manager environments:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
        // api is a stable preload bridge.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const notify: Notify = (message, severity) => setSnackbar({ open: true, message, severity });

    if (loading) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography>{t('common.loading')}</Typography>
            </Box>
        );
    }

    const nativeEnvs = environments.filter(item => item.env.kind === 'native');
    const wslEnvs = environments.filter(item => item.env.kind === 'wsl');

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                <Box>
                    <Typography variant='h4' component='h1' sx={{ mb: 1 }}>
                        {t(`${agentId}.assets.title`)}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                        {t(`${agentId}.assets.descriptionText`)}
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

            {nativeEnvs.map(item => (
                <Box key={`${envId(item.env)}-${reload}`}>
                    <Typography variant='h6' sx={{ mb: 1 }}>
                        {item.label}
                    </Typography>
                    <AssetSection agentId={agentId} api={api} env={item.env} notify={notify} />
                </Box>
            ))}

            {wslEnvs.length > 0 && (
                <>
                    <Divider sx={{ my: 3 }} />
                    <Typography variant='h5' sx={{ mb: 2 }}>
                        WSL
                    </Typography>
                    {wslEnvs.map(item => (
                        <Box key={`${envId(item.env)}-${reload}`}>
                            <Typography variant='h6' sx={{ mb: 1 }}>
                                {t(`${agentId}.assets.wslSection`, { distro: item.label })}
                            </Typography>
                            <AssetSection agentId={agentId} api={api} env={item.env} notify={notify} />
                        </Box>
                    ))}
                </>
            )}

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar(current => ({ ...current, open: false }))}
            >
                <Alert
                    severity={snackbar.severity}
                    onClose={() => setSnackbar(current => ({ ...current, open: false }))}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};
