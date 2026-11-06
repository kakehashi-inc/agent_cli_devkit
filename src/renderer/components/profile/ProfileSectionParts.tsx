import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Tooltip,
    Typography,
} from '@mui/material';
import type { ProfileActiveNotice, ProfileSectionData, ProfileSectionSpec } from '@shared/agents/profile/types';
import { WRAPPING_CHIP_SX } from '../../utils/wrappingChip';
import { StackedDialogFocus } from '../settings/StackedDialogFocus';
import { failureText, warningText } from './profileText';

const MONO_BOX_SX = {
    m: 0,
    p: 1.5,
    bgcolor: 'action.hover',
    borderRadius: 1,
    fontFamily: 'monospace',
    fontSize: '0.8rem',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
} as const;

/** section の見出しと条件付きの注記をまとめて表示する枠。 */
export const ProfileSectionFrame: React.FC<{
    section: ProfileSectionSpec;
    notices?: readonly ProfileActiveNotice[];
    children: React.ReactNode;
}> = ({ section, notices, children }) => {
    const { t } = useTranslation();
    return (
        <Box sx={{ mb: 4, '&:last-of-type': { mb: 0 } }}>
            {section.titleKey && (
                <Typography variant='subtitle1' component='h3' sx={{ fontWeight: 600, mb: 1 }}>
                    {t(section.titleKey)}
                </Typography>
            )}
            {(notices ?? []).map(notice => (
                <Alert key={notice.key} severity='warning' sx={{ mb: 1 }}>
                    {t(notice.key, { names: (notice.names ?? []).join(', ') })}
                </Alert>
            ))}
            {children}
        </Box>
    );
};

/** 読み込み中の表示。 */
export const SectionLoading: React.FC = () => {
    const { t } = useTranslation();
    return (
        <Typography color='text.secondary' sx={{ py: 1 }}>
            {t('common.loading')}
        </Typography>
    );
};

/** section を読めなかった理由の表示。 */
export const SectionFailure: React.FC<{ data: Extract<ProfileSectionData, { kind: 'failed' }> }> = ({ data }) => {
    const { t } = useTranslation();
    return <Alert severity='error'>{failureText(t, data.message, data.detail)}</Alert>;
};

/** テキストの読み取り専用の表示。 */
export const MonoBlock: React.FC<{ text: string }> = ({ text }) => (
    <Box component='pre' sx={{ ...MONO_BOX_SX, maxHeight: 320, overflow: 'auto', mb: 1 }}>
        {text}
    </Box>
);

/** 状態を示す小さなチップ。title を渡すとツールチップで補足する。長い文言は折り返す。 */
export const StatusChip: React.FC<{
    label: string;
    color?: 'default' | 'success' | 'warning' | 'error' | 'info';
    title?: string;
}> = ({ label, color = 'default', title }) => (
    <Tooltip title={title ?? ''} disableHoverListener={!title}>
        <Chip label={label} color={color} size='small' variant='outlined' sx={WRAPPING_CHIP_SX} />
    </Tooltip>
);

/** 警告の内容を示して、続行を確認するダイアログ。warnings が null の間は閉じている。destructive なら確定のボタンを赤にする。 */
export const WarningConfirmDialog: React.FC<{
    warnings: readonly string[] | null;
    busy?: boolean;
    title?: string;
    body?: string;
    confirmLabel?: string;
    destructive?: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}> = ({ warnings, busy = false, title, body, confirmLabel, destructive = false, onCancel, onConfirm }) => {
    const { t } = useTranslation();
    return (
        <>
            <StackedDialogFocus open={warnings !== null} />
            <Dialog open={warnings !== null} onClose={() => !busy && onCancel()} maxWidth='sm' fullWidth>
                <DialogTitle>{title ?? t('common.profile.warningConfirmTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 1, overflowWrap: 'anywhere' }}>
                        {body ?? t('common.profile.warningConfirmBody')}
                    </DialogContentText>
                    {(warnings ?? []).map(warning => (
                        <Alert key={warning} severity='warning' sx={{ mb: 1, overflowWrap: 'anywhere' }}>
                            {warningText(t, warning)}
                        </Alert>
                    ))}
                </DialogContent>
                <DialogActions>
                    <Button onClick={onCancel} disabled={busy}>
                        {t('common.profile.cancel')}
                    </Button>
                    <Button
                        color={destructive ? 'error' : 'warning'}
                        variant='contained'
                        onClick={onConfirm}
                        disabled={busy}
                    >
                        {confirmLabel ?? t('common.profile.confirmContinue')}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};
