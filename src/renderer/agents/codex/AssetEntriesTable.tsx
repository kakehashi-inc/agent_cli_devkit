import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Checkbox,
    Button,
    Tooltip,
} from '@mui/material';
import { Visibility as ViewIcon, Article as FullViewIcon } from '@mui/icons-material';
import type { AssetEntry } from '@shared/agents/codex/types';
import { formatCount, formatDateTime, isRecent, relativeTimeParts } from '../../utils/format';

// frontmatter 列の表示設定（table-layout: fixed と併用）。
// - fit:    内容に合わせて伸縮し、maxWidth で上限を制限する（name）。上限超過は省略（…）。
// - width:  固定幅（model）。
// - flex:   残り幅をすべて使う伸縮列（description。width:auto で貪欲に確保）。
export interface FmColumn {
    key: string;
    width?: number;
    maxWidthPct?: number;
    fit?: boolean;
    flex?: boolean;
}

const NAME_MIN_WIDTH = 80;
const NAME_CHAR_PX = 8;

/**
 * fit 列（name）の幅を実データから見積もる。
 */
export function computeFitWidth(entries: AssetEntry[], maxWidthPx: number): number {
    let maxChars = 0;
    for (const e of entries) {
        const nameLen = (e.frontmatter?.name ?? e.name ?? '').length;
        const subLen = relSubDir(e.relPath).length;
        maxChars = Math.max(maxChars, nameLen, subLen);
    }
    const px = maxChars * NAME_CHAR_PX + 24;
    return Math.min(Math.max(px, NAME_MIN_WIDTH), maxWidthPx);
}

function colWidthSx(col: FmColumn, fitWidth: number): { width?: number | string } {
    if (col.flex) {
        return { width: 'auto' };
    }
    if (col.fit) {
        return { width: fitWidth };
    }
    return { width: col.width };
}

/**
 * relPath（asset 親からの相対パス）のうち、サブディレクトリ部分（最後の '/' より前）を返す。
 */
export function relSubDir(relPath: string): string {
    const idx = relPath.lastIndexOf('/');
    return idx <= 0 ? '' : relPath.slice(0, idx + 1);
}

interface Props {
    entries: AssetEntry[];
    columns: FmColumn[];
    fitWidth: number;
    showFileCount: boolean;
    showLastModified?: boolean;
    checkedKeys: Set<string>;
    onToggle: (relPath: string) => void;
    onToggleAll: () => void;
    onView: (entry: AssetEntry) => void;
    // 「全体」参照（ファイル内容全体の表示）。未指定なら「全体」ボタンを表示しない（公式ダイアログ用）。
    onViewFull?: (entry: AssetEntry) => void;
}

const LAST_MODIFIED_WIDTH = 140;

/**
 * Agent・Skill / 公式スキルの一覧テーブル。
 */
