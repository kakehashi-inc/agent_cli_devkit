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
    ClaudeEnvironment,
    SettingsFieldSpec,
    SettingsFieldValue,
    SettingsValues,
} from '@shared/agents/claude/types';

interface Props {
    env: ClaudeEnvironment;
    onNotify: (message: string, severity: 'success' | 'error' | 'warning') => void;
}

/**
 * 1 環境分の Claude Code 設定（~/.claude/settings.json）編集セクション。
 *
 * - read() が返す項目定義（result.fields）だけをテーブルに展開して編集する。
 *   各項目は 3 状態 boolean・envFlag・候補入力・セレクト・テキスト・数値で表示し、
 *   構造化設定はファイルの直接編集が必要なことを値欄へ表示する。
 * - 個々の変更は即保存せず、テーブル下の「保存」「キャンセル」で確定/破棄する。
 *   - 保存: 変更した編集可能項目だけを settings.json へ差分マージ（登録外・未編集項目には触れない）。
 *   - キャンセル: 再取得して編集前の状態へ戻す。
 * - 保存/キャンセル行の右端「直接編集」で settings.json の生 JSON を直接編集できる。
 *   ダイアログ内の保存で書き込み、キャンセルで破棄する。
 */
export const SettingsSection: React.FC<Props> = ({ env, onNotify }) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [available, setAvailable] = useState(true);

    // テーブルの編集値（key -> 値）。boolean / envFlag は boolean、string は string。
    const [editValues, setEditValues] = useState<Record<string, SettingsFieldValue>>({});
    const [originalValues, setOriginalValues] = useState<Record<string, SettingsFieldValue>>({});

    // 直接編集ダイアログ。
    const [rawOpen, setRawOpen] = useState(false);
    const [rawText, setRawText] = useState('');
    const [rawError, setRawError] = useState(false);

    // 編集対象項目の定義は read() の戻り値（result.fields）から受け取る。
    // これによりレンダラーは os 依存の shared/constants を import しない。
    const [fields, setFields] = useState<SettingsFieldSpec[]>([]);

    // 設定キー・表示名・説明に対するキーワードフィルター。
    const [searchQuery, setSearchQuery] = useState('');

    // 展開中のグループ。初期は model / agent のみ展開し、他は折りたたむ。
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set(['model', 'agent']));
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
                f => t(`claude.settings.field.${f.key}.label`),
                f => t(`claude.settings.field.${f.key}.desc`)
            ),
        [fields, searchQuery, t]
    );

    // group ごとにまとめる（出現順を保持）。UI はグループ見出し付きで表示する。
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

    // 公式に固定既定値が確認できた項目だけ「未設定」ラベルへ併記する。
    const unsetLabel = (f: SettingsFieldSpec): string => {
        if (typeof f.defaultOn === 'boolean') {
            return t('claude.settings.unsetWithDefault', {
                default: f.defaultOn ? t('claude.settings.enabled') : t('claude.settings.disabled'),
            });
        }
        if (f.defaultValue !== undefined) {
            return t('claude.settings.unsetWithDefault', { default: f.defaultValue });
        }
        return t('claude.settings.unset');
    };

    const load = async () => {
        setLoading(true);
        try {
            const result = await window.agentCliDevkit.claude.settings.read(env);
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
            onNotify(t('claude.settings.readError'), 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // env は親で固定の安定参照。マウント時に一度ロードする。
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 未編集項目と直接編集項目は送らず、将来の設定や構造値を壊さない。
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
            const result = await window.agentCliDevkit.claude.settings.write(env, collectValues());
            if (result.ok) {
                onNotify(t('claude.settings.saveSuccess'), 'success');
                await load();
            } else {
                onNotify(
                    t(
                        result.message === 'invalid-existing-json'
                            ? 'claude.settings.invalidExisting'
                            : result.message === 'verify-failed'
                              ? 'claude.settings.verifyFailed'
                              : 'claude.settings.saveError'
                    ),
                    'error'
                );
            }
        } catch {
            onNotify(t('claude.settings.saveError'), 'error');
        } finally {
            setBusy(false);
        }
    };

    // キャンセル: 再取得して編集前へ戻す。
    const handleCancel = () => {
        load();
    };

    // 直接編集を開く: 最新の生 JSON を取得して表示する。
    const handleOpenRaw = async () => {
        setBusy(true);
        try {
            const result = await window.agentCliDevkit.claude.settings.read(env);
            const text = result.raw ?? '{}\n';
            setRawText(text);
            setRawError(false);
            setRawOpen(true);
        } catch {
            onNotify(t('claude.settings.readError'), 'error');
        } finally {
            setBusy(false);
        }
    };

    const handleRawTextChange = (text: string) => {
        setRawText(text);
        // 構文チェック（保存ボタンの活性とエラー表示に使う）。
        try {
            const parsed = JSON.parse(text);
            setRawError(!(parsed && typeof parsed === 'object' && !Array.isArray(parsed)));
        } catch {
            setRawError(true);
        }
    };

    const handleSaveRaw = async () => {
        setBusy(true);
        try {
            const result = await window.agentCliDevkit.claude.settings.writeRaw(env, rawText);
            if (result.ok) {
                onNotify(t('claude.settings.saveSuccess'), 'success');
                setRawOpen(false);
                await load();
            } else {
                onNotify(
                    t(result.message === 'invalid-json' ? 'claude.settings.invalidJson' : 'claude.settings.saveError'),
                    'error'
                );
            }
        } catch {
            onNotify(t('claude.settings.saveError'), 'error');
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
        return <Alert severity='info'>{t('claude.settings.unavailable')}</Alert>;
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
                                <TableCell sx={{ width: '40%' }}>{t('claude.settings.colItem')}</TableCell>
                                <TableCell>{t('claude.settings.colValue')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {groupedFields.map(({ group, items }) => {
                                const expanded = searching || expandedGroups.has(group);
                                return (
                                    <React.Fragment key={group}>
                                        {/* グループ見出し行（クリックで開閉） */}
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
                                                    {t(`claude.settings.group.${group}`)}
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                        {expanded &&
                                            items.map(f => (
                                                <TableRow key={f.key}>
                                                    <TableCell sx={{ verticalAlign: 'top', pl: 3 }}>
                                                        <Typography variant='body2' sx={{ fontWeight: 600 }}>
                                                            {t(`claude.settings.field.${f.key}.label`)}
                                                        </Typography>
                                                        <Typography variant='caption' color='text.secondary'>
                                                            {t(`claude.settings.field.${f.key}.desc`)}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <SettingsValueEditor
                                                            field={f}
                                                            value={editValues[f.key]}
                                                            unsetLabel={unsetLabel(f)}
                                                            enabledLabel={t('claude.settings.enabled')}
                                                            disabledLabel={t('claude.settings.disabled')}
                                                            directEditLabel={t('claude.settings.directEditValue')}
                                                            unknownValueLabel={value =>
                                                                t('claude.settings.unknownValue', { value })
                                                            }
                                                            enumOptions={f.enumChoices?.map(choice => ({
                                                                value: choice.value,
                                                                label: t(
                                                                    `claude.settings.field.${f.key}.choice.${choice.labelKey}`
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
                    {t('claude.settings.save')}
                </Button>
                <Button
                    variant='outlined'
                    size='small'
                    startIcon={<CloseIcon />}
                    disabled={busy}
                    onClick={handleCancel}
                >
                    {t('claude.settings.cancel')}
                </Button>
                <Box sx={{ flexGrow: 1 }} />
                <Button
                    variant='outlined'
                    size='small'
                    startIcon={<CodeIcon />}
                    disabled={busy}
                    onClick={handleOpenRaw}
                >
                    {t('claude.settings.directEdit')}
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
                <DialogTitle>{t('claude.settings.directEditTitle')}</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <Typography variant='body2' color='text.secondary' sx={{ mb: 1.5, flexShrink: 0 }}>
                        {t('claude.settings.directEditDesc')}
                    </Typography>
                    <TextField
                        multiline
                        fullWidth
                        value={rawText}
                        onChange={e => handleRawTextChange(e.target.value)}
                        error={rawError}
                        helperText={rawError ? t('claude.settings.invalidJson') : ' '}
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
                        {t('claude.settings.cancel')}
                    </Button>
                    <Button
                        variant='contained'
                        startIcon={<SaveIcon />}
                        onClick={handleSaveRaw}
                        disabled={busy || rawError}
                    >
                        {t('claude.settings.save')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
