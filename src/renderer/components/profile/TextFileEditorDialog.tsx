import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Typography,
} from '@mui/material';
import { MISSING_REVISION, type ProfileEol, type ProfileWriteResult } from '@shared/agents/profile/types';
import {
    DirectEditDialog,
    sameEditorText,
    useRenderAgainAfterDiscard,
    type DirectEditor,
} from '../settings/DirectEditDialog';
import { StackedDialogFocus } from '../settings/StackedDialogFocus';
import type { Notify } from '../agent/types';
import { WarningConfirmDialog } from './ProfileSectionParts';
import { warningText, writeFailureText } from './profileText';

/** 編集を始めるときに読み込む内容。description は読み込んだファイルのパス。 */
export type TextFileLoad =
    | {
          ok: true;
          text: string;
          revision: string;
          eol?: ProfileEol;
          mixedEol?: boolean;
          linkTarget?: string;
          description?: string;
      }
    | { ok: false; message: string };

/** 空のテキストの保存で削除するファイルの内容。 */
export interface TextFileDeletion {
    displayPath: string;
    // シンボリックリンクなら、リンク先のパス。
    linkTarget?: string;
    // 確認ダイアログに並べる注記。
    notes: string[];
    remove(baseRevision: string, confirmed: boolean): Promise<ProfileWriteResult>;
}

export interface TextFileRequest {
    title: string;
    // 読み込む前に分かるときのファイルのパス。
    description?: string;
    // true なら読み取り専用で開く。
    readOnly?: boolean;
    // true なら保存の間は入力できない。保存の失敗はテキスト欄の上に出す。
    entryEditor?: boolean;
    load(): Promise<TextFileLoad>;
    save(text: string, baseRevision: string, confirmed: boolean): Promise<ProfileWriteResult>;
    // 指定すると、空白だけのテキストの保存を削除の確認に切り替える。
    deletion?: TextFileDeletion;
}

interface Props {
    // null の間は閉じている。別の値に変わるたびに読み込み直して開く。
    request: TextFileRequest | null;
    notify: Notify;
    onClose: () => void;
    // 保存または削除が成功したときに呼ぶ。
    onSaved: () => void;
}

/**
 * テキストファイルの編集ダイアログ。直接編集ダイアログの表示に、保存の結果に応じた確認を加える。
 * - conflict: 再読み込みか編集に戻るかを選ばせる。上書きの手段は持たない。
 * - needs-confirmation: 警告の内容を示し、確認されたら confirmedWarnings を付けて再送する。
 * - 空の保存: deletion があれば、実パスと注記を示して確認のうえ削除する。ファイルが無ければ何もしない。
 * - 保存中の入力: 送った内容と違えば、保存の完了後も未保存の編集として開いたままにする。
 * - 保存の失敗: entryEditor の依頼はテキスト欄の上に、それ以外は通知に出す。入力を変えると消す。
 * - 閉じる操作: 未保存の編集があれば、破棄してよいかを確認する。閉じ終えたらファイルの本文を保持しない。
 */
