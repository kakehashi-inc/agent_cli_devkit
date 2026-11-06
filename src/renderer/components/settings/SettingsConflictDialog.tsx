import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { StackedDialogFocus } from './StackedDialogFocus';

interface Props {
    // 読み込んだ後に値が変わった項目の表示名。null の間は閉じている。空なら項目を特定できなかったことを示す。
    labels: readonly string[] | null;
    busy: boolean;
    onBack: () => void;
    onReload: () => void;
}

/** テーブルの保存で、読み込んだ後に同じ項目の値が変わっていたことを知らせ、再読み込みか編集に戻るかを選ばせる。 */
export const SettingsConflictDialog: React.FC<Props> = ({ labels, busy, onBack, onReload }) => {
    const { t } = useTranslation();
    const open = labels !== null;
    return (
        <>
            <StackedDialogFocus open={open} />
            <Dialog open={open} onClose={() => !busy && onBack()} maxWidth='sm'>
                <DialogTitle>{t('common.settingsFile.conflictTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {labels && labels.length > 0
                            ? t('common.settingsFile.tableConflictBody', { names: labels.join(', ') })
                            : t('common.settingsFile.tableConflictRetry')}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onBack} disabled={busy}>
                        {t('common.settingsFile.conflictBack')}
                    </Button>
                    <Button variant='contained' onClick={onReload} disabled={busy}>
                        {t('common.settingsFile.conflictReload')}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};
