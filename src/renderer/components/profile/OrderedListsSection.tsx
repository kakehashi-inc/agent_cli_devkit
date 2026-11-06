import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Autocomplete, Box, Button, TextField, Typography } from '@mui/material';
import { Close as CloseIcon, Save as SaveIcon } from '@mui/icons-material';
import type {
    OrderedListData,
    OrderedListSpec,
    OrderedListsSectionSpec,
    ProfileWriteResult,
} from '@shared/agents/profile/types';
import type { ProfileSectionProps } from './profileContext';
import {
    ProfileSectionFrame,
    SectionFailure,
    SectionLoading,
    StatusChip,
    WarningConfirmDialog,
} from './ProfileSectionParts';
import { warningText, writeFailureText } from './profileText';
import { draftsAfterSave } from './unsavedDrafts';
import { useSectionData } from './useSectionData';

// 編集中のリスト。unset は「未設定」にする指定。
interface ListDraft {
    text: string;
    unset: boolean;
}

function draftOf(data: OrderedListData | undefined): ListDraft {
    return { text: (data?.items ?? []).join('\n'), unset: data?.items === null || data?.items === undefined };
}

function sameDraft(a: ListDraft, b: ListDraft): boolean {
    return a.text === b.text && a.unset === b.unset;
}

/** 1 行 1 要素の編集で内容を保てない要素か（改行を含む、空、前後に空白がある）。 */
function isUneditableItem(item: string): boolean {
    return /[\r\n]/.test(item) || item.trim() !== item || item === '';
}

/** 編集中のリストを保存する値にする。空行は要素にしない。 */
function itemsOf(draft: ListDraft): string[] | null {
    if (draft.unset) return null;
    return draft.text
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line !== '');
}

/** 候補から選んで行を足す入力欄。選んだ後は欄を空に戻す。 */
const SuggestionPicker: React.FC<{ suggestions: string[]; disabled: boolean; onPick: (value: string) => void }> = ({
    suggestions,
    disabled,
    onPick,
}) => {
    const { t } = useTranslation();
    const [input, setInput] = useState('');
    return (
        <Autocomplete
            options={suggestions}
            value={null}
            inputValue={input}
            disabled={disabled}
            onChange={(_event, next) => {
                if (next) onPick(next);
                setInput('');
            }}
            onInputChange={(_event, next, reason) => {
                if (reason === 'input' || reason === 'clear') setInput(next);
            }}
            renderInput={params => (
                <TextField {...params} size='small' label={t('common.profile.list.addSuggestion')} />
            )}
            sx={{ mt: 1, maxWidth: 360 }}
        />
    );
};

/**
 * 設定ファイルの文字列の配列を 1 行 1 要素で編集する section。要素の順序は入力のまま保つ。
 * 未保存の編集がある間は読み直さず、保存時の競合の判定に任せる。保存中も入力でき、送った内容と違う編集は保存後も未保存のまま残す。
 */
