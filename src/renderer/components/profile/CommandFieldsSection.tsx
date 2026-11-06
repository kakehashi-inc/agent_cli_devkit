import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Autocomplete, Box, Button, TextField, Typography } from '@mui/material';
import { Close as CloseIcon, Save as SaveIcon } from '@mui/icons-material';
import type { CommandFieldSpec, CommandFieldsSectionSpec, ProfileWriteResult } from '@shared/agents/profile/types';
import type { ProfileSectionProps } from './profileContext';
import { ProfileSectionFrame, SectionFailure, SectionLoading, WarningConfirmDialog } from './ProfileSectionParts';
import { warningText, writeFailureText } from './profileText';
import { draftsAfterSave } from './unsavedDrafts';
import { useSectionData } from './useSectionData';

/** コマンド 1 つの入力欄。候補があれば候補付きの入力にする。 */
const CommandInput: React.FC<{
    field: CommandFieldSpec;
    value: string;
    disabled: boolean;
    onChange: (value: string) => void;
}> = ({ field, value, disabled, onChange }) => {
    const [open, setOpen] = useState(false);
    if (!field.suggestions) {
        return (
            <TextField
                fullWidth
                size='small'
                value={value}
                disabled={disabled}
                onChange={event => onChange(event.target.value)}
                slotProps={{ input: { sx: { fontFamily: 'monospace', fontSize: '0.85rem' } } }}
            />
        );
    }
    return (
        <Autocomplete
            freeSolo
            options={field.suggestions}
            value={value}
            inputValue={value}
            disabled={disabled}
            open={open}
            onOpen={() => setOpen(true)}
            onClose={() => setOpen(false)}
            onChange={(_event, next) => onChange(next ?? '')}
            onInputChange={(_event, next, reason) => {
                if (reason !== 'input' && reason !== 'clear') return;
                onChange(next);
                // 空にしただけでは候補を開かない（下の保存ボタンを隠さない）。
                if (next === '') setOpen(false);
            }}
            renderInput={params => <TextField {...params} size='small' />}
        />
    );
};

/**
 * 設定ファイルの文字列のコマンドを 1 行で編集する section。空にした値はキーの削除として保存する。
 * 未保存の編集がある間は読み直さず、保存時の競合の判定に任せる。保存中も入力でき、送った内容と違う編集は保存後も未保存のまま残す。
 */
export const CommandFieldsSection: React.FC<ProfileSectionProps<CommandFieldsSectionSpec>> = ({ section, ctx }) => {
    const { t } = useTranslation();
    const [drafts, setDrafts] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState(false);
    const [pendingWarnings, setPendingWarnings] = useState<string[] | null>(null);
    const [stale, setStale] = useState(false);
    const dirty = Object.keys(drafts).length > 0;
    const { data, reload } = useSectionData(ctx, section, { editing: dirty });
    const values = data?.kind === 'commandFields' ? data.values : null;

    const setDraft = (key: string, value: string) => {
        setDrafts(previous => {
            const next = { ...previous };
            // 保存中は読み込み済みの値が古いので、同じ値でも編集として残し、保存の完了時に判定する。
            if (!busy && value === (values?.[key]?.value ?? '')) delete next[key];
            else next[key] = value;
            return next;
        });
    };

    const handleResult = async (
        result: ProfileWriteResult,
        confirmed: readonly string[],
        sent: Readonly<Record<string, string>>
    ) => {
        if (result.ok) {
            // 読み直してから編集を消し、保存前の値が一瞬表示されないようにする。
            const read = await reload();
            const saved = read.kind === 'commandFields' ? read.values : null;
            setDrafts(current =>
                draftsAfterSave(
                    current,
                    sent,
                    (a, b) => a === b,
                    (key, draft) => saved !== null && draft === (saved[key]?.value ?? '')
                )
            );
            setStale(false);
            ctx.notify(t('common.profile.saved'), 'success');
            const notes = (result.warnings ?? []).filter(warning => !confirmed.includes(warning));
            if (notes.length > 0) ctx.notify(notes.map(note => warningText(t, note)).join(' '), 'warning');
            ctx.onChanged(section);
        } else if (result.message === 'needs-confirmation') {
            setPendingWarnings(result.warnings);
        } else {
            if (result.message === 'conflict') setStale(true);
            ctx.notify(writeFailureText(t, result), 'error');
        }
    };

    const save = async (confirmed: boolean) => {
        if (!values) return;
        const confirmedWarnings = pendingWarnings ?? [];
        setPendingWarnings(null);
        const changed: Record<string, string | null> = {};
        const base: Record<string, string> = {};
        for (const [key, value] of Object.entries(drafts)) {
            changed[key] = value.trim() === '' ? null : value;
            base[key] = values[key]?.revision ?? '';
        }
        setBusy(true);
        try {
            await handleResult(
                await ctx.api.saveCommandFields(ctx.env, section.id, changed, base, confirmed),
                confirmedWarnings,
                drafts
            );
        } catch {
            ctx.notify(t('common.profile.error.write-failed'), 'error');
        } finally {
            setBusy(false);
        }
    };

    const discard = () => {
        setDrafts({});
        setStale(false);
        void reload();
    };

    const body = () => {
        if (data === null) return <SectionLoading />;
        if (data.kind === 'failed') return <SectionFailure data={data} />;
        if (data.kind !== 'commandFields') return null;
        return (
            <>
                {section.fields.map(field => {
                    const current = data.values[field.key];
                    return (
                        <Box key={field.key} sx={{ mb: 2 }}>
                            {field.labelKey && (
                                <Typography variant='body2' sx={{ fontWeight: 600, mb: 0.5 }}>
                                    {t(field.labelKey)}
                                </Typography>
                            )}
                            <CommandInput
                                field={field}
                                value={drafts[field.key] ?? current?.value ?? ''}
                                disabled={current?.unsupported === true}
                                onChange={value => setDraft(field.key, value)}
                            />
                            {current?.unsupported && (
                                <Typography variant='caption' color='warning.main'>
                                    {t('common.profile.commandUnsupported')}
                                </Typography>
                            )}
                        </Box>
                    );
                })}
                {stale && (
                    <Alert severity='warning' sx={{ mb: 1 }}>
                        {t('common.profile.staleDraft')}
                    </Alert>
                )}
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant='contained'
                        size='small'
                        startIcon={<SaveIcon />}
                        disabled={busy || !dirty}
                        onClick={() => void save(false)}
                    >
                        {t('common.profile.save')}
                    </Button>
                    <Button
                        variant='outlined'
                        size='small'
                        startIcon={<CloseIcon />}
                        disabled={busy || !dirty}
                        onClick={discard}
                    >
                        {t('common.profile.discard')}
                    </Button>
                </Box>
            </>
        );
    };

    return (
        <ProfileSectionFrame section={section} notices={data?.notices}>
            {body()}
            <WarningConfirmDialog
                warnings={pendingWarnings}
                busy={busy}
                confirmLabel={t('common.profile.confirmSave')}
                onCancel={() => setPendingWarnings(null)}
                onConfirm={() => void save(true)}
            />
        </ProfileSectionFrame>
    );
};
