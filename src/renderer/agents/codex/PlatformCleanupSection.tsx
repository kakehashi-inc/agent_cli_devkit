import React, { useEffect, useMemo, useState } from 'react';
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
    Collapse,
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
    CodexEnvironment,
    CleanupCandidate,
    CleanupEnvReport,
    OtherCleanupReport,
} from '@shared/agents/codex/types';
import { formatBytes, formatCount } from '../../utils/format';

interface Props {
    env: CodexEnvironment;
    label: string;
    onNotify: (message: string, severity: 'success' | 'error' | 'warning') => void;
}

// i18n キーは camelCase。ハイフン区切りキーを変換する。
function camelKey(key: string): string {
    return key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

/**
 * 1 つのプラットフォーム（Windows / macOS / Linux / WSL distro）のクリーンアップセクション。
 * Codex のディレクトリリストと、その他のツール（Serena 等）のリストを 1 つにまとめ、
 * 末尾の「選択済みを削除」ボタン 1 つで両方をまとめて処理する。
 */
export const PlatformCleanupSection: React.FC<Props> = ({ env, label, onNotify }) => {
    const { t } = useTranslation();
    const [report, setReport] = useState<CleanupEnvReport | null>(null);
    const [otherReport, setOtherReport] = useState<OtherCleanupReport | null>(null);
    const [loading, setLoading] = useState(true);

    const [checkedDirs, setCheckedDirs] = useState<Set<string>>(new Set());
    const [checkedChildren, setCheckedChildren] = useState<Record<string, Set<string>>>({});
    const [checkedOther, setCheckedOther] = useState<Set<string>>(new Set());

    const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

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

    const load = async () => {
        try {
            const [r, o] = await Promise.all([
                window.agentCliDevkit.codex.cleanup.scan(env).catch(() => null),
                window.agentCliDevkit.codex.cleanup.scanOther(env).catch(() => null),
            ]);
            applyReports(r, o);
        } catch (error) {
            console.error('Failed to scan cleanup targets:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [label]);

    const candidates = (report?.candidates ?? []).filter(c => c.exists && c.fileCount > 0);
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

    const codexSelection = useMemo(() => {
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

    const handleDelete = async () => {
        setConfirmOpen(false);
        setDeleting(true);
        let hadError = false;
        let skippedCount = 0;
        let r: CleanupEnvReport | null = report;
        let o: OtherCleanupReport | null = otherReport;
        try {
            const hasChildSelection = Object.values(codexSelection.childSelections).some(a => a.length > 0);
            if (codexSelection.dirs.length > 0 || hasChildSelection) {
                r = await window.agentCliDevkit.codex.cleanup.delete(env, codexSelection);
                skippedCount += r.skipped?.length ?? 0;
            }
        } catch (error) {
            hadError = true;
            console.error('Codex cleanup failed:', error);
        }
        try {
            if (checkedOther.size > 0) {
                o = await window.agentCliDevkit.codex.cleanup.deleteOther(env, Array.from(checkedOther));
                skippedCount += o.skipped?.length ?? 0;
            }
        } catch (error) {
            hadError = true;
            console.error('Other cleanup failed:', error);
        }

        if (hadError) {
            onNotify(t('codex.cleanup.deleteError'), 'error');
            await load();
        } else {
            applyReports(r, o);
            if (skippedCount > 0) {
                onNotify(t('codex.cleanup.deletePartial'), 'warning');
            } else {
                onNotify(t('codex.cleanup.deleteSuccess'), 'success');
            }
        }
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
                                {t(`codex.cleanup.dir.${camelKey(c.key)}`)}
                            </Typography>
                        </Box>
                    </TableCell>
                    <TableCell>
                        <Typography variant='body2' color='text.secondary'>
                            {t(`codex.cleanup.desc.${camelKey(c.key)}`)}
                        </Typography>
                    </TableCell>
                    <TableCell align='right'>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                            {formatCount(c.fileCount)}
                        </Typography>
                    </TableCell>
                    <TableCell align='right'>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                            {formatBytes(c.size)}
                        </Typography>
                    </TableCell>
                </TableRow>
                <TableRow>
                    <TableCell sx={{ py: 0, border: 0 }} colSpan={5}>
                        <Collapse in={isExpanded} timeout='auto' unmountOnExit>
                            <Box sx={{ pl: 6, py: 1 }}>
                                {children.length === 0 ? (
                                    <Typography variant='body2' color='text.secondary'>
                                        {t('codex.cleanup.noCandidates')}
                                    </Typography>
                                ) : (
                                    <Table size='small'>
                                        <TableBody>
                                            {children.map(child => (
                                                <TableRow key={child.name}>
                                                    <TableCell padding='checkbox' sx={{ border: 0 }}>
                                                        <Checkbox
                                                            size='small'
                                                            checked={allChecked || !!childSel?.has(child.name)}
                                                            disabled={allChecked}
                                                            onChange={() => toggleChild(c.key, child.name)}
                                                        />
                                                    </TableCell>
                                                    <TableCell sx={{ border: 0 }}>
                                                        <Typography
                                                            variant='body2'
                                                            sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
                                                        >
                                                            {child.name}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align='right' sx={{ border: 0 }}>
                                                        <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                                                            {formatCount(child.fileCount)}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align='right' sx={{ border: 0 }}>
                                                        <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                                                            {formatBytes(child.size)}
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </Box>
                        </Collapse>
                    </TableCell>
                </TableRow>
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
                    {t(`codex.cleanup.dir.${camelKey(c.key)}`)}
                </Typography>
            </TableCell>
            <TableCell>
                <Typography variant='body2' color='text.secondary'>
                    {t(`codex.cleanup.desc.${camelKey(c.key)}`)}
                </Typography>
            </TableCell>
            <TableCell align='right'>
                <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                    {formatCount(c.fileCount)}
                </Typography>
            </TableCell>
            <TableCell align='right'>
                <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                    {formatBytes(c.size)}
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
                <Alert severity='info'>{t('codex.cleanup.noCandidates')}</Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ mb: 4 }}>
            {/* Codex のディレクトリリスト（見出しなし） */}
            {candidates.length > 0 && (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell padding='checkbox'></TableCell>
                                <TableCell>{t('codex.cleanup.columnName')}</TableCell>
                                <TableCell>{t('codex.cleanup.columnDescription')}</TableCell>
                                <TableCell align='right' width='110'>
                                    {t('codex.cleanup.columnFiles')}
                                </TableCell>
                                <TableCell align='right' width='120'>
                                    {t('codex.cleanup.columnSize')}
                                </TableCell>
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
                        {t('codex.cleanup.other.sectionTitle')}
                    </Typography>
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell padding='checkbox'></TableCell>
                                    <TableCell>{t('codex.cleanup.columnName')}</TableCell>
                                    <TableCell>{t('codex.cleanup.columnDescription')}</TableCell>
                                    <TableCell align='right' width='110'>
                                        {t('codex.cleanup.columnFiles')}
                                    </TableCell>
                                    <TableCell align='right' width='150'>
                                        {t('codex.cleanup.other.columnMetric')}
                                    </TableCell>
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
                                                {t(`codex.cleanup.other.label.${camelKey(item.key)}`)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant='body2' color='text.secondary'>
                                                {t(`codex.cleanup.other.desc.${camelKey(item.key)}`)}
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
                                                    : t('codex.cleanup.other.registered', { count: item.metricValue })}
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
                    disabled={!canDelete || deleting}
                    onClick={() => setConfirmOpen(true)}
                    sx={{ textTransform: 'none' }}
                >
                    {t('codex.cleanup.deleteSelected')}
                </Button>
            </Box>

            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
                <DialogTitle>{t('codex.cleanup.confirmTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{t('codex.cleanup.confirmBody', { count: selectedCount })}</DialogContentText>
                    <Alert severity='warning' sx={{ mt: 2 }}>
                        {t('codex.cleanup.inUseWarning')}
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmOpen(false)} sx={{ textTransform: 'none' }}>
                        {t('codex.cleanup.cancel')}
                    </Button>
                    <Button onClick={handleDelete} color='error' variant='contained' sx={{ textTransform: 'none' }}>
                        {t('codex.cleanup.deleteSelected')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
