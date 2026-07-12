import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Select,
    MenuItem,
    TextField,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
} from '@mui/material';
import {
    Save as SaveIcon,
    Close as CloseIcon,
    Code as CodeIcon,
    KeyboardArrowDown as ExpandIcon,
    KeyboardArrowRight as CollapseIcon,
} from '@mui/icons-material';
import type {
    CodexEnvironment,
    SettingsFieldSpec,
    SettingsFieldValue,
    SettingsValues,
} from '@shared/agents/codex/types';

interface Props {
    env: CodexEnvironment;
    onNotify: (message: string, severity: 'success' | 'error' | 'warning') => void;
}

/**
 * 1 環境分の Codex 設定（~/.codex/config.toml）編集セクション。
 *
 * - read() が返す項目定義（result.fields）だけをテーブルに展開して編集する。
 *   各項目はトグル（boolean）・セレクト（string + choices）・テキスト / 数値（string / number）で表示する。
 * - 個々の変更は即保存せず、テーブル下の「保存」「キャンセル」で確定/破棄する。
 *   - 保存: 登録項目のみ config.toml へ反映（他セクション・コメント・書式は保持）。
 *   - キャンセル: 再取得して編集前の状態へ戻す。
 * - 「直接編集」で config.toml の生 TOML を直接編集できる。
 */
