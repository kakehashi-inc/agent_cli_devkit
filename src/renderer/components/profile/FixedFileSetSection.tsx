import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Box,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import {
    Add as AddIcon,
    DeleteOutlined as DeleteIcon,
    Edit as EditIcon,
    MergeType as MergeIcon,
} from '@mui/icons-material';
import { shortestDistinctPaths } from '@shared/agents/profile/pathLabels';
import {
    MISSING_REVISION,
    type FixedFileRow,
    type FixedFileSetSectionSpec,
    type ProfileFileData,
    type ProfileWriteResult,
} from '@shared/agents/profile/types';
import type { ProfileSectionProps } from './profileContext';
import {
    ProfileSectionFrame,
    SectionFailure,
    SectionLoading,
    StatusChip,
    WarningConfirmDialog,
} from './ProfileSectionParts';
import { baseNameOf, unreadableText, warningText, writeFailureText } from './profileText';
import { TextFileEditorDialog, type TextFileLoad, type TextFileRequest } from './TextFileEditorDialog';
import { useSectionData } from './useSectionData';

/** 行の状態の表示。 */
const RowStatus: React.FC<{ row: FixedFileRow; hasEffective: boolean }> = ({ row, hasEffective }) => {
    const { t } = useTranslation();
    const chips: React.ReactNode[] = [];
    if (row.state === 'missing') chips.push(<StatusChip key='missing' label={t('common.profile.fixed.missing')} />);
    if (row.state === 'dangling-link') {
        chips.push(
            <StatusChip
                key='dangling'
                color='error'
                label={t('common.profile.fixed.danglingLink')}
                title={row.linkTarget}
            />
        );
    }
    if (row.state === 'not-utf8') {
        chips.push(<StatusChip key='utf8' color='error' label={t('common.profile.fixed.notUtf8')} />);
    }
    if (row.state === 'error') {
        chips.push(<StatusChip key='error' color='error' label={t('common.profile.fixed.readError')} />);
    }
    if (row.state === 'ok' && hasEffective) {
        chips.push(
            row.effective ? (
                <StatusChip key='effective' color='success' label={t('common.profile.fixed.effective')} />
            ) : (
                <StatusChip key='notEffective' label={t('common.profile.fixed.notEffective')} />
            )
        );
    }
    if (row.state === 'ok' && row.empty) {
        chips.push(<StatusChip key='empty' label={t('common.profile.fixed.empty')} />);
    }
    if (row.isLink && row.state !== 'dangling-link') {
        chips.push(
            <StatusChip key='link' color='info' label={t('common.profile.fixed.link')} title={row.linkTarget} />
        );
    }
    return <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{chips}</Box>;
};

/**
 * 決まった名前のファイルの一覧を表示し、編集する section。未作成のファイルも「未作成」の行として並べる。
 * 行の名前は、ほかの行と見分けられる最小の相対パスにする。
 * 空のテキストの保存は、確認のうえファイルの削除として扱う。大文字小文字だけ違う別のファイルがあれば、統合の操作を出す。
 */
