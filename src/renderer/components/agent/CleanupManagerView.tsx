import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    Collapse,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    IconButton,
    Paper,
    Snackbar,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import {
    DeleteSweep as DeleteIcon,
    KeyboardArrowDown as ExpandIcon,
    KeyboardArrowRight as CollapseIcon,
    Refresh as RefreshIcon,
} from '@mui/icons-material';
import type {
    AgentEnvironment,
    CleanupCandidate,
    CleanupChild,
    CleanupEnvReport,
    CleanupSelection,
} from '@shared/agents/types';
import { envId, formatBytes, formatCount } from '../../utils/format';
import type { CleanupApi, Notify } from './types';

interface Props {
    agentId: string;
    api: CleanupApi;
}

/**
 * 展開可能な候補の全体を選んだときに削除する件数（使用中ではない子要素の数）。
 * 数えられる子要素が無い場合（子要素の一覧に含まれない中身だけの場合など）は 1 件とする。
 */
export function cleanupWholeCount(candidate: CleanupCandidate): number {
    return Math.max(1, (candidate.children ?? []).filter(child => !child.inUse).length);
}

/**
 * 展開可能なクリーンアップ候補の子要素 1 行（チェックボックス・名前・ファイル数・サイズ）。
 * 使用中の子要素は選択できず、名前の横に使用中である旨を表示する。
 */
