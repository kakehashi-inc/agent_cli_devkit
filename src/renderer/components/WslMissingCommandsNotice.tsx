import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Box } from '@mui/material';
import type { WslMissingCommands } from '@shared/agents/types';

// 再取得の後に足りないコマンドの状態を読み直す間隔。
const REFRESH_INTERVAL_MS = 60_000;

/** 必須のコマンドが足りない WSL ディストリビューションを、画面の上部に表示する。足りていれば何も表示しない。 */
export const WslMissingCommandsNotice: React.FC = () => {
    const { t } = useTranslation();
    const { pathname } = useLocation();
    const [missing, setMissing] = useState<WslMissingCommands[]>([]);

    useEffect(() => {
        let active = true;
        const load = () => {
            window.agentCliDevkit.wsl
                .getMissingCommands()
                .then(next => {
                    if (active) setMissing(next);
                })
                .catch(error => console.error('Failed to check WSL commands:', error));
        };
        load();
        const timer = window.setInterval(load, REFRESH_INTERVAL_MS);
        return () => {
            active = false;
            window.clearInterval(timer);
        };
    }, [pathname]);

    if (missing.length === 0) return null;
    return (
        <Box sx={{ px: 3, pt: 2 }}>
            {missing.map(item => (
                <Alert key={item.distro} severity='warning' sx={{ mb: 1 }}>
                    {t('common.wslMissingCommands', { distro: item.distro, commands: item.commands.join(', ') })}
                </Alert>
            ))}
        </Box>
    );
};