export const SettingsSection: React.FC<Props> = ({ env, onNotify }) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [available, setAvailable] = useState(true);

    const [editValues, setEditValues] = useState<Record<string, SettingsFieldValue>>({});

    const [rawOpen, setRawOpen] = useState(false);
    const [rawText, setRawText] = useState('');

    const [fields, setFields] = useState<SettingsFieldSpec[]>([]);

    // 展開中のグループ。初期は model / security のみ展開する。
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set(['model', 'security']));
    const toggleGroup = (group: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(group)) {
                next.delete(group);
            } else {
                next.add(group);
            }
            return next;
        });
    };

    const groupedFields = useMemo(() => {
        const order: string[] = [];
        const byGroup = new Map<string, SettingsFieldSpec[]>();
        for (const f of fields) {
            if (!byGroup.has(f.group)) {
                byGroup.set(f.group, []);
                order.push(f.group);
            }
            byGroup.get(f.group)!.push(f);
        }
        return order.map(group => ({ group, items: byGroup.get(group)! }));
    }, [fields]);

    const boolToSelect = (v: SettingsFieldValue): string => (v === true ? 'true' : v === false ? 'false' : '');
    const selectToBool = (v: string): SettingsFieldValue => (v === 'true' ? true : v === 'false' ? false : undefined);

    const unsetLabel = (f: SettingsFieldSpec): string => {
        if (typeof f.defaultOn === 'boolean') {
            return t('codex.settings.unsetWithDefault', {
                default: f.defaultOn ? t('codex.settings.enabled') : t('codex.settings.disabled'),
            });
        }
        return t('codex.settings.unset');
    };

    const load = async () => {
        setLoading(true);
        try {
            const result = await window.agentCliDevkit.codex.config.read(env);
            setAvailable(result.available);
            setFields(result.fields);
            const next: Record<string, SettingsFieldValue> = {};
            for (const f of result.fields) {
                next[f.key] = result.values[f.key];
            }
            setEditValues(next);
        } catch (error) {
            console.error('Failed to read settings:', error);
            onNotify(t('codex.settings.readError'), 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const collectValues = (): SettingsValues => ({ ...editValues });

    const handleSave = async () => {
        setBusy(true);
        try {
            const result = await window.agentCliDevkit.codex.config.write(env, collectValues());
            if (result.ok) {
                onNotify(t('codex.settings.saveSuccess'), 'success');
                await load();
            } else {
                onNotify(
                    t(
                        result.message === 'invalid-existing-toml'
                            ? 'codex.settings.invalidExisting'
                            : 'codex.settings.saveError'
                    ),
                    'error'
                );
            }
        } catch {
            onNotify(t('codex.settings.saveError'), 'error');
        } finally {
            setBusy(false);
        }
    };

    const handleCancel = () => {
        load();
    };

    const handleOpenRaw = async () => {
        setBusy(true);
        try {
            const result = await window.agentCliDevkit.codex.config.read(env);
            const text = result.raw ?? '';
            setRawText(text);
            setRawOpen(true);
        } catch {
            onNotify(t('codex.settings.readError'), 'error');
        } finally {
            setBusy(false);
        }
    };

    const handleSaveRaw = async () => {
        setBusy(true);
        try {
            const result = await window.agentCliDevkit.codex.config.writeRaw(env, rawText);
            if (result.ok) {
                onNotify(t('codex.settings.saveSuccess'), 'success');
                setRawOpen(false);
                await load();
            } else {
                onNotify(
                    t(result.message === 'invalid-toml' ? 'codex.settings.invalidToml' : 'codex.settings.saveError'),
                    'error'
                );
            }
        } catch {
            onNotify(t('codex.settings.saveError'), 'error');
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
        return <Alert severity='info'>{t('codex.settings.unavailable')}</Alert>;
    }

    return (
        <Box>
            <TableContainer>
                <Table size='small'>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ width: '40%' }}>{t('codex.settings.colItem')}</TableCell>
                            <TableCell>{t('codex.settings.colValue')}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {groupedFields.map(({ group, items }) => {
                            const expanded = expandedGroups.has(group);
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
                                                {expanded ? (
                                                    <ExpandIcon fontSize='small' />
                                                ) : (
                                                    <CollapseIcon fontSize='small' />
                                                )}
                                                {t(`codex.settings.group.${group}`)}
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                    {expanded &&
                                        items.map(f => (
                                            <TableRow key={f.key}>
                                                <TableCell sx={{ verticalAlign: 'top', pl: 3 }}>
                                                    <Typography variant='body2' sx={{ fontWeight: 600 }}>
                                                        {t(`codex.settings.field.${f.key}.label`)}
                                                    </Typography>
                                                    <Typography variant='caption' color='text.secondary'>
                                                        {t(`codex.settings.field.${f.key}.desc`)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    {f.type === 'boolean' ? (
                                                        <Select
                                                            size='small'
                                                            displayEmpty
                                                            value={boolToSelect(editValues[f.key])}
                                                            onChange={e =>
                                                                setValue(f.key, selectToBool(e.target.value))
                                                            }
                                                            sx={{ minWidth: 200 }}
                                                        >
                                                            <MenuItem value=''>
                                                                <em>{unsetLabel(f)}</em>
                                                            </MenuItem>
                                                            <MenuItem value='true'>
                                                                {t('codex.settings.enabled')}
                                                            </MenuItem>
                                                            <MenuItem value='false'>
                                                                {t('codex.settings.disabled')}
                                                            </MenuItem>
                                                        </Select>
                                                    ) : f.choices ? (
                                                        <Select
                                                            size='small'
                                                            displayEmpty
                                                            value={(editValues[f.key] as string | undefined) ?? ''}
                                                            onChange={e =>
                                                                setValue(
                                                                    f.key,
                                                                    e.target.value === '' ? undefined : e.target.value
                                                                )
                                                            }
                                                            sx={{ minWidth: 200 }}
                                                        >
                                                            <MenuItem value=''>
                                                                <em>{t('codex.settings.unset')}</em>
                                                            </MenuItem>
                                                            {f.choices.map(c => (
                                                                <MenuItem key={c} value={c}>
                                                                    {c}
                                                                </MenuItem>
                                                            ))}
                                                        </Select>
                                                    ) : f.type === 'number' ? (
                                                        <TextField
                                                            size='small'
                                                            type='number'
                                                            placeholder={t('codex.settings.unset')}
                                                            value={
                                                                typeof editValues[f.key] === 'number'
                                                                    ? String(editValues[f.key])
                                                                    : ''
                                                            }
                                                            onChange={e => {
                                                                const raw = e.target.value;
                                                                if (raw === '') {
                                                                    setValue(f.key, undefined);
                                                                    return;
                                                                }
                                                                const n = Number(raw);
                                                                setValue(f.key, Number.isFinite(n) ? n : undefined);
                                                            }}
                                                            slotProps={{
                                                                htmlInput: { min: f.min, max: f.max },
                                                            }}
                                                            sx={{ minWidth: 200 }}
                                                        />
                                                    ) : (
                                                        <TextField
                                                            size='small'
                                                            placeholder={t(
                                                                `codex.settings.field.${f.key}.placeholder`,
                                                                ''
                                                            )}
                                                            value={(editValues[f.key] as string | undefined) ?? ''}
                                                            onChange={e =>
                                                                setValue(
                                                                    f.key,
                                                                    e.target.value === '' ? undefined : e.target.value
                                                                )
                                                            }
                                                            sx={{ minWidth: 200 }}
                                                        />
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                </React.Fragment>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* テーブル下部: 左に 保存 / キャンセル、右端に 直接編集 */}
            <Box sx={{ display: 'flex', gap: 1, mt: 2, alignItems: 'center' }}>
                <Button variant='contained' size='small' startIcon={<SaveIcon />} disabled={busy} onClick={handleSave}>
                    {t('codex.settings.save')}
                </Button>
                <Button
                    variant='outlined'
                    size='small'
                    startIcon={<CloseIcon />}
                    disabled={busy}
                    onClick={handleCancel}
                >
                    {t('codex.settings.cancel')}
                </Button>
                <Box sx={{ flexGrow: 1 }} />
                <Button
                    variant='outlined'
                    size='small'
                    startIcon={<CodeIcon />}
                    disabled={busy}
                    onClick={handleOpenRaw}
                >
                    {t('codex.settings.directEdit')}
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
                <DialogTitle>{t('codex.settings.directEditTitle')}</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <Typography variant='body2' color='text.secondary' sx={{ mb: 1.5, flexShrink: 0 }}>
                        {t('codex.settings.directEditDesc')}
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
                        {t('codex.settings.cancel')}
                    </Button>
                    <Button variant='contained' startIcon={<SaveIcon />} onClick={handleSaveRaw} disabled={busy}>
                        {t('codex.settings.save')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
