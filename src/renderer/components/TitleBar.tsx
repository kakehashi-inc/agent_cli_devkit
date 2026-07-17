import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    IconButton,
    Typography,
    Menu,
    MenuItem,
    MenuList,
    ListItemIcon,
    ListItemText,
    Divider,
    Tooltip,
    Popper,
    Paper,
} from '@mui/material';
import {
    Menu as MenuIcon,
    Minimize as MinimizeIcon,
    CropSquare as MaximizeIcon,
    FullscreenExit as RestoreIcon,
    Close as CloseIcon,
    Dashboard as DashboardIcon,
    PowerSettingsNew as ExitIcon,
    Settings as AppSettingsIcon,
    KeyboardArrowDown as ExpandGroupIcon,
    KeyboardArrowUp as CollapseGroupIcon,
    ChevronLeft as SubMenuIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AGENT_MODULES } from '../agents/index';

export const TitleBar: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMaximized, setIsMaximized] = useState(false);
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const [appVersion, setAppVersion] = useState<string>('');
    // タイトルバーで展開中の agent グループ（null = すべて閉じる）。
    const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);
    // バーガーメニューでホバー中の agent グループのサブメニュー（カスケード表示）。
    const [subMenu, setSubMenu] = useState<{ anchorEl: HTMLElement; agentId: string } | null>(null);

    // 現在のルートが属するグループを自動展開する（ダッシュボードやメニューからの遷移に追従）。
    useEffect(() => {
        const owner = AGENT_MODULES.find(m => m.features.some(f => f.path === location.pathname));
        if (owner) {
            setExpandedAgentId(owner.id);
        }
    }, [location.pathname]);

    // 代表ボタンのクリック: 同じグループなら閉じる、別グループならそちらを展開（他は閉じる）。
    const toggleAgentGroup = (id: string) => {
        setExpandedAgentId(prev => (prev === id ? null : id));
    };

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
        setSubMenu(null);
    };

    const handleMenuClose = () => {
        setMenuAnchor(null);
        setSubMenu(null);
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

                {/* agent グループ（代表ボタンのみ表示。クリックで機能アイコンを展開し、
                    他グループを展開すると自動で閉じるアコーディオン方式） */}
                {AGENT_MODULES.map(module => {
                    const groupActive = module.features.some(f => f.path === location.pathname);
                    const expanded = expandedAgentId === module.id;
                    return (
                        <React.Fragment key={module.id}>
                            <Divider orientation='vertical' flexItem sx={{ mx: 0.5, my: 1.25 }} />
                            <Button
                                size='small'
                                onClick={() => toggleAgentGroup(module.id)}
                                endIcon={expanded ? <CollapseGroupIcon /> : <ExpandGroupIcon />}
                                sx={{
                                    minWidth: 0,
                                    px: 1,
                                    textTransform: 'none',
                                    fontSize: '0.85rem',
                                    fontWeight: groupActive ? 600 : 400,
                                    color: groupActive ? 'primary.main' : 'text.secondary',
                                    bgcolor: expanded ? 'action.selected' : 'transparent',
                                    '&:hover': { bgcolor: 'action.hover' },
                                    '& .MuiButton-endIcon': { ml: 0.25 },
                                }}
                            >
                                {module.label}
                            </Button>
                            {expanded &&
                                module.features.map(feature => {
                                    const active = location.pathname === feature.path;
                                    return (
                                        <Tooltip key={feature.path} title={`${module.label}: ${t(feature.navKey)}`}>
                                            <IconButton
                                                size='small'
                                                onClick={() => navigate(feature.path)}
                                                sx={{ ...navIconSx(active), p: 0.75 }}
                                            >
                                                <feature.Icon sx={{ fontSize: 22 }} />
                                            </IconButton>
                                        </Tooltip>
                                    );
                                })}
                        </React.Fragment>
                    );
                })}

                {/* スペーサー */}
                <Box sx={{ width: 16 }} />

                {/* アプリ設定（アイコンのみ・バーガーメニューの左） */}
                <Tooltip title={t('nav.appSettings')}>
                    <IconButton
                        size='medium'
                        onClick={() => navigate('/app-settings')}
                        sx={navIconSx(location.pathname === '/app-settings')}
                    >
                        <AppSettingsIcon />
                    </IconButton>
                </Tooltip>

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
                    <MenuItem
                        selected={location.pathname === '/'}
                        onClick={() => handleNavigate('/')}
                        onMouseEnter={() => setSubMenu(null)}
                    >
                        <ListItemIcon>
                            <DashboardIcon />
                        </ListItemIcon>
                        <ListItemText
                            primary={t('nav.dashboard')}
                            slotProps={{ primary: { sx: { fontSize: '0.95rem' } } }}
                        />
                    </MenuItem>
                    {/* agent グループ（1 階層目）。ホバーで機能一覧のサブメニューを横に展開する */}
                    {AGENT_MODULES.map(module => {
                        const groupActive = module.features.some(f => f.path === location.pathname);
                        return (
                            <MenuItem
                                key={module.id}
                                onMouseEnter={e =>
                                    setSubMenu({ anchorEl: e.currentTarget, agentId: module.id })
                                }
                                onClick={e =>
                                    setSubMenu({ anchorEl: e.currentTarget, agentId: module.id })
                                }
                            >
                                <ListItemIcon>
                                    <SubMenuIcon sx={{ color: 'text.secondary' }} />
                                </ListItemIcon>
                                <ListItemText
                                    primary={module.label}
                                    slotProps={{
                                        primary: {
                                            sx: { fontSize: '0.95rem', fontWeight: groupActive ? 600 : 400 },
                                        },
                                    }}
                                />
                            </MenuItem>
                        );
                    })}
                    <Divider />
                    <MenuItem
                        selected={location.pathname === '/app-settings'}
                        onClick={() => handleNavigate('/app-settings')}
                        onMouseEnter={() => setSubMenu(null)}
                    >
                        <ListItemIcon>
                            <AppSettingsIcon />
                        </ListItemIcon>
                        <ListItemText
                            primary={t('nav.appSettings')}
                            slotProps={{ primary: { sx: { fontSize: '0.95rem' } } }}
                        />
                    </MenuItem>
                    <MenuItem onClick={handleExit} onMouseEnter={() => setSubMenu(null)}>
                        <ListItemIcon>
                            <ExitIcon />
                        </ListItemIcon>
                        <ListItemText
                            primary={t('menu.exit')}
                            slotProps={{ primary: { sx: { fontSize: '0.95rem' } } }}
                        />
                    </MenuItem>
                </Menu>

                {/* agent グループのサブメニュー。バーガーメニューはウィンドウ右端に開くため
                    右側に空きがなく、常に左横へカスケード表示する（矢印 ◀ も左向きに合わせる） */}
                <Popper
                    open={Boolean(subMenu)}
                    anchorEl={subMenu?.anchorEl ?? null}
                    placement='left-start'
                    sx={{ zIndex: theme => theme.zIndex.modal + 1 }}
                >
                    <Paper elevation={8}>
                        <MenuList>
                            {AGENT_MODULES.find(m => m.id === subMenu?.agentId)?.features.map(feature => (
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
                            ))}
                        </MenuList>
                    </Paper>
                </Popper>
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