export const CleanupChildRow: React.FC<{
    child: CleanupChild;
    checked: boolean;
    disabled: boolean;
    onToggle: () => void;
}> = ({ child, checked, disabled, onToggle }) => {
    const { t } = useTranslation();
    const inUse = child.inUse === true;
    return (
        <TableRow>
            <TableCell padding='checkbox' sx={{ border: 0 }}>
                <Checkbox size='small' checked={checked && !inUse} disabled={disabled || inUse} onChange={onToggle} />
            </TableCell>
            <TableCell sx={{ border: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <Typography
                        variant='body2'
                        color={inUse ? 'text.disabled' : undefined}
                        sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
                    >
                        {child.name}
                    </Typography>
                    {inUse && (
                        <Chip size='small' variant='outlined' color='warning' label={t('common.cleanupChildInUse')} />
                    )}
                </Box>
            </TableCell>
            <TableCell align='right' sx={{ border: 0 }}>
                <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                    {formatCount(child.fileCount)}
                </Typography>
            </TableCell>
            <TableCell align='right' sx={{ border: 0 }}>
                <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                    {child.sizeUnknown ? '-' : formatBytes(child.size)}
                </Typography>
            </TableCell>
        </TableRow>
    );
};

const CleanupSection: React.FC<{
    agentId: string;
    api: CleanupApi;
    env: AgentEnvironment;
    notify: Notify;
}> = ({ agentId, api, env, notify }) => {
    const { t } = useTranslation();
    const [report, setReport] = useState<CleanupEnvReport | null>(null);
    const [dirs, setDirs] = useState<Set<string>>(new Set());
    const [children, setChildren] = useState<Record<string, Set<string>>>({});
    const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const next = await api.scan(env);
            setReport(next);
            setDirs(
                new Set(
                    next.candidates
                        .filter(candidate => candidate.exists && candidate.defaultChecked)
                        .map(candidate => candidate.key)
                )
            );
            setChildren({});
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
    }, []);

    // 削除できるものがある候補だけを表示する。
    const candidates = (report?.candidates ?? []).filter(candidate => candidate.exists && candidate.fileCount > 0);

    const toggleDir = (key: string) => {
        setDirs(current => {
            const next = new Set(current);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
        setChildren(current => {
            if (!current[key] || current[key].size === 0) return current;
            return { ...current, [key]: new Set() };
        });
    };

    const toggleChild = (key: string, name: string) => {
        setChildren(current => {
            const selected = new Set(current[key] ?? []);
            if (selected.has(name)) selected.delete(name);
            else selected.add(name);
            return { ...current, [key]: selected };
        });
    };

    const toggleExpanded = (key: string) => {
        setExpandedKeys(current => ({ ...current, [key]: !current[key] }));
    };

    const selection: CleanupSelection = useMemo(() => {
        const selectedDirs = Array.from(dirs);
        const childSelections: Record<string, string[]> = {};
        for (const candidate of candidates) {
            if (!candidate.expandable || dirs.has(candidate.key)) continue;
            const selected = children[candidate.key];
            if (selected && selected.size > 0) childSelections[candidate.key] = Array.from(selected);
        }
        return { dirs: selectedDirs, childSelections };
    }, [candidates, children, dirs]);

    // 削除する件数と、全体を選んだ展開可能な候補の表示名
    const { selectedCount, wholeLabels } = useMemo(() => {
        let count = 0;
        const labels: string[] = [];
        for (const candidate of candidates) {
            if (candidate.expandable && !dirs.has(candidate.key)) {
                const selected = children[candidate.key];
                for (const child of candidate.children ?? []) {
                    if (selected?.has(child.name)) count += 1;
                }
            } else if (candidate.expandable) {
                count += cleanupWholeCount(candidate);
                labels.push(t(`${agentId}.cleanup.item.${candidate.key}.label`));
            } else if (dirs.has(candidate.key)) {
                count += 1;
            }
        }
        return { selectedCount: count, wholeLabels: labels };
    }, [agentId, candidates, children, dirs, t]);

    const remove = async () => {
        setConfirmOpen(false);
        setBusy(true);
        try {
            const next = await api.delete(env, selection);
            setReport(next);
            setDirs(new Set());
            setChildren({});
            notify(
                t(`${agentId}.cleanup.${(next.skipped?.length ?? 0) > 0 ? 'deletePartial' : 'deleteSuccess'}`),
                (next.skipped?.length ?? 0) > 0 ? 'warning' : 'success'
            );
        } catch (error) {
            console.error('Cleanup failed:', error);
            notify(t(`${agentId}.cleanup.deleteError`), 'error');
            await load();
        } finally {
            setBusy(false);
        }
    };

    /** 展開した行の中身（子要素の一覧）。 */
    const renderChildList = (candidate: CleanupCandidate, allChecked: boolean) => {
        const childSel = children[candidate.key];
        const childList = candidate.children ?? [];
        if (childList.length === 0)
            return (
                <Typography variant='body2' color='text.secondary'>
                    {t(`${agentId}.cleanup.noCandidates`)}
                </Typography>
            );
        return (
            <Table size='small'>
                <TableBody>
                    {childList.map(child => (
                        <CleanupChildRow
                            key={child.name}
                            child={child}
                            checked={allChecked || !!childSel?.has(child.name)}
                            disabled={allChecked}
                            onToggle={() => toggleChild(candidate.key, child.name)}
                        />
                    ))}
                </TableBody>
            </Table>
        );
    };

    const renderExpandableRow = (candidate: CleanupCandidate) => {
        const allChecked = dirs.has(candidate.key);
        const childSel = children[candidate.key];
        const indeterminate = !allChecked && !!childSel && childSel.size > 0;
        const isExpanded = expandedKeys[candidate.key] ?? false;
        return (
            <React.Fragment key={candidate.key}>
                <TableRow sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                    <TableCell padding='checkbox'>
                        <Checkbox
                            checked={allChecked}
                            indeterminate={indeterminate}
                            onChange={() => toggleDir(candidate.key)}
                        />
                    </TableCell>
                    <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <IconButton size='small' onClick={() => toggleExpanded(candidate.key)}>
                                {isExpanded ? <ExpandIcon /> : <CollapseIcon />}
                            </IconButton>
                            <Typography variant='body2' sx={{ fontWeight: 'medium' }}>
                                {t(`${agentId}.cleanup.item.${candidate.key}.label`)}
                            </Typography>
                        </Box>
                    </TableCell>
                    <TableCell>
                        <Typography variant='body2' color='text.secondary'>
                            {t(`${agentId}.cleanup.item.${candidate.key}.desc`)}
                        </Typography>
                    </TableCell>
                    <TableCell align='right'>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                            {formatCount(candidate.fileCount)}
                        </Typography>
                    </TableCell>
                    <TableCell align='right'>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                            {candidate.sizeUnknown ? '-' : formatBytes(candidate.size)}
                        </Typography>
                    </TableCell>
                </TableRow>
                <TableRow>
                    <TableCell sx={{ py: 0, border: 0 }} colSpan={5}>
                        <Collapse in={isExpanded} timeout='auto' unmountOnExit>
                            <Box sx={{ pl: 6, py: 1 }}>{renderChildList(candidate, allChecked)}</Box>
                        </Collapse>
                    </TableCell>
                </TableRow>
            </React.Fragment>
        );
    };

    const renderDirRow = (candidate: CleanupCandidate) => (
        <TableRow key={candidate.key} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
            <TableCell padding='checkbox'>
                <Checkbox checked={dirs.has(candidate.key)} onChange={() => toggleDir(candidate.key)} />
            </TableCell>
            <TableCell>
                <Typography variant='body2' sx={{ fontWeight: 'medium' }}>
                    {t(`${agentId}.cleanup.item.${candidate.key}.label`)}
                </Typography>
            </TableCell>
            <TableCell>
                <Typography variant='body2' color='text.secondary'>
                    {t(`${agentId}.cleanup.item.${candidate.key}.desc`)}
                </Typography>
            </TableCell>
            <TableCell align='right'>
                <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                    {formatCount(candidate.fileCount)}
                </Typography>
            </TableCell>
            <TableCell align='right'>
                <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                    {candidate.sizeUnknown ? '-' : formatBytes(candidate.size)}
                </Typography>
            </TableCell>
        </TableRow>
    );

    if (loading)
        return (
            <Box sx={{ mb: 4 }}>
                <Typography sx={{ px: 1 }}>{t('common.loading')}</Typography>
            </Box>
        );

    if (candidates.length === 0)
        return (
            <Box sx={{ mb: 4 }}>
                <Alert severity='info'>{t(`${agentId}.cleanup.noCandidates`)}</Alert>
            </Box>
        );

    return (
        <Box sx={{ mb: 4 }}>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell padding='checkbox' />
                            <TableCell>{t(`${agentId}.cleanup.name`)}</TableCell>
                            <TableCell>{t(`${agentId}.cleanup.descriptionColumn`)}</TableCell>
                            <TableCell align='right' width='110'>
                                {t(`${agentId}.cleanup.files`)}
                            </TableCell>
                            <TableCell align='right' width='120'>
                                {t(`${agentId}.cleanup.size`)}
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {candidates.map(candidate =>
                            candidate.expandable ? renderExpandableRow(candidate) : renderDirRow(candidate)
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button
                    color='error'
                    variant='contained'
                    startIcon={<DeleteIcon />}
                    disabled={busy || selectedCount === 0}
                    onClick={() => setConfirmOpen(true)}
                    sx={{ textTransform: 'none' }}
                >
                    {t(`${agentId}.cleanup.deleteSelected`)}
                </Button>
            </Box>
            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
                <DialogTitle>{t(`${agentId}.cleanup.confirmTitle`)}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {t(`${agentId}.cleanup.confirmBody`, { count: selectedCount })}
                    </DialogContentText>
                    {wholeLabels.length > 0 && (
                        <DialogContentText sx={{ mt: 1 }}>
                            {t('common.cleanupConfirmWhole', { names: wholeLabels.join(', ') })}
                        </DialogContentText>
                    )}
                    <Alert severity='info' sx={{ mt: 2 }}>
                        {t(`${agentId}.cleanup.inUseNotice`)}
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmOpen(false)} sx={{ textTransform: 'none' }}>
                        {t(`${agentId}.cleanup.cancel`)}
                    </Button>
                    <Button color='error' variant='contained' onClick={remove} sx={{ textTransform: 'none' }}>
                        {t(`${agentId}.cleanup.deleteSelected`)}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export const CleanupManagerView: React.FC<Props> = ({ agentId, api }) => {
    const { t } = useTranslation();
    const [environments, setEnvironments] = useState<{ env: AgentEnvironment; label: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [reload, setReload] = useState(0);
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error' | 'warning';
    }>({ open: false, message: '', severity: 'success' });
    const load = async (refresh = false) => {
        setLoading(true);
        try {
            setEnvironments(await api.getEnvironments(refresh));
            setReload(value => value + 1);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
    }, []);
    if (loading)
        return (
            <Box sx={{ p: 3 }}>
                <Typography>{t('common.loading')}</Typography>
            </Box>
        );
    const native = environments.filter(item => item.env.kind === 'native');
    const wsl = environments.filter(item => item.env.kind === 'wsl');
    const notify: Notify = (message, severity) => setSnackbar({ open: true, message, severity });
    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                <Box>
                    <Typography variant='h4' component='h1' sx={{ mb: 1 }}>
                        {t(`${agentId}.cleanup.title`)}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                        {t(`${agentId}.cleanup.description`)}
                    </Typography>
                </Box>
                <Button
                    variant='outlined'
                    startIcon={<RefreshIcon />}
                    onClick={() => void load(true)}
                    sx={{ textTransform: 'none', flexShrink: 0 }}
                >
                    {t('common.refresh')}
                </Button>
            </Box>
            {environments.length === 0 && (
                <Alert severity='info' sx={{ mb: 2 }}>
                    {t(`${agentId}.noEnvironment`)}
                </Alert>
            )}
            {native.map(item => (
                <Box key={`${envId(item.env)}-${reload}`}>
                    <Typography variant='h6' sx={{ mb: 1 }}>
                        {item.label}
                    </Typography>
                    <CleanupSection agentId={agentId} api={api} env={item.env} notify={notify} />
                </Box>
            ))}
            {wsl.length > 0 && (
                <>
                    <Divider sx={{ my: 3 }} />
                    <Typography variant='h5' sx={{ mb: 2 }}>
                        WSL
                    </Typography>
                </>
            )}
            {wsl.map(item => (
                <Box key={`${envId(item.env)}-${reload}`}>
                    <Typography variant='h6' sx={{ mb: 1 }}>
                        {t(`${agentId}.cleanup.wslSection`, { distro: item.label })}
                    </Typography>
                    <CleanupSection agentId={agentId} api={api} env={item.env} notify={notify} />
                </Box>
            ))}
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
