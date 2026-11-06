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
    TextField,
    Typography,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import type { SettingsRawResult, SettingsWriteResult } from '@shared/agents/types';
import { StackedDialogFocus } from './StackedDialogFocus';

interface DirectEditOptions {
    read(): Promise<SettingsRawResult>;
    writeRaw(raw: string, baseRevision: string): Promise<SettingsWriteResult>;
    // ファイルが無いときの編集の起点。
    initialText: string;
    // 編集中のテキストの検証。省略すると保存時の検証だけになる。
    isValid?: (text: string) => boolean;
    setBusy(busy: boolean): void;
    onSaved(): void | Promise<void>;
    onReadFailed(): void;
    onSaveFailed(message: string | undefined): void;
}

export interface DirectEditor {
    open: boolean;
    text: string;
    // 読み込んだ時点か最後に保存した時点から、テキストが変わっている。
    dirty: boolean;
    invalid: boolean;
    eol: '\n' | '\r\n';
    mixedEol: boolean;
    conflict: boolean;
    setText(text: string): void;
    start(): Promise<void>;
    close(): void;
    save(): Promise<void>;
    reload(): Promise<void>;
    backToEdit(): void;
    // ダイアログを閉じ終えたときに、保持しているファイルの本文を捨てる。
    onExited(): void;
}

/**
 * 閉じたエディターの本文を state から捨てた後に、もう一度描画させる関数を返す。
 * React は 1 つ前の描画の props と state を控えとして持つので、もう一度描画して控えからも本文を消す。
 */
export function useRenderAgainAfterDiscard(): () => void {
    const [pending, setPending] = useState(false);
    useEffect(() => {
        if (pending) setPending(false);
    }, [pending]);
    return () => setPending(true);
}

/** 改行の違いを除いて同じテキストか。 */
export function sameEditorText(a: string, b: string): boolean {
    return a.replace(/\r\n?/g, '\n') === b.replace(/\r\n?/g, '\n');
}

/**
 * 直接編集ダイアログの状態と操作。
 * 開いた時点の revision を保持して保存時に渡す。ファイルが変わっていたら conflict を立てて、再読み込みか編集に戻るかを選ばせる。
 * 上書きの手段は持たない（編集に戻っても、再読み込みするまで保存できない）。
 * 保存中の入力は、送った内容と違えば保存の完了後も未保存の編集として開いたままにする。
 * ダイアログを閉じ終えたらファイルの本文を保持しない。
 */
export function useDirectEdit(options: DirectEditOptions): DirectEditor {
    const [open, setOpen] = useState(false);
    const [text, setShownText] = useState('');
    // 表示中のテキスト。保存の完了時に、送った内容と比べる。
    const latestText = useRef('');
    // 読み込んだ時点か最後に保存した時点のテキスト。
    const [savedText, setSavedText] = useState('');
    const [revision, setRevision] = useState('');
    const [eol, setEol] = useState<'\n' | '\r\n'>('\n');
    const [mixedEol, setMixedEol] = useState(false);
    const [conflict, setConflict] = useState(false);
    const renderAgain = useRenderAgainAfterDiscard();

    const setText = (next: string) => {
        latestText.current = next;
        setShownText(next);
    };

    const load = async (): Promise<boolean> => {
        const result = await options.read();
        if (result.readFailed !== undefined) {
            options.onReadFailed();
            return false;
        }
        const loaded = result.raw ?? options.initialText;
        setText(loaded);
        setSavedText(loaded);
        setRevision(result.revision);
        setEol(result.eol);
        setMixedEol(result.mixedEol);
        setConflict(false);
        return true;
    };

    const discardText = () => {
        setText('');
        setSavedText('');
        renderAgain();
    };

    const withBusy = async (work: () => Promise<void>, onError: () => void) => {
        options.setBusy(true);
        try {
            await work();
        } catch {
            onError();
        } finally {
            options.setBusy(false);
        }
    };

    return {
        open,
        text,
        dirty: !sameEditorText(text, savedText),
        invalid: options.isValid ? !options.isValid(text) : false,
        eol,
        mixedEol,
        conflict,
        setText,
        start: () =>
            withBusy(async () => {
                if (await load()) setOpen(true);
            }, options.onReadFailed),
        close: () => setOpen(false),
        save: () =>
            withBusy(
                async () => {
                    const sent = latestText.current;
                    const result = await options.writeRaw(sent, revision);
                    if (result.ok) {
                        if (latestText.current === sent) {
                            setOpen(false);
                            // ダイアログが閉じ終わる前に取り除かれると onExited が来ないので、ここで本文を捨てる。
                            discardText();
                        } else {
                            setSavedText(sent);
                            if (result.revision !== undefined) setRevision(result.revision);
                            setMixedEol(false);
                        }
                        await options.onSaved();
                    } else if (result.message === 'conflict') {
                        setConflict(true);
                    } else {
                        options.onSaveFailed(result.message);
                    }
                },
                () => options.onSaveFailed(undefined)
            ),
        reload: () =>
            withBusy(async () => {
                await load();
            }, options.onReadFailed),
        backToEdit: () => setConflict(false),
        onExited: discardText,
    };
}

