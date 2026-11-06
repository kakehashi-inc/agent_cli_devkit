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
    ClaudeEnvironment,
    SettingsFieldSpec,
    SettingsFieldValue,
    SettingsParseError,
    SettingsValues,
} from '@shared/agents/claude/types';

interface Props {
    env: ClaudeEnvironment;
    onNotify: (message: string, severity: 'success' | 'error' | 'warning') => void;
    // タブの枠から受け取る情報。リンク行の移動先と、別のタブの保存への追従に使う。
    profile?: SettingsTabContext;
}

/**
 * 1 環境分の Claude Code 設定（~/.claude/settings.json）編集セクション。
 *
 * - read() が返す項目定義（result.fields）だけをテーブルに展開して編集する。
 *   各項目は 3 状態 boolean・envFlag・候補入力・セレクト・テキスト・数値で表示し、
 *   構造化設定は編集先のタブへのリンクか、ファイルの直接編集が必要なことを値欄へ表示する。
 * - 個々の変更は即保存せず、テーブル下の「保存」「キャンセル」で確定/破棄する。
 *   - 保存: 変更した編集可能項目だけを settings.json へ差分マージ（登録外・未編集項目には触れない）。
 *   - キャンセル: 再取得して編集前の状態へ戻す。
 * - 保存/キャンセル行の右端「直接編集」で settings.json の生 JSON を直接編集できる。
 *   ダイアログ内の保存で書き込み、キャンセルで破棄する。
 */
export const SettingsSection: React.FC<Props> = ({ env, onNotify, profile }) => {
    const { t } = useTranslation();
    const fieldLink = useSettingsFieldLink('claude', profile?.selectTab);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [available, setAvailable] = useState(true);

    // テーブルの編集値（key -> 値）。boolean / envFlag は boolean、string は string。
    const [editValues, setEditValues] = useState<Record<string, SettingsFieldValue>>({});
    const [originalValues, setOriginalValues] = useState<Record<string, SettingsFieldValue>>({});

    // 設定ファイルを読めない、または CLI が読めない内容である理由。
    const [readFailed, setReadFailed] = useState<string | undefined>(undefined);
    const [parseError, setParseError] = useState<SettingsParseError | undefined>(undefined);

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

    // テーブルの保存で、読み込んだ後に値が変わっていた項目の key。null の間は確認を出さない。
    const [conflictKeys, setConflictKeys] = useState<string[] | null>(null);

    const load = async (mode: SettingsLoadMode = 'replace', discard: readonly string[] = []) => {
        if (mode === 'replace') setLoading(true);
        try {
            const result = await window.agentCliDevkit.claude.settings.read(env);
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
            onNotify(t('claude.settings.readError'), 'error');
        } finally {
            setLoading(false);
        }
    };

    useSettingsLoadEffect(load, profile?.docVersion, profile?.reloadNonce);

    // 未編集項目と直接編集項目は送らず、将来の設定や構造値を壊さない。
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
                    t(`claude.settings.field.${invalid.field.key}.label`)
                ),
                'error'
            );
            return;
        }
        setBusy(true);
        try {
            const result = await window.agentCliDevkit.claude.settings.write(
                env,
                values,
                baseValuesOf(values, originalValues)
            );
            if (result.ok) {
                onNotify(t('claude.settings.saveSuccess'), 'success');
                await load();
                profile?.onSaved();
            } else if (result.message === 'conflict') {
                setConflictKeys(result.conflictKeys ?? []);
            } else {
                onNotify(t(tableSaveErrorKey('claude.settings', result.message, 'invalid-existing-json')), 'error');
            }
        } catch {
            onNotify(t('claude.settings.saveError'), 'error');
        } finally {
            setBusy(false);
        }
    };

    // キャンセル: 再取得して編集前へ戻す。
    const handleCancel = () => {
        void load();
    };

    // 直接編集: 開いた時点の生 JSON を編集する。保存できるのは CLI が読める厳密な JSON だけ。
    const directEditor = useDirectEdit({
        read: () => window.agentCliDevkit.claude.settings.readRaw(env),
        writeRaw: (raw, baseRevision) => window.agentCliDevkit.claude.settings.writeRaw(env, raw, baseRevision),
        initialText: '{}\n',
        isValid: text => {
            try {
                const parsed = JSON.parse(text);
                return Boolean(parsed && typeof parsed === 'object' && !Array.isArray(parsed));
            } catch {
                return false;
            }
        },
        setBusy,
        onSaved: async () => {
            onNotify(t('claude.settings.saveSuccess'), 'success');
            await load();
            profile?.onSaved();
        },
        onReadFailed: () => onNotify(t('claude.settings.readError'), 'error'),
        onSaveFailed: message =>
            onNotify(t(directSaveErrorKey('claude.settings', message, 'invalid-json', 'invalidJson')), 'error'),
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
        return <Alert severity='info'>{t('claude.settings.unavailable')}</Alert>;
    }

    // 値を確定できないあいだは、未設定に見える表と保存の操作を出さない。
    const blocked = readFailed !== undefined || parseError !== undefined;

    return (
        <Box>
            <SettingsFileBanner
                readFailed={readFailed}
                parseError={parseError}
                parseErrorKey='claude.settings.parseError'
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
                                                    <TableCell
                                                        sx={{ verticalAlign: 'top', pl: 3, overflowWrap: 'anywhere' }}
                                                    >
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
                    {t('claude.settings.directEdit')}
                </Button>
            </Box>

            <SettingsConflictDialog
                labels={conflictKeys?.map(key => t(`claude.settings.field.${key}.label`)) ?? null}
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
                title={t('claude.settings.directEditTitle')}
                description={t('claude.settings.directEditDesc')}
                cancelLabel={t('claude.settings.cancel')}
                saveLabel={t('claude.settings.save')}
                invalidText={t('claude.settings.invalidJson')}
            />
        </Box>
    );
};
