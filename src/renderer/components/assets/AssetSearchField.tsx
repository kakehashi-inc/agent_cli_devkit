import React from 'react';
import { useTranslation } from 'react-i18next';
import { Clear as ClearIcon, Search as SearchIcon } from '@mui/icons-material';
import { IconButton, InputAdornment, TextField } from '@mui/material';

interface Props {
    value: string;
    onChange: (value: string) => void;
    /** ラベル文言の上書き。省略時は Agent・Skill 一覧向けの共通文言を使う。 */
    label?: string;
}

/** Agent・Skill 一覧や設定画面で共通利用する検索入力。 */
export const AssetSearchField: React.FC<Props> = ({ value, onChange, label }) => {
    const { t } = useTranslation();

    return (
        <TextField
            fullWidth
            size='small'
            label={label ?? t('common.assetSearchLabel')}
            placeholder={t('common.assetSearchPlaceholder')}
            value={value}
            onChange={event => onChange(event.target.value)}
            sx={{ mb: 2 }}
            slotProps={{
                input: {
                    startAdornment: (
                        <InputAdornment position='start'>
                            <SearchIcon fontSize='small' />
                        </InputAdornment>
                    ),
                    endAdornment: value ? (
                        <InputAdornment position='end'>
                            <IconButton
                                size='small'
                                edge='end'
                                aria-label={t('common.clearSearch')}
                                onClick={() => onChange('')}
                            >
                                <ClearIcon fontSize='small' />
                            </IconButton>
                        </InputAdornment>
                    ) : undefined,
                },
            }}
        />
    );
};
