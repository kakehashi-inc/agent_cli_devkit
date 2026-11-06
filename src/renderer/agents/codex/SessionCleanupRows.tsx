import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box,
    Checkbox,
    Chip,
    IconButton,
    TableCell,
    TableRow,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import { KeyboardArrowDown as ExpandIcon, KeyboardArrowRight as CollapseIcon } from '@mui/icons-material';
import type { CleanupChild } from '@shared/agents/codex/types';
import { formatBytes, formatCount, formatDateTime } from '../../utils/format';
import { WRAPPING_CHIP_SX } from '../../utils/wrappingChip';
import { CleanupChildName } from '../../components/agent/CleanupDeleteDialogs';

/** セッションの表示の切り替え。 */
export type SessionView = 'date' | 'project';

// 階層 1 段あたりの字下げ（theme.spacing の単位）。
const DEPTH_INDENT = 3;
// 展開ボタンの無い行で、名前の位置を揃えるための幅。
const EXPAND_BUTTON_WIDTH = 34;

/** 階層の子要素を親が先の順で平らにする。 */
export function flattenChildren(children: readonly CleanupChild[]): CleanupChild[] {
    return children.flatMap(child => [child, ...flattenChildren(child.children ?? [])]);
}

/**
 * 階層の選択を切り替えた結果を返す。名前は '/' で階層を表す。親を選ぶと親だけで配下すべてを表すので、
 * 配下の個別の選択を外す。
 */
export function toggleNestedSelection(selected: ReadonlySet<string>, name: string): Set<string> {
    const next = new Set(selected);
    if (next.has(name)) {
        next.delete(name);
        return next;
    }
    for (const other of selected) {
        if (other.startsWith(`${name}/`)) next.delete(other);
    }
    next.add(name);
    return next;
}

/** 日付とプロジェクトの表示を切り替えるボタン。 */
export const SessionViewToggle: React.FC<{ view: SessionView; onChange: (view: SessionView) => void }> = ({
    view,
    onChange,
}) => {
    const { t } = useTranslation();
    return (
        <ToggleButtonGroup
            exclusive
            size='small'
            value={view}
            aria-label={t('codex.cleanup.view.label')}
            onChange={(_, next: SessionView | null) => {
                if (next) onChange(next);
            }}
            sx={{ ml: 1.5 }}
        >
            <ToggleButton value='date' sx={{ py: 0.25 }}>
                {t('codex.cleanup.view.date')}
            </ToggleButton>
            <ToggleButton value='project' sx={{ py: 0.25 }}>
                {t('codex.cleanup.view.project')}
            </ToggleButton>
        </ToggleButtonGroup>
    );
};

/** 日付の階層の行（配下は展開したものだけ続けて出す）。どの階層でも選択できる。 */
export const SessionDateRows: React.FC<{
    nodes: readonly CleanupChild[];
    depth?: number;
    selected: ReadonlySet<string>;
    // 親か候補全体が選択されている
    ancestorChecked: boolean;
    expanded: ReadonlySet<string>;
    onToggle: (name: string) => void;
    onToggleExpanded: (name: string) => void;
}> = ({ nodes, depth = 0, selected, ancestorChecked, expanded, onToggle, onToggleExpanded }) => {
    return (
        <>
            {nodes.map(node => {
                const nested = node.children ?? [];
                const isOpen = expanded.has(node.name);
                const checked = ancestorChecked || selected.has(node.name);
                const partial = !checked && flattenChildren(nested).some(descendant => selected.has(descendant.name));
                return (
                    <React.Fragment key={node.name}>
                        <TableRow>
                            <TableCell padding='checkbox' sx={{ border: 0 }}>
                                <Checkbox
                                    size='small'
                                    checked={checked}
                                    indeterminate={partial}
                                    disabled={ancestorChecked}
                                    onChange={() => onToggle(node.name)}
                                />
                            </TableCell>
                            <TableCell sx={{ border: 0, width: '100%', pl: DEPTH_INDENT * depth }}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    {nested.length > 0 ? (
                                        <IconButton size='small' onClick={() => onToggleExpanded(node.name)}>
                                            {isOpen ? <ExpandIcon /> : <CollapseIcon />}
                                        </IconButton>
                                    ) : (
                                        <Box sx={{ width: EXPAND_BUTTON_WIDTH }} />
                                    )}
                                    <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                                        {node.name}
                                    </Typography>
                                </Box>
                            </TableCell>
                            <TableCell align='right' sx={{ border: 0, whiteSpace: 'nowrap' }}>
                                <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                                    {formatCount(node.fileCount)}
                                </Typography>
                            </TableCell>
                            <TableCell align='right' sx={{ border: 0, whiteSpace: 'nowrap' }}>
                                <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                                    {formatBytes(node.size)}
                                </Typography>
                            </TableCell>
                        </TableRow>
                        {isOpen && nested.length > 0 && (
                            <SessionDateRows
                                nodes={nested}
                                depth={depth + 1}
                                selected={selected}
                                ancestorChecked={checked}
                                expanded={expanded}
                                onToggle={onToggle}
                                onToggleExpanded={onToggleExpanded}
                            />
                        )}
                    </React.Fragment>
                );
            })}
        </>
    );
};

/** プロジェクト単位の表示の 1 行（パス、スレッド数、最終更新、ファイル数、サイズ）。 */
export const SessionProjectRow: React.FC<{
    child: CleanupChild;
    checked: boolean;
    disabled: boolean;
    onToggle: () => void;
}> = ({ child, checked, disabled, onToggle }) => {
    const { t } = useTranslation();
    const updated = formatDateTime(child.mtimeMs);
    return (
        <TableRow>
            <TableCell padding='checkbox' sx={{ border: 0 }}>
                <Checkbox size='small' checked={checked} disabled={disabled} onChange={onToggle} />
            </TableCell>
            <TableCell sx={{ border: 0, width: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <CleanupChildName child={child} selectable />
                    <Chip
                        sx={WRAPPING_CHIP_SX}
                        size='small'
                        variant='outlined'
                        label={t('codex.cleanup.threadCount', { count: child.threadCount ?? 0 })}
                    />
                </Box>
                {updated && (
                    <Typography variant='caption' color='text.secondary' component='div' sx={{ mt: 0.5 }}>
                        {t('codex.cleanup.lastUpdated', { date: updated })}
                    </Typography>
                )}
            </TableCell>
            <TableCell align='right' sx={{ border: 0, whiteSpace: 'nowrap' }}>
                <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                    {formatCount(child.fileCount)}
                </Typography>
            </TableCell>
            <TableCell align='right' sx={{ border: 0, whiteSpace: 'nowrap' }}>
                <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                    {formatBytes(child.size)}
                </Typography>
            </TableCell>
        </TableRow>
    );
};
