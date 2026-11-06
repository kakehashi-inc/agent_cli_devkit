import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Chip, Tooltip } from '@mui/material';
import type { AssetEntry, AssetListReport } from '@shared/agents/types';
import { WRAPPING_CHIP_SX } from '../../utils/wrappingChip';

interface Mark {
    key: string;
    label: string;
    hint: string;
    color: 'default' | 'warning' | 'error';
}

/** 行の補足（リンク、読み込まれない状態、由来、同じ名前の優先関係）を名前の下へ小さく並べる。無ければ何も出さない。 */
export const AssetEntryMarks: React.FC<{ entry: AssetEntry; i18nPrefix: string }> = ({ entry, i18nPrefix }) => {
    const { t } = useTranslation();
    const originLabel = (origin: string) => t(`${i18nPrefix}.origin.${origin}`);
    const marks: Mark[] = [];
    if (entry.origin) {
        marks.push({ key: 'origin', label: originLabel(entry.origin), hint: '', color: 'default' });
    }
    if (entry.link) {
        marks.push({
            key: 'link',
            label: t(`${i18nPrefix}.entryMark.link.${entry.link}`),
            hint: t(`${i18nPrefix}.entryMark.linkHint.${entry.link}`),
            color: 'default',
        });
    }
    if (entry.status) {
        marks.push({
            key: 'status',
            label: t(`${i18nPrefix}.entryMark.status.${entry.status}`),
            hint: t(`${i18nPrefix}.entryMark.statusHint.${entry.status}`),
            color: entry.status === 'refused-name' ? 'error' : 'warning',
        });
    }
    if (entry.overriddenBy) {
        const origin = originLabel(entry.overriddenBy);
        marks.push({
            key: 'overridden',
            label: t(`${i18nPrefix}.entryMark.overriddenBy`, { origin }),
            hint: t(`${i18nPrefix}.entryMark.overriddenByHint`, { origin }),
            color: 'warning',
        });
    }
    if (entry.sameNameIn) {
        const origin = originLabel(entry.sameNameIn);
        marks.push({
            key: 'same-name',
            label: t(`${i18nPrefix}.entryMark.sameNameIn`, { origin }),
            hint: t(`${i18nPrefix}.entryMark.sameNameInHint`, { origin }),
            color: 'warning',
        });
    }
    if (marks.length === 0) return null;
    return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
            {marks.map(mark => (
                <Tooltip key={mark.key} title={mark.hint}>
                    <Chip
                        size='small'
                        variant='outlined'
                        color={mark.color}
                        label={mark.label}
                        sx={{ ...WRAPPING_CHIP_SX, minHeight: 20, fontSize: '0.7rem' }}
                    />
                </Tooltip>
            ))}
        </Box>
    );
};

/** 一覧全体への注記（深さの上限で打ち切ったこと、読み取れなかったフォルダーがあること）を表示する。無ければ何も出さない。 */
export const AssetListNotices: React.FC<{ report: AssetListReport | null; i18nPrefix: string }> = ({
    report,
    i18nPrefix,
}) => {
    const { t } = useTranslation();
    if (!report || (report.truncatedDepth === undefined && !report.incomplete)) return null;
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
            {report.truncatedDepth !== undefined && (
                <Alert severity='warning'>{t(`${i18nPrefix}.listTruncated`, { depth: report.truncatedDepth })}</Alert>
            )}
            {report.incomplete && <Alert severity='warning'>{t(`${i18nPrefix}.listIncomplete`)}</Alert>}
        </Box>
    );
};
