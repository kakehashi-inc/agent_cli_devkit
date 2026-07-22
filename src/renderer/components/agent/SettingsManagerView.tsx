import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Snackbar,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import {
    Save as SaveIcon,
    Close as CloseIcon,
    Code as CodeIcon,
    KeyboardArrowDown as ExpandIcon,
    KeyboardArrowRight as CollapseIcon,
    Refresh as RefreshIcon,
} from '@mui/icons-material';
import type { AgentEnvironment, SettingsFieldSpec, SettingsFieldValue, SettingsValues } from '@shared/agents/types';
import { SettingsValueEditor } from '../settings/SettingsValueEditor';
import { AssetSearchField } from '../assets/AssetSearchField';
import { envId } from '../../utils/format';
import { filterSettingsFields } from '../../utils/settingsSearch';
import type { Notify, SettingsApi } from './types';

interface Props {
    agentId: string;
    api: SettingsApi;
}

/**
 * 1 環境分の設定編集セクション。
 * 既存 agent（Grok 等）と同じデザイン: 折りたたみ可能なグループ見出し行を持つ 1 枚のテーブル、
 * SettingsValueEditor による値編集（directEdit 項目はテキスト表示のみ）、
 * テーブル下の 保存 / キャンセル（左）と 直接編集（右端）。
 */
