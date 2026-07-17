import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Box,
    Button,
    Divider,
    IconButton,
    Paper,
    Snackbar,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    ToggleOn as EnableIcon,
    ToggleOff as DisableIcon,
    DragIndicator as DragIcon,
    Refresh as RefreshIcon,
} from '@mui/icons-material';
import type { MCPServerInfo, McpEnvInfo } from '@shared/agents/types';
import { envId } from '../../utils/format';
import type { McpApi } from './types';

interface Props {
    agentId: string;
    api: McpApi;
}

interface SectionProps {
    agentId: string;
    api: McpApi;
    info: McpEnvInfo;
    onNotify(message: string, severity: 'success' | 'error'): void;
}

/**
 * 1 つの環境（native または WSL distro）の MCP サーバーを管理するセクション。
 * 他 agent（Claude / Codex / Grok）と同じく、有効/無効の 2 テーブル、
 * ドラッグ並べ替え、有効化/無効化トグルを提供する。
 */
const McpSection: React.FC<SectionProps> = ({ agentId, api, info, onNotify }) => {
    const { t } = useTranslation();
    const { env } = info;
    const [enabledServers, setEnabledServers] = useState<MCPServerInfo[]>([]);
    const [disabledServers, setDisabledServers] = useState<MCPServerInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [draggedDisabledIndex, setDraggedDisabledIndex] = useState<number | null>(null);

    const loadData = async () => {
        try {
            const servers = await api.getMCPServers(env);
            setEnabledServers(servers.enabled);
            setDisabledServers(servers.disabled);
        } catch (error) {
            console.error('Failed to load MCP servers:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [info.configPath]);

    const handleDisable = async (serverName: string) => {
        try {
            const result = await api.disableMCPServer(env, serverName);
            setEnabledServers(result.enabled);
            setDisabledServers(result.disabled);
            onNotify(t('common.success'), 'success');
        } catch (error) {
            onNotify(error instanceof Error ? error.message : t('common.error'), 'error');
        }
    };

    const handleEnable = async (serverName: string) => {
        try {
            const result = await api.enableMCPServer(env, serverName);
            setEnabledServers(result.enabled);
            setDisabledServers(result.disabled);
            onNotify(t('common.success'), 'success');
        } catch (error) {
            onNotify(error instanceof Error ? error.message : t('common.error'), 'error');
        }
    };

    const handleDragStart = (index: number) => setDraggedIndex(index);

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;
        const newServers = [...enabledServers];
        const dragged = newServers[draggedIndex];
        newServers.splice(draggedIndex, 1);
        newServers.splice(index, 0, dragged);
        setEnabledServers(newServers);
        setDraggedIndex(index);
    };

    const handleDragEnd = async () => {
        if (draggedIndex === null) return;
        try {
            const names = enabledServers.map(s => s.name);
            await api.reorderMCPServers(env, names);
            onNotify(t('common.success'), 'success');
        } catch (error) {
            onNotify(error instanceof Error ? error.message : t('common.error'), 'error');
            await loadData();
        } finally {
            setDraggedIndex(null);
        }
    };

    const handleDisabledDragStart = (index: number) => setDraggedDisabledIndex(index);

    const handleDisabledDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedDisabledIndex === null || draggedDisabledIndex === index) return;
        const newServers = [...disabledServers];
        const dragged = newServers[draggedDisabledIndex];
        newServers.splice(draggedDisabledIndex, 1);
        newServers.splice(index, 0, dragged);
        setDisabledServers(newServers);
        setDraggedDisabledIndex(index);
    };

    const handleDisabledDragEnd = async () => {
        if (draggedDisabledIndex === null) return;
        try {
            const names = disabledServers.map(s => s.name);
            await api.reorderDisabledMCPServers(env, names);
            onNotify(t('common.success'), 'success');
        } catch (error) {
            onNotify(error instanceof Error ? error.message : t('common.error'), 'error');
            await loadData();
        } finally {
            setDraggedDisabledIndex(null);
        }
    };

    // command が配列（OpenCode local）や URL 形式（remote）でも 1 列で表示する
    const renderCommand = (server: MCPServerInfo): string => {
        const command = server.config.command;
        if (Array.isArray(command)) return command.join(' ');
        if (typeof command === 'string') return command;
        const fallback = server.config.serverUrl ?? server.config.url;
        return typeof fallback === 'string' ? fallback : '-';
    };

    const renderArgs = (server: MCPServerInfo): string => {
        const args = server.config.args;
        return Array.isArray(args) && args.length > 0 ? args.join(' ') : '-';
    };

    const renderTable = (
        servers: MCPServerInfo[],
        variant: 'enabled' | 'disabled',
        onDragStart: (index: number) => void,
        onDragOver: (e: React.DragEvent, index: number) => void,
        onDragEnd: () => void,
        draggingIndex: number | null
    ) => (
        <TableContainer component={Paper}>
            {/* tableLayout: fixed で各列の最大幅を画面幅の比率から決め、長い値は省略せず折り返す */}
            <Table sx={{ tableLayout: 'fixed' }}>
                <TableHead>
                    <TableRow>
                        <TableCell width='40'></TableCell>
                        <TableCell width='20%'>{t(`${agentId}.mcp.serverName`)}</TableCell>
                        <TableCell width='100'>{t(`${agentId}.mcp.actions`)}</TableCell>
                        <TableCell width='18%'>{t(`${agentId}.mcp.command`)}</TableCell>
                        <TableCell>{t(`${agentId}.mcp.args`)}</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {servers.map((server, index) => (
                        <TableRow
                            key={server.name}
                            draggable
                            onDragStart={() => onDragStart(index)}
                            onDragOver={e => onDragOver(e, index)}
                            onDragEnd={onDragEnd}
                            sx={{
                                cursor: 'move',
                                opacity: draggingIndex === index ? 0.5 : 1,
                                '&:hover': { bgcolor: 'action.hover' },
                            }}
                        >
                            <TableCell>
                                <DragIcon sx={{ color: 'action.disabled' }} />
                            </TableCell>
                            <TableCell>
                                <Typography variant='body2' sx={{ fontWeight: 'medium', wordBreak: 'break-all' }}>
                                    {server.name}
                                </Typography>
                            </TableCell>
                            <TableCell>
                                {variant === 'enabled' ? (
                                    <Tooltip title={t(`${agentId}.mcp.disable`)}>
                                        <IconButton
                                            size='large'
                                            color='success'
                                            onClick={() => handleDisable(server.name)}
                                        >
                                            <EnableIcon sx={{ fontSize: 40 }} />
                                        </IconButton>
                                    </Tooltip>
                                ) : (
                                    <Tooltip title={t(`${agentId}.mcp.enable`)}>
                                        <IconButton
                                            size='large'
                                            color='error'
                                            onClick={() => handleEnable(server.name)}
                                        >
                                            <DisableIcon sx={{ fontSize: 40 }} />
                                        </IconButton>
                                    </Tooltip>
                                )}
                            </TableCell>
                            <TableCell>
                                <Typography variant='body2' sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                    {renderCommand(server)}
                                </Typography>
                            </TableCell>
                            <TableCell>
                                <Typography variant='body2' sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                    {renderArgs(server)}
                                </Typography>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );

    return (
        <Box sx={{ mb: 4 }}>
            <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant='body2' color='text.secondary' sx={{ mb: 0.5 }}>
                    {t(`${agentId}.mcp.configPath`)}: {info.configPath}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                    {t(`${agentId}.mcp.disabledConfigPath`)}: {info.disabledConfigPath}
                </Typography>
            </Paper>

            {loading ? (
                <Typography sx={{ px: 1 }}>{t('common.loading')}</Typography>
            ) : !info.configExists ? (
                <Alert severity='info'>{t(`${agentId}.mcp.notFound`)}</Alert>
            ) : (
                <>
                    <Box sx={{ mb: 3 }}>
                        <Typography variant='subtitle1' sx={{ mb: 1 }}>
                            {t(`${agentId}.mcp.enabledServers`)}
                            {enabledServers.length > 0 && (
                                <Typography variant='caption' color='text.secondary' sx={{ ml: 2 }}>
                                    ({t(`${agentId}.mcp.dragToReorder`)})
                                </Typography>
                            )}
                        </Typography>
                        {enabledServers.length === 0 ? (
                            <Alert severity='info'>{t(`${agentId}.mcp.noServers`)}</Alert>
                        ) : (
                            renderTable(
                                enabledServers,
                                'enabled',
                                handleDragStart,
                                handleDragOver,
                                handleDragEnd,
                                draggedIndex
                            )
                        )}
                    </Box>

                    <Box>
                        <Typography variant='subtitle1' sx={{ mb: 1 }}>
                            {t(`${agentId}.mcp.disabledServers`)}
                            {disabledServers.length > 0 && (
                                <Typography variant='caption' color='text.secondary' sx={{ ml: 2 }}>
                                    ({t(`${agentId}.mcp.dragToReorder`)})
                                </Typography>
                            )}
                        </Typography>
                        {disabledServers.length === 0 ? (
                            <Alert severity='info'>{t(`${agentId}.mcp.noServers`)}</Alert>
                        ) : (
                            renderTable(
                                disabledServers,
                                'disabled',
                                handleDisabledDragStart,
                                handleDisabledDragOver,
                                handleDisabledDragEnd,
                                draggedDisabledIndex
                            )
                        )}
                    </Box>
                </>
            )}
        </Box>
    );
};

export const McpManagerView: React.FC<Props> = ({ agentId, api }) => {
    const { t } = useTranslation();
    const [environments, setEnvironments] = useState<McpEnvInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    const load = async () => {
        setLoading(true);
        try {
            setEnvironments(await api.getEnvironments());
        } catch (error) {
            console.error('Failed to load MCP environments:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
        // api is a stable preload bridge.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const notify = (message: string, severity: 'success' | 'error') => {
        setSnackbar({ open: true, message, severity });
    };

    if (loading) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography>{t('common.loading')}</Typography>
            </Box>
        );
    }

    const nativeEnvs = environments.filter(e => e.env.kind === 'native');
    const wslEnvs = environments.filter(e => e.env.kind === 'wsl');

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant='h4' component='h1'>
                    {t(`${agentId}.mcp.title`)}
                </Typography>
                <Button variant='outlined' startIcon={<RefreshIcon />} onClick={load} sx={{ textTransform: 'none' }}>
                    {t('common.refresh')}
                </Button>
            </Box>

            {nativeEnvs.map(info => (
                <Box key={envId(info.env)}>
                    <Typography variant='h6' sx={{ mb: 1 }}>
                        {info.label}
                    </Typography>
                    <McpSection agentId={agentId} api={api} info={info} onNotify={notify} />
                </Box>
            ))}

            {wslEnvs.length > 0 && (
                <>
                    <Divider sx={{ my: 3 }} />
                    <Typography variant='h5' sx={{ mb: 2 }}>
                        WSL
                    </Typography>
                    {wslEnvs.map(info => (
                        <Box key={envId(info.env)}>
                            <Typography variant='h6' sx={{ mb: 1 }}>
                                {t(`${agentId}.mcp.wslSection`, { distro: info.label })}
                            </Typography>
                            <McpSection agentId={agentId} api={api} info={info} onNotify={notify} />
                        </Box>
                    ))}
                </>
            )}

            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};
