import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    TextField,
    Typography,
} from '@mui/material';
import {
    Add as AddIcon,
    DeleteOutlined as DeleteIcon,
    Download as DownloadIcon,
    Upload as UploadIcon,
} from '@mui/icons-material';
import {
    MISSING_REVISION,
    type FileCollectionEntry,
    type FileCollectionSectionSpec,
    type FileCollectionSpec,
} from '@shared/agents/profile/types';
import type { AssetEntry } from '@shared/agents/types';
import { filterAssetEntries } from '../../utils/assetSearch';
import { AssetEntriesTable, computeFitWidth, type FmColumn } from '../assets/AssetEntriesTable';
import { AssetSearchField } from '../assets/AssetSearchField';
import type { ProfileSectionProps } from './profileContext';
import {
    ProfileSectionFrame,
    SectionFailure,
    SectionLoading,
    StatusChip,
    WarningConfirmDialog,
} from './ProfileSectionParts';
import { failureText, unreadableText, warningText } from './profileText';
import { TextFileEditorDialog, type TextFileRequest } from './TextFileEditorDialog';
import { useSectionData } from './useSectionData';

const COLUMNS: FmColumn[] = [
    { key: 'name', fit: true, maxWidthPct: 0.35 },
    { key: 'description', flex: true },
];

/** 一覧の 1 行を AssetEntriesTable の行にする。 */
function toAssetEntry(entry: FileCollectionEntry): AssetEntry {
    return {
        name: entry.name,
        relPath: entry.relPath,
        isFile: true,
        frontmatter: { ...entry.frontmatter, name: entry.displayName ?? entry.frontmatter?.name ?? entry.name },
        frontmatterRaw: null,
        mtimeMs: entry.mtimeMs,
    };
}

/** 一覧のフォルダの実パスと相対パスをつないで表示用のパスにする。 */
function entryDisplayPath(root: string, relPath: string): string {
    const separator = root.includes('\\') ? '\\' : '/';
    return `${root}${separator}${relPath.replace(/\//g, separator)}`;
}

/** 新規作成の入力を一覧の相対パスにする。入力が使えなければ null。 */
function newEntryRelPath(spec: FileCollectionSpec, input: string): string | null {
    const name = input.trim().replace(/\\/g, '/');
    if (name === '' || name.startsWith('/')) return null;
    if (spec.fixedFileName !== undefined) return name.includes('/') ? null : `${name}/${spec.fixedFileName}`;
    if (spec.maxDepth === 0 && name.includes('/')) return null;
    return spec.extensions.some(extension => name.endsWith(extension)) ? name : `${name}${spec.createExtension}`;
}

/** 名前の下のチップの文言のキーを返す。 */
function entryChipKeys(entry: FileCollectionEntry, section: FileCollectionSectionSpec): string[] {
    const keys: string[] = [];
    if (entry.notLoaded) keys.push(section.notLoadedNoteKey ?? 'common.profile.collection.notLoaded');
    if (entry.dangling) keys.push('common.profile.collection.dangling');
    if (entry.isLink && !entry.dangling) keys.push('common.profile.collection.linkReadOnly');
    if (!entry.isLink && !entry.dangling && entry.readOnly) keys.push('common.profile.collection.readOnly');
    const overridesName =
        entry.displayName !== undefined && section.displayNameNote?.names.includes(entry.displayName) === true;
    if (overridesName && section.displayNameNote) keys.push(section.displayNameNote.noteKey);
    return keys;
}

/** 行の名前の下に出す印。 */
const EntryMarks: React.FC<{ entry: FileCollectionEntry; section: FileCollectionSectionSpec }> = ({
    entry,
    section,
}) => {
    const { t } = useTranslation();
    const warnings = entry.warnings ?? [];
    const showFileName = entry.displayName !== undefined && entry.displayName !== entry.name;
    const overridesName =
        entry.displayName !== undefined && section.displayNameNote?.names.includes(entry.displayName) === true;
    if (
        !showFileName &&
        !entry.notLoaded &&
        !entry.isLink &&
        !entry.dangling &&
        warnings.length === 0 &&
        !overridesName
    ) {
        return null;
    }
    return (
        <Box sx={{ mt: 0.5 }}>
            {showFileName && (
                <Typography component='div' variant='caption' color='text.secondary' sx={{ fontFamily: 'monospace' }}>
                    {entry.name}
                </Typography>
            )}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.25 }}>
                {entry.notLoaded && (
                    <StatusChip
                        color='warning'
                        label={t(section.notLoadedNoteKey ?? 'common.profile.collection.notLoaded')}
                    />
                )}
                {entry.dangling && <StatusChip color='error' label={t('common.profile.collection.dangling')} />}
                {entry.isLink && !entry.dangling && (
                    <StatusChip color='info' label={t('common.profile.collection.linkReadOnly')} />
                )}
                {!entry.isLink && !entry.dangling && entry.readOnly && (
                    <StatusChip color='info' label={t('common.profile.collection.readOnly')} />
                )}
                {overridesName && section.displayNameNote && (
                    <StatusChip color='info' label={t(section.displayNameNote.noteKey)} />
                )}
                {warnings.length > 0 && (
                    <StatusChip
                        color='warning'
                        label={t('common.profile.collection.warningCount', { count: warnings.length })}
                        title={warnings.map(warning => warningText(t, warning)).join('\n')}
                    />
                )}
            </Box>
        </Box>
    );
};

