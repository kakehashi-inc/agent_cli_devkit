import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Box,
    Button,
    Divider,
    Snackbar,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
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
import type {
    AgentEnvironment,
    SettingsFieldSpec,
    SettingsFieldValue,
    SettingsParseError,
    SettingsValues,
} from '@shared/agents/types';
import { findInvalidSettingsValue } from '@shared/agents/settingsValue';
import type { ProfileApi } from '@shared/agents/profile/types';
import { DirectEditDialog, useDirectEdit } from '../settings/DirectEditDialog';
import { SettingsConflictDialog } from '../settings/SettingsConflictDialog';
import { SettingsFileBanner } from '../settings/SettingsFileBanner';
import { directSaveErrorKey, tableSaveErrorKey } from '../settings/settingsFileMessage';
import { SettingsValueEditor } from '../settings/SettingsValueEditor';
import {
    baseValuesOf,
    overlayUnsavedValues,
    useSettingsFieldLink,
    useSettingsLoadEffect,
    type SettingsLoadMode,
    type SettingsTabContext,
} from '../settings/settingsTabContext';
import { settingsValueProblemMessage } from '../settings/settingsValueMessage';
import { ProfileTabsShell } from '../profile/ProfileTabsShell';
import { useProfileTabSelection } from '../profile/useProfileTabSelection';
import { AssetSearchField } from '../assets/AssetSearchField';
import { envId } from '../../utils/format';
import { filterSettingsFields } from '../../utils/settingsSearch';
import type { Notify, SettingsApi } from './types';
import { useAgentEnvironments } from './useAgentEnvironments';

interface Props {
    agentId: string;
    api: SettingsApi;
    profileApi: ProfileApi;
}

/**
 * 1 環境分の設定編集セクション。
 * 折りたたみ可能なグループ見出し行を持つ 1 枚のテーブル、SettingsValueEditor による値編集
 * （directEdit 項目は編集先へのリンクか案内のテキスト）、テーブル下の 保存 / キャンセル（左）と 直接編集（右端）で構成する。
 * 設定ファイル全体への注記があれば、テーブルの上に表示する。設定ファイルを読めない、または解釈できないときは、
 * テーブルの代わりに理由を表示する。
 */
