import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box,
    Paper,
    Tabs,
    Tab,
    Button,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Typography,
    Tooltip,
    CircularProgress,
} from '@mui/material';
import {
    Download as DownloadIcon,
    Upload as UploadIcon,
    DeleteOutlined as DeleteIcon,
    CloudDownloadOutlined as CloudDownloadIcon,
} from '@mui/icons-material';
import type { AssetEntry, AssetKind, AssetListReport, CodexEnvironment } from '@shared/agents/codex/types';
import { AssetEntriesTable, computeFitWidth, type FmColumn } from './AssetEntriesTable';

// セクションのタブ値: エージェント / スキル（AssetKind）に加え、設定タブを持つ。
type SectionTab = AssetKind;
// 単体ファイルアップロードの種別（zip 以外）。skills=md、agents=toml。
type UploadKind = 'zip' | 'md' | 'toml';

interface Props {
    env: CodexEnvironment;
    onNotify: (message: string, severity: 'success' | 'error' | 'warning') => void;
}

const FRONTMATTER_COLUMNS: Record<AssetKind, FmColumn[]> = {
    agents: [
        { key: 'name', fit: true, maxWidthPct: 0.3 },
        { key: 'model', width: 120 },
        { key: 'description', flex: true },
    ],
    skills: [
        { key: 'name', fit: true, maxWidthPct: 0.3 },
        { key: 'description', flex: true },
    ],
};

// 公式スキルダイアログの一覧は skills 列構成（name + description）を使う。
const OFFICIAL_COLUMNS: FmColumn[] = FRONTMATTER_COLUMNS.skills;

/**
 * 1 環境分の Agent・Skill 管理セクション。
 * 「エージェント」「スキル」「設定」をタブで分離する。
 * スキルタブでは公式スキル（openai/skills）の取り込みも行える（git が必要）。
 */