/**
 * フォルダのファイルの一覧を表示し、新規作成、編集、削除、エクスプローラ表示、ZIP のダウンロードとアップロードを行う section。
 * フォルダがなければ空の一覧を出し、新規作成とアップロードの時点でフォルダを作る。ZIP と表示は使える環境でだけ操作を出す。
 */
export const FileCollectionSection: React.FC<ProfileSectionProps<FileCollectionSectionSpec>> = ({ section, ctx }) => {
    const { t } = useTranslation();
    const spec = section.collection;
    const [request, setRequest] = useState<TextFileRequest | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [checked, setChecked] = useState<Set<string>>(new Set());
    const [busy, setBusy] = useState(false);
    const [newOpen, setNewOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteWarnings, setDeleteWarnings] = useState<string[] | null>(null);
    const [pendingUpload, setPendingUpload] = useState<{
        srcPath: string;
        conflicts: string[];
        warnings: string[];
    } | null>(null);
    const [windowWidth, setWindowWidth] = useState<number>(() => window.innerWidth);
    const { data } = useSectionData(ctx, section, { editing: request !== null });
    const report = data?.kind === 'fileCollection' ? data.report : null;

    useEffect(() => {
        const onResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const entries = useMemo(() => report?.entries ?? [], [report]);
    const entryByRel = useMemo(() => new Map(entries.map(entry => [entry.relPath, entry])), [entries]);
    const assetEntries = useMemo(() => entries.map(toAssetEntry), [entries]);
    const filtered = useMemo(() => filterAssetEntries(assetEntries, searchQuery), [assetEntries, searchQuery]);
    const fitWidth = useMemo(
        () =>
            computeFitWidth(filtered, Math.round(windowWidth * (COLUMNS[0].maxWidthPct ?? 0.25)), true, assetEntry => {
                const entry = entryByRel.get(assetEntry.relPath);
                if (!entry) return [];
                return [
                    ...entryChipKeys(entry, section).map(key => t(key)),
                    ...(entry.warnings?.length
                        ? [t('common.profile.collection.warningCount', { count: entry.warnings.length })]
                        : []),
                    ...(entry.displayName !== undefined && entry.displayName !== entry.name ? [entry.name] : []),
                ];
            }),
        [entryByRel, filtered, section, t, windowWidth]
    );
    const selected = filtered.filter(entry => checked.has(entry.relPath)).map(entry => entry.relPath);
    const capabilities = report?.capabilities ?? { zip: false, reveal: false };

    const toggle = (relPath: string) => {
        const next = new Set(checked);
        if (next.has(relPath)) next.delete(relPath);
        else next.add(relPath);
        setChecked(next);
    };
    const toggleAll = () => {
        const all = filtered.length > 0 && filtered.every(entry => checked.has(entry.relPath));
        const next = new Set(checked);
        for (const entry of filtered) {
            if (all) next.delete(entry.relPath);
            else next.add(entry.relPath);
        }
        setChecked(next);
    };

    const refreshAfterChange = () => {
        setChecked(new Set());
        ctx.onChanged(section);
    };

    const withBusy = async (work: () => Promise<void>) => {
        setBusy(true);
        try {
            await work();
        } catch {
            ctx.notify(t('common.profile.error.operation-failed'), 'error');
        } finally {
            setBusy(false);
        }
    };

    const openEntry = (relPath: string) => {
        const entry = entryByRel.get(relPath);
        const readOnly = entry?.readOnly === true;
        setRequest({
            title: entry?.displayName ?? entry?.name ?? relPath,
            description: entryDisplayPath(report?.displayRoot ?? spec.rootRel, relPath),
            readOnly,
            load: async () => {
                const read = await ctx.api.readEntry(ctx.env, section.id, relPath);
                if (read.state !== 'ok') {
                    return {
                        ok: false,
                        message: unreadableText(t, read) ?? t('common.profile.error.not-found'),
                    };
                }
                return {
                    ok: true,
                    text: read.text,
                    revision: read.revision,
                    eol: read.eol,
                    mixedEol: read.mixedEol,
                    linkTarget: read.linkTarget,
                };
            },
            save: (text, baseRevision, confirmed) =>
                ctx.api.saveEntry(ctx.env, section.id, relPath, text, baseRevision, confirmed),
        });
    };

    const startCreate = () => {
        const relPath = newEntryRelPath(spec, newName);
        if (relPath === null) {
            ctx.notify(t('common.profile.error.unsafe-path'), 'error');
            return;
        }
        setNewOpen(false);
        setNewName('');
        setRequest({
            title: t('common.profile.collection.newFileTitle', { name: relPath }),
            description: entryDisplayPath(report?.displayRoot ?? spec.rootRel, relPath),
            load: async () => ({ ok: true, text: '', revision: MISSING_REVISION }),
            // 一度作った後の保存は、作ったファイルへの保存にする。
            save: (text, baseRevision, confirmed) =>
                baseRevision === MISSING_REVISION
                    ? ctx.api.createEntry(ctx.env, section.id, relPath, text, confirmed)
                    : ctx.api.saveEntry(ctx.env, section.id, relPath, text, baseRevision, confirmed),
        });
    };

    const handleReveal = (entry: AssetEntry) =>
        withBusy(async () => {
            const result = await ctx.api.revealEntry(ctx.env, section.id, entry.relPath);
            if (!result.ok) ctx.notify(t('common.revealInFileManagerError'), 'error');
        });

    const handleDownload = () =>
        withBusy(async () => {
            const result = await ctx.api.download(ctx.env, section.id, selected);
            if (result.canceled) return;
            if (result.ok) ctx.notify(t('common.profile.collection.downloaded'), 'success');
            else ctx.notify(failureText(t, result.message), 'error');
        });

    const runDelete = (confirmed: boolean) =>
        withBusy(async () => {
            setDeleteOpen(false);
            setDeleteWarnings(null);
            const result = await ctx.api.deleteEntries(ctx.env, section.id, selected, confirmed);
            if (result.needsConfirmation) {
                setDeleteWarnings(result.warnings ?? []);
                return;
            }
            if (result.ok) {
                ctx.notify(t('common.profile.collection.deleted', { count: result.deletedCount ?? 0 }), 'success');
            } else if ((result.skipped?.length ?? 0) > 0) {
                ctx.notify(
                    t('common.profile.collection.deletePartial', { names: (result.skipped ?? []).join(', ') }),
                    'warning'
                );
            } else {
                ctx.notify(failureText(t, result.message), 'error');
            }
            refreshAfterChange();
        });

    const runUpload = async (srcPath: string, overwrite: boolean) => {
        const result = await ctx.api.upload(ctx.env, section.id, srcPath, overwrite, true);
        if (result.ok) {
            ctx.notify(t('common.profile.collection.uploaded', { count: result.importedCount ?? 0 }), 'success');
            refreshAfterChange();
        } else {
            ctx.notify(failureText(t, result.message, result.detail), 'error');
        }
    };

    /** ファイルを選ばせ、上書きや警告があれば確認を挟んで取り込む。 */
    const handleUploadClick = () =>
        withBusy(async () => {
            const inspected = await ctx.api.inspectUpload(ctx.env, section.id);
            if (inspected.canceled) return;
            if (!inspected.ok || !inspected.srcPath) {
                ctx.notify(failureText(t, inspected.message, inspected.detail), 'error');
                return;
            }
            const conflicts = inspected.conflicts ?? [];
            const warnings = inspected.warnings ?? [];
            if (conflicts.length > 0 || warnings.length > 0) {
                setPendingUpload({ srcPath: inspected.srcPath, conflicts, warnings });
            } else {
                await runUpload(inspected.srcPath, false);
            }
        });

    const confirmUpload = () => {
        const upload = pendingUpload;
        setPendingUpload(null);
        if (upload) void withBusy(() => runUpload(upload.srcPath, upload.conflicts.length > 0));
    };

    const body = () => {
        if (data === null) return <SectionLoading />;
        if (data.kind === 'failed') return <SectionFailure data={data} />;
        if (!report) return null;
        return (
            <>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, alignItems: 'center' }}>
                    {spec.allowCreate && (
                        <Button
                            variant='contained'
                            size='small'
                            startIcon={<AddIcon />}
                            disabled={busy}
                            onClick={() => setNewOpen(true)}
                        >
                            {t('common.profile.create')}
                        </Button>
                    )}
                    <Button
                        variant='outlined'
                        size='small'
                        startIcon={<DownloadIcon />}
                        disabled={busy || selected.length === 0 || !capabilities.zip}
                        onClick={() => void handleDownload()}
                    >
                        {t('common.profile.collection.download')}
                    </Button>
                    <Button
                        variant='outlined'
                        size='small'
                        startIcon={<UploadIcon />}
                        disabled={busy || !capabilities.zip || !spec.allowCreate}
                        onClick={() => void handleUploadClick()}
                    >
                        {t('common.profile.collection.upload')}
                    </Button>
                    <Button
                        variant='outlined'
                        color='error'
                        size='small'
                        startIcon={<DeleteIcon />}
                        disabled={busy || selected.length === 0}
                        onClick={() => setDeleteOpen(true)}
                    >
                        {t('common.profile.delete')}
                    </Button>
                </Box>
                {!capabilities.zip && (
                    <Alert severity='info' sx={{ mb: 1 }}>
                        {t('common.profile.collection.noCapabilities')}
                    </Alert>
                )}
                {report.incomplete && (
                    <Alert severity='warning' sx={{ mb: 1 }}>
                        {t('common.profile.collection.incomplete')}
                    </Alert>
                )}
                {report.truncated && (
                    <Alert severity='warning' sx={{ mb: 1 }}>
                        {t('common.profile.collection.truncated')}
                    </Alert>
                )}
                {report.linkedDirs && report.linkedDirs.length > 0 && (
                    <Alert severity='info' sx={{ mb: 1 }}>
                        {t('common.profile.collection.linkedDirs', { names: report.linkedDirs.join(', ') })}
                    </Alert>
                )}
                <AssetSearchField value={searchQuery} onChange={setSearchQuery} />
                {entries.length === 0 ? (
                    <Typography color='text.secondary' sx={{ py: 1 }}>
                        {t('common.profile.collection.noEntries')}
                    </Typography>
                ) : filtered.length === 0 ? (
                    <Typography color='text.secondary' sx={{ py: 1 }}>
                        {t('common.noSearchResults')}
                    </Typography>
                ) : (
                    <AssetEntriesTable
                        i18nPrefix='common.profile.collection'
                        entries={filtered}
                        columns={COLUMNS}
                        fitWidth={fitWidth}
                        showFileCount={false}
                        showLastModified
                        checkedKeys={checked}
                        onToggle={toggle}
                        onToggleAll={toggleAll}
                        onView={() => undefined}
                        hideHeaderView
                        onReveal={capabilities.zip ? entry => void handleReveal(entry) : undefined}
                        revealDisabledReason={capabilities.reveal ? undefined : t('common.revealUnavailable')}
                        onViewFull={entry => openEntry(entry.relPath)}
                        renderNameExtra={assetEntry => {
                            const entry = entryByRel.get(assetEntry.relPath);
                            return entry ? <EntryMarks entry={entry} section={section} /> : null;
                        }}
                    />
                )}
            </>
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

            <Dialog open={newOpen} onClose={() => setNewOpen(false)} maxWidth='sm' fullWidth>
                <DialogTitle>{t('common.profile.collection.newTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        {t(
                            spec.fixedFileName !== undefined
                                ? 'common.profile.collection.newFolderBody'
                                : spec.maxDepth === 0
                                  ? 'common.profile.collection.newFlatBody'
                                  : 'common.profile.collection.newNestedBody'
                        )}
                    </DialogContentText>
                    <TextField
                        autoFocus
                        fullWidth
                        size='small'
                        value={newName}
                        onChange={event => setNewName(event.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setNewOpen(false)}>{t('common.profile.cancel')}</Button>
                    <Button variant='contained' disabled={newName.trim() === ''} onClick={startCreate}>
                        {t('common.profile.create')}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
                <DialogTitle>{t('common.profile.collection.deleteTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {t('common.profile.collection.deleteBody', { count: selected.length })}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteOpen(false)}>{t('common.profile.cancel')}</Button>
                    <Button color='error' variant='contained' onClick={() => void runDelete(false)}>
                        {t('common.profile.delete')}
                    </Button>
                </DialogActions>
            </Dialog>

            <WarningConfirmDialog
                warnings={deleteWarnings}
                busy={busy}
                confirmLabel={t('common.profile.delete')}
                onCancel={() => setDeleteWarnings(null)}
                onConfirm={() => void runDelete(true)}
            />

            <WarningConfirmDialog
                warnings={pendingUpload?.warnings ?? null}
                busy={busy}
                title={t('common.profile.collection.uploadTitle')}
                body={
                    pendingUpload && pendingUpload.conflicts.length > 0
                        ? t('common.profile.collection.uploadOverwriteBody', {
                              names: pendingUpload.conflicts.join(', '),
                          })
                        : t('common.profile.collection.uploadBody')
                }
                confirmLabel={t('common.profile.collection.upload')}
                onCancel={() => setPendingUpload(null)}
                onConfirm={confirmUpload}
            />
        </ProfileSectionFrame>
    );
};