const SettingsSection: React.FC<{
    agentId: string;
    api: SettingsApi;
    env: AgentEnvironment;
    notify: Notify;
    profile: SettingsTabContext;
}> = ({ agentId, api, env, notify, profile }) => {
    const { t } = useTranslation();
    const fieldLink = useSettingsFieldLink(agentId, profile.selectTab);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [available, setAvailable] = useState(true);

    const [fields, setFields] = useState<SettingsFieldSpec[]>([]);
    const [editValues, setEditValues] = useState<Record<string, SettingsFieldValue>>({});
    const [originalValues, setOriginalValues] = useState<Record<string, SettingsFieldValue>>({});
    const [notices, setNotices] = useState<Record<string, string>>({});
    const [fileNotice, setFileNotice] = useState<string | undefined>(undefined);

    // 設定ファイルを読めない、または解釈できない理由。
    const [readFailed, setReadFailed] = useState<string | undefined>(undefined);
    const [parseError, setParseError] = useState<SettingsParseError | undefined>(undefined);

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

    // テーブルの保存で、読み込んだ後に値が変わっていた項目の key。null の間は確認を出さない。
    const [conflictKeys, setConflictKeys] = useState<string[] | null>(null);

    const load = async (mode: SettingsLoadMode = 'replace', discard: readonly string[] = []) => {
        if (mode === 'replace') setLoading(true);
        try {
            const result = await api.read(env);
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
            setNotices(result.notices ?? {});
            setFileNotice(result.fileNotice);
        } catch (error) {
            console.error('Failed to read settings:', error);
            notify(t(`${agentId}.settings.readError`), 'error');
        } finally {
            setLoading(false);
        }
    };

    useSettingsLoadEffect(load, profile.docVersion, profile.reloadNonce);

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
            notify(
                settingsValueProblemMessage(
                    t,
                    invalid.field,
                    invalid.problem,
                    t(`${agentId}.settings.field.${invalid.field.key}.label`)
                ),
                'error'
            );
            return;
        }
        setBusy(true);
        try {
            const result = await api.write(env, values, baseValuesOf(values, originalValues));
            if (result.ok) {
                notify(t(`${agentId}.settings.saveSuccess`), 'success');
                await load();
                profile.onSaved();
            } else if (result.message === 'conflict') {
                setConflictKeys(result.conflictKeys ?? []);
            } else {
                notify(t(tableSaveErrorKey(`${agentId}.settings`, result.message, 'invalid-existing-json')), 'error');
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

    const directEditor = useDirectEdit({
        read: () => api.readRaw(env),
        writeRaw: (raw, baseRevision) => api.writeRaw(env, raw, baseRevision),
        initialText: '',
        setBusy,
        onSaved: async () => {
            notify(t(`${agentId}.settings.saveSuccess`), 'success');
            await load();
            profile.onSaved();
        },
        onReadFailed: () => notify(t(`${agentId}.settings.readError`), 'error'),
        onSaveFailed: message =>
            notify(t(directSaveErrorKey(`${agentId}.settings`, message, 'invalid-json', 'invalidJson')), 'error'),
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
        return <Alert severity='info'>{t(`${agentId}.settings.unavailable`)}</Alert>;
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
            {fileNotice && (
                <Alert severity='info' sx={{ mb: 2 }}>
                    {t(`${agentId}.settings.${fileNotice}`)}
                </Alert>
            )}
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
                                                    <TableCell
                                                        sx={{ verticalAlign: 'top', pl: 3, overflowWrap: 'anywhere' }}
                                                    >
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
                                                            enumOptions={f.enumChoices?.map(choice => ({
                                                                value: choice.value,
                                                                label: t(
                                                                    `${agentId}.settings.field.${f.key}.choice.${choice.labelKey}`
                                                                ),
                                                            }))}
                                                            onChange={value => setValue(f.key, value)}
                                                            {...fieldLink(f)}
                                                        />
                                                        {notices[f.key] && (
                                                            <Typography
                                                                variant='caption'
                                                                color='text.secondary'
                                                                sx={{ display: 'block', mt: 0.5 }}
                                                            >
                                                                {t(`${agentId}.settings.${notices[f.key]}`)}
                                                            </Typography>
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
                    {t(`${agentId}.settings.directEdit`)}
                </Button>
            </Box>

            <SettingsConflictDialog
                labels={conflictKeys?.map(key => t(`${agentId}.settings.field.${key}.label`)) ?? null}
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
                title={t(`${agentId}.settings.directTitle`)}
                description={t(`${agentId}.settings.directDesc`)}
                cancelLabel={t(`${agentId}.settings.cancel`)}
                saveLabel={t(`${agentId}.settings.save`)}
            />
        </Box>
    );
};

export const SettingsManagerView: React.FC<Props> = ({ agentId, api, profileApi }) => {
    const { t } = useTranslation();
    const { environments, loading, reloadNonce, load } = useAgentEnvironments(
        agentId,
        api,
        'Failed to load settings environments:'
    );
    const selection = useProfileTabSelection(agentId);
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error' | 'warning';
    }>({ open: false, message: '', severity: 'success' });

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
                    onClick={() => void load(true)}
                    sx={{ flexShrink: 0 }}
                >
                    {t('common.refresh')}
                </Button>
            </Box>

            {environments.length === 0 && (
                <Alert severity='info' sx={{ mb: 2 }}>
                    {t(`${agentId}.noEnvironment`)}
                </Alert>
            )}
            {nativeEnvs.map(item => (
                <Box key={`${agentId}:${envId(item.env)}`} sx={{ mb: 4 }}>
                    <Typography variant='h6' sx={{ mb: 1 }}>
                        {item.label}
                    </Typography>
                    <ProfileTabsShell
                        agentId={agentId}
                        env={item.env}
                        api={profileApi}
                        notify={notify}
                        reloadNonce={reloadNonce}
                        tab={selection.get(item.env)}
                        onTabChange={tabId => selection.set(item.env, tabId)}
                        renderSettings={context => (
                            <SettingsSection
                                agentId={agentId}
                                api={api}
                                env={item.env}
                                notify={notify}
                                profile={context}
                            />
                        )}
                    />
                </Box>
            ))}

            {wslEnvs.length > 0 && (
                <>
                    <Divider sx={{ my: 3 }} />
                    <Typography variant='h5' sx={{ mb: 2 }}>
                        WSL
                    </Typography>
                    {wslEnvs.map(item => (
                        <Box key={`${agentId}:${envId(item.env)}`} sx={{ mb: 4 }}>
                            <Typography variant='h6' sx={{ mb: 1 }}>
                                {t(`${agentId}.settings.wslSection`, { distro: item.label })}
                            </Typography>
                            <ProfileTabsShell
                                agentId={agentId}
                                env={item.env}
                                api={profileApi}
                                notify={notify}
                                reloadNonce={reloadNonce}
                                tab={selection.get(item.env)}
                                onTabChange={tabId => selection.set(item.env, tabId)}
                                renderSettings={context => (
                                    <SettingsSection
                                        agentId={agentId}
                                        api={api}
                                        env={item.env}
                                        notify={notify}
                                        profile={context}
                                    />
                                )}
                            />
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
