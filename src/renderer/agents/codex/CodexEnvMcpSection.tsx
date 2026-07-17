import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box,
    Paper,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Alert,
    Tooltip,
} from '@mui/material';
import { ToggleOn as EnableIcon, ToggleOff as DisableIcon, DragIndicator as DragIcon } from '@mui/icons-material';
import type { CodexMcpEnvInfo, MCPServerInfo } from '@shared/agents/codex/types';

interface Props {
    info: CodexMcpEnvInfo;
    onNotify: (message: string, severity: 'success' | 'error') => void;
}

/**
 * 1 つの Codex 環境（native または WSL distro）の MCP サーバーを管理するセクション。
 * 有効/無効の 2 テーブル、ドラッグ並べ替え、有効化/無効化トグルを提供する。
 */
export const CodexEnvMcpSection: React.FC<Props> = ({ info, onNotify }) => {
    const { t } = useTranslation();
    const { env } = info;
    const [enabledServers, setEnabledServers] = useState<MCPServerInfo[]>([]);
    const [disabledServers, setDisabledServers] = useState<MCPServerInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [draggedDisabledIndex, setDraggedDisabledIndex] = useState<number | null>(null);

    const loadData = async () => {
        try {
            const servers = await window.agentCliDevkit.codex.mcp.getMCPServers(env);
            setEnabledServers(servers.enabled);
            setDisabledServers(servers.disabled);
        } catch (error) {
            console.error('Failed to load Codex MCP servers:', error);
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
            const result = await window.agentCliDevkit.codex.mcp.disableMCPServer(env, serverName);
            setEnabledServers(result.enabled);
            setDisabledServers(result.disabled);
            onNotify(t('common.success'), 'success');
        } catch (error) {
            onNotify(error instanceof Error ? error.message : t('common.error'), 'error');
        }
    };

    const handleEnable = async (serverName: string) => {
        try {
            const result = await window.agentCliDevkit.codex.mcp.enableMCPServer(env, serverName);
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
            await window.agentCliDevkit.codex.mcp.reorderMCPServers(env, names);
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
            await window.agentCliDevkit.codex.mcp.reorderDisabledMCPServers(env, names);
            onNotify(t('common.success'), 'success');
        } catch (error) {
            onNotify(error instanceof Error ? error.message : t('common.error'), 'error');
            await loadData();
        } finally {
            setDraggedDisabledIndex(null);
        }
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
                        <TableCell width='20%'>{t('codex.codexMcp.serverName')}</TableCell>
                        <TableCell width='100'>{t('codex.codexMcp.actions')}</TableCell>
                        <TableCell width='18%'>{t('codex.codexMcp.command')}</TableCell>
                        <TableCell>{t('codex.codexMcp.args')}</TableCell>
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
                                    <Tooltip title={t('codex.codexMcp.disable')}>
                                        <IconButton
                                            size='large'
                                            color='success'
                                            onClick={() => handleDisable(server.name)}
                                        >
                                            <EnableIcon sx={{ fontSize: 40 }} />
                                        </IconButton>
                                    </Tooltip>
                                ) : (
                                    <Tooltip title={t('codex.codexMcp.enable')}>
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
                                    {server.config.command ?? '-'}
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
                    {t('codex.codexMcp.configPath')}: {info.configPath}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                    {t('codex.codexMcp.disabledConfigPath')}: {info.disabledConfigPath}
                </Typography>
            </Paper>

            {loading ? (
                <Typography sx={{ px: 1 }}>{t('common.loading')}</Typography>
            ) : !info.configExists ? (
                <Alert severity='info'>{t('codex.codexMcp.notFound')}</Alert>
            ) : (
                <>
                    <Box sx={{ mb: 3 }}>
                        <Typography variant='subtitle1' sx={{ mb: 1 }}>
                            {t('codex.codexMcp.enabledServers')}
                            {enabledServers.length > 0 && (
                                <Typography variant='caption' color='text.secondary' sx={{ ml: 2 }}>
                                    ({t('codex.codexMcp.dragToReorder')})
                                </Typography>
                            )}
                        </Typography>
                        {enabledServers.length === 0 ? (
                            <Alert severity='info'>{t('codex.codexMcp.noServers')}</Alert>
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
                            {t('codex.codexMcp.disabledServers')}
                            {disabledServers.length > 0 && (
                                <Typography variant='caption' color='text.secondary' sx={{ ml: 2 }}>
                                    ({t('codex.codexMcp.dragToReorder')})
                                </Typography>
                            )}
                        </Typography>
                        {disabledServers.length === 0 ? (
                            <Alert severity='info'>{t('codex.codexMcp.noServers')}</Alert>
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
