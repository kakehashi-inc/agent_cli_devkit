import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
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
import { WRAPPING_CHIP_SX } from '../../utils/wrappingChip';
import {
    ApprovalList,
    CleanupCandidateNotice,
    CleanupChildName,
    CleanupConfirmWarnings,
    FailedPathsDialog,
    applyApprovals,
    cleanupOutcome,
    cleanupOutcomeNotice,
    collectConfirmWarnings,
    collectPendingApprovals,
    isSelectableChild,
    needsApproval,
} from './CleanupDeleteDialogs';
import { CleanupChildRegion, CleanupChildTable, CleanupColumns } from './CleanupTableParts';
import type { CleanupApi, Notify } from './types';
import { useAgentEnvironments } from './useAgentEnvironments';

interface Props {
    agentId: string;
    api: CleanupApi;
}

/**
 * 展開可能な候補の全体を選んだときに数える件数（選択できる子要素の数。使用中の可能性があるものを含む）。
 * 数えられる子要素が無い場合（子要素の一覧に含まれない中身だけの場合など）は 1 件とする。
 */
export function cleanupWholeCount(candidate: CleanupCandidate): number {
    return Math.max(1, (candidate.children ?? []).filter(isSelectableChild).length);
}

/**
 * 候補を表示するか。この環境で使えない候補は、使えない理由を伝えるために表示する。
 * それ以外は、削除できるファイルがあるか、子要素（中身が 0 件のディレクトリを含む）がある候補を表示する。
 * 子要素は中身が 0 件でもディレクトリごと削除できるため表示する。
 */
export function isVisibleCandidate(candidate: CleanupCandidate): boolean {
    if (candidate.blocked) return true;
    return (
        candidate.exists &&
        (candidate.fileCount > 0 || (candidate.expandable === true && (candidate.children ?? []).length > 0))
    );
}

/**
 * 展開可能なクリーンアップ候補の子要素 1 行（チェックボックス・名前・ファイル数・サイズ）。
 * 使用中の可能性がある子要素（削除の確認で問い合わせるもの）は選択でき、名前の横にその旨を表示する。
 * それ以外の使用中の子要素は選択できず、名前の横に使用中である旨を表示する。
 */