export const AssetEntriesTable: React.FC<Props> = ({
    entries,
    columns,
    fitWidth,
    showFileCount,
    showLastModified = false,
    checkedKeys,
    onToggle,
    onToggleAll,
    onView,
    onViewFull,
}) => {
    const { t } = useTranslation();
    const allChecked = entries.length > 0 && entries.every(e => checkedKeys.has(e.relPath));
    const someChecked = entries.some(e => checkedKeys.has(e.relPath));

    return (
        <TableContainer>
            <Table size='small' sx={{ tableLayout: 'fixed', width: '100%' }}>
                <TableHead>
                    <TableRow>
                        <TableCell padding='checkbox' sx={{ width: 48 }}>
                            <Checkbox
                                indeterminate={someChecked && !allChecked}
                                checked={allChecked}
                                onChange={onToggleAll}
                            />
                        </TableCell>
                        {columns.map(col => (
                            <TableCell
                                key={col.key}
                                sx={{
                                    ...colWidthSx(col, fitWidth),
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {t(`codex.assetManager.col.${col.key}`)}
                            </TableCell>
                        ))}
                        {showLastModified && (
                            <TableCell sx={{ width: LAST_MODIFIED_WIDTH, whiteSpace: 'nowrap' }}>
                                {t('codex.assetManager.columnLastModified')}
                            </TableCell>
                        )}
                        {showFileCount && (
                            <TableCell align='right' sx={{ width: 72, whiteSpace: 'nowrap' }}>
                                {t('codex.assetManager.columnFiles')}
                            </TableCell>
                        )}
                        <TableCell align='center' sx={{ width: 96, whiteSpace: 'nowrap' }}>
                            {t('codex.assetManager.columnView')}
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {entries.map(entry => {
                        const recent = isRecent(entry.mtimeMs);
                        const relPart = relativeTimeParts(entry.mtimeMs);
                        const relText = relPart
                            ? t(
                                  `codex.assetManager.relative.${relPart.key}`,
                                  relPart.count != null ? { count: relPart.count } : {}
                              )
                            : '';
                        return (
                            <TableRow key={entry.relPath} hover>
                                <TableCell padding='checkbox' sx={{ width: 48 }}>
                                    <Checkbox
                                        checked={checkedKeys.has(entry.relPath)}
                                        onChange={() => onToggle(entry.relPath)}
                                    />
                                </TableCell>
                                {columns.map(col => {
                                    const fmValue = entry.frontmatter?.[col.key];
                                    const value = fmValue ?? (col.key === 'name' ? (entry.name ?? '') : '');
                                    const subPath = col.key === 'name' ? relSubDir(entry.relPath) : '';
                                    const valueSx = col.fit
                                        ? {
                                              whiteSpace: 'nowrap' as const,
                                              overflow: 'hidden',
                                              textOverflow: 'ellipsis',
                                          }
                                        : {
                                              display: '-webkit-box',
                                              WebkitBoxOrient: 'vertical' as const,
                                              WebkitLineClamp: 2,
                                              overflow: 'hidden',
                                              overflowWrap: 'anywhere' as const,
                                          };
                                    return (
                                        <TableCell
                                            key={col.key}
                                            sx={{
                                                ...colWidthSx(col, fitWidth),
                                                verticalAlign: 'top',
                                            }}
                                        >
                                            <Tooltip title={value} disableHoverListener={!value}>
                                                <Box sx={valueSx}>{value}</Box>
                                            </Tooltip>
                                            {subPath && (
                                                <Tooltip title={subPath}>
                                                    <Box
                                                        sx={{
                                                            display: 'block',
                                                            mt: 0.25,
                                                            fontSize: '0.75rem',
                                                            lineHeight: 1.3,
                                                            color: 'text.secondary',
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                        }}
                                                    >
                                                        {subPath}
                                                    </Box>
                                                </Tooltip>
                                            )}
                                        </TableCell>
                                    );
                                })}
                                {showLastModified && (
                                    <TableCell sx={{ width: LAST_MODIFIED_WIDTH, verticalAlign: 'top' }}>
                                        <Box sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                                            {formatDateTime(entry.mtimeMs)}
                                        </Box>
                                        {(recent || relText) && (
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                                {recent && (
                                                    <Box
                                                        component='span'
                                                        sx={{
                                                            px: 0.75,
                                                            py: 0.125,
                                                            borderRadius: 0.75,
                                                            bgcolor: 'error.main',
                                                            color: 'error.contrastText',
                                                            fontSize: '0.7rem',
                                                            fontWeight: 700,
                                                            lineHeight: 1.4,
                                                            letterSpacing: '0.05em',
                                                        }}
                                                    >
                                                        {t('codex.assetManager.newBadge')}
                                                    </Box>
                                                )}
                                                {relText && (
                                                    <Box
                                                        component='span'
                                                        sx={{
                                                            fontSize: '0.75rem',
                                                            lineHeight: 1.3,
                                                            color: 'text.secondary',
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                    >
                                                        {relText}
                                                    </Box>
                                                )}
                                            </Box>
                                        )}
                                    </TableCell>
                                )}
                                {showFileCount && (
                                    <TableCell
                                        align='right'
                                        sx={{ width: 72, whiteSpace: 'nowrap', verticalAlign: 'top' }}
                                    >
                                        {formatCount(entry.fileCount ?? 0)}
                                    </TableCell>
                                )}
                                <TableCell
                                    align='center'
                                    sx={{ width: 96, whiteSpace: 'nowrap', verticalAlign: 'top' }}
                                >
                                    <Button
                                        size='small'
                                        startIcon={<ViewIcon />}
                                        disabled={!entry.frontmatterRaw}
                                        onClick={() => onView(entry)}
                                        sx={{ display: 'flex', mx: 'auto', py: 0, minWidth: 0 }}
                                    >
                                        {t('codex.assetManager.viewHeader')}
                                    </Button>
                                    {onViewFull && (
                                        <Button
                                            size='small'
                                            startIcon={<FullViewIcon />}
                                            onClick={() => onViewFull(entry)}
                                            sx={{ display: 'flex', mx: 'auto', py: 0, minWidth: 0, mt: 0.5 }}
                                        >
                                            {t('codex.assetManager.viewFull')}
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
};
