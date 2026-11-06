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
    IconButton,
} from '@mui/material';
import { Visibility as ViewIcon, Article as FullViewIcon, OpenInNew as OpenInNewIcon } from '@mui/icons-material';
import type { AssetEntry } from '@shared/agents/types';
import { canRevealAsset, canSelectAsset, canViewAsset } from '../../utils/assetEntry';
import { formatCount, formatDateTime, isRecent, relativeTimeParts } from '../../utils/format';
import { AssetEntryMarks } from './AssetEntryMarks';
import { AssetDetails, ColumnValue, EffortLine, resolveColumnValue, type FmColumn } from './assetColumns';

export type { FmColumn };

// relPath の先頭の読み取り元の識別子と、相対パスの区切り。
const ORIGIN_SEPARATOR = '::';

// name（fit 列）の最小幅と、文字の種類ごとの概算 px（幅見積り用）。
const NAME_MIN_WIDTH = 80;
const CHAR_PX = 8;
const UPPER_CHAR_PX = 10;
const WIDE_CHAR_PX = 14;
// セルの左右の余白、表示アイコン、チップの左右の余白の px。
const CELL_PADDING_PX = 32;
const REVEAL_ACTION_PX = 24;
const CHIP_PADDING_PX = 24;

/** テキストの表示幅の概算（px）。 */
function estimateTextWidth(text: string): number {
    let width = 0;
    for (const char of text) {
        if (char.charCodeAt(0) > 0x2e7f) width += WIDE_CHAR_PX;
        else width += /[A-Z]/.test(char) ? UPPER_CHAR_PX : CHAR_PX;
    }
    return width;
}

/**
 * fit 列（name）の幅を実データから見積もる。名前とサブパスの長い方と、名前の下に並ぶチップ（chipLabels）の長い方を基準に、
 * [NAME_MIN_WIDTH, maxWidthPx] の範囲へクランプする。
 */
export function computeFitWidth(
    entries: AssetEntry[],
    maxWidthPx: number,
    includeRevealAction = false,
    chipLabels?: (entry: AssetEntry) => readonly string[]
): number {
    let maxWidth = 0;
    for (const e of entries) {
        const nameWidth = estimateTextWidth(e.frontmatter?.name ?? e.name ?? '');
        const subWidth = estimateTextWidth(relSubDir(e.relPath));
        const chipWidth = Math.max(
            0,
            ...(chipLabels?.(e) ?? []).map(label => estimateTextWidth(label) + CHIP_PADDING_PX)
        );
        maxWidth = Math.max(maxWidth, nameWidth + (includeRevealAction ? REVEAL_ACTION_PX : 0), subWidth, chipWidth);
    }
    return Math.min(Math.max(maxWidth + CELL_PADDING_PX, NAME_MIN_WIDTH), maxWidthPx);
}

/** 列の幅指定を sx 用に解決する。fit 列は事前計算した fitWidth を使う。 */
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
 * relPath（読み取り元のルートからの相対パス）のうち、サブディレクトリ部分（最後の '/' より前）を返す。
 * 先頭の読み取り元の識別子（「<識別子>::」）は含めない。
 * 例: 'c-suite/cbdo.md' → 'c-suite/'、'foo.md' / 'apple-design' → ''（サブディレクトリなし）。
 */
export function relSubDir(relPath: string): string {
    const separator = relPath.indexOf(ORIGIN_SEPARATOR);
    const rel = separator === -1 ? relPath : relPath.slice(separator + ORIGIN_SEPARATOR.length);
    const idx = rel.lastIndexOf('/');
    return idx <= 0 ? '' : rel.slice(0, idx + 1);
}

interface Props {
    // i18n キーのプレフィックス（例 'agy.assets'）。col.* / columnLastModified 等を解決する。
    i18nPrefix: string;
    entries: AssetEntry[];
    columns: FmColumn[];
    fitWidth: number;
    showFileCount: boolean;
    // 最終更新日時列を表示するか。
    showLastModified?: boolean;
    checkedKeys: Set<string>;
    onToggle: (relPath: string) => void;
    onToggleAll: () => void;
    onView: (entry: AssetEntry) => void;
    // OS 標準のファイルマネージャーで対象を表示。未指定なら名前横の表示アイコンを出さない。
    onReveal?: (entry: AssetEntry) => void;
    // ファイルマネージャーで開けない理由。あれば行のアイコンを無効にして、この理由を表示する。
    revealDisabledReason?: string;
    // 「全体」参照（ファイル内容全体の表示）。未指定なら「全体」ボタンを表示しない。
    onViewFull?: (entry: AssetEntry) => void;
    // true ならヘッダの参照ボタンを出さない。
    hideHeaderView?: boolean;
    // name 列の下に追加で表示する内容を返す。
    renderNameExtra?: (entry: AssetEntry) => React.ReactNode;
}

