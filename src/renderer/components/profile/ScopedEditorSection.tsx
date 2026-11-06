import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Button, Typography } from '@mui/material';
import {
    Edit as EditIcon,
    Add as AddIcon,
    Visibility as RevealIcon,
    VisibilityOff as HideIcon,
} from '@mui/icons-material';
import type { ScopedEditorSectionSpec } from '@shared/agents/profile/types';
import type { ProfileSectionProps } from './profileContext';
import { MonoBlock, ProfileSectionFrame, SectionFailure, SectionLoading } from './ProfileSectionParts';
import { failureText } from './profileText';
import { TextFileEditorDialog, type TextFileRequest } from './TextFileEditorDialog';
import { useSectionData } from './useSectionData';

/**
 * 設定ファイルの一部、またはファイル全体を原文で編集する section。
 * 本文は読み取り専用で表示し、編集はダイアログで行う。sensitive の section は、展開か編集の操作があるまで本文を読まない。
 */
export const ScopedEditorSection: React.FC<ProfileSectionProps<ScopedEditorSectionSpec>> = ({ section, ctx }) => {
    const { t } = useTranslation();
    const [request, setRequest] = useState<TextFileRequest | null>(null);
    const [revealed, setRevealed] = useState(false);
    const { data } = useSectionData(ctx, section, { editing: request !== null, reveal: revealed });

    const openEditor = (displayPath: string) => {
        setRequest({
            title: t(section.editorTitleKey),
            description: displayPath,
            load: async () => {
                const read = await ctx.api.readSection(ctx.env, section.id, { reveal: true });
                if (read.kind !== 'scopedEditor') {
                    return {
                        ok: false,
                        message:
                            read.kind === 'failed'
                                ? failureText(t, read.message, read.detail)
                                : t('common.profile.error.read-failed'),
                    };
                }
                return {
                    ok: true,
                    text: read.present ? (read.text ?? '') : (section.emptyTemplate ?? ''),
                    revision: read.revision,
                };
            },
            save: (text, baseRevision, confirmed) =>
                ctx.api.saveScoped(ctx.env, section.id, text, baseRevision, confirmed),
        });
    };

    const body = () => {
        if (data === null) return <SectionLoading />;
        if (data.kind === 'failed') return <SectionFailure data={data} />;
        if (data.kind !== 'scopedEditor') return null;
        const blocked = data.otherForm === true && !data.present;
        return (
            <>
                {data.otherForm && section.otherForm && (
                    <Alert severity='warning' sx={{ mb: 1 }}>
                        {t(blocked ? section.otherForm.blockedKey : section.otherForm.bothKey)}
                    </Alert>
                )}
                {data.normalized && (
                    <Alert severity='info' sx={{ mb: 1 }}>
                        {t('common.profile.scoped.normalized')}
                    </Alert>
                )}
                {!data.present ? (
                    <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                        {t('common.profile.scoped.unset')}
                    </Typography>
                ) : data.withheld ? (
                    <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                        {t('common.profile.scoped.withheld')}
                    </Typography>
                ) : (
                    <MonoBlock text={data.text ?? ''} />
                )}
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant='outlined'
                        size='small'
                        startIcon={data.present ? <EditIcon /> : <AddIcon />}
                        disabled={blocked}
                        onClick={() => openEditor(data.displayPath)}
                    >
                        {data.present ? t('common.profile.edit') : t('common.profile.add')}
                    </Button>
                    {section.sensitive && data.present && (
                        <Button
                            size='small'
                            startIcon={revealed ? <HideIcon /> : <RevealIcon />}
                            onClick={() => setRevealed(value => !value)}
                        >
                            {revealed ? t('common.profile.scoped.hide') : t('common.profile.scoped.reveal')}
                        </Button>
                    )}
                </Box>
            </>
        );
    };

    return (
        <ProfileSectionFrame section={section} notices={data?.notices}>
            {body()}
            <TextFileEditorDialog
                request={request}
                notify={ctx.notify}
                onClose={() => setRequest(null)}
                onSaved={() => {
                    ctx.notify(t('common.profile.saved'), 'success');
                    ctx.onChanged(section);
                }}
            />
        </ProfileSectionFrame>
    );
};
