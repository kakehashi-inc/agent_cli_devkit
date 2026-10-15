import React from 'react';
import { Box, Tooltip, type SxProps, type Theme } from '@mui/material';

// 補足表示するメタキー。
// - defaultValue: 値が既定値と同じ（大小無視）場合は表示しない。
export type DetailKey = string | { key: string; defaultValue?: string };

// frontmatter 列の表示設定（table-layout: fixed と併用）。
// - fit:    内容に合わせて伸縮し、maxWidth で上限を制限する（name）。上限超過は省略（…）。
// - width:  固定幅（model など）。
// - flex:   残り幅をすべて使う伸縮列（description。width:auto で貪欲に確保）。
export interface FmColumn {
    key: string;
    width?: number; // 固定幅（px）
    maxWidthPct?: number; // fit 列の最大幅（ウィンドウ幅に対する割合 0〜1）
    fit?: boolean; // 内容フィット（maxWidth 上限）
    flex?: boolean; // 残り幅を使う伸縮列
    effortKey?: string; // 推論レベルのメタキー。値があれば列の値の次の行に「(値)」で表示する
    detailKeys?: DetailKey[]; // 値の下に「キー: 値」で補足表示するメタキー（記載順）
    // 表示値と推論レベルを独自に解決する（値に推論レベルが埋め込まれる形式用）。指定時は effortKey より優先する
    resolve?: (frontmatter: Record<string, string>) => { value: string; effort?: string };
}

/**
 * 列の表示値と推論レベル（resolve または effortKey から解決。未指定・空なら undefined）を返す。
 * 表示値は前後の空白・改行を除く。
 */
export function resolveColumnValue(
    entry: { name?: string; frontmatter?: Record<string, string> },
    col: FmColumn
): { value: string; effort?: string } {
    // name 列はディレクトリ名 / ファイル名を基準に、frontmatter があれば優先。
    // frontmatter が未定義でも落ちないようガードする。
    if (col.resolve) {
        const resolved = col.resolve(entry.frontmatter ?? {});
        return { value: resolved.value.trim(), effort: resolved.effort?.trim() || undefined };
    }
    const fmValue = entry.frontmatter?.[col.key];
    const value = fmValue ?? (col.key === 'name' ? (entry.name ?? '') : '');
    const effort = col.effortKey ? entry.frontmatter?.[col.effortKey]?.trim() : undefined;
    return { value: value.trim(), effort: effort || undefined };
}

/** 列の値（name 以外）を表示する。ツールチップは改行を保持して全文を出す（値が空なら出さない）。 */
export const ColumnValue: React.FC<{ value: string; sx: SxProps<Theme> }> = ({ value, sx }) => (
    <Tooltip title={value ? <Box sx={{ whiteSpace: 'pre-line' }}>{value}</Box> : ''}>
        <Box sx={sx}>{value}</Box>
    </Tooltip>
);

/** 推論レベルを列の値の次の行に「(値)」の控えめな表記で表示する。 */
export const EffortLine: React.FC<{ effort: string }> = ({ effort }) => (
    <Tooltip title={`(${effort})`}>
        <Box
            sx={{
                mt: 0.25,
                fontSize: '0.75rem',
                lineHeight: 1.3,
                color: 'text.secondary',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
            }}
        >
            ({effort})
        </Box>
    </Tooltip>
);

/**
 * detailKeys に指定したメタ情報のうち、値があり既定値と異なるものを「キー: 値」で小さく並べる。
 * 最大 2 行で省略し、ツールチップで全項目を 1 行ずつ表示する。該当が無ければ何も描画しない。
 */
export const AssetDetails: React.FC<{ frontmatter?: Record<string, string>; keys: DetailKey[] }> = ({
    frontmatter,
    keys,
}) => {
    const items = keys
        .map(spec => (typeof spec === 'string' ? { key: spec } : spec))
        .map(spec => ({ key: spec.key, defaultValue: spec.defaultValue, value: frontmatter?.[spec.key]?.trim() ?? '' }))
        .filter(item => item.value !== '' && item.value.toLowerCase() !== item.defaultValue?.toLowerCase());
    if (items.length === 0) {
        return null;
    }
    return (
        <Tooltip
            title={
                <Box>
                    {items.map(item => (
                        <Box key={item.key} sx={{ overflowWrap: 'anywhere' }}>
                            {item.key}: {item.value}
                        </Box>
                    ))}
                </Box>
            }
        >
            <Box
                sx={{
                    mt: 0.5,
                    fontSize: '0.75rem',
                    lineHeight: 1.4,
                    color: 'text.secondary',
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: 2,
                    overflow: 'hidden',
                    overflowWrap: 'anywhere',
                }}
            >
                {items.map(item => (
                    <Box component='span' key={item.key} sx={{ mr: 1.5 }}>
                        <Box component='span' sx={{ fontWeight: 600 }}>
                            {item.key}:
                        </Box>{' '}
                        {item.value}
                    </Box>
                ))}
            </Box>
        </Tooltip>
    );
};