export const CleanupChildRow: React.FC<{
    child: CleanupChild;
    checked: boolean;
    disabled: boolean;
    onToggle: () => void;
}> = ({ child, checked, disabled, onToggle }) => {
    const { t } = useTranslation();
    const selectable = isSelectableChild(child);
    return (
        <TableRow>
            <TableCell padding='checkbox' sx={{ border: 0 }}>
                <Checkbox
                    size='small'
                    checked={checked && selectable}
                    disabled={disabled || !selectable}
                    onChange={onToggle}
                />
            </TableCell>
            <TableCell sx={{ border: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <CleanupChildName child={child} selectable={selectable} />
                    {child.inUse === true && (
                        <Chip
                            sx={WRAPPING_CHIP_SX}
                            size='small'
                            variant='outlined'
                            color='warning'
                            label={t(
                                needsApproval(child) ? 'common.cleanupChildMayBeInUse' : 'common.cleanupChildInUse'
                            )}
                        />
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
    // 更新のたびに変わる値。変わると読み直す（行の展開は保ち、選択は初期状態に戻す）。
    reloadNonce: number;
}> = ({ agentId, api, env, notify, reloadNonce }) => {
    const { t } = useTranslation();
    const [report, setReport] = useState<CleanupEnvReport | null>(null);
    const [dirs, setDirs] = useState<Set<string>>(new Set());
    const [children, setChildren] = useState<Record<string, Set<string>>>({});
    const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    // 読み直しの間は前の内容を表示したままにし、結果で選択が変わるので削除を始めさせない。
    const [reloading, setReloading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    // 削除の確認で、利用者が削除を承認した使用中の可能性がある子要素（approvalKey）
    const [approved, setApproved] = useState<Set<string>>(new Set());
    // 削除できずに残ったパス（空でなければ一覧のダイアログを表示する）
    const [failedPaths, setFailedPaths] = useState<string[]>([]);

    // 最後に始めた読み込みだけを画面に反映する。
    const loadRequest = useRef(0);
    const load = async () => {
        const request = ++loadRequest.current;
        setReloading(true);
        try {
            const next = await api.scan(env);
            if (request !== loadRequest.current) return;
            setReport(next);
            setDirs(
                new Set(
                    next.candidates
                        .filter(candidate => candidate.exists && candidate.defaultChecked)
                        .map(candidate => candidate.key)
                )
            );
            setChildren({});
        } catch (error) {
            console.error('Failed to scan cleanup targets:', error);
        } finally {
            setLoading(false);
            if (request === loadRequest.current) setReloading(false);
        }
    };
    useEffect(() => {
        void load();
        // マウント時と更新のたびと api が変わったときに読み直す。レンダーごとに変わる関数は読み直しのきっかけにしない。
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [api, reloadNonce]);

    const candidates = (report?.candidates ?? []).filter(isVisibleCandidate);

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

    // 選択したもののうち使用中の可能性があるもの。削除の確認で削除するかを問い合わせる。
    const pending = useMemo(() => collectPendingApprovals(candidates, dirs, children), [candidates, children, dirs]);
    // 選択したものの注意文。候補全体の選択でも子要素の個別選択でも表示する。
    const warningKeys = useMemo(() => collectConfirmWarnings(candidates, dirs, children), [candidates, children, dirs]);
    // 使用中のものについての注意は、ファイルやフォルダーを消すものを選んだときだけ表示する。

    const openConfirm = () => {
        setApproved(new Set());
        setConfirmOpen(true);
    };

    const toggleApproved = (key: string) => {
        setApproved(current => {
            const next = new Set(current);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const remove = async () => {
        setConfirmOpen(false);
        const labelOf = (candidate: CleanupCandidate) => t(`${agentId}.cleanup.item.${candidate.key}.label`);
        const successText = t(`${agentId}.cleanup.deleteSuccess`);
        const effective = applyApprovals(selection, pending, approved);
        if (effective.dirs.length === 0 && Object.keys(effective.childSelections).length === 0) {
            // 確認ですべて外されたので、何も消さずに選択を残す。
            const outcome = cleanupOutcome(candidates, candidates, dirs, children, labelOf);
            const notice = cleanupOutcomeNotice(t, outcome, false, successText);
            notify(notice.message, notice.severity);
            return;
        }
        setBusy(true);
        try {
            const next = await api.delete(env, effective);
            // 削除の前に始めた読み込みの結果は古いので使わない。
            loadRequest.current += 1;
            setReloading(false);
            setReport(next);
            setDirs(new Set());
            setChildren({});
            // 消えたものと残ったものを伝え、残ったパスは一覧で報告する。
            const failed = (next.skipped?.length ?? 0) > 0 || (next.failedPaths?.length ?? 0) > 0;
            const outcome = cleanupOutcome(candidates, next.candidates, dirs, children, labelOf);
            const notice = cleanupOutcomeNotice(t, outcome, failed, successText);
            notify(notice.message, notice.severity);
            setFailedPaths(next.failedPaths ?? []);
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
            <CleanupChildTable>
                {childList.map(child => (
                    <CleanupChildRow
                        key={child.name}
                        child={child}
                        checked={allChecked || !!childSel?.has(child.name)}
                        disabled={allChecked}
                        onToggle={() => toggleChild(candidate.key, child.name)}
                    />
                ))}
            </CleanupChildTable>
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
                            disabled={candidate.blocked}
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
                        <CleanupCandidateNotice candidate={candidate} />
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
                <CleanupChildRegion open={isExpanded}>{renderChildList(candidate, allChecked)}</CleanupChildRegion>
            </React.Fragment>
        );
    };

    const renderDirRow = (candidate: CleanupCandidate) => (
        <TableRow key={candidate.key} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
            <TableCell padding='checkbox'>
                <Checkbox
                    checked={dirs.has(candidate.key)}
                    disabled={candidate.blocked}
                    onChange={() => toggleDir(candidate.key)}
                />
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
                <CleanupCandidateNotice candidate={candidate} />
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
                <FailedPathsDialog paths={failedPaths} onClose={() => setFailedPaths([])} />
            </Box>
        );

    return (
        <Box sx={{ mb: 4 }}>
            <TableContainer component={Paper}>
                <Table sx={{ tableLayout: 'fixed' }}>
                    <CleanupColumns />
                    <TableHead>
                        <TableRow>
                            <TableCell padding='checkbox' />
                            <TableCell>{t(`${agentId}.cleanup.name`)}</TableCell>
                            <TableCell>{t(`${agentId}.cleanup.descriptionColumn`)}</TableCell>
                            <TableCell align='right'>{t(`${agentId}.cleanup.files`)}</TableCell>
                            <TableCell align='right'>{t(`${agentId}.cleanup.size`)}</TableCell>
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
                    disabled={busy || reloading || selectedCount === 0}
                    onClick={openConfirm}
                >
                    {t(`${agentId}.cleanup.deleteSelected`)}
                </Button>
            </Box>
            <Dialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                maxWidth={pending.length > 0 ? 'md' : 'sm'}
                fullWidth={pending.length > 0}
            >
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
                    {pending.length > 0 && (
                        <ApprovalList
                            title={t('common.cleanupApprovalTitle')}
                            items={pending}
                            checked={approved}
                            onToggle={toggleApproved}
                        />
                    )}
                    <CleanupConfirmWarnings keys={warningKeys} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmOpen(false)}>{t(`${agentId}.cleanup.cancel`)}</Button>
                    <Button color='error' variant='contained' onClick={remove}>
                        {t(`${agentId}.cleanup.deleteSelected`)}
                    </Button>
                </DialogActions>
            </Dialog>
            <FailedPathsDialog paths={failedPaths} onClose={() => setFailedPaths([])} />
        </Box>
    );
};

export const CleanupManagerView: React.FC<Props> = ({ agentId, api }) => {
    const { t } = useTranslation();
    // 更新中は環境セクションを表示したまま読み直し、行の展開を保つ。
    const { environments, loading, refreshing, reloadNonce, load } = useAgentEnvironments(
        agentId,
        api,
        'Failed to load cleanup environments:'
    );
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error' | 'warning';
    }>({ open: false, message: '', severity: 'success' });
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
                    disabled={refreshing}
                    onClick={() => void load(true)}
                    sx={{ flexShrink: 0 }}
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
                <Box key={`${agentId}:${envId(item.env)}`}>
                    <Typography variant='h6' sx={{ mb: 1 }}>
                        {item.label}
                    </Typography>
                    <CleanupSection
                        agentId={agentId}
                        api={api}
                        env={item.env}
                        notify={notify}
                        reloadNonce={reloadNonce}
                    />
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
                <Box key={`${agentId}:${envId(item.env)}`}>
                    <Typography variant='h6' sx={{ mb: 1 }}>
                        {t(`${agentId}.cleanup.wslSection`, { distro: item.label })}
                    </Typography>
                    <CleanupSection
                        agentId={agentId}
                        api={api}
                        env={item.env}
                        notify={notify}
                        reloadNonce={reloadNonce}
                    />
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
