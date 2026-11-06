import React from 'react';
import {
    AssetEntriesTable as SharedAssetEntriesTable,
    computeFitWidth,
    fitColumnLimit,
    type FmColumn,
} from '../../components/assets/AssetEntriesTable';

export { computeFitWidth, fitColumnLimit };
export type { FmColumn };

type Props = Omit<React.ComponentProps<typeof SharedAssetEntriesTable>, 'i18nPrefix'>;

/** Claude Code の Agent・Skill の一覧テーブル。 */
export const AssetEntriesTable: React.FC<Props> = props => (
    <SharedAssetEntriesTable i18nPrefix='claude.assetManager' {...props} />
);
