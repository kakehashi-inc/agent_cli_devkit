import React from 'react';
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
    FormControlLabel,
    Paper,
    Typography,
} from '@mui/material';
import { ContentCopy as CopyIcon } from '@mui/icons-material';
import { WRAPPING_CHIP_SX } from '../../utils/wrappingChip';
import type { CleanupCandidate, CleanupChild, CleanupInUseSession, CleanupSelection } from '@shared/agents/types';

/** 使用中の可能性がある（削除の確認で削除するかを問い合わせる）子要素か。 */
export function needsApproval(child: CleanupChild): boolean {
    return (child.inUseSessions?.length ?? 0) > 0;
}

/** 選択できる子要素か（使用中の子要素は、削除の確認で問い合わせるものだけを選択できる）。 */
export function isSelectableChild(child: CleanupChild): boolean {
    return child.inUse !== true || needsApproval(child);
}

/** 子要素の表示名（無ければ識別子）。 */
function childLabel(child: CleanupChild): string {
    return child.displayName ?? child.name;
}

/** 子要素の名前と、パス不明の印、状態の表示。 */
export const CleanupChildName: React.FC<{ child: CleanupChild; selectable: boolean }> = ({ child, selectable }) => {
    const { t } = useTranslation();
    return (
        <>
            <Typography
                variant='body2'
                color={selectable ? undefined : 'text.disabled'}
                sx={{ fontFamily: 'monospace', wordBreak: 'break-all', whiteSpace: 'pre-line' }}
            >
                {childLabel(child)}
            </Typography>
            {child.pathUnknown && (
                <Chip
                    sx={WRAPPING_CHIP_SX}
                    size='small'
                    variant='outlined'
                    label={t(child.pathUnknownLabelKey ?? 'common.cleanupPathUnknown')}
                />
            )}
            {child.badges?.map(badge => {
                const label = t(`common.cleanupBadge.${badge.key}`);
                return (
                    <Chip
                        key={badge.key}
                        sx={WRAPPING_CHIP_SX}
                        size='small'
                        variant='outlined'
                        label={
                            badge.count === undefined
                                ? label
                                : t('common.cleanupBadgeCount', { label, count: badge.count })
                        }
                    />
                );
            })}
        </>
    );
};

/** 候補の行に添える注記。候補に注記が無ければ何も表示しない。使えない候補の注記は目立つ色で表示する。 */
export const CleanupCandidateNotice: React.FC<{ candidate: CleanupCandidate }> = ({ candidate }) => {
    const { t } = useTranslation();
    if (!candidate.noticeKey) return null;
    return (
        <Typography
            variant='caption'
            color={candidate.blocked ? 'warning.main' : 'text.secondary'}
            component='div'
            sx={{ mt: 0.5 }}
        >
            {t(candidate.noticeKey, candidate.noticeParams ?? {})}
        </Typography>
    );
};

/**
 * 候補が全体または子要素の個別で選択されているか。dirs は全体を選択した候補キー、children は個別選択した子要素名
 * （階層のある子要素は配下の名前も含む）。
 */
export function isCandidateSelected(
    candidate: CleanupCandidate,
    dirs: ReadonlySet<string>,
    children: Readonly<Record<string, ReadonlySet<string>>>
): boolean {
    if (dirs.has(candidate.key)) return true;
    const selected = children[candidate.key];
    if (!selected) return false;
    const anySelected = (list: readonly CleanupChild[]): boolean =>
        list.some(child => selected.has(child.name) || anySelected(child.children ?? []));
    return anySelected(candidate.children ?? []);
}

/** 削除の結果の要約。removed は消えた選択項目の数、left は削除後も残っている選択項目の表示名。 */
export interface CleanupOutcome {
    removed: number;
    left: string[];
}

/**
 * 選択した項目が削除後の一覧に残っているかを調べる。全体を選んだ展開可能な候補は、選択できる子要素を項目として数える。
 * labelOf は子要素を持たない候補の表示名を返す。
 */
export function cleanupOutcome(
    before: readonly CleanupCandidate[],
    after: readonly CleanupCandidate[],
    dirs: ReadonlySet<string>,
    children: Readonly<Record<string, ReadonlySet<string>>>,
    labelOf: (candidate: CleanupCandidate) => string
): CleanupOutcome {
    const outcome: CleanupOutcome = { removed: 0, left: [] };
    for (const candidate of before) {
        const current = after.find(item => item.key === candidate.key);
        const whole = dirs.has(candidate.key);
        const selected = (candidate.children ?? []).filter(child =>
            whole ? isSelectableChild(child) : children[candidate.key]?.has(child.name)
        );
        if (selected.length > 0) {
            const remaining = new Set((current?.children ?? []).map(child => child.name));
            for (const child of selected) {
                if (remaining.has(child.name)) outcome.left.push(childLabel(child));
                else outcome.removed += 1;
            }
        } else if (whole) {
            if (current?.exists && current.fileCount > 0) outcome.left.push(labelOf(candidate));
            else outcome.removed += 1;
        }
    }
    return outcome;
}