// 最終更新日時列の幅（px）。'YYYY-MM-DD HH:mm' ＋ NEW バッジが収まる固定幅。
const LAST_MODIFIED_WIDTH = 140;
// 操作列の幅（px）。アイコン付きの参照ボタンがセルの余白の内側に収まる固定幅。
const ACTIONS_WIDTH = 120;
// 選択列の幅（px）。
const CHECKBOX_WIDTH = 48;
// ファイル数列の幅（px）。
const FILE_COUNT_WIDTH = 72;
// ウィンドウの幅のうち、一覧の外側の余白とスクロールバーが使う幅（px）。
const TABLE_MARGIN_PX = 97;
// 残り幅を使う列に確保する幅（px）。見出しの「Description」が省略されない幅。
const FLEX_MIN_WIDTH = 110;

/**
 * fit 列の幅の上限を返す。ウィンドウ幅に対する割合を基本にし、狭いウィンドウでは残り幅を使う列の幅を確保できるよう抑える。
 */
export function fitColumnLimit(columns: readonly FmColumn[], windowWidth: number, showFileCount: boolean): number {
    const ratio = columns.find(col => col.fit)?.maxWidthPct ?? 0.25;
    const fixedColumns = columns.reduce((sum, col) => sum + (col.width ?? 0), 0);
    const otherColumns =
        CHECKBOX_WIDTH + LAST_MODIFIED_WIDTH + ACTIONS_WIDTH + (showFileCount ? FILE_COUNT_WIDTH : 0) + fixedColumns;
    const room = windowWidth - TABLE_MARGIN_PX - otherColumns - FLEX_MIN_WIDTH;
    return Math.max(NAME_MIN_WIDTH, Math.min(Math.round(windowWidth * ratio), room));
}

/**
 * Agent・Skill の一覧テーブル（agent 非依存の共通実装）。
 * チェックボックス選択・frontmatter 列・最終更新日時・ファイル数・参照ボタンを 1 行ずつ表示する。
 */
