import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Typography } from '@mui/material';
import type { SettingsParseError } from '@shared/agents/types';
import { configDetailMessage, configDetailText } from '../../utils/configFileFailure';

interface Props {
    readFailed?: string;
    parseError?: SettingsParseError;
    // 解釈できないときの文言のキー（直接編集での修正を案内する）。
    parseErrorKey: string;
}

/** 設定ファイルを読めない、または解釈できないことを、値の表の代わりに示す。 */
export const SettingsFileBanner: React.FC<Props> = ({ readFailed, parseError, parseErrorKey }) => {
    const { t } = useTranslation();
    if (readFailed !== undefined) {
        return (
            <Alert severity='error' sx={{ mb: 2 }}>
                {t('common.settingsFile.readFailed', { detail: configDetailText(t, readFailed) })}
            </Alert>
        );
    }
    if (!parseError) return null;
    return (
        <Alert severity='error' sx={{ mb: 2 }}>
            {t(parseErrorKey)}
            <Typography component='div' variant='caption'>
                {configDetailMessage(t, parseError)}
            </Typography>
        </Alert>
    );
};