export const AssetManagerSection: React.FC<Props> = ({ env, onNotify }) => {
    const { t } = useTranslation();
    const [tab, setTab] = useState<SectionTab>('agents');
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
    const [busy, setBusy] = useState(false);
    const [confirm, setConfirm] = useState<{
        srcPath: string;
        conflicts: string[];
        uploadKind: UploadKind;
    } | null>(null);
    const [kindWarn, setKindWarn] = useState<{
        srcPath: string;
        conflicts: string[];
        uploadKind: UploadKind;
        reason: string;
    } | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [viewEntry, setViewEntry] = useState<AssetEntry | null>(null);
    const [windowWidth, setWindowWidth] = useState<number>(() => window.innerWidth);

    // 公式スキルインポート関連。
    const [gitAvailable, setGitAvailable] = useState(false);
    const [officialOpen, setOfficialOpen] = useState(false);
    const [officialEntries, setOfficialEntries] = useState<AssetEntry[]>([]);
    const [officialChecked, setOfficialChecked] = useState<Set<string>>(new Set());
    const [officialLoading, setOfficialLoading] = useState(false);

    useEffect(() => {
        const onResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const load = async () => {
        try {
            const [agents, skills] = await Promise.all([
                window.agentCliDevkit.codex.asset.list(env, 'agents').catch(() => null),
                window.agentCliDevkit.codex.asset.list(env, 'skills').catch(() => null),
            ]);
            setReports({ agents, skills });
            setChecked({ agents: new Set(), skills: new Set() });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        window.agentCliDevkit.codex.asset
            .isGitAvailable()
            .then(setGitAvailable)
            .catch(() => setGitAvailable(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const report = reports[kind];
    const checkedKeys = checked[kind];
    const entries = useMemo(() => report?.entries ?? [], [report]);
    const columns = FRONTMATTER_COLUMNS[kind];
    const fitWidth = useMemo(() => {
        const fitCol = columns.find(c => c.fit);
        if (!fitCol) {
            return 0;
        }
        const maxWidthPx = Math.round(windowWidth * (fitCol.maxWidthPct ?? 0.25));
        return computeFitWidth(entries, maxWidthPx);
    }, [columns, entries, windowWidth]);
    const officialFitWidth = useMemo(() => {
        const fitCol = OFFICIAL_COLUMNS.find(c => c.fit);
        if (!fitCol) {
            return 0;
        }
        const maxWidthPx = Math.round(windowWidth * (fitCol.maxWidthPct ?? 0.25));
        return computeFitWidth(officialEntries, maxWidthPx);
    }, [officialEntries, windowWidth]);
    // ファイル数列は skills のみ表示（agents は 1 ファイル固定なので不要）。
    const showFileCount = kind === 'skills';
    const someChecked = entries.some(e => checkedKeys.has(e.relPath));

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

    const allChecked = entries.length > 0 && entries.every(e => checkedKeys.has(e.relPath));
    const toggleAll = () => {
        if (allChecked) {
            setKindChecked(new Set());
        } else {
            setKindChecked(new Set(entries.map(e => e.relPath)));
        }
    };

    const handleDownload = async () => {
        const relPaths = entries.filter(e => checkedKeys.has(e.relPath)).map(e => e.relPath);
        if (relPaths.length === 0) {
            return;
        }
        setBusy(true);
        try {
            const result = await window.agentCliDevkit.codex.asset.download(env, kind, relPaths);
            if (result.canceled) {
                return;
            }
            if (result.ok) {
                onNotify(t('codex.assetManager.downloadSuccess'), 'success');
            } else {
                onNotify(t('codex.assetManager.downloadError'), 'error');
            }
        } catch {
            onNotify(t('codex.assetManager.downloadError'), 'error');
        } finally {
            setBusy(false);
        }
    };

    const handleUploadClick = async () => {
        setBusy(true);
        try {
            const result = await window.agentCliDevkit.codex.asset.inspectUpload(env, kind);
            if (result.canceled) {
                return;
            }
            if (!result.ok) {
                const msg = result.message ?? '';
                if (msg.startsWith('kind-block-')) {
                    onNotify(t(`codex.assetManager.kindBlock.${msg.slice('kind-block-'.length)}`), 'error');
                } else {
                    onNotify(
                        t(msg === 'md-no-name' ? 'codex.assetManager.mdNoName' : 'codex.assetManager.uploadError'),
                        'error'
                    );
                }
                return;
            }
            const uploadKind = (result.uploadKind ?? 'zip') as UploadKind;
            const srcPath = uploadKind === 'zip' ? result.zipPath : result.srcPath;
            if (!srcPath) {
                onNotify(t('codex.assetManager.uploadError'), 'error');
                return;
            }
            const conflicts = result.conflicts ?? [];
            if (result.kindCheck === 'warn') {
                setKindWarn({ srcPath, conflicts, uploadKind, reason: result.kindMessage ?? '' });
                return;
            }
            await proceedUpload(srcPath, uploadKind, conflicts);
        } catch {
            onNotify(t('codex.assetManager.uploadError'), 'error');
        } finally {
            setBusy(false);
        }
    };

    const proceedUpload = async (srcPath: string, uploadKind: UploadKind, conflicts: string[]) => {
        if (conflicts.length > 0) {
            setConfirm({ srcPath, conflicts, uploadKind });
            return;
        }
        await runUpload(srcPath, uploadKind, false);
    };

    const handleConfirmKindWarn = async () => {
        if (!kindWarn) {
            return;
        }
        const { srcPath, uploadKind, conflicts } = kindWarn;
        setKindWarn(null);
        setBusy(true);
        try {
            await proceedUpload(srcPath, uploadKind, conflicts);
        } catch {
            onNotify(t('codex.assetManager.uploadError'), 'error');
        } finally {
            setBusy(false);
        }
    };

    const runUpload = async (srcPath: string, uploadKind: UploadKind, overwrite: boolean) => {
        const result =
            uploadKind === 'zip'
                ? await window.agentCliDevkit.codex.asset.upload(env, kind, srcPath, overwrite)
                : await window.agentCliDevkit.codex.asset.uploadFile(env, kind, srcPath, overwrite);
        if (result.ok) {
            onNotify(t('codex.assetManager.uploadSuccess', { count: result.importedCount ?? 0 }), 'success');
            await load();
        } else {
            onNotify(
                t(result.message === 'md-no-name' ? 'codex.assetManager.mdNoName' : 'codex.assetManager.uploadError'),
                'error'
            );
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
            onNotify(t('codex.assetManager.uploadError'), 'error');
        } finally {
            setBusy(false);
        }
    };

    const handleConfirmDelete = async () => {
        setDeleteConfirmOpen(false);
        const relPaths = entries.filter(e => checkedKeys.has(e.relPath)).map(e => e.relPath);
        if (relPaths.length === 0) {
            return;
        }
        setBusy(true);
        try {
            const result = await window.agentCliDevkit.codex.asset.deleteSelected(env, kind, relPaths);
            if (result.ok) {
                onNotify(t('codex.assetManager.deleteSuccess', { count: result.deletedCount ?? 0 }), 'success');
            } else if ((result.deletedCount ?? 0) > 0 || (result.skipped?.length ?? 0) > 0) {
                onNotify(t('codex.assetManager.deletePartial'), 'warning');
            } else {
                onNotify(t('codex.assetManager.deleteError'), 'error');
            }
            await load();
        } catch {
            onNotify(t('codex.assetManager.deleteError'), 'error');
        } finally {
            setBusy(false);
        }
    };

    const handleOpenOfficial = async () => {
        setBusy(true);
        setOfficialLoading(true);
        setOfficialOpen(true);
        setOfficialEntries([]);
        setOfficialChecked(new Set());
        try {
            const result = await window.agentCliDevkit.codex.asset.listOfficialSkills();
            if (result.ok && result.entries) {
                setOfficialEntries(result.entries);
            } else {
                onNotify(t('codex.assetManager.officialListError'), 'error');
                setOfficialOpen(false);
            }
        } catch {
            onNotify(t('codex.assetManager.officialListError'), 'error');
            setOfficialOpen(false);
        } finally {
            setOfficialLoading(false);
            setBusy(false);
        }
    };

    const toggleOfficial = (relPath: string) => {
        const next = new Set(officialChecked);
        if (next.has(relPath)) {
            next.delete(relPath);
        } else {
            next.add(relPath);
        }
        setOfficialChecked(next);
    };

    const officialAllChecked = officialEntries.length > 0 && officialEntries.every(e => officialChecked.has(e.relPath));
    const toggleOfficialAll = () => {
        if (officialAllChecked) {
            setOfficialChecked(new Set());
        } else {
            setOfficialChecked(new Set(officialEntries.map(e => e.relPath)));
        }
    };

    const handleImportOfficial = async () => {
        const relPaths = officialEntries.filter(e => officialChecked.has(e.relPath)).map(e => e.relPath);
        if (relPaths.length === 0) {
            return;
        }
        setBusy(true);
        try {
            const result = await window.agentCliDevkit.codex.asset.importOfficialSkills(env, relPaths);
            if (result.ok) {
                onNotify(
                    t('codex.assetManager.officialImportSuccess', { count: result.importedCount ?? 0 }),
                    'success'
                );
                setOfficialOpen(false);
                await load();
            } else {
                onNotify(t('codex.assetManager.officialImportError'), 'error');
            }
        } catch {
            onNotify(t('codex.assetManager.officialImportError'), 'error');
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
            <Tabs
                value={tab}
                onChange={(_, v: SectionTab) => setTab(v)}
                sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
                <Tab value='agents' label={t('codex.assetManager.tabAgents')} />
                <Tab value='skills' label={t('codex.assetManager.tabSkills')} />
            </Tabs>

            <Box sx={{ p: 2 }}>
                {report && !report.available ? (
                    <Alert severity='info'>{t('codex.assetManager.unavailable')}</Alert>
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
                                {t('codex.assetManager.download')}
                            </Button>
                            <Button
                                variant='outlined'
                                size='small'
                                startIcon={<UploadIcon />}
                                disabled={busy}
                                onClick={handleUploadClick}
                            >
                                {t('codex.assetManager.upload')}
                            </Button>
                            <Button
                                variant='outlined'
                                color='error'
                                size='small'
                                startIcon={<DeleteIcon />}
                                disabled={busy || !someChecked}
                                onClick={() => setDeleteConfirmOpen(true)}
                            >
                                {t('codex.assetManager.delete')}
                            </Button>
                            {kind === 'skills' && (
                                <>
                                    <Box sx={{ flexGrow: 1 }} />
                                    <Tooltip title={gitAvailable ? '' : t('codex.assetManager.gitRequired')}>
                                        <span>
                                            <Button
                                                variant='outlined'
                                                size='small'
                                                startIcon={<CloudDownloadIcon />}
                                                disabled={busy || !gitAvailable}
                                                onClick={handleOpenOfficial}
                                            >
                                                {t('codex.assetManager.importOfficial')}
                                            </Button>
                                        </span>
                                    </Tooltip>
                                </>
                            )}
                        </Box>

                        {entries.length === 0 ? (
                            <Typography color='text.secondary' sx={{ py: 1 }}>
                                {t('codex.assetManager.noEntries')}
                            </Typography>
                        ) : (
                            <AssetEntriesTable
                                entries={entries}
                                columns={columns}
                                fitWidth={fitWidth}
                                showFileCount={showFileCount}
                                showLastModified
                                checkedKeys={checkedKeys}
                                onToggle={toggle}
                                onToggleAll={toggleAll}
                                onView={setViewEntry}
                            />
                        )}
                    </>
                )}
            </Box>

            {/* 種別不一致の警告ダイアログ（続行 / キャンセル） */}
            <Dialog open={kindWarn !== null} onClose={() => setKindWarn(null)}>
                <DialogTitle>{t('codex.assetManager.kindWarnTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {kindWarn ? t(`codex.assetManager.kindWarn.${kindWarn.reason}`) : ''}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setKindWarn(null)}>{t('codex.assetManager.cancel')}</Button>
                    <Button color='warning' variant='contained' onClick={handleConfirmKindWarn}>
                        {t('codex.assetManager.kindWarnContinue')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* 上書き確認ダイアログ */}
            <Dialog open={confirm !== null} onClose={() => setConfirm(null)}>
                <DialogTitle>{t('codex.assetManager.overwriteConfirmTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {t('codex.assetManager.overwriteConfirmBody', {
                            count: confirm?.conflicts.length ?? 0,
                            names: (confirm?.conflicts ?? []).join(', '),
                        })}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirm(null)}>{t('codex.assetManager.cancel')}</Button>
                    <Button color='error' variant='contained' onClick={handleConfirmOverwrite}>
                        {t('codex.assetManager.overwrite')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* 削除確認ダイアログ */}
            <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
                <DialogTitle>{t('codex.assetManager.deleteConfirmTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {t('codex.assetManager.deleteConfirmBody', { count: checkedKeys.size })}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmOpen(false)}>{t('codex.assetManager.cancel')}</Button>
                    <Button color='error' variant='contained' onClick={handleConfirmDelete}>
                        {t('codex.assetManager.delete')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* メタ情報（ヘッダー）参照ダイアログ */}
            <Dialog open={viewEntry !== null} onClose={() => setViewEntry(null)} maxWidth='md' fullWidth>
                <DialogTitle>{t('codex.assetManager.viewTitle', { name: viewEntry?.name ?? '' })}</DialogTitle>
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
                    <Button onClick={() => setViewEntry(null)}>{t('codex.assetManager.close')}</Button>
                </DialogActions>
            </Dialog>

            {/* 公式スキルインポートダイアログ */}
            <Dialog open={officialOpen} onClose={() => !busy && setOfficialOpen(false)} maxWidth='lg' fullWidth>
                <DialogTitle>{t('codex.assetManager.importOfficialTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>{t('codex.assetManager.importOfficialDesc')}</DialogContentText>
                    {officialLoading ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
                            <CircularProgress size={20} />
                            <Typography color='text.secondary'>{t('codex.assetManager.repoUpdating')}</Typography>
                        </Box>
                    ) : officialEntries.length === 0 ? (
                        <Typography color='text.secondary' sx={{ py: 1 }}>
                            {t('codex.assetManager.noEntries')}
                        </Typography>
                    ) : (
                        <AssetEntriesTable
                            entries={officialEntries}
                            columns={OFFICIAL_COLUMNS}
                            fitWidth={officialFitWidth}
                            showFileCount
                            checkedKeys={officialChecked}
                            onToggle={toggleOfficial}
                            onToggleAll={toggleOfficialAll}
                            onView={setViewEntry}
                        />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOfficialOpen(false)} disabled={busy}>
                        {t('codex.assetManager.cancel')}
                    </Button>
                    <Button
                        variant='contained'
                        startIcon={<CloudDownloadIcon />}
                        onClick={handleImportOfficial}
                        disabled={busy || officialChecked.size === 0}
                    >
                        {t('codex.assetManager.import')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};