// 通知に並べる、残っている項目の数の上限。
const LEFT_NAMES_SHOWN = 3;

type Translate = (key: string, options?: Record<string, unknown>) => string;

/**
 * 削除の結果の通知の文言と重要度を返す。すべて消えて失敗も無ければ successText。
 * 何も消えていなければその旨を、一部だけ消えたなら消えた数と残っているものを伝える。
 */
export function cleanupOutcomeNotice(
    t: Translate,
    outcome: CleanupOutcome,
    failed: boolean,
    successText: string
): { message: string; severity: 'success' | 'warning' } {
    const { removed, left } = outcome;
    if (left.length === 0) {
        return failed
            ? { message: t('common.cleanupDeleteFailed'), severity: 'warning' }
            : { message: successText, severity: 'success' };
    }
    const shown = left.slice(0, LEFT_NAMES_SHOWN).join(', ');
    const names =
        left.length > LEFT_NAMES_SHOWN
            ? t('common.cleanupLeftMore', { names: shown, count: left.length - LEFT_NAMES_SHOWN })
            : shown;
    return removed === 0
        ? { message: t('common.cleanupNothingDeleted', { names }), severity: 'warning' }
        : { message: t('common.cleanupPartlyDeleted', { count: removed, names }), severity: 'warning' };
}

/** 選択されている候補の、削除の確認に表示する注意文の i18n キーを、候補の順に重複なく返す。 */
export function collectConfirmWarnings(
    candidates: readonly CleanupCandidate[],
    dirs: ReadonlySet<string>,
    children: Readonly<Record<string, ReadonlySet<string>>>
): string[] {
    const keys = candidates.flatMap(candidate =>
        candidate.confirmWarningKey && isCandidateSelected(candidate, dirs, children)
            ? [candidate.confirmWarningKey]
            : []
    );
    return [...new Set(keys)];
}

/** 削除の確認ダイアログに表示する注意文の一覧。 */
export const CleanupConfirmWarnings: React.FC<{ keys: readonly string[] }> = ({ keys }) => {
    const { t } = useTranslation();
    return (
        <>
            {keys.map(key => (
                <Alert key={key} severity='warning' sx={{ mt: 2 }}>
                    {t(key)}
                </Alert>
            ))}
        </>
    );
};

/** 削除の確認で問い合わせる、使用中の可能性がある子要素 1 件と、その根拠のセッション。 */
export interface PendingApproval {
    candidateKey: string;
    name: string;
    // 画面に表示する名前
    label: string;
    sessions: CleanupInUseSession[];
}

/** 承認状態を管理するためのキー（候補キーと子要素名の組）。 */
export function approvalKey(item: PendingApproval): string {
    return `${item.candidateKey}\u0000${item.name}`;
}

/**
 * 選択した子要素（候補全体の選択ではすべての子要素）のうち、使用中の可能性があるものを集める。
 * dirs は全体を選択した候補キー、children は候補キーごとに個別選択した子要素名。
 */
export function collectPendingApprovals(
    candidates: readonly CleanupCandidate[],
    dirs: ReadonlySet<string>,
    children: Readonly<Record<string, ReadonlySet<string>>>
): PendingApproval[] {
    const result: PendingApproval[] = [];
    for (const candidate of candidates) {
        if (!candidate.expandable) continue;
        const whole = dirs.has(candidate.key);
        const selected = children[candidate.key];
        for (const child of candidate.children ?? []) {
            if (needsApproval(child) && (whole || selected?.has(child.name))) {
                result.push({
                    candidateKey: candidate.key,
                    name: child.name,
                    label: childLabel(child),
                    sessions: child.inUseSessions ?? [],
                });
            }
        }
    }
    return result;
}

/**
 * 削除の選択内容に承認の結果を反映する。承認したものは approvedChildren に入れ、承認しなかったものは
 * 個別選択から外す（候補全体の選択では、承認されていないものは削除されない）。
 */