export const TextFileEditorDialog: React.FC<Props> = ({ request, notify, onClose, onSaved }) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [text, setShownText] = useState('');
    // 表示中のテキスト。保存の完了時に、送った内容と比べる。
    const latestText = useRef('');
    // 読み込んだ時点か最後に保存した時点のテキスト。
    const [savedText, setSavedText] = useState('');
    const [revision, setRevision] = useState('');
    const [eol, setEol] = useState<ProfileEol>('\n');
    const [mixedEol, setMixedEol] = useState(false);
    const [linkTarget, setLinkTarget] = useState<string | undefined>(undefined);
    const [loadedDescription, setLoadedDescription] = useState<string | undefined>(undefined);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [conflict, setConflict] = useState(false);
    const [busy, setBusy] = useState(false);
    const [pendingWarnings, setPendingWarnings] = useState<string[] | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const renderAgain = useRenderAgainAfterDiscard();
    const shownRequest = useRef<TextFileRequest | null>(null);
    if (request) shownRequest.current = request;
    const current = request ?? shownRequest.current;

    const setText = (next: string) => {
        latestText.current = next;
        setShownText(next);
        setSaveError(null);
    };

    const applyLoad = async (target: TextFileRequest): Promise<boolean> => {
        let loaded: TextFileLoad;
        try {
            loaded = await target.load();
        } catch {
            loaded = { ok: false, message: t('common.profile.error.read-failed') };
        }
        if (!loaded.ok) {
            notify(loaded.message, 'error');
            return false;
        }
        setText(loaded.text);
        setSavedText(loaded.text);
        setRevision(loaded.revision);
        setEol(loaded.eol ?? '\n');
        setMixedEol(loaded.mixedEol ?? false);
        setLinkTarget(loaded.linkTarget);
        setLoadedDescription(loaded.description);
        setConflict(false);
        return true;
    };

    useEffect(() => {
        if (!request) {
            setOpen(false);
            return undefined;
        }
        let cancelled = false;
        setBusy(true);
        void applyLoad(request)
            .then(loaded => {
                if (cancelled) return;
                if (loaded) setOpen(true);
                else onClose();
            })
            .finally(() => {
                if (!cancelled) setBusy(false);
            });
        return () => {
            cancelled = true;
        };
        // 開くたびに 1 回だけ読み込む。依存の関数はレンダーごとに変わるが、読み込みのきっかけにはしない。
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [request]);

    const finish = (result: ProfileWriteResult, confirmed: readonly string[], sent: string) => {
        if (result.ok) {
            onSaved();
            const notes = (result.warnings ?? []).filter(warning => !confirmed.includes(warning));
            if (notes.length > 0) notify(notes.map(note => warningText(t, note)).join(' '), 'warning');
            if (latestText.current === sent) {
                onClose();
            } else {
                setSavedText(sent);
                setRevision(result.revision);
                setMixedEol(false);
            }
            return;
        }
        if (result.message === 'needs-confirmation') {
            setPendingWarnings(result.warnings);
        } else if (result.message === 'conflict') {
            setConflict(true);
        } else if (current?.entryEditor) {
            setSaveError(writeFailureText(t, result));
        } else {
            notify(writeFailureText(t, result), 'error');
        }
    };

    const run = async (work: () => Promise<ProfileWriteResult>, confirmed: readonly string[] = []) => {
        const sent = latestText.current;
        setBusy(true);
        try {
            finish(await work(), confirmed, sent);
        } catch {
            notify(t('common.profile.error.write-failed'), 'error');
        } finally {
            setBusy(false);
        }
    };

    const save = async (confirmed: boolean) => {
        if (!current) return;
        const confirmedWarnings = pendingWarnings ?? [];
        setPendingWarnings(null);
        await run(() => current.save(latestText.current, revision, confirmed), confirmedWarnings);
    };

    const requestSave = async () => {
        if (!current) return;
        if (current.deletion && text.trim() === '') {
            if (revision === MISSING_REVISION) onClose();
            else setDeleteOpen(true);
            return;
        }
        await save(false);
    };

    const confirmDelete = async () => {
        const deletion = current?.deletion;
        setDeleteOpen(false);
        if (deletion) await run(() => deletion.remove(revision, true));
    };

    const editor: DirectEditor = {
        open: open && request !== null,
        text,
        dirty: !sameEditorText(text, savedText),
        invalid: false,
        eol,
        mixedEol,
        conflict,
        setText,
        start: async () => undefined,
        close: onClose,
        save: requestSave,
        reload: async () => {
            if (!current) return;
            setBusy(true);
            try {
                await applyLoad(current);
            } finally {
                setBusy(false);
            }
        },
        backToEdit: () => setConflict(false),
        onExited: () => {
            setText('');
            setSavedText('');
            setRevision('');
            setLinkTarget(undefined);
            setLoadedDescription(undefined);
            renderAgain();
        },
    };

    const deletion = current?.deletion;
    const deleteLinkTarget = deletion?.linkTarget ?? linkTarget;

    return (
        <>
            <DirectEditDialog
                editor={editor}
                busy={busy}
                title={current?.title ?? ''}
                description={loadedDescription ?? current?.description ?? ''}
                cancelLabel={current?.readOnly ? t('common.profile.close') : t('common.profile.cancel')}
                saveLabel={t('common.profile.save')}
                readOnly={current?.readOnly || (current?.entryEditor && busy)}
                covered={pendingWarnings !== null || deleteOpen}
                notices={
                    <>
                        {saveError !== null && (
                            <Alert severity='error' sx={{ mb: 1.5, flexShrink: 0, overflowWrap: 'anywhere' }}>
                                {saveError}
                            </Alert>
                        )}
                        {linkTarget !== undefined && (
                            <Alert severity='info' sx={{ mb: 1.5, flexShrink: 0, overflowWrap: 'anywhere' }}>
                                {current?.readOnly
                                    ? t('common.profile.editor.linkReadOnly', { target: linkTarget })
                                    : t('common.profile.editor.linkWrites', { target: linkTarget })}
                            </Alert>
                        )}
                    </>
                }
            />

            <WarningConfirmDialog
                warnings={pendingWarnings}
                busy={busy}
                confirmLabel={t('common.profile.confirmSave')}
                onCancel={() => setPendingWarnings(null)}
                onConfirm={() => void save(true)}
            />

            <StackedDialogFocus open={deleteOpen} />
            <Dialog open={deleteOpen} onClose={() => !busy && setDeleteOpen(false)} maxWidth='sm' fullWidth>
                <DialogTitle>{t('common.profile.deleteFile.title')}</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 1 }}>{t('common.profile.deleteFile.body')}</DialogContentText>
                    <Typography
                        component='div'
                        variant='body2'
                        sx={{ fontFamily: 'monospace', overflowWrap: 'anywhere', mb: 1 }}
                    >
                        {deletion?.displayPath}
                    </Typography>
                    {deleteLinkTarget !== undefined && (
                        <Alert severity='info' sx={{ mb: 1, overflowWrap: 'anywhere' }}>
                            {t('common.profile.deleteFile.linkOnly', { target: deleteLinkTarget })}
                        </Alert>
                    )}
                    {(deletion?.notes ?? []).map(note => (
                        <Alert key={note} severity='warning' sx={{ mb: 1 }}>
                            {note}
                        </Alert>
                    ))}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteOpen(false)} disabled={busy}>
                        {t('common.profile.cancel')}
                    </Button>
                    <Button color='error' variant='contained' onClick={() => void confirmDelete()} disabled={busy}>
                        {t('common.profile.delete')}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};
