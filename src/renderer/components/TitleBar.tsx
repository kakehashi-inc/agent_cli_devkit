import React, { useState, useEffect } from 'react';
import {
    Box,
    IconButton,
    Typography,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    ListSubheader,
    Divider,
    Tooltip,
} from '@mui/material';
import {
    Menu as MenuIcon,
    Minimize as MinimizeIcon,
    CropSquare as MaximizeIcon,
    FullscreenExit as RestoreIcon,
    Close as CloseIcon,
    Dashboard as DashboardIcon,
    PowerSettingsNew as ExitIcon,
    Brightness4 as DarkIcon,
    Brightness7 as LightIcon,
    Language as LanguageIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from 'react-i18next';
import { AGENT_MODULES } from '../agents/index';

export const TitleBar: React.FC = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { theme, language, setTheme, setLanguage } = useAppStore();
    const [isMaximized, setIsMaximized] = useState(false);
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const [langMenuAnchor, setLangMenuAnchor] = useState<null | HTMLElement>(null);
    const [appVersion, setAppVersion] = useState<string>('');

    const handleNavigate = (path: string) => {
        navigate(path);
        handleMenuClose();
    };

    useEffect(() => {
        window.agentCliDevkit.window.isMaximized().then(setIsMaximized);
        window.agentCliDevkit.system
            .getVersion()
            .then(setAppVersion)
            .catch(() => setAppVersion(''));
    }, []);

    const handleMinimize = () => {
        window.agentCliDevkit.window.minimize();
    };

    const handleMaximize = async () => {
        await window.agentCliDevkit.window.maximize();
        const maximized = await window.agentCliDevkit.window.isMaximized();
        setIsMaximized(maximized);
    };

    const handleClose = () => {
        window.agentCliDevkit.window.close();
    };

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setMenuAnchor(event.currentTarget);
    };

    const handleMenuClose = () => {
        setMenuAnchor(null);
    };

    const handleLanguageMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setLangMenuAnchor(event.currentTarget);
    };

    const handleLanguageMenuClose = () => {
        setLangMenuAnchor(null);
    };

    const handleLanguageSelect = (lang: 'en' | 'ja') => {
        setLanguage(lang);
        i18n.changeLanguage(lang);
        handleLanguageMenuClose();
    };

    const handleThemeToggle = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    const handleExit = () => {
        handleMenuClose();
        window.agentCliDevkit.window.close();
    };

    // 画面切替アイコン共通スタイル
    const navIconSx = (active: boolean) => ({
        color: active ? 'primary.main' : 'text.secondary',
        bgcolor: active ? 'action.selected' : 'transparent',
        '&:hover': { bgcolor: 'action.hover' },
    });

    return (
        <Box
            sx={{
                height: 48,
                bgcolor: 'background.paper',
                display: 'flex',
                alignItems: 'center',
                borderBottom: 1,
                borderColor: 'divider',
                WebkitAppRegion: 'drag',
                userSelect: 'none',
            }}
        >
            {/* タイトル */}
            <Box sx={{ flexGrow: 1, ml: 2, display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography
                    variant='body1'
                    sx={{
                        fontWeight: 500,
                        fontSize: '0.95rem',
                    }}
                >
                    {t('app.title')}
                </Typography>
                {appVersion && (
                    <Typography
                        variant='caption'
                        sx={{
                            color: 'text.secondary',
                            fontSize: '0.75rem',
                        }}
                    >
                        v{appVersion}
                    </Typography>
                )}
            </Box>

            {/* 右側：ツールメニュー */}
            <Box sx={{ display: 'flex', alignItems: 'center', WebkitAppRegion: 'no-drag' }}>
                {/* ダッシュボード */}
                <Tooltip title={t('nav.dashboard')}>
                    <IconButton size='medium' onClick={() => navigate('/')} sx={navIconSx(location.pathname === '/')}>
                        <DashboardIcon />
                    </IconButton>
                </Tooltip>

                {/* agent ごとの画面切替アイコン（グループ間は仕切り線で区切る） */}
                {AGENT_MODULES.map(module => (
                    <React.Fragment key={module.id}>
                        <Divider orientation='vertical' flexItem sx={{ mx: 0.5, my: 1.25 }} />
                        {module.features.map(feature => {
                            const active = location.pathname === feature.path;
                            return (
                                <Tooltip key={feature.path} title={`${module.label}: ${t(feature.navKey)}`}>
                                    <IconButton
                                        size='medium'
                                        onClick={() => navigate(feature.path)}
                                        sx={navIconSx(active)}
                                    >
                                        <feature.Icon />
                                    </IconButton>
                                </Tooltip>
                            );
                        })}
                    </React.Fragment>
                ))}

                {/* スペーサー */}
                <Box sx={{ width: 16 }} />

                {/* テーマ切り替え */}
                <Tooltip title={t('theme.' + (theme === 'light' ? 'dark' : 'light'))}>
                    <IconButton
                        size='medium'
                        onClick={handleThemeToggle}
                        sx={{
                            color: 'text.primary',
                        }}
                    >
                        {theme === 'light' ? <DarkIcon /> : <LightIcon />}
                    </IconButton>
                </Tooltip>

                {/* 言語ドロップダウン */}
                <Tooltip title={t('language.' + language)}>
                    <IconButton
                        size='medium'
                        onClick={handleLanguageMenuOpen}
                        sx={{
                            color: 'text.primary',
                        }}
                    >
                        <LanguageIcon />
                    </IconButton>
                </Tooltip>

                <Menu
                    anchorEl={langMenuAnchor}
                    open={Boolean(langMenuAnchor)}
                    onClose={handleLanguageMenuClose}
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'right',
                    }}
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                    }}
                >
                    <MenuItem onClick={() => handleLanguageSelect('ja')} selected={language === 'ja'}>
                        <ListItemText
                            primary={t('language.ja')}
                            slotProps={{ primary: { sx: { fontSize: '0.95rem' } } }}
                        />
                    </MenuItem>
                    <MenuItem onClick={() => handleLanguageSelect('en')} selected={language === 'en'}>
                        <ListItemText
                            primary={t('language.en')}
                            slotProps={{ primary: { sx: { fontSize: '0.95rem' } } }}
                        />
                    </MenuItem>
                </Menu>

                {/* バーガーメニュー */}
                <IconButton
                    size='medium'
                    onClick={handleMenuOpen}
                    sx={{
                        color: 'text.primary',
                    }}
                >
                    <MenuIcon />
                </IconButton>

                <Menu
                    anchorEl={menuAnchor}
                    open={Boolean(menuAnchor)}
                    onClose={handleMenuClose}
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'right',
                    }}
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                    }}
                >
                    <MenuItem selected={location.pathname === '/'} onClick={() => handleNavigate('/')}>
                        <ListItemIcon>
                            <DashboardIcon />
                        </ListItemIcon>
                        <ListItemText
                            primary={t('nav.dashboard')}
                            slotProps={{ primary: { sx: { fontSize: '0.95rem' } } }}
                        />
                    </MenuItem>
                    {AGENT_MODULES.flatMap(module => [
                        <ListSubheader key={`${module.id}-header`} sx={{ lineHeight: '32px', bgcolor: 'transparent' }}>
                            {module.label}
                        </ListSubheader>,
                        ...module.features.map(feature => (
                            <MenuItem
                                key={feature.path}
                                selected={location.pathname === feature.path}
                                onClick={() => handleNavigate(feature.path)}
                            >
                                <ListItemIcon>
                                    <feature.Icon />
                                </ListItemIcon>
                                <ListItemText
                                    primary={t(feature.navKey)}
                                    slotProps={{ primary: { sx: { fontSize: '0.95rem' } } }}
                                />
                            </MenuItem>
                        )),
                    ])}
                    <Divider />
                    <MenuItem onClick={handleExit}>
                        <ListItemIcon>
                            <ExitIcon />
                        </ListItemIcon>
                        <ListItemText
                            primary={t('menu.exit')}
                            slotProps={{ primary: { sx: { fontSize: '0.95rem' } } }}
                        />
                    </MenuItem>
                </Menu>
            </Box>

            {/* ウィンドウコントロールボタン */}
            <Box sx={{ display: 'flex', WebkitAppRegion: 'no-drag' }}>
                <IconButton
                    size='medium'
                    onClick={handleMinimize}
                    sx={{
                        borderRadius: 0,
                        width: 48,
                        height: 48,
                        color: 'text.primary',
                        '&:hover': {
                            bgcolor: 'action.hover',
                        },
                    }}
                >
                    <MinimizeIcon />
                </IconButton>
                <IconButton
                    size='medium'
                    onClick={handleMaximize}
                    sx={{
                        borderRadius: 0,
                        width: 48,
                        height: 48,
                        color: 'text.primary',
                        '&:hover': {
                            bgcolor: 'action.hover',
                        },
                    }}
                >
                    {isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
                </IconButton>
                <IconButton
                    size='medium'
                    onClick={handleClose}
                    sx={{
                        borderRadius: 0,
                        width: 48,
                        height: 48,
                        color: 'text.primary',
                        '&:hover': {
                            bgcolor: 'error.main',
                            color: 'error.contrastText',
                        },
                    }}
                >
                    <CloseIcon />
                </IconButton>
            </Box>
        </Box>
    );
};
