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
import type { AssetEntry, AssetKind, AssetListReport, ClaudeEnvironment } from '@shared/agents/claude/types';
import { AssetSearchField } from '../../components/assets/AssetSearchField';
import { filterAssetEntries } from '../../utils/assetSearch';
import { AssetEntriesTable, computeFitWidth, type FmColumn } from './AssetEntriesTable';

// セクションのタブ値: エージェント / スキル（AssetKind）に加え、設定タブを持つ。
type SectionTab = AssetKind;

interface Props {
    env: ClaudeEnvironment;
    onNotify: (message: string, severity: 'success' | 'error' | 'warning') => void;
}

const FRONTMATTER_COLUMNS: Record<AssetKind, FmColumn[]> = {
    agents: [
        { key: 'name', fit: true, maxWidthPct: 0.3 },
        { key: 'model', width: 90 },
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
 * 「エージェント」「スキル」をタブで分離し、各タブで一覧 / ダウンロード / アップロードを行う。
 * スキルタブでは公式スキル（anthropics/skills）の取り込みも行える（git が必要）。
 * 各エントリの frontmatter（ヘッダー部）を固定列で展開表示し、「参照」で生のヘッダー部全体を見られる。
 */
export const AssetManagerSection: React.FC<Props> = ({ env, onNotify }) => {
    const { t } = useTranslation();
    // 表示中のタブ（エージェント / スキル）。
    const [tab, setTab] = useState<SectionTab>('agents');
    // 資産（エージェント/スキル）操作で使う種別。
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
    const [searchQueries, setSearchQueries] = useState<Record<AssetKind, string>>({
        agents: '',
        skills: '',
    });
    const [busy, setBusy] = useState(false);
    // 上書き確認: zip / md 共通。uploadKind で確定 IPC を呼び分ける。
    const [confirm, setConfirm] = useState<{
        srcPath: string;
        conflicts: string[];
        uploadKind: 'zip' | 'md';
    } | null>(null);
    // 種別不一致の警告（続行 / キャンセル）。続行時は通常フロー（衝突確認 → アップロード）へ進む。
    const [kindWarn, setKindWarn] = useState<{
        srcPath: string;
        conflicts: string[];
        uploadKind: 'zip' | 'md';
        reason: string;
    } | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [viewEntry, setViewEntry] = useState<AssetEntry | null>(null);
    // 「全体」参照ダイアログ（ファイル内容全体）。
    const [viewFull, setViewFull] = useState<{ name: string; content: string } | null>(null);

    // エントリの内容全体（agents=ファイル本体 / skills=SKILL.md）を読み込んで表示する。
    const handleViewFull = async (entry: AssetEntry) => {
        try {
            const result = await window.agentCliDevkit.claude.asset.readEntry(env, kind, entry.relPath);
            if (!result.ok || result.content === undefined) {
                onNotify(t('claude.assetManager.viewFullError'), 'error');
                return;
            }
            setViewFull({ name: entry.name, content: result.content });
        } catch {
            onNotify(t('claude.assetManager.viewFullError'), 'error');
        }
    };

    const handleReveal = async (entry: AssetEntry) => {
        try {
            const result = await window.agentCliDevkit.claude.asset.revealEntry(env, kind, entry.relPath);
            if (!result.ok) {
                onNotify(t('common.revealInFileManagerError'), 'error');
            }
        } catch {
            onNotify(t('common.revealInFileManagerError'), 'error');
        }
    };
    // name 列の最大幅をウィンドウ幅の割合で算出するため、ウィンドウ幅を監視する。
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
                window.agentCliDevkit.claude.asset.list(env, 'agents').catch(() => null),
                window.agentCliDevkit.claude.asset.list(env, 'skills').catch(() => null),
            ]);
            setReports({ agents, skills });
            setChecked({ agents: new Set(), skills: new Set() });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // git の利用可否を判定（公式スキルインポートボタンの活性に使う）。
        window.agentCliDevkit.claude.asset
            .isGitAvailable()
            .then(setGitAvailable)
            .catch(() => setGitAvailable(false));
        // env は安定参照（親で固定）。マウント時に一度ロードする。
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const report = reports[kind];
    const checkedKeys = checked[kind];
    const entries = useMemo(() => report?.entries ?? [], [report]);
    const searchQuery = searchQueries[kind];
    const filteredEntries = useMemo(() => filterAssetEntries(entries, searchQuery), [entries, searchQuery]);
    const columns = FRONTMATTER_COLUMNS[kind];
    // name（fit 列）の幅を実データから見積もる（内容に合わせて伸縮・最大幅はウィンドウ幅の割合でクランプ）。
    const fitWidth = useMemo(() => {
        const fitCol = columns.find(c => c.fit);
        if (!fitCol) {
            return 0;
        }
        const maxWidthPx = Math.round(windowWidth * (fitCol.maxWidthPct ?? 0.25));
        return computeFitWidth(filteredEntries, maxWidthPx, true);
    }, [columns, filteredEntries, windowWidth]);
    // 公式ダイアログ用の fit 幅（skills 列構成）。
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

    const handleDownload = async () => {
        const relPaths = selectedEntries.map(entry => entry.relPath);
        if (relPaths.length === 0) {
            return;
        }
        setBusy(true);
        try {
            const result = await window.agentCliDevkit.claude.asset.download(env, kind, relPaths);
            if (result.canceled) {
                return;
            }
            if (result.ok) {
                onNotify(t('claude.assetManager.downloadSuccess'), 'success');
            } else {
                onNotify(t('claude.assetManager.downloadError'), 'error');
            }
        } catch {
            onNotify(t('claude.assetManager.downloadError'), 'error');
        } finally {
            setBusy(false);
        }
    };

    const handleUploadClick = async () => {
        setBusy(true);
        try {
            const result = await window.agentCliDevkit.claude.asset.inspectUpload(env, kind);
            if (result.canceled) {
                return;
            }
            // 検査エラー。種別不一致のブロック（kind-block-*）は専用メッセージを出す。
            if (!result.ok) {
                const msg = result.message ?? '';
                if (msg.startsWith('kind-block-')) {
                    onNotify(t(`claude.assetManager.kindBlock.${msg.slice('kind-block-'.length)}`), 'error');
                } else {
                    onNotify(
                        t(msg === 'md-no-name' ? 'claude.assetManager.mdNoName' : 'claude.assetManager.uploadError'),
                        'error'
                    );
                }
                return;
            }
            // 共通型 AssetOpResult の uploadKind は 'toml' も取り得るが、Claude 側の
            // inspectUpload は 'zip' | 'md' のみ返すためここで絞り込む。
            const uploadKind = (result.uploadKind ?? 'zip') as 'zip' | 'md';
            const srcPath = uploadKind === 'md' ? result.srcPath : result.zipPath;
            if (!srcPath) {
                onNotify(t('claude.assetManager.uploadError'), 'error');
                return;
            }
            const conflicts = result.conflicts ?? [];
            // 種別不一致の疑い → 続行/キャンセルの確認を先に挟む。
            if (result.kindCheck === 'warn') {
                setKindWarn({ srcPath, conflicts, uploadKind, reason: result.kindMessage ?? '' });
                return;
            }
            await proceedUpload(srcPath, uploadKind, conflicts);
        } catch {
            onNotify(t('claude.assetManager.uploadError'), 'error');
        } finally {
            setBusy(false);
        }
    };

    // 検査後の通常フロー: 衝突があれば上書き確認、無ければそのまま取り込む。
    const proceedUpload = async (srcPath: string, uploadKind: 'zip' | 'md', conflicts: string[]) => {
        if (conflicts.length > 0) {
            setConfirm({ srcPath, conflicts, uploadKind });
            return;
        }
        await runUpload(srcPath, uploadKind, false);
    };

    // 種別不一致の警告で「続行」 → 通常フローへ。
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
            onNotify(t('claude.assetManager.uploadError'), 'error');
        } finally {
            setBusy(false);
        }
    };

    const runUpload = async (srcPath: string, uploadKind: 'zip' | 'md', overwrite: boolean) => {
        const result =
            uploadKind === 'md'
                ? await window.agentCliDevkit.claude.asset.uploadMd(env, kind, srcPath, overwrite)
                : await window.agentCliDevkit.claude.asset.upload(env, kind, srcPath, overwrite);
        if (result.ok) {
            onNotify(t('claude.assetManager.uploadSuccess', { count: result.importedCount ?? 0 }), 'success');
            await load();
        } else {
            onNotify(
                t(result.message === 'md-no-name' ? 'claude.assetManager.mdNoName' : 'claude.assetManager.uploadError'),
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
            onNotify(t('claude.assetManager.uploadError'), 'error');
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
            const result = await window.agentCliDevkit.claude.asset.deleteSelected(env, kind, relPaths);
            if (result.ok) {
                onNotify(t('claude.assetManager.deleteSuccess', { count: result.deletedCount ?? 0 }), 'success');
            } else if ((result.deletedCount ?? 0) > 0 || (result.skipped?.length ?? 0) > 0) {
                // 一部のみ削除できた（使用中などでスキップ）
                onNotify(t('claude.assetManager.deletePartial'), 'warning');
            } else {
                onNotify(t('claude.assetManager.deleteError'), 'error');
            }
            await load();
        } catch {
            onNotify(t('claude.assetManager.deleteError'), 'error');
        } finally {
            setBusy(false);
        }
    };

    // 公式スキルインポート: リポジトリを更新して一覧を取得し、ダイアログを開く。
    const handleOpenOfficial = async () => {
        setBusy(true);
        setOfficialLoading(true);
        setOfficialOpen(true);
        setOfficialEntries([]);
        setOfficialChecked(new Set());
        try {
            const result = await window.agentCliDevkit.claude.asset.listOfficialSkills();
            if (result.ok && result.entries) {
                setOfficialEntries(result.entries);
            } else {
                onNotify(t('claude.assetManager.officialListError'), 'error');
                setOfficialOpen(false);
            }
        } catch {
            onNotify(t('claude.assetManager.officialListError'), 'error');
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

    // 公式スキルを取り込む（公式同士は確認なしで置換）。
    const handleImportOfficial = async () => {
        const relPaths = officialEntries.filter(e => officialChecked.has(e.relPath)).map(e => e.relPath);
        if (relPaths.length === 0) {
            return;
        }
        setBusy(true);
        try {
            const result = await window.agentCliDevkit.claude.asset.importOfficialSkills(env, relPaths);
            if (result.ok) {
                onNotify(
                    t('claude.assetManager.officialImportSuccess', { count: result.importedCount ?? 0 }),
                    'success'
                );
                setOfficialOpen(false);
                await load();
            } else {
                onNotify(t('claude.assetManager.officialImportError'), 'error');
            }
        } catch {
            onNotify(t('claude.assetManager.officialImportError'), 'error');
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
                <Tab value='agents' label={t('claude.assetManager.tabAgents')} />
                <Tab value='skills' label={t('claude.assetManager.tabSkills')} />
            </Tabs>

            <Box sx={{ p: 2 }}>
                {report && !report.available ? (
                    <Alert severity='info'>{t('claude.assetManager.unavailable')}</Alert>
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
                                {t('claude.assetManager.download')}
                            </Button>
                            <Button
                                variant='outlined'
                                size='small'
                                startIcon={<UploadIcon />}
                                disabled={busy}
                                onClick={handleUploadClick}
                            >
                                {t('claude.assetManager.upload')}
                            </Button>
                            <Button
                                variant='outlined'
                                color='error'
                                size='small'
                                startIcon={<DeleteIcon />}
                                disabled={busy || !someChecked}
                                onClick={() => setDeleteConfirmOpen(true)}
                            >
                                {t('claude.assetManager.delete')}
                            </Button>
                            {/* スキルタブのみ: 公式スキルインポートを右寄せで配置 */}
                            {kind === 'skills' && (
                                <>
                                    <Box sx={{ flexGrow: 1 }} />
                                    <Tooltip title={gitAvailable ? '' : t('claude.assetManager.gitRequired')}>
                                        <span>
                                            <Button
                                                variant='outlined'
                                                size='small'
                                                startIcon={<CloudDownloadIcon />}
                                                disabled={busy || !gitAvailable}
                                                onClick={handleOpenOfficial}
                                            >
                                                {t('claude.assetManager.importOfficial')}
                                            </Button>
                                        </span>
                                    </Tooltip>
                                </>
                            )}
                        </Box>

                        <AssetSearchField value={searchQuery} onChange={setKindSearchQuery} />

                        {entries.length === 0 ? (
                            <Typography color='text.secondary' sx={{ py: 1 }}>
                                {t('claude.assetManager.noEntries')}
                            </Typography>
                        ) : filteredEntries.length === 0 ? (
                            <Typography color='text.secondary' sx={{ py: 1 }}>
                                {t('common.noSearchResults')}
                            </Typography>
                        ) : (
                            <AssetEntriesTable
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

            {/* 種別不一致の警告ダイアログ（続行 / キャンセル） */}
            <Dialog open={kindWarn !== null} onClose={() => setKindWarn(null)}>
                <DialogTitle>{t('claude.assetManager.kindWarnTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {kindWarn ? t(`claude.assetManager.kindWarn.${kindWarn.reason}`) : ''}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setKindWarn(null)}>{t('claude.assetManager.cancel')}</Button>
                    <Button color='warning' variant='contained' onClick={handleConfirmKindWarn}>
                        {t('claude.assetManager.kindWarnContinue')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* 上書き確認ダイアログ（zip / md 共通） */}
            <Dialog open={confirm !== null} onClose={() => setConfirm(null)}>
                <DialogTitle>{t('claude.assetManager.overwriteConfirmTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {t('claude.assetManager.overwriteConfirmBody', {
                            count: confirm?.conflicts.length ?? 0,
                            names: (confirm?.conflicts ?? []).join(', '),
                        })}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirm(null)}>{t('claude.assetManager.cancel')}</Button>
                    <Button color='error' variant='contained' onClick={handleConfirmOverwrite}>
                        {t('claude.assetManager.overwrite')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* 削除確認ダイアログ */}
            <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
                <DialogTitle>{t('claude.assetManager.deleteConfirmTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {t('claude.assetManager.deleteConfirmBody', { count: selectedEntries.length })}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmOpen(false)}>{t('claude.assetManager.cancel')}</Button>
                    <Button color='error' variant='contained' onClick={handleConfirmDelete}>
                        {t('claude.assetManager.delete')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* frontmatter 参照ダイアログ */}
            <Dialog open={viewEntry !== null} onClose={() => setViewEntry(null)} maxWidth='md' fullWidth>
                <DialogTitle>{t('claude.assetManager.viewTitle', { name: viewEntry?.name ?? '' })}</DialogTitle>
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
                    <Button onClick={() => setViewEntry(null)}>{t('claude.assetManager.close')}</Button>
                </DialogActions>
            </Dialog>

            {/* 内容全体参照ダイアログ */}
            <Dialog open={viewFull !== null} onClose={() => setViewFull(null)} maxWidth='md' fullWidth>
                <DialogTitle>{t('claude.assetManager.viewFullTitle', { name: viewFull?.name ?? '' })}</DialogTitle>
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
                    <Button onClick={() => setViewFull(null)}>{t('claude.assetManager.close')}</Button>
                </DialogActions>
            </Dialog>

            {/* 公式スキルインポートダイアログ */}
            <Dialog open={officialOpen} onClose={() => !busy && setOfficialOpen(false)} maxWidth='lg' fullWidth>
                <DialogTitle>{t('claude.assetManager.importOfficialTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>{t('claude.assetManager.importOfficialDesc')}</DialogContentText>
                    {officialLoading ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
                            <CircularProgress size={20} />
                            <Typography color='text.secondary'>{t('claude.assetManager.repoUpdating')}</Typography>
                        </Box>
                    ) : officialEntries.length === 0 ? (
                        <Typography color='text.secondary' sx={{ py: 1 }}>
                            {t('claude.assetManager.noEntries')}
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
                        {t('claude.assetManager.cancel')}
                    </Button>
                    <Button
                        variant='contained'
                        startIcon={<CloudDownloadIcon />}
                        onClick={handleImportOfficial}
                        disabled={busy || officialChecked.size === 0}
                    >
                        {t('claude.assetManager.import')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};
