import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box,
    Paper,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Checkbox,
    IconButton,
    Button,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
} from '@mui/material';
import {
    KeyboardArrowDown as ExpandIcon,
    KeyboardArrowRight as CollapseIcon,
    DeleteSweep as DeleteIcon,
} from '@mui/icons-material';
import type {
    GrokEnvironment,
    CleanupCandidate,
    CleanupEnvReport,
    OtherCleanupReport,
} from '@shared/agents/grok/types';
import { formatBytes, formatCount } from '../../utils/format';
import { CleanupChildRow, isVisibleCandidate } from '../../components/agent/CleanupManagerView';
import {
    CleanupCandidateNotice,
    CleanupConfirmWarnings,
    FailedPathsDialog,
    collectConfirmWarnings,
} from '../../components/agent/CleanupDeleteDialogs';
import { CleanupChildRegion, CleanupChildTable, CleanupColumns } from '../../components/agent/CleanupTableParts';
import {
    CleanupRelatedChildren,
    CleanupSharedPaths,
    collectRelatedChildren,
    collectSharedPaths,
    withRelatedSelection,
} from './CleanupConfirmDetails';

interface Props {
    env: GrokEnvironment;
    label: string;
    onNotify: (message: string, severity: 'success' | 'error' | 'warning') => void;
    // 更新のたびに変わる値。変わると読み直す（行の展開は保ち、選択は初期状態に戻す）。
    reloadNonce: number;
}

