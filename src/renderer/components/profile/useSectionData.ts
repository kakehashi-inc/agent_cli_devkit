import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProfileSectionData, ProfileSectionSpec } from '@shared/agents/profile/types';
import type { ProfileContext } from './profileContext';

interface Options {
    // 編集中の間は読み直さない。編集が終わった時点で読み直す。
    editing: boolean;
    // sensitive の section の本文を読む。
    reveal?: boolean;
}

/**
 * section の表示内容を読み、読むファイルが保存されたときと更新ボタンのたびに読み直す。
 * 読み直しの間は前の内容を表示したままにする。後から始めた読み取りの結果だけを使う。reload は読み取った内容を返す。
 */
export function useSectionData(ctx: ProfileContext, section: ProfileSectionSpec, options: Options) {
    const { api, env, reloadNonce } = ctx;
    const { id, kind } = section;
    const { editing, reveal = false } = options;
    const [data, setData] = useState<ProfileSectionData | null>(null);
    const ticket = useRef(0);

    const reload = useCallback(async (): Promise<ProfileSectionData> => {
        ticket.current += 1;
        const current = ticket.current;
        let next: ProfileSectionData;
        try {
            next = await api.readSection(env, id, reveal ? { reveal: true } : undefined);
        } catch {
            next = { kind: 'failed', sectionKind: kind, message: 'read-failed' };
        }
        if (current === ticket.current) setData(next);
        return next;
    }, [api, env, id, kind, reveal]);

    const version = ctx.versionOf(section);
    useEffect(() => {
        if (!editing) void reload();
    }, [editing, reload, reloadNonce, version]);

    return { data, reload };
}
