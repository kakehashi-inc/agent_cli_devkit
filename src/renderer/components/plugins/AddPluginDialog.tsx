import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    LinearProgress,
    List,
    ListItem,
    MenuItem,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import { OpenInNew as OpenInNewIcon } from '@mui/icons-material';
import type {
    AgentEnvironment,
    PluginCapabilities,
    PluginCatalogEntry,
    PluginMarketplaceEntry,
} from '@shared/agents/types';
import { isValidSource, sourceFormatsText } from './AddMarketplaceDialog';
import type { PluginManagerApi, PluginNotify } from './types';

type Mode = 'catalog' | 'source';
const ALL = '__all__';

interface Props {
    api: PluginManagerApi;
    env: AgentEnvironment;
    capabilities: PluginCapabilities;
    marketplaces: PluginMarketplaceEntry[];
    onNotify: PluginNotify;
    onClose: (changed: boolean) => void;
}

/**
 * プラグイン追加ダイアログ。
 * - 「マーケットプレイスから」: カタログ（plugin list --available）を一覧表示して選択インストール。
 * - 「リポジトリ / ローカルから」:
 *   - capabilities.directInstall=true（grok）: ソースを 1 コマンドで直接インストール。
 *   - false（claude / codex）: ソースをマーケットプレイスとして追加し、そのカタログへ誘導する 2 段階。
 * インストール実行前には信頼確認を挟む（プラグインは任意コード実行が可能なため）。
 */
