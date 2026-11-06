import React from 'react';
import { Box, Collapse, Table, TableBody, TableCell, TableRow } from '@mui/material';

// ファイル数とサイズの列の幅（px）。環境や候補が違っても数字の位置を揃える。
const FILES_COLUMN_WIDTH = 110;
const SIZE_COLUMN_WIDTH = 150;
// チェックボックスの列の幅（px）。子要素の表は小さいチェックボックスと左右の余白が入る幅にする。
const CHECKBOX_COLUMN_WIDTH = 48;
const CHILD_CHECKBOX_COLUMN_WIDTH = 66;
// 名前の列の幅（表全体に対する割合）。
const NAME_COLUMN_WIDTH = '32%';

/** 候補の表の列の幅。テーブルの先頭に置き、テーブルは固定レイアウトにする。 */
export const CleanupColumns: React.FC = () => (
    <colgroup>
        <col style={{ width: CHECKBOX_COLUMN_WIDTH }} />
        <col style={{ width: NAME_COLUMN_WIDTH }} />
        <col />
        <col style={{ width: FILES_COLUMN_WIDTH }} />
        <col style={{ width: SIZE_COLUMN_WIDTH }} />
    </colgroup>
);

/** 候補の行の下で展開する領域。右端を親の表の右端に揃える。 */
export const CleanupChildRegion: React.FC<{ open: boolean; children: React.ReactNode }> = ({ open, children }) => (
    <TableRow>
        <TableCell sx={{ py: 0, pr: 0, border: 0 }} colSpan={5}>
            <Collapse in={open} timeout='auto' unmountOnExit>
                <Box sx={{ pl: 6, py: 1 }}>{children}</Box>
            </Collapse>
        </TableCell>
    </TableRow>
);

/** 子要素の表。ファイル数とサイズの列を親の表の列に揃える。 */
export const CleanupChildTable: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Table size='small' sx={{ tableLayout: 'fixed' }}>
        <colgroup>
            <col style={{ width: CHILD_CHECKBOX_COLUMN_WIDTH }} />
            <col />
            <col style={{ width: FILES_COLUMN_WIDTH }} />
            <col style={{ width: SIZE_COLUMN_WIDTH }} />
        </colgroup>
        <TableBody>{children}</TableBody>
    </Table>
);