export const OrderedListsSection: React.FC<ProfileSectionProps<OrderedListsSectionSpec>> = ({ section, ctx }) => {
    const { t } = useTranslation();
    const [drafts, setDrafts] = useState<Record<string, ListDraft>>({});
    const [busy, setBusy] = useState(false);
    const [pendingWarnings, setPendingWarnings] = useState<string[] | null>(null);
    const [stale, setStale] = useState(false);
    const dirty = Object.keys(drafts).length > 0;
    const { data, reload } = useSectionData(ctx, section, { editing: dirty });
    const lists = data?.kind === 'orderedLists' ? data.lists : null;

    const setDraft = (key: string, draft: ListDraft) => {
        setDrafts(previous => {
            const next = { ...previous };
            // 保存中は読み込み済みの値が古いので、同じ値でも編集として残し、保存の完了時に判定する。
            if (!busy && sameDraft(draft, draftOf(lists?.[key]))) delete next[key];
            else next[key] = draft;
            return next;
        });
    };

    const handleResult = async (
        result: ProfileWriteResult,
        confirmed: readonly string[],
        sent: Readonly<Record<string, ListDraft>>
    ) => {
        if (result.ok) {
            // 読み直してから編集を消し、保存前の値が一瞬表示されないようにする。
            const read = await reload();
            const saved = read.kind === 'orderedLists' ? read.lists : null;
            setDrafts(current =>
                draftsAfterSave(
                    current,
                    sent,
                    sameDraft,
                    (key, draft) => saved !== null && sameDraft(draft, draftOf(saved[key]))
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
        if (!lists) return;
        const confirmedWarnings = pendingWarnings ?? [];
        setPendingWarnings(null);
        const changed: Record<string, string[] | null> = {};
        const base: Record<string, string> = {};
        for (const [key, draft] of Object.entries(drafts)) {
            changed[key] = itemsOf(draft);
            base[key] = lists[key]?.revision ?? '';
        }
        setBusy(true);
        try {
            await handleResult(
                await ctx.api.saveLists(ctx.env, section.id, changed, base, confirmed),
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

    const renderList = (list: OrderedListSpec, current: OrderedListData | undefined, blocked: boolean) => {
        const draft = drafts[list.key] ?? draftOf(current);
        const uneditableItem = (current?.items ?? []).some(isUneditableItem);
        const locked = blocked || current?.unsupported === true || uneditableItem;
        const append = (value: string) => {
            setDraft(list.key, { text: draft.text.trim() === '' ? value : `${draft.text}\n${value}`, unset: false });
        };
        return (
            <Box key={list.key} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    {list.labelKey && (
                        <Typography variant='body2' sx={{ fontWeight: 600 }}>
                            {t(list.labelKey)}
                        </Typography>
                    )}
                    {draft.unset && <StatusChip label={t('common.profile.list.unset')} />}
                    {!draft.unset && itemsOf(draft)?.length === 0 && (
                        <StatusChip label={t('common.profile.list.empty')} />
                    )}
                </Box>
                <TextField
                    multiline
                    fullWidth
                    minRows={3}
                    maxRows={12}
                    size='small'
                    value={draft.text}
                    disabled={locked}
                    onChange={event =>
                        setDraft(list.key, {
                            text: event.target.value,
                            unset: list.emptyMeans === 'unset' && event.target.value.trim() === '',
                        })
                    }
                    slotProps={{ input: { sx: { fontFamily: 'monospace', fontSize: '0.85rem' } } }}
                />
                {list.suggestions && !locked && (
                    <SuggestionPicker suggestions={list.suggestions} disabled={locked} onPick={append} />
                )}
                {list.emptyMeans === 'emptyArray' && !locked && (
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Button size='small' onClick={() => setDraft(list.key, { text: '', unset: false })}>
                            {t('common.profile.list.setEmpty')}
                        </Button>
                        <Button size='small' onClick={() => setDraft(list.key, { text: '', unset: true })}>
                            {t('common.profile.list.setUnset')}
                        </Button>
                    </Box>
                )}
                {(current?.unsupported || uneditableItem) && (
                    <Typography variant='caption' color='warning.main'>
                        {t('common.profile.list.unsupported')}
                    </Typography>
                )}
            </Box>
        );
    };

    const body = () => {
        if (data === null) return <SectionLoading />;
        if (data.kind === 'failed') return <SectionFailure data={data} />;
        if (data.kind !== 'orderedLists') return null;
        const anyOwn = section.lists.some(list => data.lists[list.key]?.items);
        const blocked = data.otherForm === true && !anyOwn;
        return (
            <>
                {data.otherForm && section.otherForm && (
                    <Alert severity='warning' sx={{ mb: 1 }}>
                        {t(blocked ? section.otherForm.blockedKey : section.otherForm.bothKey)}
                    </Alert>
                )}
                {section.lists.map(list => renderList(list, data.lists[list.key], blocked))}
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
