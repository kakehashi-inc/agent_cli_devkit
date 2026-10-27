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
    Chip,
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
    ClaudeEnvironment,
    CleanupCandidate,
    CleanupChild,
    CleanupEnvReport,
    OtherCleanupReport,
} from '@shared/agents/claude/types';
import { formatBytes, formatCount } from '../../utils/format';
import { cleanupWholeCount, isVisibleCandidate } from '../../components/agent/CleanupManagerView';
import {
    ApprovalList,
    FailedPathsDialog,
    applyApprovals,
    collectPendingApprovals,
    isSelectableChild,
    needsApproval,
} from '../../components/agent/CleanupDeleteDialogs';

interface Props {
    env: ClaudeEnvironment;
    label: string;
    onNotify: (message: string, severity: 'success' | 'error' | 'warning') => void;
}

// i18n キーは camelCase。ハイフン区切りキーを変換する。
function camelKey(key: string): string {
    return key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

/**
 * 展開可能な候補の子要素 1 行（チェックボックス・名前・状態・ファイル数・サイズ）。
 * 使用中の可能性があるプロジェクト（削除時に削除するかを問い合わせる）は選択でき、名前の横にその旨を表示する。
 * それ以外の使用中の子要素は選択できない。会話履歴が無く一時物だけが残ったプロジェクトも名前の横にその旨を表示する。
 */
const ClaudeCleanupChildRow: React.FC<{
    child: CleanupChild;
    checked: boolean;
    disabled: boolean;
    onToggle: () => void;
}> = ({ child, checked, disabled, onToggle }) => {
    const { t } = useTranslation();
    const inUse = child.inUse === true;
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
                    <Typography
                        variant='body2'
                        color={selectable ? undefined : 'text.disabled'}
                        sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
                    >
                        {child.name}
                    </Typography>
                    {child.orphan && <Chip size='small' variant='outlined' label={t('claude.cleanup.childOrphan')} />}
                    {needsApproval(child) ? (
                        <Chip
                            size='small'
                            variant='outlined'
                            color='warning'
                            label={t('claude.cleanup.childMayBeInUse', { count: child.inUseParts ?? 0 })}
                        />
                    ) : (
                        inUse && (
                            <Chip
                                size='small'
                                variant='outlined'
                                color='warning'
                                label={t('common.cleanupChildInUse')}
                            />
                        )
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
                    {formatBytes(child.size)}
                </Typography>
            </TableCell>
        </TableRow>
    );
};

/**
 * 1 つのプラットフォーム（Windows / macOS / Linux / WSL distro）のクリーンアップセクション。
 * Claude Code のディレクトリリストと、その他のツール（Serena 等）のリストを 1 つにまとめ、
 * 末尾の「選択済みを削除」ボタン 1 つで両方をまとめて処理する。
 */
export const PlatformCleanupSection: React.FC<Props> = ({ env, label, onNotify }) => {
    const { t } = useTranslation();
    const [report, setReport] = useState<CleanupEnvReport | null>(null);
    const [otherReport, setOtherReport] = useState<OtherCleanupReport | null>(null);
    const [loading, setLoading] = useState(true);

    // Claude Code 側の選択
    const [checkedDirs, setCheckedDirs] = useState<Set<string>>(new Set());
    // expandable 候補ごとの個別選択した子要素名。キー=候補キー（projects / plans など）。
    const [checkedChildren, setCheckedChildren] = useState<Record<string, Set<string>>>({});
    // その他ツール側の選択（項目キー）
    const [checkedOther, setCheckedOther] = useState<Set<string>>(new Set());

    // expandable 候補ごとの展開状態。
    const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    // 削除の確認で、利用者が削除を承認した使用中の可能性があるプロジェクト（approvalKey）
    const [approved, setApproved] = useState<Set<string>>(new Set());
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

    const load = async () => {
        try {
            const [r, o] = await Promise.all([
                window.agentCliDevkit.claude.cleanup.scan(env).catch(() => null),
                window.agentCliDevkit.claude.cleanup.scanOther(env).catch(() => null),
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
        // 候補全体のチェックを切り替えたら、その候補の個別選択はリセットする。
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

    const claudeSelection = useMemo(() => {
        const dirs = Array.from(checkedDirs);
        // expandable 候補で「全体未チェック」かつ個別選択がある場合のみ childSelections に積む。
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

    // 削除する件数（Claude Code ＋ その他ツール）と、全体を選んだ展開可能な候補の表示名
    const { selectedCount, wholeLabels } = useMemo(() => {
        let count = 0;
        const labels: string[] = [];
        for (const c of candidates) {
            if (c.expandable) {
                if (checkedDirs.has(c.key)) {
                    count += cleanupWholeCount(c);
                    labels.push(t(`claude.cleanup.dir.${camelKey(c.key)}`));
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
        return { selectedCount: count, wholeLabels: labels };
    }, [candidates, checkedDirs, checkedChildren, checkedOther, t]);

    const canDelete = selectedCount > 0;

    // 選択した子要素（候補全体の選択ではすべての子要素）のうち、使用中の可能性があるもの。削除の確認で問い合わせる。
    const pending = useMemo(
        () => collectPendingApprovals(candidates, checkedDirs, checkedChildren),
        [candidates, checkedDirs, checkedChildren]
    );

    const openConfirm = () => {
        setApproved(new Set());
        setConfirmOpen(true);
    };

    const toggleApproved = (key: string) => {
        setApproved(prev => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    const handleDelete = async () => {
        setConfirmOpen(false);
        setDeleting(true);
        let hadError = false;
        // 削除しようとして削除できなかった Claude Code の項目
        let failedCount = 0;
        // 削除に失敗した「その他のツール」の項目
        let otherFailedCount = 0;
        let failed: string[] = [];
        let r: CleanupEnvReport | null = report;
        let o: OtherCleanupReport | null = otherReport;
        // 承認の結果を反映した選択内容（承認しなかった使用中の可能性があるプロジェクトは削除しない）
        const selection = applyApprovals(claudeSelection, pending, approved);
        try {
            const hasChildSelection = Object.values(selection.childSelections).some(a => a.length > 0);
            if (selection.dirs.length > 0 || hasChildSelection) {
                r = await window.agentCliDevkit.claude.cleanup.delete(env, selection);
                failedCount = r.skipped?.length ?? 0;
                failed = r.failedPaths ?? [];
            }
        } catch (error) {
            hadError = true;
            console.error('Claude cleanup failed:', error);
        }
        try {
            if (checkedOther.size > 0) {
                o = await window.agentCliDevkit.claude.cleanup.deleteOther(env, Array.from(checkedOther));
                otherFailedCount = o.skipped?.length ?? 0;
            }
        } catch (error) {
            hadError = true;
            console.error('Other cleanup failed:', error);
        }

        if (hadError) {
            // 想定外の IPC エラー等。消せた分を反映しつつエラー通知。
            onNotify(t('claude.cleanup.deleteError'), 'error');
            await load();
        } else {
            applyReports(r, o);
            if (failedCount > 0 || failed.length > 0 || otherFailedCount > 0) {
                // OS のファイルロックなどで消せなかったものがある: 消せた分は反映し、失敗を警告で通知する。
                onNotify(t('common.cleanupDeleteFailed'), 'warning');
            } else {
                onNotify(t('claude.cleanup.deleteSuccess'), 'success');
            }
        }
        // 削除できずに残ったパスは、最後にまとめて一覧で報告する。
        setFailedPaths(failed);
        setDeleting(false);
    };

    const hasAnyTarget = candidates.length > 0 || otherItems.length > 0;

    // projects（プロジェクト単位）/ plans（ファイル単位）/ 一時物の候補など expandable 候補の行。
    // 全体チェックと、展開時の子要素の個別チェックを扱う。
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
                                {t(`claude.cleanup.dir.${camelKey(c.key)}`)}
                            </Typography>
                        </Box>
                    </TableCell>
                    <TableCell>
                        <Typography variant='body2' color='text.secondary'>
                            {t(`claude.cleanup.desc.${camelKey(c.key)}`)}
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
                                        {t('claude.cleanup.noCandidates')}
                                    </Typography>
                                ) : (
                                    <Table size='small'>
                                        <TableBody>
                                            {children.map(child => (
                                                <ClaudeCleanupChildRow
                                                    key={child.name}
                                                    child={child}
                                                    checked={allChecked || !!childSel?.has(child.name)}
                                                    disabled={allChecked}
                                                    onToggle={() => toggleChild(c.key, child.name)}
                                                />
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
                    {t(`claude.cleanup.dir.${camelKey(c.key)}`)}
                </Typography>
            </TableCell>
            <TableCell>
                <Typography variant='body2' color='text.secondary'>
                    {t(`claude.cleanup.desc.${camelKey(c.key)}`)}
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
                <Alert severity='info'>{t('claude.cleanup.noCandidates')}</Alert>
                <FailedPathsDialog paths={failedPaths} onClose={() => setFailedPaths([])} />
            </Box>
        );
    }

    return (
        <Box sx={{ mb: 4 }}>
            {/* Claude Code のディレクトリリスト（見出しなし） */}
            {candidates.length > 0 && (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell padding='checkbox'></TableCell>
                                <TableCell>{t('claude.cleanup.columnName')}</TableCell>
                                <TableCell>{t('claude.cleanup.columnDescription')}</TableCell>
                                <TableCell align='right' width='110'>
                                    {t('claude.cleanup.columnFiles')}
                                </TableCell>
                                <TableCell align='right' width='120'>
                                    {t('claude.cleanup.columnSize')}
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
                        {t('claude.cleanup.other.sectionTitle')}
                    </Typography>
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell padding='checkbox'></TableCell>
                                    <TableCell>{t('claude.cleanup.columnName')}</TableCell>
                                    <TableCell>{t('claude.cleanup.columnDescription')}</TableCell>
                                    <TableCell align='right' width='110'>
                                        {t('claude.cleanup.columnFiles')}
                                    </TableCell>
                                    <TableCell align='right' width='150'>
                                        {t('claude.cleanup.other.columnMetric')}
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
                                                {t(`claude.cleanup.other.label.${camelKey(item.key)}`)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant='body2' color='text.secondary'>
                                                {t(`claude.cleanup.other.desc.${camelKey(item.key)}`)}
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
                                                    : t('claude.cleanup.other.registered', { count: item.metricValue })}
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
                    onClick={openConfirm}
                    sx={{ textTransform: 'none' }}
                >
                    {t('claude.cleanup.deleteSelected')}
                </Button>
            </Box>

            <Dialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                maxWidth={pending.length > 0 ? 'md' : 'sm'}
                fullWidth={pending.length > 0}
            >
                <DialogTitle>{t('claude.cleanup.confirmTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{t('claude.cleanup.confirmBody', { count: selectedCount })}</DialogContentText>
                    {wholeLabels.length > 0 && (
                        <DialogContentText sx={{ mt: 1 }}>
                            {t('common.cleanupConfirmWhole', { names: wholeLabels.join(', ') })}
                        </DialogContentText>
                    )}
                    {pending.length > 0 && (
                        <ApprovalList
                            title={t('claude.cleanup.approvalTitle')}
                            items={pending}
                            checked={approved}
                            onToggle={toggleApproved}
                        />
                    )}
                    <Alert severity='info' sx={{ mt: 2 }}>
                        {t('claude.cleanup.inUseNotice')}
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmOpen(false)} sx={{ textTransform: 'none' }}>
                        {t('claude.cleanup.cancel')}
                    </Button>
                    <Button onClick={handleDelete} color='error' variant='contained' sx={{ textTransform: 'none' }}>
                        {t('claude.cleanup.deleteSelected')}
                    </Button>
                </DialogActions>
            </Dialog>

            <FailedPathsDialog paths={failedPaths} onClose={() => setFailedPaths([])} />
        </Box>
    );
};