export const AssetEntriesTable: React.FC<Props> = ({
    i18nPrefix,
    entries,
    columns,
    fitWidth,
    showFileCount,
    showLastModified = false,
    checkedKeys,
    onToggle,
    onToggleAll,
    onView,
    onReveal,
    revealDisabledReason,
    onViewFull,
    hideHeaderView = false,
    renderNameExtra,
}) => {
    const { t } = useTranslation();
    const selectable = entries.filter(canSelectAsset);
    const allChecked = selectable.length > 0 && selectable.every(e => checkedKeys.has(e.relPath));
    const someChecked = selectable.some(e => checkedKeys.has(e.relPath));

    return (
        <TableContainer>
            <Table size='small' sx={{ tableLayout: 'fixed', width: '100%' }}>
                <TableHead>
                    <TableRow>
                        <TableCell padding='checkbox' sx={{ width: CHECKBOX_WIDTH }}>
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
                                {t(`${i18nPrefix}.col.${col.key}`)}
                            </TableCell>
                        ))}
                        {showLastModified && (
                            <TableCell sx={{ width: LAST_MODIFIED_WIDTH, whiteSpace: 'nowrap' }}>
                                {t(`${i18nPrefix}.columnLastModified`)}
                            </TableCell>
                        )}
                        {showFileCount && (
                            <TableCell align='right' sx={{ width: FILE_COUNT_WIDTH, whiteSpace: 'nowrap' }}>
                                {t(`${i18nPrefix}.columnFiles`)}
                            </TableCell>
                        )}
                        <TableCell align='center' sx={{ width: ACTIONS_WIDTH, whiteSpace: 'nowrap' }}>
                            {t(`${i18nPrefix}.columnView`)}
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {entries.map(entry => {
                        const recent = isRecent(entry.mtimeMs);
                        const relPart = relativeTimeParts(entry.mtimeMs);
                        const relText = relPart
                            ? t(
                                  `${i18nPrefix}.relative.${relPart.key}`,
                                  relPart.count != null ? { count: relPart.count } : {}
                              )
                            : '';
                        return (
                            <TableRow key={entry.relPath} hover>
                                <TableCell padding='checkbox' sx={{ width: CHECKBOX_WIDTH }}>
                                    <Checkbox
                                        checked={checkedKeys.has(entry.relPath)}
                                        disabled={!canSelectAsset(entry)}
                                        onChange={() => onToggle(entry.relPath)}
                                    />
                                </TableCell>
                                {columns.map(col => {
                                    const { value, effort } = resolveColumnValue(entry, col);
                                    // name 列のみ: 親からの相対サブパスがあれば名前の下に控えめな色で表示。
                                    const subPath = col.key === 'name' ? relSubDir(entry.relPath) : '';
                                    // name（fit 列）は省略せず、列に収まらなければ折り返す。
                                    // その他の列は最大 2 行まで表示して超過を省略する。
                                    const valueSx = col.fit
                                        ? { overflowWrap: 'anywhere' as const }
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
                                            {col.key === 'name' && onReveal && canRevealAsset(entry) ? (
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 0.25,
                                                        minWidth: 0,
                                                    }}
                                                >
                                                    <Tooltip title={value} disableHoverListener={!value}>
                                                        <Box sx={{ ...valueSx, minWidth: 0 }}>{value}</Box>
                                                    </Tooltip>
                                                    <Tooltip
                                                        title={revealDisabledReason ?? t('common.revealInFileManager')}
                                                    >
                                                        <span>
                                                            <IconButton
                                                                size='small'
                                                                aria-label={t('common.revealInFileManager')}
                                                                disabled={revealDisabledReason !== undefined}
                                                                onClick={() => onReveal(entry)}
                                                                sx={{ p: 0.25, flexShrink: 0 }}
                                                            >
                                                                <OpenInNewIcon sx={{ fontSize: 16 }} />
                                                            </IconButton>
                                                        </span>
                                                    </Tooltip>
                                                </Box>
                                            ) : (
                                                <ColumnValue value={value} sx={valueSx} />
                                            )}
                                            {subPath && (
                                                <Tooltip title={subPath}>
                                                    <Box
                                                        sx={{
                                                            display: 'block',
                                                            mt: 0.25,
                                                            fontSize: '0.75rem',
                                                            lineHeight: 1.3,
                                                            color: 'text.secondary',
                                                            overflowWrap: 'anywhere',
                                                        }}
                                                    >
                                                        {subPath}
                                                    </Box>
                                                </Tooltip>
                                            )}
                                            {col.key === 'name' && (
                                                <AssetEntryMarks entry={entry} i18nPrefix={i18nPrefix} />
                                            )}
                                            {col.key === 'name' && renderNameExtra?.(entry)}
                                            {effort && <EffortLine effort={effort} />}
                                            {col.detailKeys && (
                                                <AssetDetails frontmatter={entry.frontmatter} keys={col.detailKeys} />
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
                                                        {t(`${i18nPrefix}.newBadge`)}
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
                                        sx={{ width: FILE_COUNT_WIDTH, whiteSpace: 'nowrap', verticalAlign: 'top' }}
                                    >
                                        {formatCount(entry.fileCount ?? 0)}
                                    </TableCell>
                                )}
                                <TableCell
                                    align='center'
                                    sx={{ width: ACTIONS_WIDTH, whiteSpace: 'nowrap', verticalAlign: 'top' }}
                                >
                                    {!hideHeaderView && (
                                        <Button
                                            size='small'
                                            startIcon={<ViewIcon />}
                                            disabled={!entry.frontmatterRaw}
                                            onClick={() => onView(entry)}
                                            sx={{ display: 'flex', mx: 'auto', py: 0, minWidth: 0 }}
                                        >
                                            {t(`${i18nPrefix}.viewHeader`)}
                                        </Button>
                                    )}
                                    {onViewFull && (
                                        <Button
                                            size='small'
                                            startIcon={<FullViewIcon />}
                                            disabled={!canViewAsset(entry)}
                                            onClick={() => onViewFull(entry)}
                                            sx={{
                                                display: 'flex',
                                                mx: 'auto',
                                                py: 0,
                                                minWidth: 0,
                                                mt: hideHeaderView ? 0 : 0.5,
                                            }}
                                        >
                                            {t(`${i18nPrefix}.viewFull`)}
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