// i18n キーは camelCase。ハイフン区切りキーを変換する。
function camelKey(key: string): string {
    return key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

/**
 * 1 つのプラットフォーム（Windows / macOS / Linux / WSL distro）のクリーンアップセクション。
 * Grok のディレクトリリストと、その他のツール（Serena 等）のリストを 1 つにまとめ、
 * 末尾の「選択済みを削除」ボタン 1 つで両方をまとめて処理する。
 */
export const PlatformCleanupSection: React.FC<Props> = ({ env, label, onNotify, reloadNonce }) => {
    const { t } = useTranslation();
    const [report, setReport] = useState<CleanupEnvReport | null>(null);
    const [otherReport, setOtherReport] = useState<OtherCleanupReport | null>(null);
    const [loading, setLoading] = useState(true);
    // 読み直しの間は前の内容を表示したままにし、結果で選択が変わるので削除を始めさせない。
    const [reloading, setReloading] = useState(false);

    const [checkedDirs, setCheckedDirs] = useState<Set<string>>(new Set());
    const [checkedChildren, setCheckedChildren] = useState<Record<string, Set<string>>>({});
    const [checkedOther, setCheckedOther] = useState<Set<string>>(new Set());

    const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});
    const [confirmOpen, setConfirmOpen] = useState(false);
    // 削除の確認で一緒に削除すると選んだ関連する子要素（relatedKey）
    const [checkedRelated, setCheckedRelated] = useState<Set<string>>(new Set());
    const [deleting, setDeleting] = useState(false);
    // 削除できずに残ったパス（空でなければ一覧のダイアログを表示する）
    const [failedPaths, setFailedPaths] = useState<string[]>([]);

    const applyReports = (r: CleanupEnvReport | null, o: OtherCleanupReport | null) => {
        setReport(r);
        setOtherReport(o);
        const defaults = new Set<string>();
        for (const c of r?.candidates ?? []) {
            if (c.exists && c.defaultChecked) {
                defaults.add(c.key);
            }
        }
        setCheckedDirs(defaults);
        setCheckedChildren({});
        setCheckedOther(new Set());
    };

    // 最後に始めた読み込みだけを画面に反映する。
    const loadRequest = useRef(0);
    const load = async () => {
        const request = ++loadRequest.current;
        setReloading(true);
        try {
            const [r, o] = await Promise.all([
                window.agentCliDevkit.grok.cleanup.scan(env).catch(() => null),
                window.agentCliDevkit.grok.cleanup.scanOther(env).catch(() => null),
            ]);
            if (request === loadRequest.current) applyReports(r, o);
        } catch (error) {
            console.error('Failed to scan cleanup targets:', error);
        } finally {
            setLoading(false);
            if (request === loadRequest.current) setReloading(false);
        }
    };

    useEffect(() => {
        void load();
        // 表示名が変わったときと更新のたびに読み直す。レンダーごとに変わる関数は読み直しのきっかけにしない。
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [label, reloadNonce]);

    const candidates = (report?.candidates ?? []).filter(isVisibleCandidate);
    const otherItems = otherReport?.items ?? [];

    const toggleDir = (key: string) => {
        setCheckedDirs(prev => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
        setCheckedChildren(prev => {
            if (!prev[key] || prev[key].size === 0) {
                return prev;
            }
            const next = { ...prev };
            next[key] = new Set();
            return next;
        });
    };

    const toggleChild = (key: string, name: string) => {
        setCheckedChildren(prev => {
            const current = new Set(prev[key] ?? []);
            if (current.has(name)) {
                current.delete(name);
            } else {
                current.add(name);
            }
            return { ...prev, [key]: current };
        });
    };

    const toggleExpanded = (key: string) => {
        setExpandedKeys(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleOther = (key: string) => {
        setCheckedOther(prev => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    const grokSelection = useMemo(() => {
        const dirs = Array.from(checkedDirs);
        const childSelections: Record<string, string[]> = {};
        for (const c of candidates) {
            if (!c.expandable || checkedDirs.has(c.key)) {
                continue;
            }
            const sel = checkedChildren[c.key];
            if (sel && sel.size > 0) {
                childSelections[c.key] = Array.from(sel);
            }
        }
        return { dirs, childSelections };
    }, [candidates, checkedDirs, checkedChildren]);

    const selectedCount = useMemo(() => {
        let count = 0;
        for (const c of candidates) {
            if (c.expandable) {
                if (checkedDirs.has(c.key)) {
                    count += 1;
                } else {
                    const sel = checkedChildren[c.key];
                    for (const child of c.children ?? []) {
                        if (sel?.has(child.name)) {
                            count += 1;
                        }
                    }
                }
            } else if (checkedDirs.has(c.key)) {
                count += 1;
            }
        }
        count += checkedOther.size;
        return count;
    }, [candidates, checkedDirs, checkedChildren, checkedOther]);

    const canDelete = selectedCount > 0;

    // 選択したものの注意文。候補全体の選択でも子要素の個別選択でも表示する。
    const warningKeys = useMemo(
        () => collectConfirmWarnings(candidates, checkedDirs, checkedChildren),
        [candidates, checkedDirs, checkedChildren]
    );

    // 選択したもののうち、複数のパスで共有しているものと、一緒に削除するかを選べるもの。
    const sharedPaths = useMemo(
        () => collectSharedPaths(candidates, checkedDirs, checkedChildren),
        [candidates, checkedDirs, checkedChildren]
    );
    const relatedChildren = useMemo(
        () => collectRelatedChildren(candidates, checkedDirs, checkedChildren),
        [candidates, checkedDirs, checkedChildren]
    );

    const openConfirm = () => {
        setCheckedRelated(new Set());
        setConfirmOpen(true);
    };

    const toggleRelated = (key: string) => {
        setCheckedRelated(prev => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    // 使用中のものについての注意は、ファイルやフォルダーを消すものを選んだときだけ表示する。

    const handleDelete = async () => {
        setConfirmOpen(false);
        setDeleting(true);
        let hadError = false;
        // 削除しようとして削除できなかった項目の数
        let skippedCount = 0;
        let failed: string[] = [];
        let r: CleanupEnvReport | null = report;
        let o: OtherCleanupReport | null = otherReport;
        try {
            const selection = withRelatedSelection(grokSelection, relatedChildren, checkedRelated);
            const hasChildSelection = Object.values(selection.childSelections).some(a => a.length > 0);
            if (selection.dirs.length > 0 || hasChildSelection) {
                r = await window.agentCliDevkit.grok.cleanup.delete(env, selection);
                skippedCount += r.skipped?.length ?? 0;
                failed = r.failedPaths ?? [];
            }
        } catch (error) {
            hadError = true;
            console.error('Grok cleanup failed:', error);
        }
        try {
            if (checkedOther.size > 0) {
                o = await window.agentCliDevkit.grok.cleanup.deleteOther(env, Array.from(checkedOther));
                skippedCount += o.skipped?.length ?? 0;
            }
        } catch (error) {
            hadError = true;
            console.error('Other cleanup failed:', error);
        }

        if (hadError) {
            onNotify(t('grok.cleanup.deleteError'), 'error');
            await load();
        } else {
            // 削除の前に始めた読み込みの結果は古いので使わない。
            loadRequest.current += 1;
            setReloading(false);
            applyReports(r, o);
            if (skippedCount > 0 || failed.length > 0) {
                onNotify(t('common.cleanupDeleteFailed'), 'warning');
            } else {
                onNotify(t('grok.cleanup.deleteSuccess'), 'success');
            }
        }
        // 削除できずに残ったパスは、最後にまとめて一覧で報告する。
        setFailedPaths(failed);
        setDeleting(false);
    };

    const hasAnyTarget = candidates.length > 0 || otherItems.length > 0;

    const renderExpandableRow = (c: CleanupCandidate) => {
        const allChecked = checkedDirs.has(c.key);
        const childSel = checkedChildren[c.key];
        const indeterminate = !allChecked && !!childSel && childSel.size > 0;
        const children = c.children ?? [];
        const isExpanded = expandedKeys[c.key] ?? false;
        return (
            <React.Fragment key={c.key}>
                <TableRow sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                    <TableCell padding='checkbox'>
                        <Checkbox
                            checked={allChecked}
                            indeterminate={indeterminate}
                            onChange={() => toggleDir(c.key)}
                        />
                    </TableCell>
                    <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <IconButton size='small' onClick={() => toggleExpanded(c.key)}>
                                {isExpanded ? <ExpandIcon /> : <CollapseIcon />}
                            </IconButton>
                            <Typography variant='body2' sx={{ fontWeight: 'medium' }}>
                                {t(`grok.cleanup.dir.${camelKey(c.key)}`)}
                            </Typography>
                        </Box>
                    </TableCell>
                    <TableCell>
                        <Typography variant='body2' color='text.secondary'>
                            {t(`grok.cleanup.desc.${camelKey(c.key)}`)}
                        </Typography>
                        <CleanupCandidateNotice candidate={c} />
                    </TableCell>
                    <TableCell align='right'>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                            {formatCount(c.fileCount)}
                        </Typography>
                    </TableCell>
                    <TableCell align='right'>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                            {c.sizeUnknown ? '-' : formatBytes(c.size)}
                        </Typography>
                    </TableCell>
                </TableRow>
                <CleanupChildRegion open={isExpanded}>
                    {children.length === 0 ? (
                        <Typography variant='body2' color='text.secondary'>
                            {t('grok.cleanup.noCandidates')}
                        </Typography>
                    ) : (
                        <CleanupChildTable>
                            {children.map(child => (
                                <CleanupChildRow
                                    key={child.name}
                                    child={child}
                                    checked={allChecked || !!childSel?.has(child.name)}
                                    disabled={allChecked}
                                    onToggle={() => toggleChild(c.key, child.name)}
                                />
                            ))}
                        </CleanupChildTable>
                    )}
                </CleanupChildRegion>
            </React.Fragment>
        );
    };

    const renderDirRow = (c: CleanupCandidate) => (
        <TableRow key={c.key} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
            <TableCell padding='checkbox'>
                <Checkbox checked={checkedDirs.has(c.key)} onChange={() => toggleDir(c.key)} />
            </TableCell>
            <TableCell>
                <Typography variant='body2' sx={{ fontWeight: 'medium' }}>
                    {t(`grok.cleanup.dir.${camelKey(c.key)}`)}
                </Typography>
            </TableCell>
            <TableCell>
                <Typography variant='body2' color='text.secondary'>
                    {t(`grok.cleanup.desc.${camelKey(c.key)}`)}
                </Typography>
                <CleanupCandidateNotice candidate={c} />
            </TableCell>
            <TableCell align='right'>
                <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                    {formatCount(c.fileCount)}
                </Typography>
            </TableCell>
            <TableCell align='right'>
                <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                    {c.sizeUnknown ? '-' : formatBytes(c.size)}
                </Typography>
            </TableCell>
        </TableRow>
    );

    if (loading) {
        return (
            <Box sx={{ mb: 4 }}>
                <Typography sx={{ px: 1 }}>{t('common.loading')}</Typography>
            </Box>
        );
    }

    if (!hasAnyTarget) {
        return (
            <Box sx={{ mb: 4 }}>
                <Alert severity='info'>{t('grok.cleanup.noCandidates')}</Alert>
                <FailedPathsDialog paths={failedPaths} onClose={() => setFailedPaths([])} />
            </Box>
        );
    }

    return (
        <Box sx={{ mb: 4 }}>
            {/* Grok のディレクトリリスト（見出しなし） */}
            {candidates.length > 0 && (
                <TableContainer component={Paper}>
                    <Table sx={{ tableLayout: 'fixed' }}>
                        <CleanupColumns />
                        <TableHead>
                            <TableRow>
                                <TableCell padding='checkbox'></TableCell>
                                <TableCell>{t('grok.cleanup.columnName')}</TableCell>
                                <TableCell>{t('grok.cleanup.columnDescription')}</TableCell>
                                <TableCell align='right'>{t('grok.cleanup.columnFiles')}</TableCell>
                                <TableCell align='right'>{t('grok.cleanup.columnSize')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {candidates.map(c => (c.expandable ? renderExpandableRow(c) : renderDirRow(c)))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* その他のツールのリスト（こちらだけ見出しを付ける） */}
            {otherItems.length > 0 && (
                <Box sx={{ mt: candidates.length > 0 ? 3 : 0 }}>
                    <Typography variant='subtitle1' sx={{ mb: 1 }}>
                        {t('grok.cleanup.other.sectionTitle')}
                    </Typography>
                    <TableContainer component={Paper}>
                        <Table sx={{ tableLayout: 'fixed' }}>
                            <CleanupColumns />
                            <TableHead>
                                <TableRow>
                                    <TableCell padding='checkbox'></TableCell>
                                    <TableCell>{t('grok.cleanup.columnName')}</TableCell>
                                    <TableCell>{t('grok.cleanup.columnDescription')}</TableCell>
                                    <TableCell align='right'>{t('grok.cleanup.columnFiles')}</TableCell>
                                    <TableCell align='right'>{t('grok.cleanup.other.columnMetric')}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {otherItems.map(item => (
                                    <TableRow key={item.key} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                                        <TableCell padding='checkbox'>
                                            <Checkbox
                                                checked={checkedOther.has(item.key)}
                                                onChange={() => toggleOther(item.key)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant='body2' sx={{ fontWeight: 'medium' }}>
                                                {t(`grok.cleanup.other.label.${camelKey(item.key)}`)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant='body2' color='text.secondary'>
                                                {t(`grok.cleanup.other.desc.${camelKey(item.key)}`)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align='right'>
                                            <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                                                {item.metricKind === 'size' ? formatCount(item.fileCount ?? 0) : '-'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align='right'>
                                            <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                                                {item.metricKind === 'size'
                                                    ? formatBytes(item.metricValue)
                                                    : t('grok.cleanup.other.registered', { count: item.metricValue })}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            )}

            {/* プラットフォーム単位で 1 つの削除ボタン */}
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button
                    variant='contained'
                    color='error'
                    startIcon={<DeleteIcon />}
                    disabled={!canDelete || deleting || reloading}
                    onClick={openConfirm}
                >
                    {t('grok.cleanup.deleteSelected')}
                </Button>
            </Box>

            <Dialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                maxWidth={sharedPaths.length > 0 || relatedChildren.length > 0 ? 'md' : 'sm'}
                fullWidth={sharedPaths.length > 0 || relatedChildren.length > 0}
            >
                <DialogTitle>{t('grok.cleanup.confirmTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {t('grok.cleanup.confirmBody', { count: selectedCount + checkedRelated.size })}
                    </DialogContentText>
                    <CleanupSharedPaths groups={sharedPaths} />
                    <CleanupRelatedChildren items={relatedChildren} checked={checkedRelated} onToggle={toggleRelated} />
                    <CleanupConfirmWarnings keys={warningKeys} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmOpen(false)}>{t('grok.cleanup.cancel')}</Button>
                    <Button onClick={handleDelete} color='error' variant='contained'>
                        {t('grok.cleanup.deleteSelected')}
                    </Button>
                </DialogActions>
            </Dialog>

            <FailedPathsDialog paths={failedPaths} onClose={() => setFailedPaths([])} />
        </Box>
    );
};
