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
import { SettingsValueEditor } from '../../components/settings/SettingsValueEditor';
import { AssetSearchField } from '../../components/assets/AssetSearchField';
import { filterSettingsFields } from '../../utils/settingsSearch';
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
 *   各項目は 3 状態 boolean・候補入力・セレクト・テキスト・数値で表示し、
 *   構造化設定はファイルの直接編集が必要なことを値欄へ表示する。
 * - 個々の変更は即保存せず、テーブル下の「保存」「キャンセル」で確定/破棄する。
 *   - 保存: 変更した編集可能項目だけを config.toml へ反映（他セクション・コメント・書式は保持）。
 *   - キャンセル: 再取得して編集前の状態へ戻す。
 * - 「直接編集」で config.toml の生 TOML を直接編集できる。
 */
export const SettingsSection: React.FC<Props> = ({ env, onNotify }) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [available, setAvailable] = useState(true);

    const [editValues, setEditValues] = useState<Record<string, SettingsFieldValue>>({});
    const [originalValues, setOriginalValues] = useState<Record<string, SettingsFieldValue>>({});

    const [rawOpen, setRawOpen] = useState(false);
    const [rawText, setRawText] = useState('');

    const [fields, setFields] = useState<SettingsFieldSpec[]>([]);

    // 設定キー・表示名・説明に対するキーワードフィルター。
    const [searchQuery, setSearchQuery] = useState('');

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

    const filteredFields = useMemo(
        () =>
            filterSettingsFields(
                fields,
                searchQuery,
                f => t(`codex.settings.field.${f.key}.label`),
                f => t(`codex.settings.field.${f.key}.desc`)
            ),
        [fields, searchQuery, t]
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

    const unsetLabel = (f: SettingsFieldSpec): string => {
        if (typeof f.defaultOn === 'boolean') {
            return t('codex.settings.unsetWithDefault', {
                default: f.defaultOn ? t('codex.settings.enabled') : t('codex.settings.disabled'),
            });
        }
        if (f.defaultValue !== undefined) {
            return t('codex.settings.unsetWithDefault', { default: f.defaultValue });
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
            setOriginalValues(next);
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
            const result = await window.agentCliDevkit.codex.config.write(env, collectValues());
            if (result.ok) {
                onNotify(t('codex.settings.saveSuccess'), 'success');
                await load();
            } else {
                onNotify(
                    t(
                        result.message === 'invalid-existing-toml'
                            ? 'codex.settings.invalidExisting'
                            : result.message === 'verify-failed'
                              ? 'codex.settings.verifyFailed'
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
                                <TableCell sx={{ width: '40%' }}>{t('codex.settings.colItem')}</TableCell>
                                <TableCell>{t('codex.settings.colValue')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {groupedFields.map(({ group, items }) => {
                                const expanded = searching || expandedGroups.has(group);
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
                                                        <SettingsValueEditor
                                                            field={f}
                                                            value={editValues[f.key]}
                                                            unsetLabel={unsetLabel(f)}
                                                            enabledLabel={t('codex.settings.enabled')}
                                                            disabledLabel={t('codex.settings.disabled')}
                                                            directEditLabel={t('codex.settings.directEditValue')}
                                                            unknownValueLabel={value =>
                                                                t('codex.settings.unknownValue', { value })
                                                            }
                                                            enumOptions={f.enumChoices?.map(choice => ({
                                                                value: choice.value,
                                                                label: t(
                                                                    `codex.settings.field.${f.key}.choice.${choice.labelKey}`
                                                                ),
                                                            }))}
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