export const FixedFileSetSection: React.FC<ProfileSectionProps<FixedFileSetSectionSpec>> = ({ section, ctx }) => {
    const { t } = useTranslation();
    const [request, setRequest] = useState<TextFileRequest | null>(null);
    const [merge, setMerge] = useState<{ row: FixedFileRow; warnings: string[] } | null>(null);
    // 確認を待っている、編集できないファイル（リンク切れ、UTF-8 ではないファイル）の削除。
    const [pendingDelete, setPendingDelete] = useState<FixedFileRow | null>(null);
    const [busy, setBusy] = useState(false);
    const { data } = useSectionData(ctx, section, { editing: request !== null });
    const rows = data?.kind === 'fixedFileSet' ? data.files : [];

    const labels = new Map(
        shortestDistinctPaths(section.files.map(file => file.rel)).map((label, index) => [
            section.files[index].key,
            label,
        ])
    );
    const nameOfKey = (key: string) => labels.get(key) ?? key;

    /** 行を削除するときの確認ダイアログの注記。 */
    const deletionNotes = (row: FixedFileRow): string[] => {
        const notes: string[] = [];
        if (section.sharedWarningKey) notes.push(t(section.sharedWarningKey));
        if (section.effective === 'firstNonEmpty' && row.effective) {
            const nextRow = rows.slice(rows.indexOf(row) + 1).find(item => item.state === 'ok' && !item.empty);
            if (nextRow) notes.push(t('common.profile.fixed.effectiveMoves', { name: baseNameOf(nextRow.rel) }));
        }
        if (row.aliasKeys && row.aliasKeys.length > 0) {
            notes.push(t('common.profile.fixed.aliasDeleted', { names: row.aliasKeys.map(nameOfKey).join(', ') }));
        }
        return notes;
    };

    const loadOf = async (row: FixedFileRow): Promise<TextFileLoad> => {
        const read: ProfileFileData = await ctx.api.readFixedFile(ctx.env, section.id, row.key);
        if (read.state === 'missing') return { ok: true, text: '', revision: MISSING_REVISION };
        if (read.state !== 'ok') return { ok: false, message: unreadableText(t, read) ?? '' };
        return {
            ok: true,
            text: read.text,
            revision: read.revision,
            eol: read.eol,
            mixedEol: read.mixedEol,
            linkTarget: read.linkTarget,
        };
    };

    const openEditor = (row: FixedFileRow) => {
        setRequest({
            title: nameOfKey(row.key),
            description: row.displayPath,
            load: () => loadOf(row),
            save: (text, baseRevision, confirmed) =>
                ctx.api.saveFixedFile(ctx.env, section.id, row.key, text, baseRevision, confirmed),
            deletion: {
                displayPath: row.displayPath,
                linkTarget: row.isLink ? row.linkTarget : undefined,
                notes: deletionNotes(row),
                remove: (baseRevision, confirmed) =>
                    ctx.api.deleteFixedFile(ctx.env, section.id, row.key, baseRevision, confirmed),
            },
        });
    };

    const confirmDelete = async () => {
        const row = pendingDelete;
        setPendingDelete(null);
        if (!row) return;
        setBusy(true);
        try {
            const result = await ctx.api.deleteFixedFile(ctx.env, section.id, row.key, row.revision ?? '', true);
            if (result.ok) {
                ctx.notify(t('common.profile.deleted'), 'success');
                ctx.onChanged(section);
            } else if (result.message !== 'needs-confirmation') {
                ctx.notify(writeFailureText(t, result), 'error');
            }
        } catch {
            ctx.notify(t('common.profile.error.write-failed'), 'error');
        } finally {
            setBusy(false);
        }
    };

    const finishMerge = (row: FixedFileRow, result: ProfileWriteResult) => {
        if (result.ok) {
            ctx.notify(t('common.profile.saved'), 'success');
            ctx.onChanged(section);
            const notes = result.warnings ?? [];
            if (notes.length > 0) ctx.notify(notes.map(note => warningText(t, note)).join(' '), 'warning');
        } else if (result.message === 'needs-confirmation') {
            setMerge({ row, warnings: result.warnings });
        } else {
            ctx.notify(writeFailureText(t, result), 'error');
            ctx.onChanged(section);
        }
    };

    const runMerge = async (row: FixedFileRow, confirmed: boolean) => {
        setMerge(null);
        setBusy(true);
        try {
            finishMerge(
                row,
                await ctx.api.mergeFixedFileVariants(
                    ctx.env,
                    section.id,
                    row.key,
                    row.revision ?? MISSING_REVISION,
                    confirmed
                )
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
        if (data.kind !== 'fixedFileSet') return null;
        return (
            <TableContainer>
                <Table size='small'>
                    <TableHead>
                        <TableRow>
                            <TableCell>{t('common.profile.fixed.colFile')}</TableCell>
                            <TableCell sx={{ width: 220 }}>{t('common.profile.fixed.colStatus')}</TableCell>
                            <TableCell sx={{ width: 120 }}>{t('common.profile.fixed.colAction')}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map(row => {
                            const editable = row.state === 'ok' || row.state === 'missing';
                            const variants = row.variants ?? [];
                            return (
                                <TableRow key={row.key}>
                                    <TableCell sx={{ verticalAlign: 'top' }}>
                                        <Typography variant='body2' sx={{ fontWeight: 600 }}>
                                            {nameOfKey(row.key)}
                                        </Typography>
                                        {row.realName && (
                                            <Typography
                                                variant='caption'
                                                color='text.secondary'
                                                sx={{ display: 'block' }}
                                            >
                                                {t('common.profile.fixed.realName', { realName: row.realName })}
                                            </Typography>
                                        )}
                                        {row.aliasKeys && row.aliasKeys.length > 0 && (
                                            <Typography
                                                variant='caption'
                                                color='text.secondary'
                                                sx={{ display: 'block' }}
                                            >
                                                {t('common.profile.fixed.alias', {
                                                    names: row.aliasKeys.map(nameOfKey).join(', '),
                                                })}
                                            </Typography>
                                        )}
                                        {variants.length > 0 && (
                                            <Alert
                                                severity='warning'
                                                sx={{ mt: 1 }}
                                                action={
                                                    <Button
                                                        color='inherit'
                                                        size='small'
                                                        startIcon={<MergeIcon />}
                                                        disabled={busy}
                                                        onClick={() => void runMerge(row, false)}
                                                    >
                                                        {t('common.profile.fixed.merge')}
                                                    </Button>
                                                }
                                            >
                                                {t('common.profile.fixed.variants', { names: variants.join(', ') })}
                                            </Alert>
                                        )}
                                    </TableCell>
                                    <TableCell sx={{ verticalAlign: 'top' }}>
                                        <RowStatus row={row} hasEffective={section.effective !== undefined} />
                                    </TableCell>
                                    <TableCell sx={{ verticalAlign: 'top' }}>
                                        {editable ? (
                                            <Button
                                                size='small'
                                                startIcon={row.state === 'missing' ? <AddIcon /> : <EditIcon />}
                                                disabled={busy}
                                                onClick={() => openEditor(row)}
                                            >
                                                {row.state === 'missing'
                                                    ? t('common.profile.create')
                                                    : t('common.profile.edit')}
                                            </Button>
                                        ) : (
                                            row.state !== 'error' && (
                                                <Button
                                                    size='small'
                                                    color='error'
                                                    startIcon={<DeleteIcon />}
                                                    disabled={busy}
                                                    onClick={() => setPendingDelete(row)}
                                                >
                                                    {t('common.profile.delete')}
                                                </Button>
                                            )
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

    return (
        <ProfileSectionFrame section={section} notices={data?.notices}>
            {body()}
            <TextFileEditorDialog
                request={request}
                notify={ctx.notify}
                onClose={() => setRequest(null)}
                onSaved={() => {
                    ctx.notify(t('common.profile.saved'), 'success');
                    ctx.onChanged(section);
                }}
            />
            <WarningConfirmDialog
                warnings={merge?.warnings ?? null}
                busy={busy}
                title={t('common.profile.fixed.mergeTitle')}
                body={t('common.profile.fixed.mergeBody', {
                    names: (merge?.row.variants ?? []).join(', '),
                    name: merge ? baseNameOf(merge.row.rel) : '',
                })}
                confirmLabel={t('common.profile.fixed.merge')}
                onCancel={() => setMerge(null)}
                onConfirm={() => merge && void runMerge(merge.row, true)}
            />
            <WarningConfirmDialog
                warnings={
                    pendingDelete
                        ? [
                              ...(pendingDelete.isLink ? ['delete-link-only'] : []),
                              ...(section.sharedWarningKey ? ['delete-shared-file'] : []),
                          ]
                        : null
                }
                busy={busy}
                title={t('common.profile.deleteFile.title')}
                body={pendingDelete?.displayPath}
                confirmLabel={t('common.profile.delete')}
                onCancel={() => setPendingDelete(null)}
                onConfirm={() => void confirmDelete()}
            />
        </ProfileSectionFrame>
    );
};
