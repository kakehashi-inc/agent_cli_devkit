import React, { useLayoutEffect } from 'react';

/**
 * open が true になったときに、フォーカスを持つ要素からフォーカスを外す。
 * フォーカスを持ったままの要素が aria-hidden の範囲に入るのを防ぐ。ダイアログより先に動くよう、ダイアログの直前の兄弟として置く。
 */
export const StackedDialogFocus: React.FC<{ open: boolean }> = ({ open }) => {
    useLayoutEffect(() => {
        if (!open) return;
        const active = document.activeElement;
        if (active instanceof HTMLElement && active !== document.body) active.blur();
    }, [open]);
    return null;
};
