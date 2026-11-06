import React, { useMemo, useState } from 'react';
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
    Typography,
    Alert,
} from '@mui/material';
import {
    Save as SaveIcon,
    Close as CloseIcon,
    Code as CodeIcon,
    KeyboardArrowDown as ExpandIcon,
    KeyboardArrowRight as CollapseIcon,
} from '@mui/icons-material';
import { DirectEditDialog, useDirectEdit } from '../../components/settings/DirectEditDialog';
import { SettingsConflictDialog } from '../../components/settings/SettingsConflictDialog';
import { SettingsFileBanner } from '../../components/settings/SettingsFileBanner';
import { directSaveErrorKey, tableSaveErrorKey } from '../../components/settings/settingsFileMessage';
import { SettingsValueEditor } from '../../components/settings/SettingsValueEditor';
import {
    baseValuesOf,
    overlayUnsavedValues,
    useSettingsFieldLink,
    useSettingsLoadEffect,
    type SettingsLoadMode,
    type SettingsTabContext,
} from '../../components/settings/settingsTabContext';
import { settingsValueProblemMessage } from '../../components/settings/settingsValueMessage';
import { AssetSearchField } from '../../components/assets/AssetSearchField';
import { filterSettingsFields } from '../../utils/settingsSearch';
import { findInvalidSettingsValue } from '@shared/agents/settingsValue';
import type {
    GrokEnvironment,
    SettingsFieldSpec,
    SettingsFieldValue,
    SettingsParseError,
    SettingsValues,
} from '@shared/agents/grok/types';

interface Props {
    env: GrokEnvironment;
    onNotify: (message: string, severity: 'success' | 'error' | 'warning') => void;
    // タブの枠から受け取る情報。リンク行の移動先と、別のタブの保存への追従に使う。
    profile?: SettingsTabContext;
}

/**
 * 1 環境分の Grok 設定（~/.grok/config.toml）編集セクション。
 *
 * - read() が返す項目定義（result.fields）だけをテーブルに展開して編集する。
 *   各項目は 3 状態 boolean・候補入力・セレクト・テキスト・数値で表示し、
 *   構造化設定は編集先のタブへのリンクか、ファイルの直接編集が必要なことを値欄へ表示する。
 * - 個々の変更は即保存せず、テーブル下の「保存」「キャンセル」で確定/破棄する。
 *   - 保存: 変更した編集可能項目だけを config.toml へ反映（他セクション・コメント・書式は保持）。
 *   - キャンセル: 再取得して編集前の状態へ戻す。
 * - 「直接編集」で config.toml の生 TOML を直接編集できる。
 */
