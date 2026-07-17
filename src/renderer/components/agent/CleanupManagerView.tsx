import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Box,
    Button,
    Checkbox,
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
import type { AgentEnvironment, CleanupCandidate, CleanupEnvReport, CleanupSelection } from '@shared/agents/types';
import { envId, formatBytes, formatCount } from '../../utils/format';
import type { CleanupApi, Notify } from './types';

interface Props {
    agentId: string;
    api: CleanupApi;
}

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

    const candidates = (report?.candidates ?? []).filter(
        candidate => candidate.exists && candidate.fileCount > 0
    );

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

    const selectedCount = useMemo(() => {
        let count = 0;
        for (const candidate of candidates) {
            if (candidate.expandable && !dirs.has(candidate.key)) {
                const selected = children[candidate.key];
                for (const child of candidate.children ?? []) {
                    if (selected?.has(child.name)) count += 1;
                }
            } else if (dirs.has(candidate.key)) {
                count += 1;
            }
        }
        return count;
    }, [candidates, children, dirs]);

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

    const renderExpandableRow = (candidate: CleanupCandidate) => {
        const allChecked = dirs.has(candidate.key);
        const childSel = children[candidate.key];
        const indeterminate = !allChecked && !!childSel && childSel.size > 0;
        const childList = candidate.children ?? [];
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
                            {formatBytes(candidate.size)}
                        </Typography>
                    </TableCell>
                </TableRow>
                <TableRow>
                    <TableCell sx={{ py: 0, border: 0 }} colSpan={5}>
                        <Collapse in={isExpanded} timeout='auto' unmountOnExit>
                            <Box sx={{ pl: 6, py: 1 }}>
                                {childList.length === 0 ? (
                                    <Typography variant='body2' color='text.secondary'>
                                        {t(`${agentId}.cleanup.noCandidates`)}
                                    </Typography>
                                ) : (
                                    <Table size='small'>
                                        <TableBody>
                                            {childList.map(child => (
                                                <TableRow key={child.name}>
                                                    <TableCell padding='checkbox' sx={{ border: 0 }}>
                                                        <Checkbox
                                                            size='small'
                                                            checked={allChecked || !!childSel?.has(child.name)}
                                                            disabled={allChecked}
                                                            onChange={() => toggleChild(candidate.key, child.name)}
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
                    {formatBytes(candidate.size)}
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
                    <Alert severity='warning' sx={{ mt: 2 }}>
                        {t(`${agentId}.cleanup.inUseWarning`)}
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
    const load = async () => {
        setLoading(true);
        try {
            setEnvironments(await api.getEnvironments());
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
                    onClick={load}
                    sx={{ textTransform: 'none', flexShrink: 0 }}
                >
                    {t('common.refresh')}
                </Button>
            </Box>
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