interface DialogProps {
    editor: DirectEditor;
    busy: boolean;
    title: string;
    description: string;
    cancelLabel: string;
    saveLabel: string;
    // editor.invalid のときにテキスト欄の下へ出す文言。
    invalidText?: string;
    // テキスト欄の上に出す注記。
    notices?: React.ReactNode;
    // true なら本文を編集できず、保存の操作を出さない。
    readOnly?: boolean;
    // このダイアログの上に別のダイアログが開いている。
    covered?: boolean;
}

/** 設定ファイルの直接編集ダイアログと、保存の競合を知らせるダイアログ。未保存の編集があれば、閉じる前に確認する。 */
export const DirectEditDialog: React.FC<DialogProps> = ({
    editor,
    busy,
    title,
    description,
    cancelLabel,
    saveLabel,
    invalidText,
    notices,
    readOnly = false,
    covered = false,
}) => {
    const { t } = useTranslation();
    const [discardOpen, setDiscardOpen] = useState(false);
    const requestClose = () => {
        if (!readOnly && editor.dirty) setDiscardOpen(true);
        else editor.close();
    };
    const confirmDiscard = () => {
        setDiscardOpen(false);
        editor.close();
    };
    return (
        <>
            <Dialog
                open={editor.open}
                onClose={() => !busy && requestClose()}
                maxWidth='md'
                fullWidth
                // 上のダイアログが開いている間は、このダイアログへフォーカスを引き戻さない。
                disableEnforceFocus={covered || editor.conflict || discardOpen}
                // ダイアログを固定高にし、スクロールはテキストエリア内の 1 本のみにする
                slotProps={{ paper: { sx: { height: '85vh' } }, transition: { onExited: editor.onExited } }}
            >
                <DialogTitle>{title}</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <Typography variant='body2' color='text.secondary' sx={{ mb: 1.5, flexShrink: 0 }}>
                        {description}
                    </Typography>
                    {editor.mixedEol && (
                        <Alert severity='info' sx={{ mb: 1.5, flexShrink: 0 }}>
                            {t('common.settingsFile.mixedEol', { eol: editor.eol === '\r\n' ? 'CRLF' : 'LF' })}
                        </Alert>
                    )}
                    {notices}
                    <TextField
                        multiline
                        fullWidth
                        value={editor.text}
                        onChange={e => editor.setText(e.target.value)}
                        error={editor.invalid}
                        helperText={invalidText !== undefined ? (editor.invalid ? invalidText : ' ') : undefined}
                        sx={{ flexGrow: 1, minHeight: 0 }}
                        slotProps={{
                            htmlInput: { readOnly },
                            input: {
                                sx: {
                                    fontFamily: 'monospace',
                                    fontSize: '0.85rem',
                                    height: '100%',
                                    alignItems: 'flex-start',
                                    // TextareaAutosize の自動高さを無効化し、固定高＋内部スクロールにする
                                    '& textarea': {
                                        height: '100% !important',
                                        overflow: 'auto !important',
                                    },
                                },
                            },
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={requestClose} disabled={busy}>
                        {cancelLabel}
                    </Button>
                    {!readOnly && (
                        <Button
                            variant='contained'
                            startIcon={<SaveIcon />}
                            onClick={() => void editor.save()}
                            disabled={busy || editor.invalid}
                        >
                            {saveLabel}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            <StackedDialogFocus open={editor.open && editor.conflict} />
            <Dialog open={editor.open && editor.conflict} onClose={() => !busy && editor.backToEdit()} maxWidth='sm'>
                <DialogTitle>{t('common.settingsFile.conflictTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{t('common.settingsFile.conflictBody')}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={editor.backToEdit} disabled={busy}>
                        {t('common.settingsFile.conflictBack')}
                    </Button>
                    <Button variant='contained' onClick={() => void editor.reload()} disabled={busy}>
                        {t('common.settingsFile.conflictReload')}
                    </Button>
                </DialogActions>
            </Dialog>

            <StackedDialogFocus open={editor.open && discardOpen} />
            <Dialog open={editor.open && discardOpen} onClose={() => setDiscardOpen(false)} maxWidth='sm'>
                <DialogTitle>{t('common.settingsFile.discardTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{t('common.settingsFile.discardBody')}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDiscardOpen(false)}>{t('common.settingsFile.conflictBack')}</Button>
                    <Button color='error' variant='contained' onClick={confirmDiscard}>
                        {t('common.settingsFile.discardConfirm')}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};
