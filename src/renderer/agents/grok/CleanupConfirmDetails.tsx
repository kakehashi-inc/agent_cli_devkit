import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Checkbox, FormControlLabel, Paper, Typography } from '@mui/material';
import type { CleanupCandidate, CleanupRelatedChild, CleanupSelection } from '@shared/agents/grok/types';

/** 削除の確認で一緒に削除するかを選べる子要素 1 件と、その候補キー。 */
export interface PendingRelated extends CleanupRelatedChild {
    candidateKey: string;
}

/** 選択状態を管理するためのキー（候補キーと子要素名の組）。 */
export function relatedKey(item: PendingRelated): string {
    return `${item.candidateKey}\u0000${item.name}`;
}

/** 個別に選択した子要素に添えられた、まだ選択されていない関連する子要素を重複なく集める。 */
export function collectRelatedChildren(
    candidates: readonly CleanupCandidate[],
    dirs: ReadonlySet<string>,
    children: Readonly<Record<string, ReadonlySet<string>>>
): PendingRelated[] {
    const result = new Map<string, PendingRelated>();
    for (const candidate of candidates) {
        const selected = children[candidate.key];
        if (dirs.has(candidate.key) || !selected) continue;
        for (const child of candidate.children ?? []) {
            if (!selected.has(child.name)) continue;
            for (const related of child.relatedChildren ?? []) {
                if (selected.has(related.name)) continue;
                const item = { ...related, candidateKey: candidate.key };
                result.set(relatedKey(item), item);
            }
        }
    }
    return [...result.values()];
}

/** 全体または個別で選択した子要素のうち、複数のパスで共有しているものの、パスの一覧を集める。 */
export function collectSharedPaths(
    candidates: readonly CleanupCandidate[],
    dirs: ReadonlySet<string>,
    children: Readonly<Record<string, ReadonlySet<string>>>
): string[][] {
    return candidates.flatMap(candidate =>
        (candidate.children ?? [])
            .filter(child => dirs.has(candidate.key) || children[candidate.key]?.has(child.name))
            .flatMap(child => (child.sharedPaths ? [child.sharedPaths] : []))
    );
}

/** 削除の選択内容に、確認で一緒に削除すると選んだ子要素を加える。 */
export function withRelatedSelection(
    selection: CleanupSelection,
    related: readonly PendingRelated[],
    checked: ReadonlySet<string>
): CleanupSelection {
    const childSelections: Record<string, string[]> = { ...selection.childSelections };
    for (const item of related) {
        if (!checked.has(relatedKey(item))) continue;
        childSelections[item.candidateKey] = [...(childSelections[item.candidateKey] ?? []), item.name];
    }
    return { ...selection, childSelections };
}

const PATH_TEXT_SX = { fontFamily: 'monospace', wordBreak: 'break-all' } as const;

/** 削除の確認に表示する、メモリを共有しているパスの一覧。 */
export const CleanupSharedPaths: React.FC<{ groups: readonly string[][] }> = ({ groups }) => {
    const { t } = useTranslation();
    if (groups.length === 0) return null;
    return (
        <Box sx={{ mt: 2 }}>
            <Typography variant='subtitle2'>{t('grok.cleanup.confirmSharedTitle')}</Typography>
            {groups.map(paths => (
                <Paper key={paths.join('\n')} variant='outlined' sx={{ mt: 1, px: 2, py: 1 }}>
                    {paths.map(path => (
                        <Typography key={path} variant='body2' sx={PATH_TEXT_SX}>
                            {path}
                        </Typography>
                    ))}
                </Paper>
            ))}
        </Box>
    );
};

/**
 * 削除の確認に表示する、下位フォルダの許可のファイルの一覧。
 * パスごとにチェックボックスを置き、チェックしたものだけを一緒に削除する。
 */
export const CleanupRelatedChildren: React.FC<{
    items: readonly PendingRelated[];
    checked: ReadonlySet<string>;
    onToggle: (key: string) => void;
}> = ({ items, checked, onToggle }) => {
    const { t } = useTranslation();
    if (items.length === 0) return null;
    return (
        <Box sx={{ mt: 2 }}>
            <Typography variant='subtitle2'>{t('grok.cleanup.confirmRelatedTitle')}</Typography>
            <Paper variant='outlined' sx={{ mt: 1, maxHeight: 320, overflowY: 'auto', px: 2, py: 1 }}>
                {items.map(item => {
                    const key = relatedKey(item);
                    return (
                        <Box key={key} sx={{ py: 0.5 }}>
                            <FormControlLabel
                                sx={{ mr: 0 }}
                                control={
                                    <Checkbox size='small' checked={checked.has(key)} onChange={() => onToggle(key)} />
                                }
                                label={
                                    <Typography variant='body2' sx={PATH_TEXT_SX}>
                                        {item.label}
                                    </Typography>
                                }
                            />
                            <Typography
                                variant='caption'
                                color='text.secondary'
                                component='div'
                                sx={{ pl: 4.5, wordBreak: 'break-all' }}
                            >
                                {item.files.join(', ')}
                            </Typography>
                        </Box>
                    );
                })}
            </Paper>
        </Box>
    );
};