export const AddPluginDialog: React.FC<Props> = ({ api, env, capabilities, marketplaces, onNotify, onClose }) => {
    const { t } = useTranslation();
    const [mode, setMode] = useState<Mode>('catalog');
    const [entries, setEntries] = useState<PluginCatalogEntry[]>([]);
    const [catalogLoading, setCatalogLoading] = useState(false);
    const [catalogError, setCatalogError] = useState<string | null>(null);
    const [marketFilter, setMarketFilter] = useState<string>(ALL);
    const [search, setSearch] = useState('');
    const [source, setSource] = useState('');
    const [busy, setBusy] = useState(false);
    const [errorDetail, setErrorDetail] = useState<string | null>(null);
    // 信頼確認の対象（カタログの 1 件 or ソース直接インストール）。
    const [trustTarget, setTrustTarget] = useState<{ kind: 'catalog'; entry: PluginCatalogEntry } | { kind: 'source' } | null>(
        null
    );
    // このダイアログ内で行った変更（インストール / マーケットプレイス追加）の有無。
    const [changed, setChanged] = useState(false);
    // カタログモードで選択できるマーケットプレイス名（2 段階フローで増えることがある）。
    // インストール元として選択可能（selectable）なもののみ提示する。
    const [marketNames, setMarketNames] = useState<string[]>(
        marketplaces.filter(m => m.selectable).map(m => m.name)
    );

    const loadCatalog = async () => {
        setCatalogLoading(true);
        setCatalogError(null);
        try {
            const result = await api.catalog(env);
            if (result.ok) {
                setEntries(result.entries);
            } else {
                setCatalogError(result.message ?? '');
            }
        } catch (error) {
            setCatalogError(String(error));
        } finally {
            setCatalogLoading(false);
        }
    };

    useEffect(() => {
        loadCatalog();
        // env / api は安定参照。マウント時に一度ロードする。
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return entries.filter(e => {
            if (marketFilter !== ALL && e.marketplace !== marketFilter) {
                return false;
            }
            if (q.length === 0) {
                return true;
            }
            return e.name.toLowerCase().includes(q) || (e.description ?? '').toLowerCase().includes(q);
        });
    }, [entries, marketFilter, search]);

    /** カタログからのインストール（信頼確認済み）。 */
    const handleInstall = async (entry: PluginCatalogEntry) => {
        setBusy(true);
        setErrorDetail(null);
        try {
            const result = await api.install(env, entry.id);
            if (result.ok) {
                onNotify(t('pluginManager.installSuccess'), 'success');
                setChanged(true);
                setEntries(prev => prev.map(e => (e.id === entry.id ? { ...e, installed: true } : e)));
            } else {
                setErrorDetail(result.message ?? '');
                onNotify(t('pluginManager.installError'), 'error');
            }
        } catch (error) {
            setErrorDetail(String(error));
            onNotify(t('pluginManager.installError'), 'error');
        } finally {
            setBusy(false);
        }
    };

    /** ソース直接インストール（grok。信頼確認済み）。 */
    const handleInstallFromSource = async () => {
        if (!api.installFromSource) {
            return;
        }
        setBusy(true);
        setErrorDetail(null);
        try {
            const result = await api.installFromSource(env, source.trim());
            if (result.ok) {
                onNotify(t('pluginManager.installSuccess'), 'success');
                onClose(true);
            } else {
                setErrorDetail(result.message ?? '');
                onNotify(t('pluginManager.installError'), 'error');
            }
        } catch (error) {
            setErrorDetail(String(error));
            onNotify(t('pluginManager.installError'), 'error');
        } finally {
            setBusy(false);
        }
    };

    /** 2 段階フロー: ソースをマーケットプレイスとして追加し、カタログへ誘導する（claude / codex）。 */
    const handleAddAsMarketplace = async () => {
        setBusy(true);
        setErrorDetail(null);
        try {
            const result = await api.addMarketplace(env, source.trim());
            if (!result.ok) {
                setErrorDetail(result.message ?? '');
                onNotify(t('pluginManager.addMarketError'), 'error');
                return;
            }
            onNotify(t('pluginManager.addMarketSuccess'), 'success');
            setChanged(true);
            // 追加されたマーケットプレイス名を一覧の差分から特定し、カタログをその絞り込みで開く。
            const before = new Set(marketNames);
            const after = await api.list(env);
            const names = after.marketplaces.filter(m => m.selectable).map(m => m.name);
            setMarketNames(names);
            const added = names.find(n => !before.has(n));
            setMarketFilter(added ?? ALL);
            setMode('catalog');
            await loadCatalog();
        } catch (error) {
            setErrorDetail(String(error));
            onNotify(t('pluginManager.addMarketError'), 'error');
        } finally {
            setBusy(false);
        }
    };

    const handleTrustProceed = async () => {
        const target = trustTarget;
        setTrustTarget(null);
        if (!target) {
            return;
        }
        if (target.kind === 'catalog') {
            await handleInstall(target.entry);
        } else {
            await handleInstallFromSource();
        }
    };

    const sourceHelp = capabilities.directInstall
        ? t('pluginManager.sourceHelpDirect')
        : t('pluginManager.sourceHelpTwoStep');

    return (
        <Dialog open fullWidth maxWidth='md' onClose={() => !busy && onClose(changed)}>
            <DialogTitle>{t('pluginManager.addPluginTitle')}</DialogTitle>
            <DialogContent>
                <ToggleButtonGroup
                    exclusive
                    size='small'
                    value={mode}
                    onChange={(_, v: Mode | null) => {
                        if (v !== null && !busy) {
                            setMode(v);
                            setErrorDetail(null);
                        }
                    }}
                    sx={{ mb: 2 }}
                >
                    <ToggleButton value='catalog' sx={{ textTransform: 'none' }}>
                        {t('pluginManager.modeCatalog')}
                    </ToggleButton>
                    <ToggleButton value='source' sx={{ textTransform: 'none' }}>
                        {t('pluginManager.modeSource')}
                    </ToggleButton>
                </ToggleButtonGroup>

                {mode === 'catalog' && (
                    <>
                        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                            <TextField
                                select
                                size='small'
                                value={marketFilter}
                                onChange={e => setMarketFilter(e.target.value)}
                                sx={{ minWidth: 220 }}
                            >
                                <MenuItem value={ALL}>{t('pluginManager.allMarketplaces')}</MenuItem>
                                {marketNames.map(name => (
                                    <MenuItem key={name} value={name}>
                                        {name}
                                    </MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                size='small'
                                fullWidth
                                placeholder={t('pluginManager.searchPlaceholder')}
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </Box>
                        {catalogLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                                <CircularProgress size={28} />
                            </Box>
                        ) : catalogError !== null ? (
                            <Alert severity='error'>
                                {t('pluginManager.catalogError')}
                                <Typography component='pre' variant='caption' sx={{ whiteSpace: 'pre-wrap', m: 0 }}>
                                    {catalogError}
                                </Typography>
                            </Alert>
                        ) : filtered.length === 0 ? (
                            <Typography variant='body2' color='text.secondary' sx={{ p: 2 }}>
                                {t('pluginManager.catalogEmpty')}
                            </Typography>
                        ) : (
                            <List dense sx={{ maxHeight: 420, overflowY: 'auto' }}>
                                {filtered.map(entry => (
                                    <ListItem key={entry.id} divider alignItems='flex-start' sx={{ gap: 1.5 }}>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Box
                                                sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}
                                            >
                                                <Typography component='span' sx={{ fontWeight: 500 }}>
                                                    {entry.name}
                                                </Typography>
                                                {entry.homepage && (
                                                    <IconButton
                                                        size='small'
                                                        aria-label={entry.homepage}
                                                        onClick={() => {
                                                            window.agentCliDevkit.system.openExternal(
                                                                entry.homepage as string
                                                            );
                                                        }}
                                                        sx={{ p: 0.25 }}
                                                    >
                                                        <OpenInNewIcon sx={{ fontSize: 16 }} />
                                                    </IconButton>
                                                )}
                                                <Chip
                                                    size='small'
                                                    variant='outlined'
                                                    label={entry.marketplace}
                                                    sx={{ ml: 0.5 }}
                                                />
                                            </Box>
                                            {entry.description && (
                                                <Typography
                                                    variant='body2'
                                                    color='text.secondary'
                                                    sx={{ mt: 0.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                                                >
                                                    {entry.description}
                                                </Typography>
                                            )}
                                        </Box>
                                        <Box sx={{ flexShrink: 0, alignSelf: 'center' }}>
                                            {entry.installed ? (
                                                <Chip size='small' label={t('pluginManager.installedBadge')} />
                                            ) : (
                                                <Button
                                                    size='small'
                                                    variant='outlined'
                                                    disabled={busy}
                                                    onClick={() => setTrustTarget({ kind: 'catalog', entry })}
                                                    sx={{ textTransform: 'none' }}
                                                >
                                                    {t('pluginManager.install')}
                                                </Button>
                                            )}
                                        </Box>
                                    </ListItem>
                                ))}
                            </List>
                        )}
                    </>
                )}

                {mode === 'source' && (
                    <>
                        <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                            {sourceHelp}
                        </Typography>
                        <TextField
                            autoFocus
                            fullWidth
                            label={t('pluginManager.sourceLabel')}
                            value={source}
                            disabled={busy}
                            onChange={e => setSource(e.target.value)}
                            helperText={t('pluginManager.sourceFormats', {
                                formats: sourceFormatsText(t, capabilities, capabilities.directInstall),
                            })}
                        />
                        <Box sx={{ mt: 2 }}>
                            {capabilities.directInstall ? (
                                <Button
                                    variant='contained'
                                    disabled={busy || !isValidSource(source)}
                                    onClick={() => setTrustTarget({ kind: 'source' })}
                                    sx={{ textTransform: 'none' }}
                                >
                                    {t('pluginManager.install')}
                                </Button>
                            ) : (
                                <Button
                                    variant='contained'
                                    disabled={busy || !isValidSource(source)}
                                    onClick={handleAddAsMarketplace}
                                    sx={{ textTransform: 'none' }}
                                >
                                    {t('pluginManager.addAsMarketplace')}
                                </Button>
                            )}
                        </Box>
                    </>
                )}

                {busy && (
                    <>
                        <LinearProgress sx={{ mt: 2 }} />
                        <Typography variant='caption' color='text.secondary'>
                            {t('pluginManager.working')}
                        </Typography>
                    </>
                )}
                {errorDetail !== null && errorDetail.length > 0 && (
                    <Alert severity='error' sx={{ mt: 2 }}>
                        <Typography component='pre' variant='caption' sx={{ whiteSpace: 'pre-wrap', m: 0 }}>
                            {errorDetail}
                        </Typography>
                    </Alert>
                )}
            </DialogContent>
            <DialogActions>
                <Button disabled={busy} onClick={() => onClose(changed)} sx={{ textTransform: 'none' }}>
                    {t('pluginManager.close')}
                </Button>
            </DialogActions>

            {/* 信頼確認（インストール実行前） */}
            <Dialog open={trustTarget !== null} onClose={() => setTrustTarget(null)}>
                <DialogTitle>{t('pluginManager.trustTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{t('pluginManager.trustBody')}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTrustTarget(null)} sx={{ textTransform: 'none' }}>
                        {t('pluginManager.cancel')}
                    </Button>
                    <Button variant='contained' onClick={handleTrustProceed} sx={{ textTransform: 'none' }}>
                        {t('pluginManager.trustProceed')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Dialog>
    );
};