export function applyApprovals(
    selection: CleanupSelection,
    pending: readonly PendingApproval[],
    approved: ReadonlySet<string>
): CleanupSelection {
    const approvedChildren: Record<string, string[]> = {};
    const declined = new Map<string, Set<string>>();
    for (const item of pending) {
        if (approved.has(approvalKey(item))) {
            (approvedChildren[item.candidateKey] ??= []).push(item.name);
        } else {
            const names = declined.get(item.candidateKey) ?? new Set<string>();
            names.add(item.name);
            declined.set(item.candidateKey, names);
        }
    }
    const childSelections: Record<string, string[]> = {};
    for (const [key, names] of Object.entries(selection.childSelections)) {
        const kept = names.filter(name => !declined.get(key)?.has(name));
        if (kept.length > 0) childSelections[key] = kept;
    }
    return { dirs: selection.dirs, childSelections, approvedChildren };
}

/**
 * 削除の確認ダイアログに表示する、使用中の可能性がある子要素の一覧。
 * 子要素ごとにチェックボックスを置き、判定の根拠と、名前のあるセッションを添える。チェックしたものだけを削除する。
 */
export const ApprovalList: React.FC<{
    title: string;
    items: PendingApproval[];
    checked: ReadonlySet<string>;
    onToggle: (key: string) => void;
}> = ({ title, items, checked, onToggle }) => {
    const { t } = useTranslation();
    return (
        <Box sx={{ mt: 2 }}>
            <Typography variant='subtitle2'>{title}</Typography>
            <Paper variant='outlined' sx={{ mt: 1, maxHeight: 320, overflowY: 'auto', px: 2, py: 1 }}>
                {items.map(item => {
                    const key = approvalKey(item);
                    const reasons = [...new Set(item.sessions.map(session => session.reason))];
                    const titled = item.sessions.filter(session => session.title);
                    return (
                        <Box key={key} sx={{ py: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                                <FormControlLabel
                                    sx={{ mr: 0 }}
                                    control={
                                        <Checkbox
                                            size='small'
                                            checked={checked.has(key)}
                                            onChange={() => onToggle(key)}
                                        />
                                    }
                                    label={
                                        <Typography
                                            variant='body2'
                                            sx={{
                                                fontFamily: 'monospace',
                                                wordBreak: 'break-all',
                                                whiteSpace: 'pre-line',
                                            }}
                                        >
                                            {item.label}
                                        </Typography>
                                    }
                                />
                                {reasons.map(reason => (
                                    <Chip
                                        key={reason}
                                        sx={WRAPPING_CHIP_SX}
                                        size='small'
                                        variant='outlined'
                                        color='warning'
                                        label={t(`common.cleanupApprovalReason.${reason}`)}
                                    />
                                ))}
                            </Box>
                            {titled.map(session => (
                                <Typography
                                    key={session.id}
                                    variant='caption'
                                    color='text.secondary'
                                    component='div'
                                    sx={{ pl: 4.5, wordBreak: 'break-all' }}
                                >
                                    {session.title}
                                </Typography>
                            ))}
                        </Box>
                    );
                })}
            </Paper>
        </Box>
    );
};

/** 削除できずに残ったパスの一覧を表示するダイアログ。パスはまとめてクリップボードへコピーできる。 */
export const FailedPathsDialog: React.FC<{
    paths: string[];
    onClose: () => void;
}> = ({ paths, onClose }) => {
    const { t } = useTranslation();
    const copy = () => {
        navigator.clipboard.writeText(paths.join('\n')).catch(error => {
            console.error('Failed to copy paths:', error);
        });
    };
    return (
        <Dialog open={paths.length > 0} onClose={onClose} maxWidth='md' fullWidth>
            <DialogTitle>{t('common.cleanupFailedTitle')}</DialogTitle>
            <DialogContent>
                <DialogContentText>{t('common.cleanupFailedBody', { count: paths.length })}</DialogContentText>
                <Paper variant='outlined' sx={{ mt: 2, maxHeight: 360, overflow: 'auto', px: 2, py: 1 }}>
                    {paths.map((path, i) => (
                        <Typography
                            key={i}
                            variant='body2'
                            sx={{ fontFamily: 'monospace', wordBreak: 'break-all', py: 0.25 }}
                        >
                            {path}
                        </Typography>
                    ))}
                </Paper>
            </DialogContent>
            <DialogActions>
                <Button startIcon={<CopyIcon />} onClick={copy}>
                    {t('common.cleanupCopyPaths')}
                </Button>
                <Button onClick={onClose} variant='contained'>
                    {t('common.cleanupClose')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