export const SettingsSection: React.FC<Props> = ({ env, onNotify, profile }) => {
    const { t } = useTranslation();
    const fieldLink = useSettingsFieldLink('grok', profile?.selectTab);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [available, setAvailable] = useState(true);

    const [editValues, setEditValues] = useState<Record<string, SettingsFieldValue>>({});
    const [originalValues, setOriginalValues] = useState<Record<string, SettingsFieldValue>>({});

    // 設定ファイルを読めない、または解釈できない理由。
    const [readFailed, setReadFailed] = useState<string | undefined>(undefined);
    const [parseError, setParseError] = useState<SettingsParseError | undefined>(undefined);

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
                f => t(`grok.settings.field.${f.key}.label`),
                f => t(`grok.settings.field.${f.key}.desc`)
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
            return t('grok.settings.unsetWithDefault', {
                default: f.defaultOn ? t('grok.settings.enabled') : t('grok.settings.disabled'),
            });
        }
        if (f.defaultValue !== undefined) {
            return t('grok.settings.unsetWithDefault', { default: f.defaultValue });
        }
        return t('grok.settings.unset');
    };

    // テーブルの保存で、読み込んだ後に値が変わっていた項目の key。null の間は確認を出さない。
    const [conflictKeys, setConflictKeys] = useState<string[] | null>(null);

    const load = async (mode: SettingsLoadMode = 'replace', discard: readonly string[] = []) => {
        if (mode === 'replace') setLoading(true);
        try {
            const result = await window.agentCliDevkit.grok.config.read(env);
            setAvailable(result.available);
            setReadFailed(result.readFailed);
            setParseError(result.parseError);
            setFields(result.fields);
            const next: Record<string, SettingsFieldValue> = {};
            for (const f of result.fields) {
                next[f.key] = result.values[f.key];
            }
            setEditValues(
                mode === 'overlay'
                    ? previous => overlayUnsavedValues(result.fields, previous, originalValues, next, discard)
                    : next
            );
            setOriginalValues(next);
        } catch (error) {
            console.error('Failed to read settings:', error);
            onNotify(t('grok.settings.readError'), 'error');
        } finally {
            setLoading(false);
        }
    };

    useSettingsLoadEffect(load, profile?.docVersion, profile?.reloadNonce);

    const collectValues = (): SettingsValues =>
        Object.fromEntries(
            Object.entries(editValues).filter(([key, value]) => {
                const field = fields.find(item => item.key === key);
                return field?.type !== 'directEdit' && !Object.is(value, originalValues[key]);
            })
        );

    const handleSave = async () => {
        const values = collectValues();
        const invalid = findInvalidSettingsValue(fields, values);
        if (invalid) {
            onNotify(
                settingsValueProblemMessage(
                    t,
                    invalid.field,
                    invalid.problem,
                    t(`grok.settings.field.${invalid.field.key}.label`)
                ),
                'error'
            );
            return;
        }
        setBusy(true);
        try {
            const result = await window.agentCliDevkit.grok.config.write(
                env,
                values,
                baseValuesOf(values, originalValues)
            );
            if (result.ok) {
                onNotify(t('grok.settings.saveSuccess'), 'success');
                await load();
                profile?.onSaved();
            } else if (result.message === 'conflict') {
                setConflictKeys(result.conflictKeys ?? []);
            } else {
                onNotify(t(tableSaveErrorKey('grok.settings', result.message, 'invalid-existing-toml')), 'error');
            }
        } catch {
            onNotify(t('grok.settings.saveError'), 'error');
        } finally {
            setBusy(false);
        }
    };

    const handleCancel = () => {
        void load();
    };

    const directEditor = useDirectEdit({
        read: () => window.agentCliDevkit.grok.config.readRaw(env),
        writeRaw: (raw, baseRevision) => window.agentCliDevkit.grok.config.writeRaw(env, raw, baseRevision),
        initialText: '',
        setBusy,
        onSaved: async () => {
            onNotify(t('grok.settings.saveSuccess'), 'success');
            await load();
            profile?.onSaved();
        },
        onReadFailed: () => onNotify(t('grok.settings.readError'), 'error'),
        onSaveFailed: message =>
            onNotify(t(directSaveErrorKey('grok.settings', message, 'invalid-toml', 'invalidToml')), 'error'),
    });

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
        return <Alert severity='info'>{t('grok.settings.unavailable')}</Alert>;
    }

    // 値を確定できないあいだは、未設定に見える表と保存の操作を出さない。
    const blocked = readFailed !== undefined || parseError !== undefined;

    return (
        <Box>
            <SettingsFileBanner
                readFailed={readFailed}
                parseError={parseError}
                parseErrorKey='common.settingsFile.parseError'
            />
            {!blocked && (
                <AssetSearchField
                    value={searchQuery}
                    onChange={setSearchQuery}
                    label={t('common.settingsSearchLabel')}
                />
            )}

            {blocked ? null : searching && groupedFields.length === 0 ? (
                <Typography color='text.secondary' sx={{ py: 1 }}>
                    {t('common.noSearchResults')}
                </Typography>
            ) : (
                <TableContainer>
                    <Table size='small' sx={{ tableLayout: 'fixed' }}>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ width: '40%' }}>{t('grok.settings.colItem')}</TableCell>
                                <TableCell>{t('grok.settings.colValue')}</TableCell>
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
                                                    {t(`grok.settings.group.${group}`)}
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                        {expanded &&
                                            items.map(f => (
                                                <TableRow key={f.key}>
                                                    <TableCell
                                                        sx={{ verticalAlign: 'top', pl: 3, overflowWrap: 'anywhere' }}
                                                    >
                                                        <Typography variant='body2' sx={{ fontWeight: 600 }}>
                                                            {t(`grok.settings.field.${f.key}.label`)}
                                                        </Typography>
                                                        <Typography variant='caption' color='text.secondary'>
                                                            {t(`grok.settings.field.${f.key}.desc`)}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <SettingsValueEditor
                                                            field={f}
                                                            value={editValues[f.key]}
                                                            unsetLabel={unsetLabel(f)}
                                                            enabledLabel={t('grok.settings.enabled')}
                                                            disabledLabel={t('grok.settings.disabled')}
                                                            directEditLabel={t('grok.settings.directEditValue')}
                                                            unknownValueLabel={value =>
                                                                t('grok.settings.unknownValue', { value })
                                                            }
                                                            enumOptions={f.enumChoices?.map(choice => ({
                                                                value: choice.value,
                                                                label: t(
                                                                    `grok.settings.field.${f.key}.choice.${choice.labelKey}`
                                                                ),
                                                            }))}
                                                            onChange={value => setValue(f.key, value)}
                                                            {...fieldLink(f)}
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
                {!blocked && (
                    <>
                        <Button
                            variant='contained'
                            size='small'
                            startIcon={<SaveIcon />}
                            disabled={busy}
                            onClick={handleSave}
                        >
                            {t('grok.settings.save')}
                        </Button>
                        <Button
                            variant='outlined'
                            size='small'
                            startIcon={<CloseIcon />}
                            disabled={busy}
                            onClick={handleCancel}
                        >
                            {t('grok.settings.cancel')}
                        </Button>
                    </>
                )}
                <Box sx={{ flexGrow: 1 }} />
                <Button
                    variant='outlined'
                    size='small'
                    startIcon={<CodeIcon />}
                    disabled={busy || readFailed !== undefined}
                    onClick={() => void directEditor.start()}
                >
                    {t('grok.settings.directEdit')}
                </Button>
            </Box>

            <SettingsConflictDialog
                labels={conflictKeys?.map(key => t(`grok.settings.field.${key}.label`)) ?? null}
                busy={busy}
                onBack={() => setConflictKeys(null)}
                onReload={() => {
                    const keys = conflictKeys ?? [];
                    setConflictKeys(null);
                    void load('overlay', keys);
                }}
            />

            <DirectEditDialog
                editor={directEditor}
                busy={busy}
                title={t('grok.settings.directEditTitle')}
                description={t('grok.settings.directEditDesc')}
                cancelLabel={t('grok.settings.cancel')}
                saveLabel={t('grok.settings.save')}
            />
        </Box>
    );
};
