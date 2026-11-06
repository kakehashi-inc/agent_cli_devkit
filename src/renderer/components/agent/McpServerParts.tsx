import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Typography } from '@mui/material';
import type { McpFileProblem, MCPServerInfo } from '@shared/agents/types';
import { configDetailText } from '../../utils/configFileFailure';

/** 一覧の読み取りで読めなかったファイルを、理由と対処とともに表示する。 */
export const McpFileProblems: React.FC<{ problems: McpFileProblem[] }> = ({ problems }) => {
    const { t } = useTranslation();
    if (problems.length === 0) return null;
    return (
        <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {problems.map(problem => (
                <Alert severity='error' key={problem.path}>
                    {t(problem.failure === 'invalid-file' ? 'common.mcpFileInvalid' : 'common.mcpFileUnreadable', {
                        target: problem.path,
                    })}
                    {problem.detail && (
                        <Typography component='pre' variant='caption' sx={{ whiteSpace: 'pre-wrap', m: 0 }}>
                            {configDetailText(t, problem.detail)}
                        </Typography>
                    )}
                </Alert>
            ))}
        </Box>
    );
};

/** サーバー行の補足（読み取り専用であること、定義のあるファイル）を表示する。 */
export const McpServerNotes: React.FC<{ server: MCPServerInfo }> = ({ server }) => {
    const { t } = useTranslation();
    const definedIn = server.definedIn ?? [];
    return (
        <>
            {server.readOnly && (
                <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
                    {t('common.mcpReadOnlyBadge')}
                </Typography>
            )}
            {definedIn.length > 0 && (
                <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
                    {t('common.mcpDefinedIn', { files: definedIn.join(', ') })}
                </Typography>
            )}
            {definedIn.length > 1 && (
                <Typography variant='caption' color='warning.main' sx={{ display: 'block' }}>
                    {t(server.enabled ? 'common.mcpDefinedInMultiple' : 'common.mcpDisabledFromMultiple')}
                </Typography>
            )}
        </>
    );
};
