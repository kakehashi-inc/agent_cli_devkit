import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Card, CardActionArea, CardContent, Divider } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { AGENT_MODULES } from '../agents/index';

/**
 * 起動時に表示されるダッシュボード。
 * agent（Claude / Codex / ...）ごとにグループ見出しを付け、各機能をカードで選択する。
 */
export const Dashboard: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <Box sx={{ p: 4 }}>
            <Typography variant='h4' component='h1' sx={{ mb: 1 }}>
                {t('dashboard.title')}
            </Typography>
            <Typography variant='body1' color='text.secondary' sx={{ mb: 4 }}>
                {t('dashboard.subtitle')}
            </Typography>

            {AGENT_MODULES.map((module, index) => (
                <Box key={module.id} sx={{ mb: index < AGENT_MODULES.length - 1 ? 5 : 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Typography variant='h5' component='h2'>
                            {module.label}
                        </Typography>
                        <Divider sx={{ flexGrow: 1 }} />
                    </Box>
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' },
                            gap: 3,
                        }}
                    >
                        {module.features.map(feature => (
                            <Card key={feature.path} variant='outlined' sx={{ height: '100%' }}>
                                <CardActionArea
                                    onClick={() => navigate(feature.path)}
                                    sx={{ height: '100%', alignItems: 'stretch' }}
                                >
                                    <CardContent sx={{ p: 3 }}>
                                        <Box
                                            sx={{
                                                width: 56,
                                                height: 56,
                                                borderRadius: 2,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                bgcolor: feature.color,
                                                color: '#fff',
                                                mb: 2,
                                            }}
                                        >
                                            <feature.Icon sx={{ fontSize: 32 }} />
                                        </Box>
                                        <Typography variant='h6' sx={{ mb: 1 }}>
                                            {t(feature.navKey)}
                                        </Typography>
                                        <Typography variant='body2' color='text.secondary'>
                                            {t(feature.descKey)}
                                        </Typography>
                                    </CardContent>
                                </CardActionArea>
                            </Card>
                        ))}
                    </Box>
                </Box>
            ))}
        </Box>
    );
};