const SettingsSection: React.FC<{
    agentId: string;
    api: SettingsApi;
    env: AgentEnvironment;
    notify: Notify;
}> = ({ agentId, api, env, notify }) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [available, setAvailable] = useState(true);

    const [fields, setFields] = useState<SettingsFieldSpec[]>([]);
    const [editValues, setEditValues] = useState<Record<string, SettingsFieldValue>>({});
    const [originalValues, setOriginalValues] = useState<Record<string, SettingsFieldValue>>({});

    const [rawOpen, setRawOpen] = useState(false);
    const [rawText, setRawText] = useState('');

    // 設定キー・表示名・説明に対するキーワードフィルター。
    const [searchQuery, setSearchQuery] = useState('');

    // 展開中のグループ。初期は先頭グループのみ展開する。
    const [expandedGroups, setExpandedGroups] = useState<Set<string> | null>(null);
    const toggleGroup = (group: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev ?? []);
            if (next.has(group)) {
                next.delete(group);
            } else {
                next.add(group);
            }
            return next;
        });
    };

    const filteredFields = useMemo(
        () =>
            filterSettingsFields(
                fields,
                searchQuery,
                f => t(`${agentId}.settings.field.${f.key}.label`),
                f => t(`${agentId}.settings.field.${f.key}.desc`)
            ),
        [fields, searchQuery, agentId, t]
    );

    const groupedFields = useMemo(() => {
        const order: string[] = [];
        const byGroup = new Map<string, SettingsFieldSpec[]>();
        for (const f of filteredFields) {
            if (!byGroup.has(f.group)) {
                byGroup.set(f.group, []);
                order.push(f.group);
            }
            byGroup.get(f.group)!.push(f);
        }
        return order.map(group => ({ group, items: byGroup.get(group)! }));
    }, [filteredFields]);

    // フィルター中はマッチした項目を含むグループをすべて展開する。
    const searching = searchQuery.trim().length > 0;
    const expanded = searching
        ? new Set(groupedFields.map(item => item.group))
        : (expandedGroups ?? new Set(groupedFields.length > 0 ? [groupedFields[0].group] : []));

    const unsetLabel = (f: SettingsFieldSpec): string => {
        if (typeof f.defaultOn === 'boolean') {
            return t(`${agentId}.settings.unsetDefault`, {
                default: f.defaultOn ? t(`${agentId}.settings.enabled`) : t(`${agentId}.settings.disabled`),
            });
        }
        if (f.defaultValue !== undefined) {
            return t(`${agentId}.settings.unsetDefault`, { default: f.defaultValue });
        }
        return t(`${agentId}.settings.unset`);
    };

    const load = async () => {
        setLoading(true);
        try {
            const result = await api.read(env);
            setAvailable(result.available);
            setFields(result.fields);
            const next: Record<string, SettingsFieldValue> = {};
            for (const f of result.fields) {
                next[f.key] = result.values[f.key];
            }
            setEditValues(next);
            setOriginalValues(next);
        } catch (error) {
            console.error('Failed to read settings:', error);
            notify(t(`${agentId}.settings.readError`), 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
        // api and env are stable for this environment section.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const collectValues = (): SettingsValues =>
        Object.fromEntries(
            Object.entries(editValues).filter(([key, value]) => {
                const field = fields.find(item => item.key === key);
                return field?.type !== 'directEdit' && !Object.is(value, originalValues[key]);
            })
        );

    const handleSave = async () => {
        setBusy(true);
        try {
            const result = await api.write(env, collectValues());
            if (result.ok) {
                notify(t(`${agentId}.settings.saveSuccess`), 'success');
                await load();
            } else {
                notify(
                    t(
                        `${agentId}.settings.${result.message === 'invalid-existing-json' ? 'invalidExisting' : 'saveError'}`
                    ),
                    'error'
                );
            }
        } catch {
            notify(t(`${agentId}.settings.saveError`), 'error');
        } finally {
            setBusy(false);
        }
    };

    const handleCancel = () => {
        void load();
    };

    const handleOpenRaw = async () => {
        setBusy(true);
        try {
            const result = await api.read(env);
            setRawText(result.raw ?? '');
            setRawOpen(true);
        } catch {
            notify(t(`${agentId}.settings.readError`), 'error');
        } finally {
            setBusy(false);
        }
    };

    const handleSaveRaw = async () => {
        setBusy(true);
        try {
            const result = await api.writeRaw(env, rawText);
            if (result.ok) {
                notify(t(`${agentId}.settings.saveSuccess`), 'success');
                setRawOpen(false);
                await load();
            } else {
                notify(t(`${agentId}.settings.invalidJson`), 'error');
            }
        } catch {
            notify(t(`${agentId}.settings.saveError`), 'error');
        } finally {
            setBusy(false);
        }
    };

    const setValue = (key: string, value: SettingsFieldValue) => {
        setEditValues(prev => ({ ...prev, [key]: value }));
    };

    if (loading) {
        return (
            <Typography color='text.secondary' sx={{ py: 1 }}>
                {t('common.loading')}
            </Typography>
        );
    }

    if (!available) {
        return <Alert severity='info'>{t(`${agentId}.settings.unavailable`)}</Alert>;
    }

    return (
        <Box>
            <AssetSearchField value={searchQuery} onChange={setSearchQuery} label={t('common.settingsSearchLabel')} />

            {searching && groupedFields.length === 0 ? (
                <Typography color='text.secondary' sx={{ py: 1 }}>
                    {t('common.noSearchResults')}
                </Typography>
            ) : (
                <TableContainer>
                    <Table size='small'>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ width: '40%' }}>{t(`${agentId}.settings.item`)}</TableCell>
                                <TableCell>{t(`${agentId}.settings.value`)}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {groupedFields.map(({ group, items }) => {
                                const groupExpanded = expanded.has(group);
                                return (
                                    <React.Fragment key={group}>
                                        <TableRow
                                            hover
                                            onClick={() => toggleGroup(group)}
                                            sx={{ cursor: 'pointer', userSelect: 'none' }}
                                        >
                                            <TableCell
                                                colSpan={2}
                                                sx={{
                                                    bgcolor: 'action.hover',
                                                    fontWeight: 700,
                                                    py: 0.75,
                                                    borderBottom: 1,
                                                    borderColor: 'divider',
                                                }}
                                            >
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    {groupExpanded ? (
                                                        <ExpandIcon fontSize='small' />
                                                    ) : (
                                                        <CollapseIcon fontSize='small' />
                                                    )}
                                                    {t(`${agentId}.settings.group.${group}`)}
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                        {groupExpanded &&
                                            items.map(f => (
                                                <TableRow key={f.key}>
                                                    <TableCell sx={{ verticalAlign: 'top', pl: 3 }}>
                                                        <Typography variant='body2' sx={{ fontWeight: 600 }}>
                                                            {t(`${agentId}.settings.field.${f.key}.label`)}
                                                        </Typography>
                                                        <Typography variant='caption' color='text.secondary'>
                                                            {t(`${agentId}.settings.field.${f.key}.desc`)}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <SettingsValueEditor
                                                            field={f}
                                                            value={editValues[f.key]}
                                                            unsetLabel={unsetLabel(f)}
                                                            enabledLabel={t(`${agentId}.settings.enabled`)}
                                                            disabledLabel={t(`${agentId}.settings.disabled`)}
                                                            directEditLabel={t(`${agentId}.settings.directEditValue`)}
                                                            unknownValueLabel={value =>
                                                                t(`${agentId}.settings.unknownValue`, { value })
                                                            }
                                                            onChange={value => setValue(f.key, value)}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                    </React.Fragment>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* テーブル下部: 左に 保存 / キャンセル、右端に 直接編集 */}
            <Box sx={{ display: 'flex', gap: 1, mt: 2, alignItems: 'center' }}>
                <Button variant='contained' size='small' startIcon={<SaveIcon />} disabled={busy} onClick={handleSave}>
                    {t(`${agentId}.settings.save`)}
                </Button>
                <Button
                    variant='outlined'
                    size='small'
                    startIcon={<CloseIcon />}
                    disabled={busy}
                    onClick={handleCancel}
                >
                    {t(`${agentId}.settings.cancel`)}
                </Button>
                <Box sx={{ flexGrow: 1 }} />
                <Button
                    variant='outlined'
                    size='small'
                    startIcon={<CodeIcon />}
                    disabled={busy}
                    onClick={handleOpenRaw}
                >
                    {t(`${agentId}.settings.directEdit`)}
                </Button>
            </Box>

            {/* 直接編集ダイアログ */}
            <Dialog
                open={rawOpen}
                onClose={() => !busy && setRawOpen(false)}
                maxWidth='md'
                fullWidth
                // ダイアログを固定高にし、スクロールはテキストエリア内の 1 本のみにする
                slotProps={{ paper: { sx: { height: '85vh' } } }}
            >
                <DialogTitle>{t(`${agentId}.settings.directTitle`)}</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <Typography variant='body2' color='text.secondary' sx={{ mb: 1.5, flexShrink: 0 }}>
                        {t(`${agentId}.settings.directDesc`)}
                    </Typography>
                    <TextField
                        multiline
                        fullWidth
                        value={rawText}
                        onChange={e => setRawText(e.target.value)}
                        sx={{ flexGrow: 1, minHeight: 0 }}
                        slotProps={{
                            input: {
                                sx: {
                                    fontFamily: 'monospace',
                                    fontSize: '0.85rem',
                                    height: '100%',
                                    alignItems: 'flex-start',
                                    // TextareaAutosize の自動高さを無効化し、固定高＋内部スクロールにする
                                    '& textarea': {
                                        height: '100% !important',
                                        overflow: 'auto !important',
                                    },
                                },
                            },
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRawOpen(false)} disabled={busy}>
                        {t(`${agentId}.settings.cancel`)}
                    </Button>
                    <Button variant='contained' startIcon={<SaveIcon />} onClick={handleSaveRaw} disabled={busy}>
                        {t(`${agentId}.settings.save`)}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export const SettingsManagerView: React.FC<Props> = ({ agentId, api }) => {
    const { t } = useTranslation();
    const [environments, setEnvironments] = useState<{ env: AgentEnvironment; label: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [reload, setReload] = useState(0);
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error' | 'warning';
    }>({ open: false, message: '', severity: 'success' });

    const load = async () => {
        setLoading(true);
        try {
            setEnvironments(await api.getEnvironments());
            setReload(value => value + 1);
        } catch (error) {
            console.error('Failed to load settings environments:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
        // api is a stable preload bridge.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const notify: Notify = (message, severity) => setSnackbar({ open: true, message, severity });

    if (loading) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography>{t('common.loading')}</Typography>
            </Box>
        );
    }

    const nativeEnvs = environments.filter(item => item.env.kind === 'native');
    const wslEnvs = environments.filter(item => item.env.kind === 'wsl');

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                <Box>
                    <Typography variant='h4' component='h1' sx={{ mb: 1 }}>
                        {t(`${agentId}.settings.title`)}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                        {t(`${agentId}.settings.description`)}
                    </Typography>
                </Box>
                <Button
                    variant='outlined'
                    startIcon={<RefreshIcon />}
                    onClick={load}
                    sx={{ textTransform: 'none', flexShrink: 0 }}
                >
                    {t('common.refresh')}
                </Button>
            </Box>

            {nativeEnvs.map(item => (
                <Box key={`${envId(item.env)}-${reload}`} sx={{ mb: 4 }}>
                    <Typography variant='h6' sx={{ mb: 1 }}>
                        {item.label}
                    </Typography>
                    <SettingsSection agentId={agentId} api={api} env={item.env} notify={notify} />
                </Box>
            ))}

            {wslEnvs.length > 0 && (
                <>
                    <Divider sx={{ my: 3 }} />
                    <Typography variant='h5' sx={{ mb: 2 }}>
                        WSL
                    </Typography>
                    {wslEnvs.map(item => (
                        <Box key={`${envId(item.env)}-${reload}`} sx={{ mb: 4 }}>
                            <Typography variant='h6' sx={{ mb: 1 }}>
                                {t(`${agentId}.settings.wslSection`, { distro: item.label })}
                            </Typography>
                            <SettingsSection agentId={agentId} api={api} env={item.env} notify={notify} />
                        </Box>
                    ))}
                </>
            )}

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar(current => ({ ...current, open: false }))}
            >
                <Alert
                    severity={snackbar.severity}
                    onClose={() => setSnackbar(current => ({ ...current, open: false }))}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};
