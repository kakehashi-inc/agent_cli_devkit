import React from 'react';
import { useTranslation } from 'react-i18next';
import {
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
import type { CleanupCandidate, CleanupChild, CleanupInUseSession, CleanupSelection } from '@shared/agents/types';

/** 使用中の可能性がある（削除の確認で削除するかを問い合わせる）子要素か。 */
export function needsApproval(child: CleanupChild): boolean {
    return (child.inUseSessions?.length ?? 0) > 0;
}

/** 選択できる子要素か（使用中の子要素は、削除の確認で問い合わせるものだけを選択できる）。 */
export function isSelectableChild(child: CleanupChild): boolean {
    return child.inUse !== true || needsApproval(child);
}

/** 削除の確認で問い合わせる、使用中の可能性がある子要素 1 件と、その根拠のセッション。 */
export interface PendingApproval {
    candidateKey: string;
    name: string;
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
                result.push({ candidateKey: candidate.key, name: child.name, sessions: child.inUseSessions ?? [] });
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
                                            sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
                                        >
                                            {item.name}
                                        </Typography>
                                    }
                                />
                                {reasons.map(reason => (
                                    <Chip
                                        key={reason}
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
                <Button startIcon={<CopyIcon />} onClick={copy} sx={{ textTransform: 'none' }}>
                    {t('common.cleanupCopyPaths')}
                </Button>
                <Button onClick={onClose} variant='contained' sx={{ textTransform: 'none' }}>
                    {t('common.cleanupClose')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
