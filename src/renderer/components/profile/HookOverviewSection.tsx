import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    MenuItem,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { Add as AddIcon, DeleteOutlined as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import type {
    HookAddTarget,
    HookEntryAddition,
    HookEntryRead,
    HookOverviewRow,
    HookOverviewSectionSpec,
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
import { failureText, warningText, writeFailureText } from './profileText';
import { TextFileEditorDialog, type TextFileLoad, type TextFileRequest } from './TextFileEditorDialog';
import { useSectionData } from './useSectionData';

// 列が多くても最小の幅の画面に収まるように、セルの左右の余白を詰める。
const TABLE_SX = { '& .MuiTableCell-root': { px: 1 } };
const CELL_SX = { verticalAlign: 'top', overflowWrap: 'anywhere' };
// 短い値の列が 1 文字ずつ折り返されない幅。
const EVENT_CELL_SX = { ...CELL_SX, minWidth: 160 };
const TYPE_CELL_SX = { ...CELL_SX, minWidth: 84 };
const STATE_CELL_SX = { ...CELL_SX, minWidth: 88 };

/** 行の状態の表示。無効化の概念がない形式の行は状態を持たない。 */
const HookStateLabel: React.FC<{ row: HookOverviewRow }> = ({ row }) => {
    const { t } = useTranslation();
    switch (row.state) {
        case 'enabled':
            return <StatusChip color='success' label={t('common.profile.hook.enabled')} />;
        case 'disabled':
            return <StatusChip label={t('common.profile.hook.disabled')} />;
        case 'maskedByOtherCopy':
            return (
                <StatusChip
                    color='warning'
                    label={t('common.profile.hook.masked')}
                    title={t('common.profile.hook.maskedBy', { name: row.maskedBy ?? '' })}
                />
            );
        default:
            return null;
    }
};

/** 追加するイベントと追加先を選ぶダイアログ。追加先は複数あるときだけ、hook の名前は名前付きの形式でだけ選ばせる。 */
const HookAddDialog: React.FC<{
    open: boolean;
    section: HookOverviewSectionSpec;
    targets: readonly HookAddTarget[];
    onCancel: () => void;
    onNext: (addition: HookEntryAddition) => void;
}> = ({ open, section, targets, onCancel, onNext }) => {
    const { t } = useTranslation();
    const [event, setEvent] = useState(section.knownEvents[0] ?? '');
    const [source, setSource] = useState<string | null>(null);
    const [name, setName] = useState('');
    const target = targets.find(item => item.source === source) ?? targets[0];
    const named = section.parser === 'agyNamed';
    const nextName = name.trim();
    return (
        <Dialog open={open} onClose={onCancel} maxWidth='xs' fullWidth>
            <DialogTitle>{t('common.profile.hook.addTitle')}</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                    select
                    fullWidth
                    size='small'
                    label={t('common.profile.hook.colEvent')}
                    value={event}
                    onChange={changed => setEvent(changed.target.value)}
                    sx={{ mt: 1 }}
                >
                    {section.knownEvents.map(item => (
                        <MenuItem key={item} value={item}>
                            {item}
                        </MenuItem>
                    ))}
                </TextField>
                {targets.length > 1 && (
                    <TextField
                        select
                        fullWidth
                        size='small'
                        label={t('common.profile.hook.colSource')}
                        value={target?.source ?? ''}
                        onChange={changed => setSource(changed.target.value)}
                    >
                        {targets.map(item => (
                            <MenuItem key={item.source} value={item.source}>
                                {item.label}
                            </MenuItem>
                        ))}
                    </TextField>
                )}
                {named && (
                    <Autocomplete
                        freeSolo
                        options={target?.names ?? []}
                        inputValue={name}
                        onInputChange={(_changed, next) => setName(next)}
                        renderInput={params => (
                            <TextField {...params} size='small' label={t('common.profile.hook.name')} />
                        )}
                    />
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel}>{t('common.profile.cancel')}</Button>
                <Button
                    variant='contained'
                    disabled={!target || event === '' || (named && nextName === '')}
                    onClick={() =>
                        target && onNext({ source: target.source, event, ...(named ? { name: nextName } : {}) })
                    }
                >
                    {t('common.profile.next')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

/**
 * hook を 1 ハンドラ 1 行の表で表示し、1 件ごとに追加、編集、削除する section。
 * 編集はその 1 件の JSON をテキストエディタで行う。編集できない行（形の崩れた行、登録簿の行、リンクのファイルの行）は操作を出さない。
 * 無効化の行で切り替える形式では、名前の付いた行の有効と無効を切り替える。別のコピーに及ぶ切り替えは相手の名前を示して確認する。
 */
export const HookOverviewSection: React.FC<ProfileSectionProps<HookOverviewSectionSpec>> = ({ section, ctx }) => {
    const { t } = useTranslation();
    const [busy, setBusy] = useState(false);
    const [pending, setPending] = useState<{ row: HookOverviewRow; enabled: boolean; warnings: string[] } | null>(null);
    const [pendingDelete, setPendingDelete] = useState<{ row: HookOverviewRow; warnings: string[] } | null>(null);
    const [request, setRequest] = useState<TextFileRequest | null>(null);
    const [addOpen, setAddOpen] = useState(false);
    const { data } = useSectionData(ctx, section, { editing: request !== null });
    const disableList = data?.kind === 'hookOverview' ? data.disableList : undefined;
    const addTargets = data?.kind === 'hookOverview' ? data.addTargets : [];
    const toggleable = section.hookNaming !== undefined && disableList?.state !== 'unreadable';
    const showSource = section.sources.length > 1;
    const showHookName = section.parser === 'agyNamed';

    const toggle = async (row: HookOverviewRow, enabled: boolean, confirmed: boolean) => {
        if (row.hookName === undefined) return;
        setPending(null);
        setBusy(true);
        try {
            const result = await ctx.api.setHookEnabled(
                ctx.env,
                section.id,
                row.hookName,
                enabled,
                disableList?.revision ?? '',
                confirmed
            );
            if (result.ok) {
                ctx.notify(t('common.profile.saved'), 'success');
                ctx.onChanged(section);
            } else if (result.message === 'needs-confirmation') {
                setPending({ row, enabled, warnings: result.warnings });
            } else {
                ctx.notify(writeFailureText(t, result), 'error');
                ctx.onChanged(section);
            }
        } catch {
            ctx.notify(t('common.profile.error.write-failed'), 'error');
        } finally {
            setBusy(false);
        }
    };

    const loadOf = (read: HookEntryRead): TextFileLoad =>
        read.ok
            ? { ok: true, text: read.text, revision: read.revision, description: read.displayPath }
            : { ok: false, message: failureText(t, read.message, read.detail) };

    const openEditor = (row: HookOverviewRow) => {
        const { locator } = row;
        if (!locator) return;
        // 一覧を読んだ後にファイルが変わっていれば、行が別の hook を指すことがあるので開かない。
        let expectedRevision = row.revision;
        setRequest({
            title: row.event,
            entryEditor: true,
            load: async () => {
                const read = await ctx.api.readHookEntry(ctx.env, section.id, locator);
                if (read.ok && expectedRevision !== undefined && read.revision !== expectedRevision) {
                    ctx.onChanged(section);
                    return { ok: false, message: t('common.profile.error.conflict') };
                }
                expectedRevision = undefined;
                return loadOf(read);
            },
            save: (text, baseRevision, confirmed) =>
                ctx.api.saveHookEntry(ctx.env, section.id, locator, text, baseRevision, confirmed),
        });
    };

    const openRepair = (source: string, title: string) => {
        setRequest({
            title,
            entryEditor: true,
            load: async () => loadOf(await ctx.api.readHookSourceFile(ctx.env, section.id, source)),
            save: (text, baseRevision, confirmed) =>
                ctx.api.saveHookSourceFile(ctx.env, section.id, source, text, baseRevision, confirmed),
        });
    };

    const openNewEntry = (addition: HookEntryAddition) => {
        setAddOpen(false);
        setRequest({
            title: addition.event,
            entryEditor: true,
            load: async () => loadOf(await ctx.api.readHookTemplate(ctx.env, section.id, addition)),
            save: (text, baseRevision, confirmed) =>
                ctx.api.addHookEntry(ctx.env, section.id, addition, text, baseRevision, confirmed),
        });
    };

    const finishDelete = (row: HookOverviewRow, result: ProfileWriteResult) => {
        if (result.ok) {
            setPendingDelete(null);
            ctx.notify(t('common.profile.deleted'), 'success');
            const notes = result.warnings ?? [];
            if (notes.length > 0) ctx.notify(notes.map(note => warningText(t, note)).join(' '), 'warning');
            ctx.onChanged(section);
        } else if (result.message === 'needs-confirmation') {
            setPendingDelete({ row, warnings: result.warnings });
        } else {
            setPendingDelete(null);
            ctx.notify(writeFailureText(t, result), 'error');
            ctx.onChanged(section);
        }
    };

    const runDelete = async (row: HookOverviewRow, confirmed: boolean) => {
        if (!row.locator) return;
        setBusy(true);
        try {
            finishDelete(
                row,
                await ctx.api.deleteHookEntry(ctx.env, section.id, row.locator, row.revision ?? '', confirmed)
            );
        } catch {
            ctx.notify(t('common.profile.error.write-failed'), 'error');
        } finally {
            setBusy(false);
        }
    };

    const body = () => {
        if (data === null) return <SectionLoading />;
        if (data.kind === 'failed') return <SectionFailure data={data} />;
        if (data.kind !== 'hookOverview') return null;
        const { rows } = data;
        const showState = rows.some(row => row.state !== undefined);
        return (
            <>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, alignItems: 'center' }}>
                    <Button
                        variant='contained'
                        size='small'
                        startIcon={<AddIcon />}
                        disabled={busy || addTargets.length === 0 || section.knownEvents.length === 0}
                        onClick={() => setAddOpen(true)}
                    >
                        {t('common.profile.add')}
                    </Button>
                </Box>
                {disableList?.state === 'unreadable' && (
                    <Alert severity='error' sx={{ mb: 1 }}>
                        {t('common.profile.hook.disableListUnreadable')}
                    </Alert>
                )}
                {rows.length === 0 ? (
                    <Typography color='text.secondary' sx={{ py: 1 }}>
                        {t('common.profile.hook.noRows')}
                    </Typography>
                ) : (
                    <TableContainer>
                        <Table size='small' sx={TABLE_SX}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>{t('common.profile.hook.colEvent')}</TableCell>
                                    <TableCell>{t('common.profile.hook.colMatcher')}</TableCell>
                                    <TableCell>{t('common.profile.hook.colType')}</TableCell>
                                    <TableCell>{t('common.profile.hook.colCommand')}</TableCell>
                                    <TableCell align='right'>{t('common.profile.hook.colTimeout')}</TableCell>
                                    {showSource && <TableCell>{t('common.profile.hook.colSource')}</TableCell>}
                                    {showState && <TableCell>{t('common.profile.hook.colState')}</TableCell>}
                                    <TableCell align='right'>{t('common.profile.hook.colAction')}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.map((row, index) => (
                                    <TableRow key={`${row.source}:${row.hookName ?? ''}:${row.event}:${index}`}>
                                        <TableCell sx={EVENT_CELL_SX}>
                                            <Typography variant='body2' sx={{ overflowWrap: 'anywhere' }}>
                                                {row.event}
                                            </Typography>
                                            {showHookName && row.hookName && (
                                                <Typography
                                                    component='div'
                                                    variant='caption'
                                                    color='text.secondary'
                                                    sx={{ fontFamily: 'monospace', overflowWrap: 'anywhere' }}
                                                >
                                                    {row.hookName}
                                                </Typography>
                                            )}
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                {row.unknownEvent && (
                                                    <StatusChip
                                                        color='warning'
                                                        label={t('common.profile.hook.unknownEvent')}
                                                    />
                                                )}
                                                {row.invalid && (
                                                    <StatusChip
                                                        color='error'
                                                        label={t('common.profile.hook.invalid')}
                                                    />
                                                )}
                                                {row.custom && <StatusChip label={t('common.profile.hook.custom')} />}
                                                {row.linked && (
                                                    <StatusChip
                                                        color='info'
                                                        label={t('common.profile.collection.linkReadOnly')}
                                                    />
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ ...CELL_SX, fontFamily: 'monospace' }}>
                                            {row.matcher ?? ''}
                                        </TableCell>
                                        <TableCell sx={TYPE_CELL_SX}>{row.type ?? ''}</TableCell>
                                        <TableCell sx={{ ...CELL_SX, fontFamily: 'monospace' }}>
                                            {row.command ?? ''}
                                        </TableCell>
                                        <TableCell align='right' sx={CELL_SX}>
                                            {row.timeoutSec ?? ''}
                                        </TableCell>
                                        {showSource && <TableCell sx={CELL_SX}>{row.source}</TableCell>}
                                        {showState && (
                                            <TableCell sx={STATE_CELL_SX}>
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        flexWrap: 'wrap',
                                                        alignItems: 'center',
                                                        gap: 0.5,
                                                    }}
                                                >
                                                    {toggleable && row.hookName !== undefined && !row.custom && (
                                                        <Tooltip title={row.hookName}>
                                                            <Switch
                                                                size='small'
                                                                checked={row.state === 'enabled'}
                                                                disabled={busy}
                                                                onChange={event =>
                                                                    void toggle(row, event.target.checked, false)
                                                                }
                                                            />
                                                        </Tooltip>
                                                    )}
                                                    <HookStateLabel row={row} />
                                                </Box>
                                            </TableCell>
                                        )}
                                        <TableCell align='right' sx={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                                            {row.repairSource && (
                                                <Tooltip title={t('common.profile.edit')}>
                                                    <span>
                                                        <IconButton
                                                            size='small'
                                                            aria-label={t('common.profile.edit')}
                                                            disabled={busy}
                                                            onClick={() =>
                                                                openRepair(row.repairSource as string, row.source)
                                                            }
                                                        >
                                                            <EditIcon fontSize='small' />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            )}
                                            {row.locator && (
                                                <>
                                                    <Tooltip title={t('common.profile.edit')}>
                                                        <span>
                                                            <IconButton
                                                                size='small'
                                                                aria-label={t('common.profile.edit')}
                                                                disabled={busy}
                                                                onClick={() => openEditor(row)}
                                                            >
                                                                <EditIcon fontSize='small' />
                                                            </IconButton>
                                                        </span>
                                                    </Tooltip>
                                                    <Tooltip title={t('common.profile.delete')}>
                                                        <span>
                                                            <IconButton
                                                                size='small'
                                                                color='error'
                                                                aria-label={t('common.profile.delete')}
                                                                disabled={busy}
                                                                onClick={() => void runDelete(row, false)}
                                                            >
                                                                <DeleteIcon fontSize='small' />
                                                            </IconButton>
                                                        </span>
                                                    </Tooltip>
                                                </>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </>
        );
    };

    return (
        <ProfileSectionFrame section={section} notices={data?.notices}>
            {body()}
            <HookAddDialog
                open={addOpen}
                section={section}
                targets={addTargets}
                onCancel={() => setAddOpen(false)}
                onNext={openNewEntry}
            />
            <TextFileEditorDialog
                request={request}
                notify={ctx.notify}
                onClose={() => setRequest(null)}
                onSaved={() => {
                    ctx.notify(t(section.savedNoteKey ?? 'common.profile.saved'), 'success');
                    ctx.onChanged(section);
                }}
            />
            <WarningConfirmDialog
                warnings={pending?.warnings ?? null}
                busy={busy}
                title={t('common.profile.hook.toggleConfirmTitle')}
                onCancel={() => setPending(null)}
                onConfirm={() => pending && void toggle(pending.row, pending.enabled, true)}
            />
            <WarningConfirmDialog
                warnings={pendingDelete?.warnings ?? null}
                busy={busy}
                title={t('common.profile.hook.deleteTitle')}
                body={t('common.profile.hook.deleteBody', {
                    command: pendingDelete?.row.command ?? pendingDelete?.row.event ?? '',
                })}
                confirmLabel={t('common.profile.delete')}
                destructive
                onCancel={() => setPendingDelete(null)}
                onConfirm={() => pendingDelete && void runDelete(pendingDelete.row, true)}
            />
        </ProfileSectionFrame>
    );
};
