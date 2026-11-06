import React from 'react';
import type { ProfileSectionSpec, ProfileTabSpec } from '@shared/agents/profile/types';
import { CommandFieldsSection } from './CommandFieldsSection';
import { FileCollectionSection } from './FileCollectionSection';
import { FixedFileSetSection } from './FixedFileSetSection';
import { HookOverviewSection } from './HookOverviewSection';
import { OrderedListsSection } from './OrderedListsSection';
import type { ProfileContext } from './profileContext';
import { ScopedEditorSection } from './ScopedEditorSection';

/** section の種類に応じた部品を表示する。 */
const ProfileSection: React.FC<{ section: ProfileSectionSpec; ctx: ProfileContext }> = ({ section, ctx }) => {
    switch (section.kind) {
        case 'hookOverview':
            return <HookOverviewSection section={section} ctx={ctx} />;
        case 'scopedEditor':
            return <ScopedEditorSection section={section} ctx={ctx} />;
        case 'commandFields':
            return <CommandFieldsSection section={section} ctx={ctx} />;
        case 'orderedLists':
            return <OrderedListsSection section={section} ctx={ctx} />;
        case 'fixedFileSet':
            return <FixedFileSetSection section={section} ctx={ctx} />;
        default:
            return <FileCollectionSection section={section} ctx={ctx} />;
    }
};

/** タブの section を順に表示する。 */
export const ProfileTabBody: React.FC<{ tab: ProfileTabSpec; ctx: ProfileContext }> = ({ tab, ctx }) => (
    <>
        {tab.sections.map(section => (
            <ProfileSection key={section.id} section={section} ctx={ctx} />
        ))}
    </>
);
