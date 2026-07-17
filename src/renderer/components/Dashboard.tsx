import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box,
    Typography,
    Card,
    CardActionArea,
    CardContent,
    Accordion,
    AccordionSummary,
    AccordionDetails,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { AGENT_MODULES } from '../agents/index';

// 最後に展開していた agent をアプリ再起動後に復元するための保存キー。
// '' は「すべて閉じた状態で終了した」ことを表す。
const EXPANDED_AGENT_STORAGE_KEY = 'dashboard.expandedAgent';

const loadInitialExpandedId = (): string | null => {
    const stored = window.localStorage.getItem(EXPANDED_AGENT_STORAGE_KEY);
    if (stored === '') {
        return null;
    }
    if (stored && AGENT_MODULES.some(module => module.id === stored)) {
        return stored;
    }
    // 初回起動や保存値が無効な場合は先頭の agent を展開する
    return AGENT_MODULES[0]?.id ?? null;
};

/**
 * 起動時に表示されるダッシュボード。
 * agent（Claude / Codex / ...）ごとにアコーディオンでグループ化し、各機能をカードで選択する。
 * アコーディオンは排他展開（1 つ開くと他が閉じる）で、最後の展開状態を次回起動時に復元する。
 */
export const Dashboard: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [expandedId, setExpandedId] = useState<string | null>(loadInitialExpandedId);

    const handleAccordionChange = (id: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
        const next = isExpanded ? id : null;
        setExpandedId(next);
        window.localStorage.setItem(EXPANDED_AGENT_STORAGE_KEY, next ?? '');
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant='h4' component='h1' sx={{ mb: 2 }}>
                {t('dashboard.title')}
            </Typography>

            {AGENT_MODULES.map(module => (
                <Accordion
                    key={module.id}
                    variant='outlined'
                    disableGutters
                    expanded={expandedId === module.id}
                    onChange={handleAccordionChange(module.id)}
                    sx={{ '&:before': { display: 'none' }, '& + &': { borderTop: 0 } }}
                >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant='h6' component='h2'>
                            {module.dashboardLabel ?? module.label}
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0 }}>
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' },
                                gap: 1.5,
                            }}
                        >
                            {/* アイコンを左・テキストを右に置く横並びレイアウトで縦方向をコンパクトに保つ */}
                            {module.features.map(feature => (
                                <Card key={feature.path} variant='outlined' sx={{ height: '100%' }}>
                                    <CardActionArea
                                        onClick={() => navigate(feature.path)}
                                        sx={{ height: '100%', alignItems: 'stretch' }}
                                    >
                                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                                                <Box
                                                    sx={{
                                                        width: 40,
                                                        height: 40,
                                                        borderRadius: 1.5,
                                                        flexShrink: 0,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        bgcolor: feature.color,
                                                        color: '#fff',
                                                    }}
                                                >
                                                    <feature.Icon sx={{ fontSize: 24 }} />
                                                </Box>
                                                <Box sx={{ minWidth: 0 }}>
                                                    <Typography variant='h6' sx={{ mb: 0.25, lineHeight: 1.3 }}>
                                                        {t(feature.navKey)}
                                                    </Typography>
                                                    <Typography variant='body2' color='text.secondary'>
                                                        {t(feature.descKey)}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </CardContent>
                                    </CardActionArea>
                                </Card>
                            ))}
                        </Box>
                    </AccordionDetails>
                </Accordion>
            ))}
        </Box>
    );
};
