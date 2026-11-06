// 長い文言を省略せず、列に収まらなければ折り返すチップの見た目。
export const WRAPPING_CHIP_SX = {
    height: 'auto',
    minHeight: 24,
    maxWidth: '100%',
    '& .MuiChip-label': { whiteSpace: 'normal', overflowWrap: 'anywhere', py: 0.25 },
} as const;
